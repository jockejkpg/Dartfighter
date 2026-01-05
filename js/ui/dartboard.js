import { el } from "../util.js";

export function buildDartGrid(onNumberClick){
  const grid = el("div", { class:"dart-grid card", role:"group", "aria-label":"Dart nummer 1 till 20" });
  for(let n=1;n<=20;n++){
    grid.appendChild(el("button", {
      class:"dart-circle",
      type:"button",
      "aria-label":`Nummer ${n}`,
      onclick: ()=> onNumberClick(n)
    }, String(n)));
  }
  return grid;
}

export function buildActions({onOuter, onInner, onMiss}){
  const row = el("div", { class:"dart-actions" },
    el("button", { class:"pill", type:"button", onclick:onOuter },
      el("span", { class:"dot green", "aria-hidden":"true" }), "Outer"
    ),
    el("button", { class:"pill", type:"button", onclick:onInner },
      el("span", { class:"dot red", "aria-hidden":"true" }), "Inner"
    ),
    el("button", { class:"pill", type:"button", onclick:onMiss },
      el("span", { class:"miss-x", "aria-hidden":"true" }), "Miss"
    )
  );
  return row;
}

export function buildMultiplierModal({onPick, onUndo, onClose}){
  const overlay = el("div", { class:"modal-overlay", id:"multOverlay", "aria-hidden":"true" });
  const modal = el("div", { class:"modal", role:"dialog", "aria-modal":"true", "aria-label":"Välj multiplikator" });

  const title = el("div", { class:"modal-title", id:"multTitle" }, "Valt: —");
  const sub = el("div", { class:"modal-sub", id:"multSub" }, "Välj 1X/2X/3X");

  const grid = el("div", { class:"mult-grid" },
    el("button", { class:"mult-choice", type:"button", "data-m":"1" }, "1X"),
    el("button", { class:"mult-choice", type:"button", "data-m":"2" }, "2X"),
    el("button", { class:"mult-choice", type:"button", "data-m":"3" }, "3X"),
  );

  const undo = el("button", { class:"btn ghost", type:"button", id:"multUndo" }, "↩ Undo");

  modal.append(title, sub, grid, el("div", { class:"divider" }), undo);
  overlay.appendChild(modal);

  // interactions
  overlay.addEventListener("click", (e)=>{
    if(e.target === overlay){ onClose(); }
  });
  window.addEventListener("keydown", (e)=>{
    if(e.key === "Escape" && overlay.classList.contains("open")) onClose();
  });
  grid.querySelectorAll(".mult-choice").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const m = Number(btn.getAttribute("data-m"));
      onPick(m);
    });
  });
  undo.addEventListener("click", ()=> onUndo());

  return {
    overlay,
    open(number){
      title.textContent = `Valt: ${number}`;
      sub.textContent = `Välj multiplikator för ${number}`;
      grid.querySelectorAll(".mult-choice").forEach(btn=>{
        const m = btn.getAttribute("data-m");
        btn.textContent = `${m}X${number}`;
      });
      overlay.classList.add("open");
      overlay.setAttribute("aria-hidden","false");
      document.body.classList.add("modal-open");
    },
    close(){
      overlay.classList.remove("open");
      overlay.setAttribute("aria-hidden","true");
      document.body.classList.remove("modal-open");
    },
    isOpen(){ return overlay.classList.contains("open"); }
  };
}
