import { el, safeName, shuffle } from "../util.js";
import { nav, Routes } from "../router.js";
import { defaultPlayers } from "../state.js";
import { saveGame, clearSave } from "../storage.js";

export function renderPlayers({state, setState, startMatch, toast}){
  const setup = state.setup;
  const root = el("div", { class:"main" });

  const top = el("div", { class:"card topbar" },
    el("div", { class:"stack" },
      el("div", { class:"title" }, "Spelare"),
      el("div", { class:"subtitle" }, "Setup 2/2 • 1–4 spelare")
    ),
    el("button", { class:"btn ghost", type:"button", onclick: ()=> nav(Routes.SETUP) }, "Tillbaka")
  );

  const count = state.playerCount ?? 2;
  const players = state.players ?? defaultPlayers(count);

  function setCount(c){
    const nextPlayers = defaultPlayers(c).map((p, i)=> {
      const existing = players[i];
      return existing ? {...p, id: existing.id, name: existing.name, colorIdx: existing.colorIdx ?? i} : p;
    });
    setState({ ...state, playerCount: c, players: nextPlayers });
  }

  const countSeg = el("div", { class:"seg", style:"grid-template-columns:repeat(4, 1fr);" },
    ...[1,2,3,4].map(n=> el("button", {
      class:"seg-btn", type:"button",
      "aria-pressed": String(n===count),
      onclick: ()=> setCount(n)
    }, String(n)))
  );

  const cards = el("div", { class:"player-grid" });
  const colors = ["#8dd7ff","#ffb07a","#b5ffb1","#d2b3ff"];

  function renderCard(p, idx){
    const avatar = el("div", { class:"avatar", style:`border-color:${colors[idx%colors.length]}33;` }, (p.name||"").trim().slice(0,1).toUpperCase() || String(idx+1));

    const input = el("input", {
      class:"input",
      value: p.name,
      placeholder: `Spelare ${idx+1}`,
      inputmode: "text"
    });

    input.addEventListener("input", ()=>{
      const next = players.map(x => x.id===p.id ? {...x, name: input.value} : x);
      avatar.textContent = (input.value||"").trim().slice(0,1).toUpperCase() || String(idx+1);
      setState({ ...state, players: next });
    });

    input.addEventListener("keydown", (e)=>{
      if(e.key === "Enter"){
        e.preventDefault();
        const nextEl = cards.querySelectorAll("input")[idx+1];
        if(nextEl) nextEl.focus();
      }
    });

    return el("div", { class:"card player-card" },
      avatar,
      el("div", { class:"stack", style:"flex:1;min-width:0;" },
        el("div", { class:"label" }, `Spelare ${idx+1}`),
        input
      )
    );
  }

  players.forEach((p, idx)=> cards.appendChild(renderCard(p, idx)));

  const startMode = setup?.startOrderMode ?? "coin";
  const startSeg = el("div", { class:"seg", style:"grid-template-columns:1fr 1fr;" },
    el("button", { class:"seg-btn", type:"button", "aria-pressed": String(startMode==="coin"),
      onclick: ()=> setState({ ...state, setup: { ...setup, startOrderMode:"coin" } })
    }, "Coin toss"),
    el("button", { class:"seg-btn", type:"button", "aria-pressed": String(startMode==="p1"),
      onclick: ()=> setState({ ...state, setup: { ...setup, startOrderMode:"p1" } })
    }, "P1 börjar"),
  );

  const info = el("div", { class:"card", style:"padding:12px;" },
    el("div", { class:"stack" },
      el("div", { class:"field" },
        el("div", { class:"label" }, "Antal spelare"),
        countSeg
      ),
      el("div", { class:"divider" }),
      el("div", { class:"field" },
        el("div", { class:"label" }, "Namn"),
        cards
      ),
      el("div", { class:"divider" }),
      el("div", { class:"field" },
        el("div", { class:"label" }, "Startordning"),
        startSeg
      )
    )
  );

  const footer = el("div", { class:"footer" },
    el("button", { class:"btn primary", type:"button", onclick: ()=> {
      // sanitize names
      const fixed = players.map((p, i)=> ({...p, name: safeName(p.name, `Spelare ${i+1}`)}));
      setState({ ...state, players: fixed });
      startMatch();
    }}, "Starta match")
  );

  root.append(top, info, footer);
  return root;
}
