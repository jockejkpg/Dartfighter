// Dart Scorer (1v1) - web version
// Rules implemented:
// - start 301/501/701
// - optional double-in (must hit a double to become 'in', then scoring counts)
// - optional double-out (must finish on a double). If score hits 0 without valid checkout => bust
// - bust on score < 0, or score == 1, or invalid checkout
// - best-of legs and best-of sets
// - alternate starter per leg if enabled

const $ = (id) => document.getElementById(id);

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

// --- Checkout / finish helpers ---
const FINISHABLE_DOUBLES = new Set(
  Array.from({length:20}, (_,i)=>2*(i+1)).concat([50]) // D1..D20 and DB
);

function canCheckoutInThree(score, doubleOut=true){
  // Practical: consider finishes up to 170. If doubleOut, last dart must be a double (or DB).
  if(score <= 1) return false;
  if(score > 170) return false;
  if(!doubleOut) return true;

  if(FINISHABLE_DOUBLES.has(score)) return true;

  const darts = [];
  for(let n=1;n<=20;n++){
    darts.push(n);      // S
    darts.push(2*n);    // D
    darts.push(3*n);    // T
  }
  darts.push(25,50,0);

  for(const a of darts){
    const rem = score - a;
    if(rem > 0 && FINISHABLE_DOUBLES.has(rem)) return true;
  }
  for(const a of darts){
    for(const b of darts){
      const rem = score - a - b;
      if(rem > 0 && FINISHABLE_DOUBLES.has(rem)) return true;
    }
  }
  return false;
}

// --- Checkout suggestion (1–3 darts) ---
function getAllThrows(){
  const throws = [];
  for(let n=1; n<=20; n++){
    throws.push({ code:`S${n}`, label:`${n}`, points:n, isDouble:false });
    throws.push({ code:`D${n}`, label:`D${n}`, points:2*n, isDouble:true });
    throws.push({ code:`T${n}`, label:`T${n}`, points:3*n, isDouble:false });
  }
  throws.push({ code:"SB", label:"SB", points:25, isDouble:false });
  throws.push({ code:"DB", label:"DB", points:50, isDouble:true });
  return throws;
}

const ALL_THROWS = getAllThrows();

function sortThrowsForFirstDart(list){
  // Higher points first tends to produce sensible "T20-first" lines
  return [...list].sort((a,b)=> b.points - a.points);
}

function sortDoublesForLastDart(list){
  // Favor common “nice” doubles
  const pref = new Map([
    ["DB", 1000],
    ["D20", 900],
    ["D16", 800],
    ["D10", 700],
    ["D12", 650],
    ["D8", 600],
    ["D6", 550],
    ["D4", 520],
    ["D2", 500],
  ]);

  return [...list].sort((a,b)=>{
    const pa = pref.get(a.label) ?? a.points;
    const pb = pref.get(b.label) ?? b.points;
    return pb - pa;
  });
}

function formatLine(line){
  return line.map(t => t.label).join(" ");
}

function findCheckoutLine(score, doubleOut=true){
  if(score <= 1) return null;
  if(score > 170) return null; // 3-darts max

  const firstPool = sortThrowsForFirstDart(ALL_THROWS);
  const anyPool = firstPool;
  const doubles = sortDoublesForLastDart(ALL_THROWS.filter(t => t.isDouble));

  // 1 dart
  if(doubleOut){
    for(const d of doubles){
      if(d.points === score) return [d];
    }
  } else {
    for(const t of anyPool){
      if(t.points === score) return [t];
    }
  }

  // 2 darts (a + last)
  const lastPool = doubleOut ? doubles : anyPool;
  for(const a of firstPool){
    const rem = score - a.points;
    if(rem <= 0) continue;
    for(const last of lastPool){
      if(last.points === rem){
        return [a, last];
      }
    }
  }

  // 3 darts (a + b + last)
  for(const a of firstPool){
    const rem1 = score - a.points;
    if(rem1 <= 0) continue;
    for(const b of anyPool){
      const rem2 = rem1 - b.points;
      if(rem2 <= 0) continue;
      for(const last of lastPool){
        if(last.points === rem2){
          return [a, b, last];
        }
      }
    }
  }

  return null;
}

function getCheckoutSuggestionText(score, settings, playerIsIn){
  // If double-in and player not in yet => don't suggest checkout
  if(settings.doubleIn && !playerIsIn) return "";
  const line = findCheckoutLine(score, settings.doubleOut);
  if(!line) return "";
  return formatLine(line);
}

