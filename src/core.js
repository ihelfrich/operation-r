/* ---------- core utilities ---------- */
const { M, CAP, OUT, LAB } = window.DATA;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/* R-style syntax highlighting */
function hl(src){
  const re = /(#[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b\d+(?:\.\d+)?(?:e\d+)?L?\b)|(\b(?:TRUE|FALSE|NA|NULL|Inf|NaN|function|if|else|for|while|in|library|return)\b)|(%[^%\s]*%|\|>|<-)|([A-Za-z_.][A-Za-z0-9_.]*)(?=\s*\()|([A-Za-z_.][A-Za-z0-9_.]*)(?=\s*=[^=])/g;
  let out = "", last = 0, m;
  while ((m = re.exec(src))) {
    out += esc(src.slice(last, m.index));
    const c = m[1] ? "c" : m[2] ? "s" : m[3] ? "n" : m[4] ? "k" : m[5] ? "o" : m[6] ? "f" : "a";
    out += `<span class="tk-${c}">${esc(m[0])}</span>`; last = re.lastIndex;
  }
  return out + esc(src.slice(last));
}

/* R-style vector printing (width 60, like the recorded outputs) */
function fmtNums(arr){
  let dec = 0;
  for (const v of arr) {
    if (v === null || !isFinite(v)) continue;
    const s = +(+v).toPrecision(7);
    for (let d = 0; d <= 7; d++) if (Math.abs(+s.toFixed(d) - s) < 1e-9 * Math.max(1, Math.abs(s))) { dec = Math.max(dec, d); break; }
  }
  return arr.map(v => v === null ? "NA" : Number.isNaN(v) ? "NaN" : !isFinite(v) ? (v > 0 ? "Inf" : "-Inf") : (+v).toFixed(dec));
}
function fmtVals(vals, type){
  if (type === "chr") return vals.map(v => v === null ? "NA" : JSON.stringify(v));
  if (type === "lgl") return vals.map(v => v === null ? "NA" : v ? "TRUE" : "FALSE");
  return fmtNums(vals);
}
function printVec(vals, type, names = null, width = 60){
  if (!vals.length) return type === "chr" ? "character(0)" : type === "lgl" ? "logical(0)" : "numeric(0)";
  const s = fmtVals(vals, type);
  if (names) {
    const nm = names.map(n => n === null ? "<NA>" : n);
    const w = Math.max(...nm.map(x => x.length), ...s.map(x => x.length));
    const per = Math.max(1, Math.floor(width / (w + 1))), lines = [];
    for (let i = 0; i < s.length; i += per) {
      lines.push(nm.slice(i, i + per).map(x => x.padStart(w)).join(" ") + " ");
      lines.push(s.slice(i, i + per).map(x => x.padStart(w)).join(" ") + " ");
    }
    return lines.join("\n");
  }
  const w = Math.max(...s.map(x => x.length)), lab = `[${s.length}]`.length;
  const per = Math.max(1, Math.floor((width - lab) / (w + 1))), lines = [];
  for (let i = 0; i < s.length; i += per)
    lines.push(`[${i + 1}]`.padStart(lab) + s.slice(i, i + per).map(x => " " + (type === "chr" ? x.padEnd(w) : x.padStart(w))).join(""));
  return lines.join("\n");
}
const con = (lines) => `<div class="console">${lines.map(([t, x]) => `<pre class="${t}">${esc(x)}</pre>`).join("")}</div>`;

/* ---------- saved progress and the take ---------- */
let SAVE = { jobs: {}, quiz: {}, peek: {} };
try { SAVE = Object.assign(SAVE, JSON.parse(localStorage.getItem("operationR") || "{}")); } catch (e) {}
const persist = () => { try { localStorage.setItem("operationR", JSON.stringify(SAVE)); } catch (e) {} };
const ALLJOBS = [...M.flatMap(m => m.jobs.map((j, i) => ({ ...j, id: `${m.id}_j${i}`, m }))), ...CAP.jobs.map((j, i) => ({ ...j, id: `final_j${i}`, m: CAP }))];
const MAXTAKE = ALLJOBS.reduce((a, j) => a + j.pay, 0);
function takeTotal(){ return ALLJOBS.reduce((a, j) => a + (SAVE.jobs[j.id] ? j.pay * (SAVE.peek[j.id] ? 0.5 : 1) : 0), 0); }
function rankOf(t){ const f = t / MAXTAKE; return f >= .9 ? "Mastermind" : f >= .65 ? "Inside Man" : f >= .4 ? "Safecracker" : f >= .15 ? "Wheelman" : "Rookie"; }
let shownTake = takeTotal();
function updateTake(animate = true){
  const target = takeTotal(), el = $("#take-amt"), rk = $("#take-rank");
  if (rk) rk.textContent = rankOf(target);
  if (!el) return;
  if (!animate || REDUCED) { shownTake = target; el.textContent = `$${target.toFixed(1)}M`; return; }
  const from = shownTake, t0 = performance.now();
  const step = t => { const k = Math.min(1, (t - t0) / 900), e = 1 - Math.pow(1 - k, 3); shownTake = from + (target - from) * e; el.textContent = `$${shownTake.toFixed(1)}M`; if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function jobsDone(m){ const ids = m.jobs.map((_, i) => `${m.id}_j${i}`); return [ids.filter(i => SAVE.jobs[i]).length, ids.length]; }

/* ---------- effects: coins, alarm, toast, vault doors ---------- */
const FX = { parts: [], raf: 0 };
function fxCanvas(){
  let c = $("#fx");
  if (!c) { c = document.createElement("canvas"); c.id = "fx"; document.body.appendChild(c); }
  const dpr = devicePixelRatio || 1; c.width = innerWidth * dpr; c.height = innerHeight * dpr; c.style.width = innerWidth + "px"; c.style.height = innerHeight + "px";
  return c;
}
function coinBurst(x, y, n = 46){
  if (REDUCED) return;
  const c = fxCanvas(), ctx = c.getContext("2d"), dpr = devicePixelRatio || 1;
  for (let i = 0; i < n; i++) FX.parts.push({ x, y, vx: (Math.random() - .5) * 13, vy: -Math.random() * 15 - 5, r: 5 + Math.random() * 5, a: Math.random() * 6, va: (Math.random() - .5) * .4, life: 150 + Math.random() * 50, bounce: 0 });
  if (FX.raf) return;
  const floor = innerHeight - 8;
  const tick = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, innerWidth, innerHeight);
    FX.parts = FX.parts.filter(p => p.life > 0);
    for (const p of FX.parts) {
      p.vy += .55; p.x += p.vx; p.y += p.vy; p.a += p.va; p.life--;
      if (p.y > floor - p.r && p.vy > 0) { p.y = floor - p.r; p.vy *= -.55; p.vx *= .8; p.bounce++; }
      const sq = Math.abs(Math.cos(p.a));
      ctx.globalAlpha = Math.min(1, p.life / 40);
      ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r * Math.max(.15, sq), p.r, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#F4C35A"; ctx.fill(); ctx.strokeStyle = "#A87A12"; ctx.lineWidth = 1.2; ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (FX.parts.length) FX.raf = requestAnimationFrame(tick); else { FX.raf = 0; ctx.clearRect(0, 0, innerWidth, innerHeight); }
  };
  FX.raf = requestAnimationFrame(tick);
}
function alarm(el){
  if (el) { el.classList.remove("alarm"); void el.offsetWidth; el.classList.add("alarm"); setTimeout(() => el.classList.remove("alarm"), 900); }
  if (REDUCED) return;
  let a = $(".alarm-flash"); if (!a) { a = document.createElement("div"); a.className = "alarm-flash"; document.body.appendChild(a); }
  a.classList.remove("on"); void a.offsetWidth; a.classList.add("on");
}
function toast(msg){ const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2700); }
async function vaultDoors(label, swap){
  if (REDUCED) { swap(); return; }
  let d = $(".doors");
  if (!d) { d = document.createElement("div"); d.className = "doors"; d.innerHTML = `<div class="half l"></div><div class="dial"></div><div class="half r"></div>`; document.body.appendChild(d); }
  const dial = $(".dial", d); dial.textContent = label; dial.classList.remove("spin");
  d.classList.remove("open"); void d.offsetWidth; d.classList.add("shut");
  await sleep(400); swap(); dial.classList.add("spin"); await sleep(520);
  d.classList.remove("shut"); d.classList.add("open"); await sleep(650); d.classList.remove("open");
}
