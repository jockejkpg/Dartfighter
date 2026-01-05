import { clampInt } from "./util.js";

export const VERSION = "1.0.0";

export function defaultSettings(){
  return {
    startScore: 501,         // 301 or 501
    setsToWin: 1,            // number of sets in match
    legsPerSet: 3,           // legs required to win a set
    inRule: "straight",      // straight | double
    outRule: "double",       // straight | double | master
    autoAdvance: true,
    allowEndTurnEarly: true,
    showCheckout: true,
    startOrderMode: "coin",  // coin | p1
  };
}

export function defaultPlayers(count=2){
  const c = clampInt(count, 1, 4);
  return Array.from({length:c}, (_,i)=>({
    id: crypto.randomUUID?.() || String(Date.now()) + ":" + i,
    name: `Spelare ${i+1}`,
    colorIdx: i,
  }));
}

export function createNewMatch(settings, players){
  const startScore = settings.startScore;

  return {
    version: VERSION,
    createdAt: Date.now(),
    settings,
    players,
    order: players.map(p=>p.id), // will be rotated after coin toss
    currentIndex: 0,
    // per player score
    scores: Object.fromEntries(players.map(p=>[p.id, startScore])),
    // set/leg tracking
    setsWon: Object.fromEntries(players.map(p=>[p.id, 0])),
    legsWonInSet: Object.fromEntries(players.map(p=>[p.id, 0])),
    // turn tracking
    turn: {
      startScore: startScore,
      darts: [], // array of Dart objects for current turn
      turnTotal: 0
    },
    // history (for undo across turns)
    history: [], // entries: {type, payload}
    // status
    status: "playing", // playing | leg_over | set_over | match_over
    winnerId: null
  };
}