// --- SFX (MP3) ---
const SFX = {
  score100: new Audio("assets/sfx/score100.mp3"),
  win: new Audio("assets/sfx/win.mp3"),
  bust: new Audio("assets/sfx/bust.mp3"),
  start: new Audio("assets/sfx/start.mp3"),
};

function primeAudio(a){
  try{
    a.preload = "auto";
    a.volume = 1.0;
    a.load();
  }catch{}
}
Object.values(SFX).forEach(primeAudio);

async function playSfx(aud){
  if(!aud) return;
  try{
    aud.currentTime = 0;
    const p = aud.play();
    if(p && typeof p.catch === "function") p.catch(()=>{});
  }catch{}
}

// --- Carousel player selection (Street-fighter vibe) ---
const PLAYERS = [
  { token: "Ludvig", name: "Ludvig", img: "assets/players/ludvig.jpg" },
  { token: "Emelie", name: "Emelie", img: "assets/players/emelie.jpg" },
  { token: "Joakim", name: "Joakim", img: "assets/players/joakim.jpg" },
  { token: "Martin", name: "Martin", img: "assets/players/martin.jpg" },
  { token: "Alva", name: "Alva", img: "assets/players/alva.jpg" },
  { token: "__GUEST1__", name: "Gäst 1", img: "assets/players/gast1.jpg" },
  { token: "__GUEST2__", name: "Gäst 2", img: "assets/players/gast2.jpg" },
];

function showSetupStep(step){
  const a = $("setupStepPlayers");
  const b = $("setupStepSettings");
  if(!a || !b) return;
  a.classList.toggle("active", step === "players");
  b.classList.toggle("active", step === "settings");
}

function getSidePlayer(side){
  const idx = side === "A" ? App.carIndexA : App.carIndexB;
  return PLAYERS[clamp(idx, 0, PLAYERS.length - 1)];
}

function getPlayerNameForSide(side){
  const p = getSidePlayer(side);
  if(p.token === "__GUEST1__") return "Gäst 1";
  if(p.token === "__GUEST2__") return "Gäst 2";
  return p.name;
}

function setSnap(side){
  const center = side === "A" ? $("carNameA")?.parentElement : $("carNameB")?.parentElement;
  if(!center) return;
  center.classList.remove("snap");
  void center.offsetWidth;
  center.classList.add("snap");
}

function renderCarousel(side){
  const p = getSidePlayer(side);
  const imgEl = side === "A" ? $("carImgA") : $("carImgB");
  const nameEl = side === "A" ? $("carNameA") : $("carNameB");
  if(imgEl) imgEl.src = p.img;
  if(nameEl) nameEl.textContent = getPlayerNameForSide(side);
  setSnap(side);
}

function stepCarousel(side, dir){
  if(side === "A") App.carIndexA = (App.carIndexA + dir + PLAYERS.length) % PLAYERS.length;
  else App.carIndexB = (App.carIndexB + dir + PLAYERS.length) % PLAYERS.length;

  // Ensure not same player on both sides
  if(PLAYERS[App.carIndexA].token === PLAYERS[App.carIndexB].token){
    if(side === "A") App.carIndexB = (App.carIndexB + 1) % PLAYERS.length;
    else App.carIndexA = (App.carIndexA + 1) % PLAYERS.length;
  }
  renderCarousel("A");
  renderCarousel("B");
}

function parseDart(d){
  if(d === "MISS") return { points: 0, isDouble: false, mult: "S", value: 0 };
  if(d === "SB") return { points: 25, isDouble: false, mult: "SB", value: 25 };
  if(d === "DB") return { points: 50, isDouble: true,  mult: "DB", value: 50 };

  const m = d[0];
  const num = parseInt(d.slice(1), 10);
  if(!Number.isFinite(num) || num < 1 || num > 20) throw new Error("Ogiltig dart: " + d);

  if(m === "S") return { points: num, isDouble: false, mult: "S", value: num };
  if(m === "D") return { points: 2*num, isDouble: true, mult: "D", value: num };
  if(m === "T") return { points: 3*num, isDouble: false, mult: "T", value: num };
  throw new Error("Ogiltig dart: " + d);
}

