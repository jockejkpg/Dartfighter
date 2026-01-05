import { el } from "../util.js";
import { nav, Routes } from "../router.js";
import { buildDartGrid, buildActions, buildMultiplierModal } from "../ui/dartboard.js";
import { getCheckoutSuggestions } from "../logic/checkout.js";
import { isBust, isValidFinish } from "../logic/rules.js";
import { saveGame, clearSave } from "../storage.js";

export function renderGame({state, setState, toast}){
  const match = state.match;
  const settings = match.settings;
  const playersById = Object.fromEntries(match.players.map(p=>[p.id,p]));
  const currentId = match.order[match.currentIndex];
  const currentPlayer = playersById[currentId];
  const remaining = match.scores[currentId];

  const root = el("div", { class:"main" });

  // Topbar
  const top = el("div", { class:"card topbar" },
    el("div", { class:"stack" },
      el("div", { class:"title" }, currentPlayer.name),
      el("div", { class:"subtitle" }, `Score: ${remaining} • Set ${Math.max(1, Math.max(...Object.values(match.setsWon))+1)}/${settings.setsToWin} • Leg ${Math.max(1, Math.max(...Object.values(match.legsWonInSet))+1)}/${settings.legsPerSet}`)
    ),
    el("button", { class:"btn ghost", type:"button", onclick: ()=> openPause() }, "⚙️")
  );

  // Checkout panel
  const checkoutPanel = el("div", { class:"card", style:"padding:12px; display:none;" });
  function updateCheckout(){
    if(!settings.showCheckout){ checkoutPanel.style.display="none"; return; }
    const suggestions = getCheckoutSuggestions(remaining, settings.outRule);
    if(suggestions.length === 0){
      checkoutPanel.style.display="none";
      return;
    }
    checkoutPanel.style.display="block";
    checkoutPanel.replaceChildren(
      el("div", { class:"label" }, "Checkout (max 3 pilar)"),
      ...suggestions.map((sug, idx)=> el("div", { style:"margin-top:6px;font-weight:900;" },
        `${idx+1}. ` + sug.darts.map(d=>d.label).join(" → ")
      ))
    );
  }

  // Turn panel
  const turnCard = el("div", { class:"card", style:"padding:12px;" });
  function formatDart(d){
    if(d.kind==="MISS") return "Miss";
    if(d.kind==="BULL") return d.value===25 ? "Outer" : "Inner";
    return d.label;
  }

  function updateTurnUI(){
    const darts = match.turn.darts;
    const subtotal = match.turn.turnTotal;
    const startScore = match.turn.startScore;
    const now = match.scores[currentId];

    const badges = el("div", { class:"row", style:"flex-wrap:wrap; gap:8px;" },
      ...darts.map((d,i)=> el("span", { class:"kbd" }, `${i+1}:${formatDart(d)}`)),
      darts.length===0 ? el("span", { class:"kbd" }, "Inga pilar än") : null
    );

    const line = el("div", { style:"margin-top:8px; font-weight:900;" }, `Tur: ${subtotal} • Start: ${startScore} → Nu: ${now}`);
    const actions = el("div", { class:"row", style:"margin-top:10px;" },
      el("button", { class:"btn", type:"button", onclick: ()=> undoDart() }, "Undo"),
      el("button", { class:"btn ghost", type:"button", onclick: ()=> endTurnEarly(), disabled: (!settings.allowEndTurnEarly || darts.length===0) ? true : null }, "Avsluta tur"),
      el("button", { class:"btn primary", type:"button", onclick: ()=> nextPlayer(), disabled: (settings.autoAdvance ? true : (darts.length===0 ? true : null)) }, "Nästa")
    );

    turnCard.replaceChildren(
      el("div", { class:"label" }, `Pilar (${darts.length}/3)`),
      badges,
      line,
      actions
    );
  }

  // Dartboard
  let pendingNumber = null;
  const multModal = buildMultiplierModal({
    onPick: (m)=> {
      if(pendingNumber==null) return;
      addDart({ kind: m===1?'S':m===2?'D':'T', num: pendingNumber, value: pendingNumber*m, label: `${m===1?'':m===2?'D':'T'}${pendingNumber}`.replace(/^1/,'') });
      pendingNumber = null;
      multModal.close();
    },
    onUndo: ()=> {
      undoDart();
      multModal.close();
    },
    onClose: ()=> {
      pendingNumber = null;
      multModal.close();
    }
  });

  const grid = buildDartGrid((n)=>{
    if(match.status !== "playing") return;
    if(match.turn.darts.length >= 3) return;
    pendingNumber = n;
    multModal.open(n);
  });

  const actionRow = buildActions({
    onOuter: ()=> addDart({kind:"BULL", num:25, value:25, label:"Outer"}),
    onInner: ()=> addDart({kind:"BULL", num:50, value:50, label:"Inner"}),
    onMiss: ()=> addDart({kind:"MISS", value:0, label:"Miss"})
  });

  // Scoreboard
  const scoreboard = el("div", { class:"card", style:"padding:10px 12px;" });
  function updateScoreboard(){
    const rows = match.order.map(pid=>{
      const p = playersById[pid];
      const score = match.scores[pid];
      const legs = match.legsWonInSet[pid];
      const sets = match.setsWon[pid];
      const active = pid===currentId;
      return el("div", { style:`display:flex;justify-content:space-between;align-items:center;padding:6px 0;${active?'font-weight:900;':''}` },
        el("div", {}, `${active?'▶ ':''}${p.name}`),
        el("div", { class:"kbd" }, `${score} • L:${legs} S:${sets}`)
      );
    });
    scoreboard.replaceChildren(
      el("div", { class:"label" }, "Scoreboard"),
      ...rows
    );
  }

  // --- Game actions / logic ---
  function persist(){
    saveGame({ ...state, match });
  }

  function addDart(dart){
    if(match.status !== "playing") return;

    // In-rule (optional): if double-in, first scoring dart must be double or inner bull.
    if(settings.inRule === "double"){
      const hasScoredYet = match.history.some(h => h.type==="dart" && h.payload?.playerId === currentId && h.payload?.value > 0)
        || match.turn.darts.some(x=>x.value>0);
      if(!hasScoredYet){
        const ok = dart.kind === "D" || (dart.kind === "BULL" && dart.value === 50);
        if(!ok){
          toast("Double in: första poängen måste vara en dubbel (eller Inner).");
          // Still counts as a dart thrown, but zero score in many formats? Commonly it's just no score.
          // We'll treat it as a thrown dart with 0 value.
          dart = { kind:"MISS", value:0, label:"Miss" };
        }
      }
    }

    const startScore = match.turn.startScore;
    const newTurnDarts = [...match.turn.darts, dart];
    const newTurnTotal = match.turn.turnTotal + dart.value;
    const newRemaining = startScore - newTurnTotal;
    const finished = (newRemaining === 0);
    const bust = isBust({ outRule: settings.outRule, startScore, newScore: newRemaining, lastDart: dart, finished });

    if(bust){
      // record darts as attempted, then bust: reset score to startScore and end turn.
      match.history.push({ type:"bust", payload:{ playerId: currentId, darts: newTurnDarts, startScore }});
      match.turn.darts = [];
      match.turn.turnTotal = 0;
      match.scores[currentId] = startScore;
      toast("BUST! Turen återställs.");
      persist();
      updateAll();
      return nextPlayer(true);
    }

    // Apply
    match.turn.darts = newTurnDarts;
    match.turn.turnTotal = newTurnTotal;
    match.scores[currentId] = newRemaining;
    match.history.push({ type:"dart", payload:{ playerId: currentId, ...dart }});

    // Win leg?
    if(finished){
      onLegWon(currentId);
      return;
    }

    persist();
    updateAll();

    if(settings.autoAdvance && match.turn.darts.length >= 3){
      nextPlayer(true);
    }
  }

  function undoDart(){
    if(match.status !== "playing") return;
    const darts = match.turn.darts;
    if(darts.length === 0){ toast("Inget att ångra i turen."); return; }
    const last = darts[darts.length-1];
    match.turn.darts = darts.slice(0,-1);
    match.turn.turnTotal -= last.value;
    match.scores[currentId] = match.turn.startScore - match.turn.turnTotal;
    match.history.push({ type:"undo", payload:{ playerId: currentId, last }});
    persist();
    updateAll();
  }

  function endTurnEarly(){
    if(!settings.allowEndTurnEarly) return;
    if(match.turn.darts.length === 0) return;
    nextPlayer(true);
  }

  function nextPlayer(force){
    if(match.status !== "playing") return;
    // reset turn
    match.turn.darts = [];
    match.turn.turnTotal = 0;
    match.currentIndex = (match.currentIndex + 1) % match.order.length;
    const nid = match.order[match.currentIndex];
    match.turn.startScore = match.scores[nid];
    persist();
    // rerender whole view for new currentId
    toast("Nästa spelare");
    setState({ ...state, match });
  }

  function onLegWon(winnerId){
    match.status = "leg_over";
    match.winnerId = winnerId;
    // increment legs in set
    match.legsWonInSet[winnerId] += 1;
    // reset scores for next leg
    const startScore = settings.startScore;
    for(const pid of match.order){
      match.scores[pid] = startScore;
    }
    // check set won
    if(match.legsWonInSet[winnerId] >= settings.legsPerSet){
      match.setsWon[winnerId] += 1;
      // reset legs in set
      for(const pid of match.order){
        match.legsWonInSet[pid] = 0;
      }
      // match won?
      if(match.setsWon[winnerId] >= settings.setsToWin){
        match.status = "match_over";
        persist();
        showWinOverlay("Match", winnerId);
        return;
      }else{
        match.status = "set_over";
        persist();
        showWinOverlay("Set", winnerId);
        return;
      }
    }

    persist();
    showWinOverlay("Leg", winnerId);
  }

  function showWinOverlay(kind, winnerId){
    const winner = playersById[winnerId]?.name || "Okänd";
    const overlay = el("div", { class:"modal-overlay open", "aria-hidden":"false" });
    const modal = el("div", { class:"modal" },
      el("div", { class:"modal-title" }, `${kind} vunnen!`),
      el("div", { class:"modal-sub" }, `Vinnare: ${winner}`),
      el("div", { class:"divider" }),
      el("button", { class:"btn primary", type:"button", onclick: ()=> {
        overlay.remove();
        // new leg starts; rotate start player? We'll rotate so winner starts next leg (simple).
        match.currentIndex = match.order.indexOf(winnerId);
        match.turn.startScore = match.scores[winnerId];
        match.turn.darts = [];
        match.turn.turnTotal = 0;
        match.status = "playing";
        match.winnerId = null;
        persist();
        setState({ ...state, match });
      }}, "Fortsätt"),
      el("button", { class:"btn", type:"button", style:"margin-top:10px;", onclick: ()=> {
        overlay.remove();
        clearSave();
        nav(Routes.SETUP);
      }}, "Avsluta match")
    );
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  function openPause(){
    const overlay = el("div", { class:"modal-overlay open", "aria-hidden":"false" });
    const modal = el("div", { class:"modal" },
      el("div", { class:"modal-title" }, "Paus"),
      el("div", { class:"modal-sub" }, "Vad vill du göra?"),
      el("div", { class:"divider" }),
      el("button", { class:"btn", type:"button", onclick: ()=> { overlay.remove(); toast("Sparat."); }}, "Stäng"),
      el("button", { class:"btn danger", type:"button", style:"margin-top:10px;", onclick: ()=> {
        overlay.remove();
        clearSave();
        nav(Routes.SETUP);
      }}, "Avsluta match")
    );
    overlay.appendChild(modal);
    overlay.addEventListener("click", (e)=>{ if(e.target===overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }

  function updateAll(){
    updateCheckout();
    updateTurnUI();
    updateScoreboard();
  }

  // initial turn startScore should be current remaining at start of turn
  match.turn.startScore = remaining;
  updateAll();

  root.append(top, checkoutPanel, turnCard, grid, actionRow, scoreboard, multModal.overlay);
  return root;
}
