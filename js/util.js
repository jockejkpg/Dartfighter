export function clampInt(v, min, max){
  const n = Math.floor(Number(v));
  if(Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

export function el(tag, attrs={}, ...children){
  const node = document.createElement(tag);
  for(const [k,val] of Object.entries(attrs || {})){
    if(k === "class") node.className = val;
    else if(k.startsWith("on") && typeof val === "function") node.addEventListener(k.slice(2), val);
    else if(k === "html") node.innerHTML = val;
    else if(val === true) node.setAttribute(k, "");
    else if(val !== false && val != null) node.setAttribute(k, String(val));
  }
  for(const ch of children){
    if(ch == null) continue;
    node.appendChild(typeof ch === "string" ? document.createTextNode(ch) : ch);
  }
  return node;
}

export function formatOutRule(outRule){
  if(outRule==="straight") return "Straight out";
  if(outRule==="double") return "Double out";
  return "Master out";
}

export function formatInRule(inRule){
  return inRule==="double" ? "Double in" : "Straight in";
}

export function sum(arr){ return arr.reduce((a,b)=>a+b,0); }

export function safeName(name, fallback){
  const n = (name||"").trim();
  return n.length ? n : fallback;
}

export function shuffle(arr){
  const a = [...arr];
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