class MatchEngine {
  constructor(p1, p2, settings){
    this.settings = settings;
    this.players = [
      { name: p1, score: settings.startScore, isIn: !settings.doubleIn, legsInSet: 0, sets: 0, turns: [] },
      { name: p2, score: settings.startScore, isIn: !settings.doubleIn, legsInSet: 0, sets: 0, turns: [] },
    ];
    this.setNo = 1;
    this.legNoInSet = 1;
    this.legStarter = Math.random() < 0.5 ? 0 : 1;
    this.current = this.legStarter;
    this.finished = false;
    this.winner = null;
    this._history = [];
  }

  getScoreline(){
    return {
      setNo: this.setNo,
      legNoInSet: this.legNoInSet,
      legsInSet: [this.players[0].legsInSet, this.players[1].legsInSet],
      sets: [this.players[0].sets, this.players[1].sets],
      currentPlayer: this.current,
      winner: this.winner
    };
  }

  _snapshot(){
    return JSON.parse(JSON.stringify({
      players: this.players,
      setNo: this.setNo,
      legNoInSet: this.legNoInSet,
      current: this.current,
      legStarter: this.legStarter,
      finished: this.finished,
      winner: this.winner
    }));
  }

  _restore(s){
    this.players = s.players;
    this.setNo = s.setNo;
    this.legNoInSet = s.legNoInSet;
    this.current = s.current;
    this.legStarter = s.legStarter;
    this.finished = s.finished;
    this.winner = s.winner;
  }

  isFinished(){ return this.finished; }

  undoLastTurn(){
    const snap = this._history.pop();
    if(!snap) return false;
    this._restore(snap);
    return true;
  }

  applyTurn(darts){
    if(this.finished) throw new Error("Matchen är redan klar.");
    if(!Array.isArray(darts) || darts.length === 0) throw new Error("Tom tur.");

    this._history.push(this._snapshot());

    const p = this.players[this.current];
    const before = p.score;

    let pointsRaw = 0;
    let pointsCounted = 0;
    let bust = false;
    let checkout = false;
    let becameIn = false;

    const parsed = darts.map(parseDart);

    // Double-in logic: only count from first double that gets you in
    if(this.settings.doubleIn && !p.isIn){
      for(const pr of parsed){
        pointsRaw += pr.points;
        if(!p.isIn && pr.isDouble){
          p.isIn = true;
          becameIn = true;
          pointsCounted += pr.points;
        } else if(p.isIn){
          pointsCounted += pr.points;
        }
      }
    } else {
      for(const pr of parsed){
        pointsRaw += pr.points;
        pointsCounted += pr.points;
      }
    }

    let after = before;

    if(p.isIn){
      after = before - pointsCounted;

      if(after < 0) bust = true;
      if(after === 1) bust = true;

      if(after === 0){
        if(this.settings.doubleOut){
          const last = parsed[parsed.length - 1];
          if(last.isDouble){
            checkout = true;
          } else {
            bust = true;
          }
        } else {
          checkout = true;
        }
      }

      if(bust){
        after = before; // revert
      } else {
        p.score = after;
      }
    } else {
      // not in yet: score doesn't change
      after = before;
    }

    p.turns.push({
      darts: [...darts],
      pointsRaw,
      pointsCounted,
      scoreBefore: before,
      scoreAfter: after,
      bust,
      checkout,
      becameIn
    });

    if(checkout){
      this._awardLeg(this.current);
    } else {
      this.current = 1 - this.current;
    }

    return { bust, checkout, becameIn, pointsCounted, scoreBefore: before, scoreAfter: after };
  }

  _awardLeg(winnerIdx){
    const w = this.players[winnerIdx];
    w.legsInSet += 1;

    const legsToWin = Math.ceil(this.settings.bestOfLegs / 2);
    if(w.legsInSet >= legsToWin){
      w.sets += 1;
      this.players[0].legsInSet = 0;
      this.players[1].legsInSet = 0;
      this.setNo += 1;
      this.legNoInSet = 1;

      const setsToWin = Math.ceil(this.settings.bestOfSets / 2);
      if(w.sets >= setsToWin){
        this.finished = true;
        this.winner = winnerIdx;
        return;
      }
    } else {
      this.legNoInSet += 1;
    }

    // New leg: reset scores and "in" state
    for(const p of this.players){
      p.score = this.settings.startScore;
      p.isIn = !this.settings.doubleIn;
    }

    // Alternate start if enabled
    if(this.settings.alternateStart){
      this.legStarter = 1 - this.legStarter;
    }
    this.current = this.legStarter;
  }

