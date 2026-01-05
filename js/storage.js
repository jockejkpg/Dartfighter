const KEY = "ejdedart:save:v1";

export function saveGame(state){
  try{
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  }catch{
    return false;
  }
}

export function loadGame(){
  try{
    const raw = localStorage.getItem(KEY);
    if(!raw) return null;
    return JSON.parse(raw);
  }catch{
    return null;
  }
}

export function clearSave(){
  try{ localStorage.removeItem(KEY); }catch{}
}
