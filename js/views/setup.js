import { el, formatInRule, formatOutRule } from "../util.js";
import { nav, Routes } from "../router.js";
import { defaultSettings } from "../state.js";

export function renderSetup({state, setState, toast}){
  const s = state.setup || defaultSettings();

  function update(patch){
    const next = { ...s, ...patch };
    setState({ ...state, setup: next });
  }

  const root = el("div", { class:"main" });

  const top = el("div", { class:"card topbar" },
    el("div", { class:"stack" },
      el("div", { class:"title" }, "EjdEdart"),
      el("div", { class:"subtitle" }, "Setup 1/2 • Välj spel")
    ),
    el("button", { class:"btn ghost", type:"button", onclick: ()=> {
      // quick reset to defaults
      setState({ ...state, setup: defaultSettings() });
      toast("Återställt till standard.");
    }}, "Återställ")
  );

  // Game type 301/501
  const seg = el("div", { class:"seg" },
    el("button", {
      class:"seg-btn",
      type:"button",
      "aria-pressed": String(s.startScore===301),
      onclick: ()=> update({startScore:301})
    }, "301"),
    el("button", {
      class:"seg-btn",
      type:"button",
      "aria-pressed": String(s.startScore===501),
      onclick: ()=> update({startScore:501})
    }, "501")
  );

  const step = (label, value, min, max, onChange) => el("div", { class:"field" },
    el("div", { class:"label" }, label),
    el("div", { class:"stepper" },
      el("button", { class:"icon-btn", type:"button", onclick: ()=> onChange(Math.max(min, value-1)) }, "–"),
      el("div", { class:"value" }, String(value)),
      el("button", { class:"icon-btn", type:"button", onclick: ()=> onChange(Math.min(max, value+1)) }, "+")
    )
  );

  const rulesCard = el("div", { class:"card", style:"padding:12px;" },
    el("div", { class:"stack" },
      el("div", { class:"label" }, "Speltyp"),
      seg,
      el("div", { class:"divider" }),
      el("div", { class:"row" },
        step("Antal set", s.setsToWin, 1, 9, (v)=>update({setsToWin:v})),
        step("Legs / set", s.legsPerSet, 1, 9, (v)=>update({legsPerSet:v})),
      ),
      el("div", { class:"divider" }),

      el("div", { class:"field" },
        el("div", { class:"label" }, `In-regel (${formatInRule(s.inRule)})`),
        el("div", { class:"seg", style:"grid-template-columns:1fr 1fr;" },
          el("button", { class:"seg-btn", type:"button", "aria-pressed": String(s.inRule==="straight"), onclick: ()=>update({inRule:"straight"}) }, "Straight"),
          el("button", { class:"seg-btn", type:"button", "aria-pressed": String(s.inRule==="double"), onclick: ()=>update({inRule:"double"}) }, "Double in"),
        )
      ),

      el("div", { class:"field" },
        el("div", { class:"label" }, `Ut-regel (${formatOutRule(s.outRule)})`),
        el("div", { class:"seg", style:"grid-template-columns:1fr 1fr 1fr;" },
          el("button", { class:"seg-btn", type:"button", "aria-pressed": String(s.outRule==="straight"), onclick: ()=>update({outRule:"straight"}) }, "Straight"),
          el("button", { class:"seg-btn", type:"button", "aria-pressed": String(s.outRule==="double"), onclick: ()=>update({outRule:"double"}) }, "Double out"),
          el("button", { class:"seg-btn", type:"button", "aria-pressed": String(s.outRule==="master"), onclick: ()=>update({outRule:"master"}) }, "Master out"),
        )
      ),

      el("div", { class:"divider" }),
      el("div", { class:"field" },
        el("div", { class:"label" }, "Matchbeteende"),
        el("div", { class:"seg", style:"grid-template-columns:1fr 1fr;" },
          el("button", { class:"seg-btn", type:"button", "aria-pressed": String(s.autoAdvance===true), onclick: ()=>update({autoAdvance:true}) }, "Auto (3 pilar)"),
          el("button", { class:"seg-btn", type:"button", "aria-pressed": String(s.autoAdvance===false), onclick: ()=>update({autoAdvance:false}) }, "Manuell"),
        ),
        el("div", { class:"row", style:"justify-content:space-between;margin-top:10px;" },
          el("div", { class:"label" }, "Checkout-förslag"),
          el("button", { class:"btn ghost", type:"button", onclick: ()=>update({showCheckout: !s.showCheckout}) },
            s.showCheckout ? "På" : "Av"
          )
        ),
        el("div", { class:"row", style:"justify-content:space-between;margin-top:6px;" },
          el("div", { class:"label" }, "Avsluta tur tidigt"),
          el("button", { class:"btn ghost", type:"button", onclick: ()=>update({allowEndTurnEarly: !s.allowEndTurnEarly}) },
            s.allowEndTurnEarly ? "På" : "Av"
          )
        ),
      ),
    )
  );

  const footer = el("div", { class:"footer" },
    el("button", { class:"btn primary", type:"button", onclick: ()=> nav(Routes.PLAYERS) }, "Nästa: Spelare")
  );

  root.append(top, rulesCard, footer);
  return root;
}
