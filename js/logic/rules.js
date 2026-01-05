export function isValidFinish({outRule, lastDart}){
  if(!lastDart) return false;
  if(outRule === "straight") return true;
  if(outRule === "double"){
    // Double out: must finish on a double OR inner bull (50 counts as double bull)
    return lastDart.kind === "D" || (lastDart.kind === "BULL" && lastDart.value === 50);
  }
  // master out: double or triple or bull 50
  return lastDart.kind === "D" || lastDart.kind === "T" || (lastDart.kind === "BULL" && lastDart.value === 50);
}

export function isBust({outRule, startScore, newScore, lastDart, finished}){
  // finished indicates score reached exactly 0
  if(newScore < 0) return true;
  if(outRule === "double" && newScore === 1) return true; // impossible to finish on a double from 1
  if(finished && !isValidFinish({outRule, lastDart})) return true;
  return false;
}
