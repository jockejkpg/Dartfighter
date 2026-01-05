// Simple checkout generator for up to 3 darts.
// Uses brute-force search over reasonable dart outcomes.
// Returns array of sequences (best first): [{darts:[Dart,...], total}]
//
// Dart: { kind: 'S'|'D'|'T'|'BULL', num?:number, value:number, label:string }

const singles = Array.from({length:20}, (_,i)=>i+1).map(n=>mk('S', n, n, String(n)));
const doubles = Array.from({length:20}, (_,i)=>i+1).map(n=>mk('D', n, 2*n, `D${n}`));
const triples = Array.from({length:20}, (_,i)=>i+1).map(n=>mk('T', n, 3*n, `T${n}`));
const bulls = [ mk('BULL', 25, 25, 'Outer'), mk('BULL', 50, 50, 'Inner') ];

// For search space: allow all singles/doubles/triples + bulls
const ALL = [...singles, ...doubles, ...triples, ...bulls];

// For last dart in Double Out: doubles + inner bull
const LAST_DOUBLE_OUT = [...doubles, bulls[1]];
const LAST_MASTER_OUT = [...doubles, ...triples, bulls[1]];
const LAST_STRAIGHT_OUT = ALL;

function mk(kind, num, value, label){
  return { kind, num, value, label };
}

function lastSet(outRule){
  if(outRule === 'straight') return LAST_STRAIGHT_OUT;
  if(outRule === 'double') return LAST_DOUBLE_OUT;
  return LAST_MASTER_OUT;
}

function scoreComplexity(d){
  // Prefer higher scores early (fewer darts), and prefer common finishes (D20, D16, D10).
  const prefDoubles = new Set([20,16,18,10,12,8,6,4,2]);
  let c = 0;
  if(d.kind === 'T') c += 2;
  if(d.kind === 'BULL' && d.value === 50) c += 1;
  if(d.kind === 'D' && prefDoubles.has(d.num)) c -= 0.5;
  // avoid tiny singles when possible
  if(d.kind === 'S' && d.value <= 5) c += 1.5;
  return c;
}

function seqCost(seq){
  // lower is better
  const dartCosts = seq.reduce((a,d)=>a + scoreComplexity(d), 0);
  const dartsUsed = seq.length;
  // fewer darts is better
  return dartsUsed * 4 + dartCosts;
}

export function getCheckoutSuggestions(remaining, outRule){
  if(remaining <= 1) return [];
  if(outRule === 'double' && remaining === 1) return [];
  // typical maximum for 3-dart checkout is 170, but bull routes exist; keep it general and search anyway.
  const results = [];
  const last = lastSet(outRule);

  // 1 dart
  for(const d3 of last){
    if(d3.value === remaining){
      results.push({darts:[d3], total: remaining});
    }
  }

  // 2 darts
  for(const d2 of ALL){
    for(const d3 of last){
      if(d2.value + d3.value === remaining){
        results.push({darts:[d2,d3], total: remaining});
      }
    }
  }

  // 3 darts
  for(const d1 of ALL){
    for(const d2 of ALL){
      for(const d3 of last){
        if(d1.value + d2.value + d3.value === remaining){
          results.push({darts:[d1,d2,d3], total: remaining});
        }
      }
    }
  }

  // Deduplicate by labels
  const key = r => r.darts.map(d=>d.label).join(" ");
  const seen = new Set();
  const unique = [];
  for(const r of results){
    const k = key(r);
    if(seen.has(k)) continue;
    seen.add(k);
    unique.push(r);
  }

  unique.sort((a,b)=> seqCost(a.darts) - seqCost(b.darts));
  return unique.slice(0, 3);
}