  matchSummary(){
    return {
      playerA: this.players[0].name,
      playerB: this.players[1].name,
      startScore: this.settings.startScore,
      doubleIn: this.settings.doubleIn,
      doubleOut: this.settings.doubleOut,
      bestOfLegs: this.settings.bestOfLegs,
      bestOfSets: this.settings.bestOfSets,
      alternateStart: this.settings.alternateStart,
      setsA: this.players[0].sets,
      setsB: this.players[1].sets,
      winner: this.winner !== null ? this.players[this.winner].name : ""
    };
  }
}

function showView(id){
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  const el = $(id);
  if(el) el.classList.add("active");
}

function showWinnerScreen(winnerIdx){
  const e = App.engine;
  if(!e || winnerIdx === null || winnerIdx === undefined) return;

  const winnerName = e.players[winnerIdx]?.name || "VINNARE";
  const side = winnerIdx === 0 ? "A" : "B";
  const p = getSidePlayer(side);

  const img = $("winnerPortrait");
  if(img){
    img.src = (p && p.img) ? p.img : "";
    img.style.display = img.src ? "block" : "none";
  }
  const nameEl = $("winnerName");
  if(nameEl) nameEl.textContent = winnerName;

  showView("winner");
}

function toast(msg){
  const t = $("toast");
  if(!t) return;
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => (t.hidden = true), 1400);
}

function buildKeypad(){
  const keypad = $("keypad");
  if(!keypad) return;
  keypad.innerHTML = "";
  for(let n=1; n<=20; n++){
    const cell = document.createElement("div");
    cell.className = "dartCell";
    cell.dataset.value = String(n);

    const zT = document.createElement("div");
    zT.className = "zone t";
    zT.textContent = "T" + n;

    const zS = document.createElement("div");
    zS.className = "zone s";
    zS.textContent = String(n);

    const zD = document.createElement("div");
    zD.className = "zone d";
    zD.textContent = "D" + n;

    cell.append(zT, zS, zD);
    keypad.append(cell);
  }
}

