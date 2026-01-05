import { getRouteFromHash, Routes, nav } from "./router.js";
import { el, shuffle } from "./util.js";
import { defaultSettings, defaultPlayers, createNewMatch } from "./state.js";
import { renderSetup } from "./views/setup.js";
import { renderPlayers } from "./views/players.js";
import { renderGame } from "./views/game.js";
import { loadGame, saveGame, clearSave } from "./storage.js";

const app = document.getElementById("app");

// global state (simple)
let state = {
  setup: defaultSettings(),
  playerCount: 2,
  players: defaultPlayers(2),
  match: null
};

const toastEl = el("div", { class:"toast", id:"toast" });
document.body.appendChild(toastEl);

function toast(msg){
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(()=> toastEl.classList.remove("show"), 1600);
}

function setState(next){
  state = next;
  render();
}

function startMatch(){
  // Resume existing?
  const settings = state.setup || defaultSettings();
  const players = state.players || defaultPlayers(state.playerCount||2);

  let order = players.map(p=>p.id);
  if(settings.startOrderMode === "coin"){
    order = shuffle(order);
    const starterId = order[0];
    showCoinToss(players.find(p=>p.id===starterId)?.name || "Spelare", ()=> {
      const match = createNewMatch(settings, players);
      match.order = order;
      match.currentIndex = 0;
      match.turn.startScore = match.scores[starterId];
      setState({ ...state, match });
      saveGame(state);
      nav(Routes.GAME);
    });
    return;
  }

  const match = createNewMatch(settings, players);
  match.order = order;
  match.currentIndex = 0;
  match.turn.startScore = match.scores[order[0]];
  setState({ ...state, match });
  saveGame(state);
  nav(Routes.GAME);
}

function showCoinToss(name, onContinue){
  const overlay = el("div", { class:"modal-overlay open", "aria-hidden":"false" });
  const modal = el("div", { class:"modal" },
    el("div", { class:"modal-title" }, "Coin toss"),
    el("div", { class:"modal-sub" }, `Startspelare: ${name}`),
    el("div", { class:"divider" }),
    el("button", { class:"btn primary", type:"button", onclick: ()=> { overlay.remove(); onContinue(); }}, "Börja")
  );
  overlay.appendChild(modal);
  overlay.addEventListener("click", (e)=>{ if(e.target===overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

function maybeResume(){
  const saved = loadGame();
  if(saved?.match){
    const overlay = el("div", { class:"modal-overlay open", "aria-hidden":"false" });
    const modal = el("div", { class:"modal" },
      el("div", { class:"modal-title" }, "Återuppta match?"),
      el("div", { class:"modal-sub" }, "Du har en sparad match."),
      el("div", { class:"divider" }),
      el("button", { class:"btn primary", type:"button", onclick: ()=> {
        overlay.remove();
        state = saved;
        nav(Routes.GAME);
        render();
      }}, "Fortsätt"),
      el("button", { class:"btn", type:"button", style:"margin-top:10px;", onclick: ()=> {
        overlay.remove();
        clearSave();
        toast("Sparning rensad.");
        render();
      }}, "Ny match")
    );
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }
}

function render(){
  const route = getRouteFromHash();
  app.replaceChildren();

  let view;
  if(route === Routes.SETUP){
    view = renderSetup({ state, setState, toast });
  }else if(route === Routes.PLAYERS){
    view = renderPlayers({ state, setState, startMatch, toast });
  }else if(route === Routes.GAME){
    if(!state.match){
      nav(Routes.SETUP);
      return;
    }
    view = renderGame({ state, setState, toast });
  }else{
    nav(Routes.SETUP);
    return;
  }

  app.appendChild(view);
}

// Service worker
if("serviceWorker" in navigator){
  window.addEventListener("load", async ()=>{
    try{
      await navigator.serviceWorker.register("./service-worker.js");
    }catch{ /* ignore */ }
  });
}

window.addEventListener("hashchange", render);

// First render
render();
maybeResume();
