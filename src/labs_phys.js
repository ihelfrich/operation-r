/* ---------- physics labs (Matter.js) and canvas simulations ---------- */
const TYPE_COL = { num: ["rgba(98,210,245,.22)", "#62D2F5"], chr: ["rgba(244,195,90,.22)", "#F4C35A"], lgl: ["rgba(183,160,255,.22)", "#B7A0FF"], na: ["rgba(255,92,99,.18)", "#FF5C63"] };
function stage(b, W, H){
  const wrap = document.createElement("div"); wrap.className = "stage";
  const c = document.createElement("canvas"); wrap.appendChild(c); b.appendChild(wrap);
  const dpr = Math.min(2, devicePixelRatio || 1); c.width = W * dpr; c.height = H * dpr; c.style.aspectRatio = `${W} / ${H}`;
  const ctx = c.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const S = { c, ctx, W, H, wrap, visible: true };
  new IntersectionObserver(es => { S.visible = es[0].isIntersecting; }, { rootMargin: "120px" }).observe(wrap);
  return S;
}
function physStage(b, W, H, { sleep = false, before = null, after = null } = {}){
  if (!window.Matter) { b.insertAdjacentHTML("beforeend", `<div class="phys-off">The physics engine couldn't load, probably no connection to cdnjs. Everything else on the page still works.</div>`); return null; }
  const { Engine, Composite, Bodies } = Matter, S = stage(b, W, H);
  S.engine = Engine.create({ enableSleeping: sleep }); S.world = S.engine.world;
  S.add = (...bs) => Composite.add(S.world, bs.flat()); S.remove = (...bs) => Composite.remove(S.world, bs.flat());
  S.wall = (x, y, w, h, o = {}) => { const bd = Bodies.rectangle(x, y, w, h, { isStatic: true, ...o }); bd.plugin = { fill: o.fill || "#1E4373", stroke: o.stroke || "#2E5A93" }; return bd; };
  S.box = (x, y, w, h, label, fill, stroke, o = {}) => { const bd = Bodies.rectangle(x, y, w, h, { chamfer: { radius: 6 }, restitution: .25, friction: .4, ...o }); bd.plugin = { fill, stroke, label, font: o.font || "600 13px IBM Plex Mono" }; return bd; };
  S.ball = (x, y, r, label, fill, stroke, o = {}) => { const bd = Bodies.circle(x, y, r, { restitution: .45, friction: .02, ...o }); bd.plugin = { fill, stroke, label, font: o.font || `700 ${Math.round(r)}px IBM Plex Mono` }; return bd; };
  S.tick = [];
  const ctx = S.ctx;
  const loop = () => {
    if (S.visible && document.visibilityState === "visible") {
      S.tick.forEach(f => f());
      Engine.update(S.engine, 1000 / 60);
      ctx.clearRect(0, 0, W, H);
      before && before(ctx);
      for (const bd of Composite.allBodies(S.world)) {
        const p = bd.plugin || {}; if (p.hidden) continue;
        ctx.beginPath();
        if (bd.circleRadius) ctx.arc(bd.position.x, bd.position.y, bd.circleRadius, 0, Math.PI * 2);
        else { const v = bd.vertices; ctx.moveTo(v[0].x, v[0].y); for (let i = 1; i < v.length; i++) ctx.lineTo(v[i].x, v[i].y); ctx.closePath(); }
        ctx.globalAlpha = p.alpha ?? 1;
        ctx.fillStyle = p.fill || "#1E4373"; ctx.fill();
        if (p.stroke) { ctx.lineWidth = p.lw || 1.5; ctx.strokeStyle = p.stroke; ctx.stroke(); }
        if (p.label !== undefined && p.label !== null) {
          ctx.save(); ctx.translate(bd.position.x, bd.position.y); ctx.rotate(bd.angle);
          ctx.fillStyle = p.ink || "#E8F1FC"; ctx.font = p.font; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          String(p.label).split("\n").forEach((ln, i, a) => ctx.fillText(ln, 0, (i - (a.length - 1) / 2) * 14));
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }
      after && after(ctx);
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  return S;
}

/* tiny R-ish evaluator for index expressions inside stash[ ] */
function evalIndex(src, stash){
  const toks = []; const re = /\s*(?:(\d+(?:\.\d+)?)|("(?:[^"\\]|\\.)*"|'[^']*')|([A-Za-z_.][A-Za-z0-9_.]*)|(==|!=|<=|>=|[-!&|:<>(),]))/y;
  let m, pos = 0; while (pos < src.length) { re.lastIndex = pos; m = re.exec(src); if (!m || m[0].length === 0) { if (/^\s*$/.test(src.slice(pos))) break; throw new Error(`unexpected input in "${src}"`); } pos = re.lastIndex; toks.push(m[1] ? { t: "num", v: +m[1] } : m[2] ? { t: "str", v: m[2].slice(1, -1) } : m[3] ? { t: "id", v: m[3] } : { t: "op", v: m[4] }); }
  let i = 0; const peek = () => toks[i], next = () => toks[i++], eat = v => { if (!peek() || peek().v !== v) throw new Error(`unexpected '${peek() ? peek().v : "end"}'`); i++; };
  const V = (t, v) => ({ t, v }), gen = (a, b) => ["lgl", "num", "chr"][Math.max(["lgl", "num", "chr"].indexOf(a), ["lgl", "num", "chr"].indexOf(b))];
  const conv = (x, t) => x.t === t ? x : V(t, x.v.map(v => v === null ? null : t === "chr" ? (x.t === "lgl" ? (v ? "TRUE" : "FALSE") : String(v)) : t === "num" ? (x.t === "lgl" ? +v : v) : v));
  const rec = (a, b, f, t) => { const n = Math.max(a.v.length, b.v.length); return V(t, Array.from({ length: n }, (_, k) => { const x = a.v[k % a.v.length], y = b.v[k % b.v.length]; return x === null || y === null ? null : f(x, y); })); };
  function prim(){
    const t = next(); if (!t) throw new Error("unexpected end of input");
    if (t.t === "num") return V("num", [t.v]); if (t.t === "str") return V("chr", [t.v]);
    if (t.t === "op" && t.v === "(") { const e = or(); eat(")"); return e; }
    if (t.t === "id") {
      if (["TRUE", "T"].includes(t.v)) return V("lgl", [true]); if (["FALSE", "F"].includes(t.v)) return V("lgl", [false]); if (t.v === "NA") return V("lgl", [null]);
      if (t.v === "stash") return V("num", stash.map(s => s[1]));
      if (peek() && peek().v === "(") { eat("("); const args = []; if (peek() && peek().v !== ")") { args.push(or()); while (peek() && peek().v === ",") { eat(","); args.push(or()); } } eat(")");
        if (t.v === "c") { if (!args.length) return V("lgl", []); const tt = args.reduce((a, x) => gen(a, x.t), "lgl"); return V(tt, args.flatMap(x => conv(x, tt).v)); }
        if (t.v === "names") return V("chr", stash.map(s => s[0])); if (t.v === "length") return V("num", [stash.length]);
        if (t.v === "which") return V("num", args[0].v.map((v, k) => v ? k + 1 : null).filter(v => v !== null));
        if (t.v === "rev") return V(args[0].t, [...args[0].v].reverse());
        throw new Error(`could not find function "${t.v}"`); }
      throw new Error(`object '${t.v}' not found`);
    }
    throw new Error(`unexpected '${t.v}'`);
  }
  function unary(){ if (peek() && peek().v === "-") { next(); const x = unary(); if (x.t === "chr") throw new Error("invalid argument to unary operator"); return V("num", conv(x, "num").v.map(v => v === null ? null : -v)); } return prim(); }
  function range(){ let a = unary(); if (peek() && peek().v === ":") { next(); const b = unary(); const s = a.v[0], e = b.v[0], out = []; for (let k = s; s <= e ? k <= e : k >= e; k += s <= e ? 1 : -1) out.push(k); a = V("num", out); } return a; }
  function cmp(){ let a = range(); const o = peek(); if (o && ["==", "!=", "<", ">", "<=", ">="].includes(o.v)) { next(); const b = range(); const t = gen(a.t, b.t); const A = conv(a, t), B = conv(b, t); const f = { "==": (x, y) => x === y, "!=": (x, y) => x !== y, "<": (x, y) => x < y, ">": (x, y) => x > y, "<=": (x, y) => x <= y, ">=": (x, y) => x >= y }[o.v]; return rec(A, B, f, "lgl"); } return a; }
  function not(){ if (peek() && peek().v === "!") { next(); const x = not(); return V("lgl", conv(x, "lgl").v.map(v => v === null ? null : !v)); } return cmp(); }
  function and(){ let a = not(); while (peek() && peek().v === "&") { next(); a = rec(a, not(), (x, y) => x && y, "lgl"); } return a; }
  function or(){ let a = and(); while (peek() && peek().v === "|") { next(); a = rec(a, and(), (x, y) => x || y, "lgl"); } return a; }
  const idx = or(); if (i < toks.length) throw new Error(`unexpected '${toks[i].v}'`);
  const n = stash.length;
  if (idx.t === "num") {
    const v = idx.v.filter(x => x !== 0);
    if (v.some(x => x < 0) && v.some(x => x > 0)) throw new Error("only 0's may be mixed with negative subscripts");
    if (v.some(x => x < 0)) { const drop = new Set(v.map(x => -Math.trunc(x) - 1)); return stash.map((_, k) => k).filter(k => !drop.has(k)); }
    return v.map(x => x === null ? null : (Math.trunc(x) <= n ? Math.trunc(x) - 1 : null));
  }
  if (idx.t === "lgl") { const L = Math.max(n, idx.v.length), out = []; for (let k = 0; k < L; k++) { const v = idx.v[k % idx.v.length]; if (v === null) out.push(null); else if (v) out.push(k < n ? k : null); } return out; }
  return idx.v.map(nm => { const k = stash.findIndex(s => s[0] === nm); return k < 0 ? null : k; });
}

LABS.crusher = () => {
  const [el, b] = labShell("Physics", "The coercion crusher", "Drop values into c( ), then press CRUSH. Everything gets pressed into the single most general type.");
  const items = [["1", 1, "num"], ["2.5", 2.5, "num"], ["TRUE", true, "lgl"], ["FALSE", false, "lgl"], ['"a"', "a", "chr"], ['"7"', "7", "chr"], ["NA", null, "lgl"]];
  b.innerHTML = `<div class="row">${items.map((it, i) => `<button class="chip" data-i="${i}">+ ${esc(it[0])}</button>`).join("")}<button class="btn primary" id="cr-go">CRUSH: c()</button><button class="btn" id="cr-rs">Clear</button></div>`;
  const W = 640, H = 300; let blocks = [], vals = [], press = null, crushed = false;
  const S = physStage(b, W, H, { after: ctx => { ctx.fillStyle = "#62D2F5"; ctx.font = "56px Saira Stencil One"; ctx.globalAlpha = .7; ctx.fillText("c(", 70, 250); ctx.fillText(")", 540, 250); ctx.globalAlpha = 1; } });
  b.insertAdjacentHTML("beforeend", `<div class="mini" id="cr-out">${con([["in", "Add a few blocks, then crush."]])}</div><p class="explain" id="cr-ex">Blocks are colored by type: <b style="color:#62D2F5">numeric</b>, <b style="color:#F4C35A">character</b>, <b style="color:#B7A0FF">logical</b>.</p>`);
  if (!S) return el;
  S.add(S.wall(320, 292, 380, 16), S.wall(138, 200, 14, 200), S.wall(502, 200, 14, 200));
  const lit = (v, t) => v === null ? "NA" : t === "chr" ? JSON.stringify(v) : t === "lgl" ? (v ? "TRUE" : "FALSE") : String(v);
  $$("[data-i]", b).forEach(ch => ch.onclick = () => {
    if (blocks.length >= 10) return;
    if (crushed) reset();
    const [txt, v, t] = items[+ch.dataset.i], col = v === null ? TYPE_COL.na : TYPE_COL[t];
    const bd = S.box(180 + Math.random() * 280, -20, 76, 32, txt, col[0], col[1]); bd.plugin.ink = col[1];
    blocks.push(bd); vals.push([v, t]); S.add(bd);
  });
  function reset(){ S.remove(blocks); if (press) S.remove(press); blocks = []; vals = []; press = null; crushed = false; $("#cr-out", b).innerHTML = con([["in", "Add a few blocks, then crush."]]); }
  $("#cr-rs", b).onclick = reset;
  $("#cr-go", b).onclick = async () => {
    if (!vals.length || crushed) return; crushed = true;
    press = S.box(320, -40, 350, 26, "PRESS", "#2C4870", "#8FA8C9", { density: .08, chamfer: { radius: 2 } }); S.add(press);
    await sleep(900);
    const T = vals.some(([v, t]) => t === "chr") ? "chr" : vals.some(([v, t]) => t === "num") ? "num" : "lgl";
    const out = vals.map(([v, t]) => v === null ? null : T === "chr" ? (t === "lgl" ? (v ? "TRUE" : "FALSE") : String(v)) : T === "num" ? (t === "lgl" ? +v : v) : v);
    blocks.forEach((bd, i) => { const v = out[i], col = v === null ? TYPE_COL.na : TYPE_COL[T]; bd.plugin.fill = col[0]; bd.plugin.stroke = col[1]; bd.plugin.ink = col[1]; bd.plugin.label = v === null ? "NA" : T === "chr" ? JSON.stringify(v) : T === "lgl" ? (v ? "TRUE" : "FALSE") : fmtNums([v])[0]; });
    const code = `c(${vals.map(([v, t]) => lit(v, t)).join(", ")})`;
    $("#cr-out", b).innerHTML = con([["in", "> " + code], ["out", printVec(out, T)], ["in", `> class(${code})`], ["out", `[1] "${{ chr: "character", num: "numeric", lgl: "logical" }[T]}"`]]);
    $("#cr-ex", b).innerHTML = T === "chr" ? "One string was enough: <b>everything became text</b>, and NA stays NA." : T === "num" ? "<b>No text, so numeric wins.</b> TRUE became 1 and FALSE became 0." : "Only logicals went in, so nothing changed type.";
    setTimeout(() => press && S.remove(press), 1400);
  };
  return el;
};

LABS.lootdrop = () => {
  const [el, b] = labShell("Physics", "The trapdoor", "Type any index into stash[ ] or pick a preset. Selected loot drops into the bag, in the order R returns it.");
  const stash = [["diamonds", 120], ["watches", 45], ["gold", 300], ["pearls", 95], ["art", 410], ["cash", 80]];
  const presets = ["2", "c(1, 3)", "-1", "-c(2, 4)", "c(TRUE, FALSE)", "stash > 100", '"gold"', 'c("art", "cash")', "c(3, 1, 1)", "7", "!(stash > 100)", "names(stash) != \"gold\""];
  b.innerHTML = `<div class="row"><span style="font-family:var(--f-mono)">stash[</span><input type="text" id="ld-in" value="stash > 100" style="flex:1;min-width:140px"><span style="font-family:var(--f-mono)">]</span><button class="btn primary" id="ld-go">▶ Drop</button></div>
    <div class="row" style="margin-top:8px">${presets.map(p => `<button class="chip" data-p="${esc(p)}">${esc(p)}</button>`).join("")}</div>`;
  const W = 640, H = 340; let spawned = [];
  const S = physStage(b, W, H, { after: ctx => { ctx.fillStyle = "#F4C35A"; ctx.font = "20px Saira Stencil One"; ctx.textAlign = "center"; ctx.fillText("THE BAG", 320, 318); ctx.textAlign = "start"; } });
  b.insertAdjacentHTML("beforeend", `<div class="mini" id="ld-out"></div>`);
  if (!S) return el;
  const crates = stash.map(([n, v], i) => { const c = S.wall(58 + i * 105, 64, 96, 54, { fill: "rgba(98,210,245,.14)", stroke: "#62D2F5" }); c.plugin.label = `${n}\n${v}  [${i + 1}]`; c.plugin.font = "600 12px IBM Plex Mono"; return c; });
  S.add(crates, S.wall(320, 300, 300, 14, { fill: "#3A2E12", stroke: "#F4C35A" }), S.wall(172, 240, 12, 130, { fill: "#3A2E12", stroke: "#F4C35A" }), S.wall(468, 240, 12, 130, { fill: "#3A2E12", stroke: "#F4C35A" }));
  async function go(){
    const src = $("#ld-in", b).value.trim(); S.remove(spawned); spawned = [];
    crates.forEach(c => { c.plugin.stroke = "#62D2F5"; c.plugin.fill = "rgba(98,210,245,.14)"; });
    let pos;
    try { pos = evalIndex(src, stash); }
    catch (e) { $("#ld-out", b).innerHTML = con([["in", `> stash[${src}]`], ["err", `Error: ${e.message}`]]); alarm(b.closest(".lab")); return; }
    const names = pos.map(k => k === null ? null : stash[k][0]), vals = pos.map(k => k === null ? null : stash[k][1]);
    $("#ld-out", b).innerHTML = con([["in", `> stash[${src}]`], ["out", pos.length ? printVec(vals, "num", names) : "named numeric(0)"]]);
    for (const k of pos) {
      let bd;
      if (k === null) { bd = S.box(320, -30, 90, 40, "NA", TYPE_COL.na[0], TYPE_COL.na[1]); bd.plugin.ink = "#FF5C63"; }
      else { const c = crates[k]; c.plugin.stroke = "#F4C35A"; c.plugin.fill = "rgba(244,195,90,.2)"; bd = S.box(c.position.x, c.position.y + 58, 90, 40, `${stash[k][0]}\n${stash[k][1]}`, "rgba(244,195,90,.25)", "#F4C35A", { font: "600 11px IBM Plex Mono" }); bd.plugin.ink = "#F4C35A"; }
      S.add(bd); spawned.push(bd); await sleep(REDUCED ? 0 : 220);
    }
  }
  $("#ld-go", b).onclick = go; $("#ld-in", b).onkeydown = e => { if (e.key === "Enter") go(); };
  $$("[data-p]", b).forEach(c => c.onclick = () => { $("#ld-in", b).value = c.dataset.p; go(); });
  setTimeout(go, 400); return el;
};

LABS.gumball = () => {
  const [el, b] = labShell("Physics", "The lottery machine: sample()", "Draw balls without replacement (each ball leaves the globe) or with replacement (a copy comes out and the ball stays in). Then replay the exact draws R made after set.seed(2718).");
  b.innerHTML = `<div class="row"><label class="f">size<select id="gb-n">${[1, 2, 3, 4, 5, 6, 8, 10].map(n => `<option ${n === 4 ? "selected" : ""}>${n}</option>`).join("")}</select></label>
    <button class="chip" id="gb-rep">replace = FALSE</button><button class="btn primary" id="gb-go">▶ sample(0:9, size)</button><button class="btn" id="gb-seed">Replay R's set.seed(2718)</button><button class="btn" id="gb-rs">Refill</button></div>`;
  const W = 640, H = 380, cx = 200, cy = 170, R = 130, cols = ["#62D2F5", "#F4C35A", "#B7A0FF", "#43D79A", "#FF8A5B", "#62D2F5", "#F4C35A", "#B7A0FF", "#43D79A", "#FF8A5B"];
  let rep = false, balls = [], tray = [], busy = false;
  const S = physStage(b, W, H, { before: ctx => { ctx.beginPath(); ctx.arc(cx, cy, R + 4, 0, Math.PI * 2); ctx.fillStyle = "rgba(98,210,245,.05)"; ctx.fill(); }, after: ctx => { ctx.fillStyle = "#8FA8C9"; ctx.font = "12px IBM Plex Mono"; ctx.fillText("tray: the draws, in order →", 360, 250); } });
  b.insertAdjacentHTML("beforeend", `<div class="mini" id="gb-out">${con([["in", "Press sample() to draw."]])}</div>`);
  if (!S) return el;
  const segs = []; for (let k = 0; k < 44; k++) { const a = k / 44 * Math.PI * 2; const s = S.wall(cx + Math.cos(a) * R, cy + Math.sin(a) * R, 22, 8, { angle: a + Math.PI / 2, fill: "#2E5A93" }); segs.push(s); }
  S.add(segs, S.wall(470, 372, 380, 12, { angle: .04 }), S.wall(634, 330, 12, 90), S.wall(300, 350, 12, 50));
  const mkBall = (d, x, y) => { const bl = S.ball(x, y, 16, String(d), "#0D2342", cols[d], { font: "700 15px IBM Plex Mono" }); bl.plugin.lw = 3; bl.plugin.ink = cols[d]; bl.plugin.digit = d; return bl; };
  function refill(){ S.remove(balls, tray); balls = []; tray = []; for (let d = 0; d <= 9; d++) balls.push(mkBall(d, cx - 60 + (d % 5) * 30, cy - 30 + Math.floor(d / 5) * 34)); S.add(balls); }
  S.tick.push(() => { if (Math.random() < .08) balls.forEach(bl => Matter.Body.applyForce(bl, bl.position, { x: (Math.random() - .5) * .012, y: -Math.random() * .014 })); });
  async function draw(digits, replace){
    for (const d of digits) {
      let src = balls.find(bl => bl.plugin.digit === d);
      if (!src) continue;
      if (replace) { const cp = mkBall(d, cx + 150, 240); tray.push(cp); S.add(cp); src.plugin.stroke = "#fff"; setTimeout(() => src.plugin.stroke = cols[d], 300); }
      else { Matter.Body.setPosition(src, { x: cx + 150, y: 240 }); Matter.Body.setVelocity(src, { x: 3, y: 0 }); balls = balls.filter(x => x !== src); tray.push(src); }
      await sleep(REDUCED ? 0 : 450);
    }
  }
  function pick(n, replace){ const pool = balls.map(bl => bl.plugin.digit), out = []; for (let k = 0; k < n; k++) { if (!pool.length) break; const j = Math.floor(Math.random() * pool.length); out.push(pool[j]); if (!replace) pool.splice(j, 1); } return out; }
  $("#gb-rep", b).onclick = e => { rep = !rep; e.target.textContent = `replace = ${rep ? "TRUE" : "FALSE"}`; e.target.classList.toggle("on", rep); };
  $("#gb-rs", b).onclick = () => { if (!busy) { refill(); $("#gb-out", b).innerHTML = con([["in", "Globe refilled: 0:9"]]); } };
  $("#gb-go", b).onclick = async () => {
    if (busy) return; const n = +$("#gb-n", b).value;
    if (!rep && n > balls.length) { $("#gb-out", b).innerHTML = con([["in", `> sample(remaining, size = ${n})`], ["err", "Error in sample.int(length(x), size, replace, prob) : \n  cannot take a sample larger than the population when 'replace = FALSE'"]]); alarm(b.closest(".lab")); return; }
    busy = true; S.remove(tray); tray = []; const d = pick(n, rep);
    $("#gb-out", b).innerHTML = con([["in", `> sample(0:9, size = ${n}${rep ? ", replace = TRUE" : ""})`], ["out", printVec(d, "num")], ["in", "# your draw, from JavaScript's random numbers"]]);
    await draw(d, rep); busy = false; if (!rep) setTimeout(() => { if (!busy) refill(); }, 2500);
  };
  $("#gb-seed", b).onclick = async () => {
    if (busy) return; busy = true;
    const outs = (OUT.out.m5_sample || []).filter(x => x.t === "out").slice(0, 3).map(x => x.x.replace(/\[\d+\]/g, " ").trim().split(/\s+/).map(Number));
    const steps = [["sample(safe_digits)", outs[0], false], ["sample(safe_digits, size = 4)", outs[1], false], ["sample(safe_digits, size = 4, replace = TRUE)", outs[2], true]];
    const lines = [["in", "> set.seed(2718)"]];
    for (const [code, digits, r] of steps) { refill(); await sleep(500); lines.push(["in", "> " + code], ["out", printVec(digits, "num")]); $("#gb-out", b).innerHTML = con(lines); await draw(digits, r); await sleep(700); S.remove(tray); tray = []; }
    lines.push(["in", "# Run this chunk in R and you'll get exactly these balls. Same seed, same draw."]); $("#gb-out", b).innerHTML = con(lines);
    refill(); busy = false;
  };
  refill(); return el;
};

LABS.explosion = () => {
  const [el, b] = labShell("Physics", "The cross-join avalanche", "Forget the key and every crew member gets paired with every job. Watch the rows pile up.");
  b.innerHTML = `<div class="row"><button class="btn danger" id="ex-bad">merge(crew, jobs)</button><button class="btn primary" id="ex-good">merge(crew, jobs, by.x = "codename", by.y = "alias")</button></div>`;
  const W = 640, H = 360; let blocks = [], n = 0, run = 0;
  const S = physStage(b, W, H, { after: ctx => { ctx.fillStyle = n > 5 ? "#FF5C63" : "#43D79A"; ctx.font = "34px Saira Stencil One"; ctx.textAlign = "right"; ctx.fillText(`${n} ROWS`, 612, 50); ctx.textAlign = "start"; } });
  b.insertAdjacentHTML("beforeend", `<p class="explain" id="ex-ex"></p>`);
  if (!S) return el;
  S.add(S.wall(320, 352, 610, 14), S.wall(18, 230, 14, 260), S.wall(622, 230, 14, 260));
  const pairs = CREW.flatMap(c => JOBS.map(j => [c[0], j[1], j[0] === c[0]]));
  async function drop(list){
    const my = ++run; S.remove(blocks); blocks = []; n = 0;
    for (const [who, what, ok] of list) { if (my !== run) return; const col = ok ? ["rgba(67,215,154,.22)", "#43D79A"] : ["rgba(255,92,99,.18)", "#FF5C63"]; const bd = S.box(60 + Math.random() * 520, -20, 104, 26, `${who}·${what}`, col[0], col[1], { font: "600 10px IBM Plex Mono" }); bd.plugin.ink = col[1]; S.add(bd); blocks.push(bd); n++; await sleep(REDUCED ? 0 : 90); }
  }
  $("#ex-bad", b).onclick = () => { drop(pairs); $("#ex-ex", b).innerHTML = "<b>36 rows.</b> No shared column name, so R pairs all 6 crew with all 6 jobs. Only the 5 green rows are real, and R gives no warning."; alarm(b.closest(".lab")); };
  $("#ex-good", b).onclick = () => { drop(pairs.filter(p => p[2])); $("#ex-ex", b).innerHTML = "<b>5 rows.</b> With the key, only real pairs survive: Ghost, Viper, Tinker (twice) and Nova."; };
  return el;
};

LABS.galton = () => {
  const [el, b] = labShell("Physics", "The Galton board", "Every ball makes 12 random left/right bounces, a fair coin flip at each peg. Its bin is the SUM of those flips, and the sums pile into a bell curve. Tilt the board to change p.");
  b.innerHTML = `<div class="row"><button class="btn primary" data-n="1">Drop 1</button><button class="btn primary" data-n="50">Drop 50</button><button class="btn primary" data-n="200">Drop 200</button><button class="btn" id="gt-rs">Reset</button>
    <label class="f">tilt the board (changes p) <input type="range" id="gt-tilt" min="-8" max="8" value="0"></label></div>`;
  const W = 560, H = 640, cx = 280, dx = 36, dy = 30, top = 100, rows = 12, binTop = top + (rows - 1) * dy + 24, floor = H - 12;
  let balls = [], queue = 0, counts = new Array(13).fill(0), total = 0;
  const binOf = x => clamp(Math.round((x - cx) / dx) + 6, 0, 12);
  const choose = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; };
  const S = physStage(b, W, H, { sleep: true, after: ctx => {
    counts.fill(0); balls.forEach(bl => { if (bl.position.y > binTop) counts[binOf(bl.position.x)]++; });
    const n = counts.reduce((a, c) => a + c, 0), hpb = 1.85;
    if (n > 4) {
      const cp = pRight();
      ctx.beginPath(); for (let k = 0; k <= 12; k++) { const e = n * choose(12, k) * Math.pow(cp, k) * Math.pow(1 - cp, 12 - k); const x = cx + (k - 6) * dx, y = floor - e * hpb; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.strokeStyle = "#F4C35A"; ctx.setLineDash([6, 5]); ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.fillStyle = "#8FA8C9"; ctx.font = "11px IBM Plex Mono"; ctx.textAlign = "center";
    counts.forEach((c, k) => ctx.fillText(c, cx + (k - 6) * dx, H - 1));
    ctx.textAlign = "left"; ctx.fillStyle = "#E8F1FC"; ctx.font = "13px IBM Plex Mono";
    const mean = n ? counts.reduce((a, c, k) => a + c * k, 0) / n : 0, sd = n > 1 ? Math.sqrt(counts.reduce((a, c, k) => a + c * (k - mean) ** 2, 0) / (n - 1)) : 0;
    ctx.fillText(`balls: ${n}`, 14, 22); ctx.fillText(`mean bin: ${mean.toFixed(2)}  (theory 6)`, 14, 40); ctx.fillText(`sd: ${sd.toFixed(2)}  (theory ${Math.sqrt(3).toFixed(2)})`, 14, 58);
    ctx.fillStyle = "#F4C35A"; ctx.fillText("- - binomial(12, p) expected", 330, 22);
  } });
  if (!S) return el;
  el._S = S; el._balls = () => balls;
  S.engine.positionIterations = 8;
  const pegs = []; for (let i = 0; i < rows; i++) for (let k = -7; k <= 7; k++) { const x = cx + (k + (i % 2 ? .5 : 0)) * dx; if (Math.abs(x - cx) > 6.2 * dx) continue; const inTri = Math.abs(x - cx) <= (i / 2) * dx + 1; const p = Matter.Bodies.circle(x, top + i * dy, 5, { isStatic: true, restitution: .2 }); p.plugin = { fill: inTri ? "#62D2F5" : "#2E5A93" }; pegs.push(p); }
  const walls = [S.wall(cx, floor + 6, 13 * dx + 20, 12)];
  for (let k = 0; k <= 13; k++) walls.push(S.wall(cx + (k - 6.5) * dx, (binTop + floor) / 2, 3, floor - binTop, { fill: "#2E5A93", stroke: null }));
  
  walls.push(S.wall(cx - 6.5 * dx - 5, 330, 8, 620), S.wall(cx + 6.5 * dx + 5, 330, 8, 620));
  S.add(pegs, walls);
  let fc = 0, flying = [];
  const pRight = () => clamp(.5 + +$("#gt-tilt", b).value / 20, .05, .95);
  S.tick.push(() => {
    if (queue > 0 && (fc++ % 4 === 0) && balls.length < 420) {
      queue--;
      const bl = S.ball(cx, top - dy, 5, null, "#F4C35A", null, { restitution: .15, friction: .001, frictionAir: .02, density: .002 });
      bl.isSensor = true; balls.push(bl); S.add(bl);
      const xs = [cx, cx]; let x = cx; for (let i = 0; i < 12; i++) { x += (Math.random() < pRight() ? 1 : -1) * dx / 2; xs.push(x); }
      flying.push({ bl, xs, i: 0, t: 0 });
    }
    flying = flying.filter(f => {
      f.t += 1 / 7; if (f.t >= 1) { f.t = 0; f.i++; }
      if (f.i >= 13) { f.bl.isSensor = false; Matter.Sleeping.set(f.bl, false); Matter.Body.setVelocity(f.bl, { x: (Math.random() - .5) * .4, y: 2 }); return false; }
      const ya = top + (f.i - 1) * dy - 9, yb = top + f.i * dy - 9, xa = f.xs[f.i], xb = f.xs[f.i + 1];
      Matter.Body.setPosition(f.bl, { x: xa + (xb - xa) * f.t, y: ya + (yb - ya) * f.t - 11 * Math.sin(Math.PI * f.t) });
      Matter.Body.setVelocity(f.bl, { x: 0, y: 0 }); Matter.Sleeping.set(f.bl, false);
      return true;
    });
  });
  $$("[data-n]", b).forEach(c => c.onclick = () => { queue += +c.dataset.n; });
  $("#gt-rs", b).onclick = () => { queue = 0; flying = []; S.remove(balls); balls = []; };
  
  return el;
};

LABS.heistsim = () => {
  const [el, b] = labShell("Simulation", "Run the heist 1,000 times", "Each dot is one attempt. It must pass the camera, the guard and the vault. Watch the success rate settle onto the exact answer.");
  b.innerHTML = `<div class="row"><label class="f">camera p <input type="range" id="hs-1" min="0.1" max="1" step="0.05" value="0.9"></label><label class="f">guard p <input type="range" id="hs-2" min="0.1" max="1" step="0.05" value="0.8"></label><label class="f">vault p <input type="range" id="hs-3" min="0.1" max="1" step="0.05" value="0.7"></label>
    <button class="btn primary" data-n="1">Run 1</button><button class="btn primary" data-n="100">Run 100</button><button class="btn primary" data-n="1000">Run 1000</button><button class="btn" id="hs-rs">Reset</button></div>`;
  const W = 640, H = 330, S = stage(b, W, H), ctx = S.ctx, gates = [200, 330, 460];
  let dots = [], queue = 0, tries = 0, wins = 0, hist = [];
  const P = () => [1, 2, 3].map(i => +$("#hs-" + i, b).value);
  b.insertAdjacentHTML("beforeend", `<div class="mini" id="hs-out"></div>`);
  const spawn = () => { const p = P(); const fate = p.findIndex(q => Math.random() >= q); dots.push({ x: 20, y: 40 + Math.random() * 150, vx: 4 + Math.random() * 1.5, vy: 0, fate, dead: false, a: 1 }); };
  const settle = d => { tries++; if (d.fate < 0) wins++; hist.push(wins / tries); if (hist.length > 400) hist = hist.filter((_, i) => i % 2 === 0); };
  function frame(){
    if (S.visible) {
      if (queue > 0) { const k = Math.min(queue, queue > 200 ? 12 : 2); for (let i = 0; i < k; i++) spawn(); queue -= k; }
      ctx.clearRect(0, 0, W, H);
      const p = P(), exact = p[0] * p[1] * p[2];
      ["CAMERA", "GUARD", "VAULT"].forEach((t, i) => { ctx.strokeStyle = "#FF5C63"; ctx.globalAlpha = .5 + .3 * Math.sin(performance.now() / 300 + i); ctx.beginPath(); ctx.moveTo(gates[i], 30); ctx.lineTo(gates[i], 200); ctx.lineWidth = 2; ctx.stroke(); ctx.globalAlpha = 1; ctx.fillStyle = "#8FA8C9"; ctx.font = "11px IBM Plex Mono"; ctx.textAlign = "center"; ctx.fillText(`${t} ${p[i].toFixed(2)}`, gates[i], 22); });
      ctx.fillStyle = "rgba(244,195,90,.15)"; ctx.fillRect(590, 30, 40, 170); ctx.fillStyle = "#F4C35A"; ctx.fillText("VAULT", 610, 215);
      dots = dots.filter(d => d.a > 0);
      for (const d of dots) {
        if (!d.dead) { const next = d.x + d.vx, gi = gates.findIndex(g => d.x < g && next >= g); d.x = next; if (gi >= 0 && gi === d.fate) { d.dead = true; d.vx *= .2; settle(d); } if (d.x > 600 && !d.done) { d.done = true; settle(d); } if (d.x > 620) d.a -= .05; }
        else { d.vy += .35; d.y += d.vy; d.x += d.vx; if (d.y > 225) { d.y = 225; d.vy *= -.3; d.a -= .02; } }
        ctx.globalAlpha = Math.max(0, d.a); ctx.fillStyle = d.dead ? "#FF5C63" : d.done ? "#F4C35A" : "#62D2F5"; ctx.beginPath(); ctx.arc(d.x, d.y, 3.2, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
      }
      const cx0 = 40, cy0 = 245, cw = 580, ch = 70;
      ctx.strokeStyle = "#1E4373"; ctx.strokeRect(cx0, cy0, cw, ch);
      const ys = v => cy0 + ch - v * ch;
      ctx.setLineDash([5, 4]); ctx.strokeStyle = "#F4C35A"; ctx.beginPath(); ctx.moveTo(cx0, ys(exact)); ctx.lineTo(cx0 + cw, ys(exact)); ctx.stroke(); ctx.setLineDash([]);
      if (hist.length > 1) { ctx.strokeStyle = "#62D2F5"; ctx.lineWidth = 2; ctx.beginPath(); hist.forEach((v, i) => { const x = cx0 + i / (hist.length - 1) * cw; i ? ctx.lineTo(x, ys(v)) : ctx.moveTo(x, ys(v)); }); ctx.stroke(); ctx.lineWidth = 1; }
      ctx.textAlign = "left"; ctx.fillStyle = "#E8F1FC"; ctx.font = "12px IBM Plex Mono";
      ctx.fillText(`attempts ${tries}   successes ${wins}   rate ${tries ? (wins / tries).toFixed(3) : "—"}   exact ${exact.toFixed(3)}`, cx0, cy0 - 8);
    }
    requestAnimationFrame(frame);
  }
  const code = () => { const p = P(); return con([["in", `> one_try = function() runif(1) < ${p[0]} & runif(1) < ${p[1]} & runif(1) < ${p[2]}`], ["in", "> mean(replicate(10000, one_try()))   # simulated"], ["in", `> ${p[0]} * ${p[1]} * ${p[2]}                     # exact`], ["out", printVec([+(p[0] * p[1] * p[2]).toFixed(6)], "num")]]); };
  $$("[data-n]", b).forEach(c => c.onclick = () => { queue += +c.dataset.n; });
  $("#hs-rs", b).onclick = () => { dots = []; tries = wins = 0; hist = []; queue = 0; };
  b.addEventListener("input", () => { $("#hs-out", b).innerHTML = code(); dots = []; tries = wins = 0; hist = []; });
  $("#hs-out", b).innerHTML = code(); requestAnimationFrame(frame); return el;
};

LABS.clt = () => {
  const [el, b] = labShell("Simulation", "Means make bells", "Pick an ugly source distribution and a sample size n. Each sample's mean drops into the lower histogram. Watch the bell appear and narrow as n grows.");
  const SRC = { skewed: { name: "exponential: rexp(n, 1)", mu: 1, sd: 1, draw: () => -Math.log(1 - Math.random()), dens: x => x < 0 ? 0 : Math.exp(-x) },
    flat: { name: "uniform: runif(n, 0, 2)", mu: 1, sd: 2 / Math.sqrt(12), draw: () => 2 * Math.random(), dens: x => x >= 0 && x <= 2 ? .5 : 0 },
    bimodal: { name: "two humps (mixture)", mu: 1, sd: Math.sqrt(.15 ** 2 + .36), draw: () => { const z = Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random()); return (Math.random() < .5 ? .4 : 1.6) + .15 * z; }, dens: x => .5 * (Math.exp(-((x - .4) ** 2) / (2 * .0225)) + Math.exp(-((x - 1.6) ** 2) / (2 * .0225))) / (.15 * Math.sqrt(2 * Math.PI)) } };
  b.innerHTML = `<div class="row"><label class="f">source<select id="cl-src">${Object.entries(SRC).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join("")}</select></label>
    <label class="f">n<select id="cl-n">${[1, 2, 5, 10, 30, 100].map(n => `<option ${n === 5 ? "selected" : ""}>${n}</option>`).join("")}</select></label>
    <button class="btn primary" data-k="1">Draw 1 sample</button><button class="btn primary" data-k="100">Draw 100</button><button class="btn primary" data-k="1000">Draw 1000</button><button class="btn" id="cl-rs">Reset</button></div>`;
  const W = 640, H = 400, S = stage(b, W, H), ctx = S.ctx, X0 = 40, X1 = 620, lo = -0.2, hi = 3, sx = x => X0 + (x - lo) / (hi - lo) * (X1 - X0);
  let means = [], anim = [], bins = new Array(64).fill(0);
  const src = () => SRC[$("#cl-src", b).value], n = () => +$("#cl-n", b).value;
  const binOf = m => clamp(Math.floor((m - lo) / (hi - lo) * 64), 0, 63);
  const add = m => { means.push(m); bins[binOf(m)]++; };
  const sample = () => { const s = src(), k = n(), xs = Array.from({ length: k }, s.draw); return { xs, m: xs.reduce((a, c) => a + c, 0) / k }; };
  b.insertAdjacentHTML("beforeend", `<div class="mini" id="cl-out"></div>`);
  function stats(){ const k = means.length, mm = k ? means.reduce((a, c) => a + c, 0) / k : 0, sd = k > 1 ? Math.sqrt(means.reduce((a, c) => a + (c - mm) ** 2, 0) / (k - 1)) : 0; return { k, mm, sd }; }
  function frame(){
    if (S.visible) {
      ctx.clearRect(0, 0, W, H); const s = src();
      ctx.fillStyle = "#8FA8C9"; ctx.font = "11px IBM Plex Mono"; ctx.fillText("source distribution", X0, 16);
      ctx.beginPath(); for (let i = 0; i <= 200; i++) { const x = lo + i / 200 * (hi - lo), y = 130 - Math.min(1.4, s.dens(x)) * 75; i ? ctx.lineTo(sx(x), y) : ctx.moveTo(sx(x), y); } ctx.strokeStyle = "#B7A0FF"; ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 1;
      ctx.strokeStyle = "#1E4373"; ctx.beginPath(); ctx.moveTo(X0, 130); ctx.lineTo(X1, 130); ctx.moveTo(X0, 380); ctx.lineTo(X1, 380); ctx.stroke();
      for (let t = 0; t <= 3; t++) { ctx.fillStyle = "#8FA8C9"; ctx.fillText(t, sx(t) - 3, 395); }
      anim = anim.filter(a => a.t < 90);
      for (const a of anim) { a.t++; const k = a.t;
        a.xs.forEach(x => { const y = Math.min(150, 40 + k * 3.2); ctx.fillStyle = "#B7A0FF"; ctx.globalAlpha = k < 40 ? 1 : Math.max(0, 1 - (k - 40) / 20); ctx.beginPath(); ctx.arc(sx(x), y, 3, 0, 7); ctx.fill(); });
        ctx.globalAlpha = 1; if (k > 30) { const y = Math.min(370, 150 + (k - 30) ** 2 * .12); ctx.fillStyle = "#F4C35A"; ctx.beginPath(); ctx.arc(sx(a.m), y, 5, 0, 7); ctx.fill(); if (y >= 370 && !a.done) { a.done = true; add(a.m); } } }
      const mx = Math.max(8, ...bins), bw = (X1 - X0) / 64;
      bins.forEach((c, i) => { const h = c / mx * 200; ctx.fillStyle = "rgba(98,210,245,.5)"; ctx.fillRect(X0 + i * bw + 1, 380 - h, bw - 2, h); });
      const st = stats();
      if (st.k > 20) { const sd = s.sd / Math.sqrt(n()); ctx.beginPath(); for (let i = 0; i <= 200; i++) { const x = lo + i / 200 * (hi - lo), d = Math.exp(-((x - s.mu) ** 2) / (2 * sd * sd)) / (sd * Math.sqrt(2 * Math.PI)), y = 380 - d * st.k * (hi - lo) / 64 / mx * 200; i ? ctx.lineTo(sx(x), y) : ctx.moveTo(sx(x), y); } ctx.strokeStyle = "#F4C35A"; ctx.setLineDash([6, 4]); ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1; }
      ctx.fillStyle = "#E8F1FC"; ctx.font = "12px IBM Plex Mono"; ctx.fillText(`sample means: ${st.k}   mean ${st.mm.toFixed(3)}   sd ${st.sd.toFixed(3)}   σ/√n = ${(s.sd / Math.sqrt(n())).toFixed(3)}`, X0, 160);
    }
    requestAnimationFrame(frame);
  }
  const code = () => { const s = $("#cl-src", b).value, k = n(); const draw = { skewed: `rexp(${k}, rate = 1)`, flat: `runif(${k}, 0, 2)`, bimodal: `c(rnorm(...), rnorm(...))` }[s]; return con([["in", `> means = replicate(5000, mean(${draw}))`], ["in", "> hist(means)             # a bell curve"], ["in", `> sd(means)               # close to sigma / sqrt(${k}) = ${(src().sd / Math.sqrt(k)).toFixed(3)}`]]); };
  const reset = () => { means = []; anim = []; bins.fill(0); $("#cl-out", b).innerHTML = code(); };
  $$("[data-k]", b).forEach(c => c.onclick = () => { const k = +c.dataset.k; if (k === 1) anim.push({ ...sample(), t: 0 }); else { for (let i = 0; i < k; i++) add(sample().m); for (let i = 0; i < 6; i++) anim.push({ ...sample(), t: -i * 8 }); } });
  $("#cl-rs", b).onclick = reset; b.addEventListener("change", reset); reset(); requestAnimationFrame(frame); return el;
};