const App = {
  engine: null,
  turn: [],
  carIndexA: 0,
  carIndexB: 1,

  resetTurn(){
    this.turn = [];
    this.renderTurn();
  },

  addDart(d){
    if(this.turn.length >= 3) return;
    this.turn.push(d);
    this.renderTurn();
  },

  undoDart(){
    if(this.turn.length){
      this.turn.pop();
      this.renderTurn();
    }
  },

  renderTurn(){
    const td = $("turnDarts");
    const tp = $("turnPoints");
    if(td) td.textContent = this.turn.length ? this.turn.join(" ") : "(tom)";

    let pts = 0;
    try{
      for(const d of this.turn){
        pts += parseDart(d).points;
      }
    }catch{
      pts = 0;
    }
    if(tp) tp.textContent = String(pts);
  },

  renderScores(){
    const e = this.engine;
    if(!e) return;
    const a = e.players[0], b = e.players[1];

    $("nameA").textContent = a.name;
    $("nameB").textContent = b.name;
    $("scoreA").textContent = String(a.score);
    $("scoreB").textContent = String(b.score);

    // Portraits from carousel selection
    const pA = $("portraitA");
    const pB = $("portraitB");
    const pa = getSidePlayer("A");
    const pb = getSidePlayer("B");
    if(pA && pa) { pA.src = pa.img; pA.style.display = "block"; }
    if(pB && pb) { pB.src = pb.img; pB.style.display = "block"; }

    // HP bars = remaining score percentage
    const start = e.settings.startScore;
    const pctA = start > 0 ? clamp((a.score / start) * 100, 0, 100) : 0;
    const pctB = start > 0 ? clamp((b.score / start) * 100, 0, 100) : 0;

    const hpA = $("hpA");
    const hpB = $("hpB");

    if(hpA){
      hpA.style.width = pctA + "%";
      hpA.classList.toggle("critical", pctA <= 20);
      const finishA = canCheckoutInThree(a.score, e.settings.doubleOut) && (!e.settings.doubleIn || a.isIn);
      hpA.classList.toggle("checkout", finishA);
      if(hpA.parentElement) hpA.parentElement.style.display = "block";
    }

    if(hpB){
      hpB.style.width = pctB + "%";
      hpB.classList.toggle("critical", pctB <= 20);
      const finishB = canCheckoutInThree(b.score, e.settings.doubleOut) && (!e.settings.doubleIn || b.isIn);
      hpB.classList.toggle("checkout", finishB);
      if(hpB.parentElement) hpB.parentElement.style.display = "block";
    }

    $("inA").textContent = e.settings.doubleIn ? (a.isIn ? "(inne)" : "(ej inne)") : "";
    $("inB").textContent = e.settings.doubleIn ? (b.isIn ? "(inne)" : "(ej inne)") : "";

    const s = e.getScoreline();
    const currentP = e.players[s.currentPlayer];
    const suggestion = getCheckoutSuggestionText(currentP.score, e.settings, currentP.isIn);

    const mid =
      `Set: ${s.setNo} / ${e.settings.bestOfSets}\n` +
      `Leg: ${s.legNoInSet} / ${e.settings.bestOfLegs}\n` +
      `Legs i set: ${s.legsInSet[0]} - ${s.legsInSet[1]}\n` +
      `Sets: ${s.sets[0]} - ${s.sets[1]}\n` +
      `Tur: ${currentP.name}\n` +
      (suggestion ? `Utgång: ${suggestion}` : `Utgång: —`);

    $("midInfo").textContent = mid;
  },

  commitTurn(){
    const e = this.engine;
    if(!e || !this.turn.length) return;

    let res;
    try{
      res = e.applyTurn(this.turn);
    }catch(err){
      alert(String(err?.message || err));
      return;
    }

    // SFX triggers (priority: checkout > bust > score>100)
    if(res.checkout){
      playSfx(SFX.win);
    } else if(res.bust){
      playSfx(SFX.bust);
    } else if(res.pointsCounted > 100){
      playSfx(SFX.score100);
    }

    const msgs = [];
    if(res.becameIn) msgs.push("DOUBLE-IN!");
    if(res.bust) msgs.push("BUST");
    if(res.checkout) msgs.push("CHECKOUT!");
    if(msgs.length) toast(msgs.join(" / "));

    this.resetTurn();
    this.renderScores();

    if(e.isFinished()){
      const save = $("saveLocal")?.checked;
      if(save){
        saveMatchToLocal(e.matchSummary());
      }
      showWinnerScreen(e.winner);
    }
  },

  undoLastTurn(){
    const e = this.engine;
    if(!e) return;
    const ok = e.undoLastTurn();
    if(!ok){
      toast("Ingen tur att ångra.");
      return;
    }
    this.resetTurn();
    this.renderScores();
  }
};

function readSettings(){
  const startScore = parseInt($("startScore").value, 10);
  const bestOfLegs = parseInt($("bestOfLegs").value, 10);
  const bestOfSets = parseInt($("bestOfSets").value, 10);
  return {
    startScore,
    doubleIn: $("doubleIn").checked,
    doubleOut: $("doubleOut").checked,
    bestOfLegs,
    bestOfSets,
    alternateStart: $("alternateStart").checked
  };
}

function saveMatchToLocal(summary){
  const key = "dart_scorer_history";
  const now = new Date().toISOString();
  const item = { ...summary, at: now };
  const existing = JSON.parse(localStorage.getItem(key) || "[]");
  existing.unshift(item);
  localStorage.setItem(key, JSON.stringify(existing.slice(0, 50)));
}

function wireUI(){
  buildKeypad();

  // Keypad zones (T/S/D) for 1–20
  const keypad = $("keypad");
  if(keypad){
    keypad.addEventListener("click", (ev) => {
      const zone = ev.target.closest(".zone");
      const cell = ev.target.closest(".dartCell");
      if(!zone || !cell) return;

      const n = Number(cell.dataset.value || "0");
      if(!Number.isFinite(n) || n < 1 || n > 20) return;

      let mult = 1;
      if(zone.classList.contains("t")) mult = 3;
      else if(zone.classList.contains("d")) mult = 2;

      const m = (mult === 3 ? "T" : (mult === 2 ? "D" : "S"));
      App.addDart(m + String(n));
    });
  }

  // Special buttons: SB / DB / MISS
  document.querySelectorAll(".btn.special").forEach((b) => {
    b.addEventListener("click", () => {
      const s = b.getAttribute("data-special");
      if(s === "SB") App.addDart("SB");
      else if(s === "DB") App.addDart("DB");
      else App.addDart("MISS");
    });
  });

  // Home start (start.png) + fullscreen prompt
  const homeStart = $("btnNewMatch");
  if(homeStart){
    homeStart.addEventListener("click", () => {
      // Play start SFX on first user gesture
      playSfx(SFX.start);

      const modal = $("fsModal");
      const yes = $("fsYes");
      const no = $("fsNo");

      const proceed = () => {
        App.carIndexA = 0; // Ludvig
        App.carIndexB = 1; // Emelie
        showSetupStep("players");
        renderCarousel("A");
        renderCarousel("B");
        showView("setup");
      };

      const canFS = !!document.documentElement.requestFullscreen;

      if(!modal || !yes || !no || !canFS){
        proceed();
        return;
      }

      modal.hidden = false;

      const cleanup = () => {
        modal.hidden = true;
        yes.onclick = null;
        no.onclick = null;
      };

      no.onclick = () => { cleanup(); proceed(); };

      yes.onclick = async () => {
        cleanup();
        try{
          if(!document.fullscreenElement){
            await document.documentElement.requestFullscreen();
          }
        }catch(e){
          // user denied fullscreen; continue anyway
        }
        proceed();
      };
    });
  }

  // Setup navigation
  const backHome = $("btnBackHome");
  if(backHome) backHome.addEventListener("click", () => showView("home"));

  const nextSettings = $("btnNextSettings");
  if(nextSettings){
    nextSettings.addEventListener("click", () => {
      const a = getPlayerNameForSide("A");
      const b = getPlayerNameForSide("B");
      if(!a || !b || a.toLowerCase() === b.toLowerCase()){
        alert("Välj två olika spelare (A och B).");
        return;
      }
      showSetupStep("settings");
    });
  }

  const backPlayers = $("btnBackPlayers");
  if(backPlayers) backPlayers.addEventListener("click", () => showSetupStep("players"));

  const startMatch = $("btnStartMatch");
  if(startMatch){
    startMatch.addEventListener("click", () => {
      const p1 = getPlayerNameForSide("A");
      const p2 = getPlayerNameForSide("B");
      if(!p1 || !p2 || p1.toLowerCase() === p2.toLowerCase()){
        alert("Välj två olika spelare (A och B).");
        showSetupStep("players");
        return;
      }
      const settings = readSettings();
      App.engine = new MatchEngine(p1, p2, settings);
      App.resetTurn();
      App.renderScores();
      showView("play");
    });
  }

  // Carousel buttons
  const prevA = $("carPrevA"), nextA = $("carNextA");
  const prevB = $("carPrevB"), nextB = $("carNextB");
  if(prevA) prevA.addEventListener("click", () => stepCarousel("A", -1));
  if(nextA) nextA.addEventListener("click", () => stepCarousel("A", +1));
  if(prevB) prevB.addEventListener("click", () => stepCarousel("B", -1));
  if(nextB) nextB.addEventListener("click", () => stepCarousel("B", +1));

  // Play controls
  const btnUndoDart = $("btnUndoDart");
  if(btnUndoDart) btnUndoDart.addEventListener("click", () => App.undoDart());

  const btnClearTurn = $("btnClearTurn");
  if(btnClearTurn) btnClearTurn.addEventListener("click", () => App.resetTurn());

  const btnCommit = $("btnCommit");
  if(btnCommit) btnCommit.addEventListener("click", () => App.commitTurn());

  const btnUndoTurn = $("btnUndoTurn");
  if(btnUndoTurn) btnUndoTurn.addEventListener("click", () => App.undoLastTurn());

  const btnEnd = $("btnEndToMenu");
  if(btnEnd){
    btnEnd.addEventListener("click", () => {
      App.engine = null;
      App.turn = [];
      showView("home");
    });
  }

  // WINNER: newgame.png button -> refresh
  const btnNewGameWinner = $("btnNewGameWinner");
  if(btnNewGameWinner){
    btnNewGameWinner.addEventListener("click", () => location.reload());
  }

  // Optional keyboard support on winner screen (Enter/Space/Escape -> refresh)
  document.addEventListener("keydown", (ev) => {
    const winnerActive = $("winner")?.classList.contains("active");
    if(!winnerActive) return;
    if(ev.key === "Enter" || ev.key === " " || ev.key === "Escape"){
      location.reload();
    }
  });

  // Initial carousel defaults so no broken images
  try{
    renderCarousel("A");
    renderCarousel("B");
  }catch(e){}
}

wireUI();
