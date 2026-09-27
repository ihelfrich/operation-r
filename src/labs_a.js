/* ---------- interactive labs (DOM / SVG) ---------- */
function labShell(kind, title, hint){
  const el = document.createElement("div"); el.className = "lab";
  el.innerHTML = `<div class="lab-h"><span class="kind">${kind}</span><b>${title}</b><span class="hint">${hint}</span></div><div class="lab-b"></div>`;
  return [el, $(".lab-b", el)];
}
const codeBox = src => `<pre class="code" style="border:1px solid var(--line);border-radius:8px;margin-top:10px">${hl(src)}</pre>`;
const LABS = {};

LABS.rstudio = () => {
  const [el, b] = labShell("Tour", "The four panes", "Tap a pane.");
  const P = [["Source", "Script · R Markdown", "Where code you want to keep lives. Run a line with Ctrl+Enter, or the whole chunk with Ctrl+Shift+Enter.", "x = rnorm(100)\nhist(x)"],
    ["Environment", "Environment · History", "Every object you've created, with its type and size. History lists what you ran.", "crew  6 obs. of 5 variables\nloot  num 250"],
    ["Console", "Console · Terminal", "Runs code line by line, like a calculator. Press ↑ to bring back the last line.", "> 250 %/% 6\n[1] 41"],
    ["Files · Plots · Help", "Files · Plots · Packages · Help", "Plots appear here, and so does Help: type ?mean in the console. This pane matters.", "mean {base}\nArithmetic Mean"]];
  b.innerHTML = `<div class="rs">${P.map((p, i) => `<button class="pane" data-i="${i}"><span class="tabs">${p[1]}</span><b>${p[0]}</b><div class="fake">${esc(p[3])}</div></button>`).join("")}</div><p class="explain"></p>`;
  const ex = $(".explain", b);
  $$(".pane", b).forEach(p => { const f = () => { $$(".pane", b).forEach(q => q.classList.toggle("on", q === p)); ex.innerHTML = `<b>${P[p.dataset.i][0]}.</b> ${P[p.dataset.i][2]}`; }; p.onclick = f; p.onmouseenter = f; });
  $(".pane", b).click(); return el;
};

LABS.typescanner = () => {
  const [el, b] = labShell("Scanner", "The type scanner", "Feed an item through the scanner. Every readout is what real R prints.");
  const S = LAB.scan;
  b.innerHTML = `<div class="row">${S.map((s, i) => `<button class="chip" data-i="${i}">${esc(s.lit)}</button>`).join("")}</div>
    <div class="scanner" style="margin-top:12px"><div class="scan-bay"><div class="scan-beam"></div><div class="scan-item"></div></div>
    <dl class="readout"></dl></div><p class="explain"></p>`;
  const bay = $(".scan-bay", b), item = $(".scan-item", b), ro = $(".readout", b), ex = $(".explain", b);
  const rows = [["class()", "class"], ["is.numeric()", "is_numeric"], ["is.character()", "is_character"], ["as.numeric()", "as_numeric"], ["as.character()", "as_character"], ["as.logical()", "as_logical"], ["length()", "length"]];
  const show = i => {
    const s = S[i]; $$(".chip", b).forEach((c, j) => c.classList.toggle("on", j === i));
    item.textContent = s.lit; bay.classList.remove("go"); void bay.offsetWidth; bay.classList.add("go");
    ro.innerHTML = rows.map(([lab, k]) => `<dt>${lab}</dt><dd class="flash">${esc(s[k])}</dd>`).join("");
    ex.innerHTML = s.warn ? `<b>Warning from as.numeric():</b> ${esc(s.warn)}` : s.lit === "NULL" ? "<b>NULL</b> has length 0, so every conversion returns an empty vector." : "No warnings.";
  };
  $$(".chip", b).forEach(c => c.onclick = () => show(+c.dataset.i)); show(0); return el;
};

LABS.lasers = () => {
  const [el, b] = labShell("Security", "The laser grid", "Set the conditions and pick a plan. The door opens only when the whole expression is TRUE.");
  const plans = [
    ["(guards < 4) & !alarm_armed", s => [["guards < 4", s.g < 4], ["!alarm_armed", !s.a]], (p) => p[0][1] && p[1][1]],
    ["(guards < 4) | cameras_on", s => [["guards < 4", s.g < 4], ["cameras_on", s.c]], (p) => p[0][1] || p[1][1]],
    ["!(cameras_on | alarm_armed)", s => [["cameras_on | alarm_armed", s.c || s.a]], (p) => !p[0][1]],
    ["guards >= 2 & guards <= 5", s => [["guards >= 2", s.g >= 2], ["guards <= 5", s.g <= 5]], (p) => p[0][1] && p[1][1]]];
  b.innerHTML = `<div class="row"><label class="f">guards <input type="range" id="lz-g" min="0" max="10" value="3"></label><span class="chip" id="lz-gv">3</span>
    <button class="chip" id="lz-c">cameras_on = TRUE</button><button class="chip" id="lz-a">alarm_armed = FALSE</button></div>
    <div class="row" style="margin-top:10px">${plans.map((p, i) => `<button class="chip plan" data-i="${i}">${esc(p[0])}</button>`).join("")}</div>
    <svg class="laser-svg" viewBox="0 0 640 170" style="margin-top:12px"></svg><div class="mini"></div>`;
  const st = { g: 3, c: true, a: false, p: 0 }, svg = $("svg", b);
  const draw = () => {
    const [ex, parts, fin] = plans[st.p], ps = parts(st), ok = fin(ps);
    $$(".plan", b).forEach((c, i) => c.classList.toggle("on", i === st.p));
    const lamps = ps.map(([t, v], i) => `<g transform="translate(${40 + i * 190},20)"><rect width="176" height="34" rx="6" fill="${v ? "rgba(67,215,154,.15)" : "rgba(255,92,99,.15)"}" stroke="${v ? "#43D79A" : "#FF5C63"}"/><circle cx="18" cy="17" r="7" fill="${v ? "#43D79A" : "#FF5C63"}"><animate attributeName="opacity" values="1;.4;1" dur="1.4s" repeatCount="indefinite"/></circle><text x="32" y="21" fill="#E8F1FC" font-family="IBM Plex Mono" font-size="11">${esc(t)} → ${v ? "TRUE" : "FALSE"}</text></g>`).join("");
    const beams = ok ? "" : [0, 1, 2, 3].map(k => `<line x1="40" x2="520" y1="${82 + k * 14}" y2="${82 + k * 14 + (k % 2 ? 6 : -6)}" stroke="#FF5C63" stroke-width="2" opacity=".85"><animate attributeName="opacity" values=".9;.35;.9" dur="${0.6 + k * 0.2}s" repeatCount="indefinite"/></line>`).join("");
    svg.innerHTML = `${lamps}<rect x="30" y="72" width="560" height="70" fill="none" stroke="#1E4373"/>${beams}
      <g style="transition:transform .8s cubic-bezier(.6,0,.3,1);transform:translateY(${ok ? -70 : 0}px)"><rect x="540" y="72" width="44" height="70" fill="#223A5C" stroke="#8FA8C9"/><circle cx="562" cy="107" r="11" fill="none" stroke="#F4C35A" stroke-width="3"/></g>
      <text x="300" y="162" text-anchor="middle" fill="${ok ? "#43D79A" : "#FF5C63"}" font-family="Saira Stencil One" font-size="16">${ok ? "DOOR OPEN" : "ACCESS DENIED"}</text>`;
    $(".mini", b).innerHTML = con([["in", `> guards = ${st.g}; cameras_on = ${st.c ? "TRUE" : "FALSE"}; alarm_armed = ${st.a ? "TRUE" : "FALSE"}`], ["in", `> ${ex}`], ["out", `[1] ${ok ? "TRUE" : "FALSE"}`]]);
  };
  $("#lz-g", b).oninput = e => { st.g = +e.target.value; $("#lz-gv", b).textContent = st.g; draw(); };
  $("#lz-c", b).onclick = e => { st.c = !st.c; e.target.textContent = `cameras_on = ${st.c ? "TRUE" : "FALSE"}`; draw(); };
  $("#lz-a", b).onclick = e => { st.a = !st.a; e.target.textContent = `alarm_armed = ${st.a ? "TRUE" : "FALSE"}`; draw(); };
  $$(".plan", b).forEach(c => c.onclick = () => { st.p = +c.dataset.i; draw(); });
  draw(); return el;
};

LABS.rep = () => {
  const [el, b] = labShell("Builder", "Patrol pattern builder", "Pick a vector and the rep() arguments. Colors show where each element came from.");
  const vecs = [['c("L", "R")', ["L", "R"], "chr"], ['c("A", "B", "C")', ["A", "B", "C"], "chr"], ["1:3", [1, 2, 3], "num"]];
  b.innerHTML = `<div class="row"><label class="f">x <select id="rp-x">${vecs.map((v, i) => `<option value="${i}">${esc(v[0])}</option>`).join("")}</select></label>
    <label class="f">times <select id="rp-t"><option>1</option><option selected>2</option><option>3</option><option value="v">c(1, 2, 3…)</option></select></label>
    <label class="f">each <select id="rp-e"><option>1</option><option>2</option><option>3</option></select></label>
    <label class="f">length.out <select id="rp-l"><option value="">(none)</option><option>5</option><option>7</option><option>10</option></select></label></div>
    <div class="cells" id="rp-out"></div><div id="rp-code"></div><div class="mini" id="rp-con"></div><p class="explain" id="rp-ex"></p>`;
  const cols = ["#62D2F5", "#F4C35A", "#B7A0FF"];
  const draw = () => {
    const [lbl, x, type] = vecs[+$("#rp-x", b).value], tv = $("#rp-t", b).value, each = +$("#rp-e", b).value, lo = $("#rp-l", b).value;
    let src = x.map((v, i) => i), eachd = src.flatMap(i => Array(each).fill(i)), res, args = [], err = null;
    if (lo) { res = Array.from({ length: +lo }, (_, k) => eachd[k % eachd.length]); }
    else if (tv === "v") { const tt = eachd.map((_, k) => k + 1); if (each > 1) err = "invalid 'times' argument"; res = eachd.flatMap((i, k) => Array(tt[k]).fill(i)); }
    else res = Array.from({ length: +tv }, () => eachd).flat();
    if (tv === "v") args.push(`times = c(${eachd.map((_, k) => k + 1).join(", ")})`); else if (tv !== "1" && !lo) args.push(`times = ${tv}`);
    if (each > 1) args.unshift(`each = ${each}`);
    if (lo) args.push(`length.out = ${lo}`);
    const code = `rep(${[lbl, ...args].join(", ")})`;
    $("#rp-code", b).innerHTML = codeBox(code);
    if (err) { $("#rp-out", b).innerHTML = ""; $("#rp-con", b).innerHTML = con([["in", "> " + code], ["err", `Error in rep(...) : ${err}`]]); $("#rp-ex", b).textContent = "A times vector needs one count per element, but each has already multiplied the elements."; return; }
    $("#rp-out", b).innerHTML = res.map((i, k) => `<div class="cell" style="border-color:${cols[i]};animation:pop .3s ${k * 45}ms both"><div class="vl" style="color:${cols[i]}">${esc(x[i])}</div><div class="ps">[${k + 1}]</div></div>`).join("");
    $("#rp-con", b).innerHTML = con([["in", "> " + code], ["out", printVec(res.map(i => x[i]), type)]]);
    $("#rp-ex", b).innerHTML = lo ? "<b>length.out</b> overrides times: R recycles until it hits the length exactly." : tv === "v" ? "<b>A vector of times</b> repeats each element its own number of times." : each > 1 ? "<b>each</b> repeats every element first, then <b>times</b> repeats the whole block." : "<b>times</b> repeats the whole vector.";
  };
  b.addEventListener("change", draw); draw(); return el;
};

LABS.recycling = () => {
  const [el, b] = labShell("Lab", "Watch R recycle", "Change the lengths. Dashed cells are recycled copies of the short vector.");
  b.innerHTML = `<div class="row"><label class="f">long vector 1:n <input type="range" id="rc-n" min="1" max="10" value="4"></label><label class="f">short vector length <input type="range" id="rc-m" min="1" max="5" value="2"></label></div><div class="rec"></div>`;
  const draw = () => {
    const n = +$("#rc-n", b).value, m = +$("#rc-m", b).value, s = Array.from({ length: m }, (_, i) => (i + 1) * 10), L = Math.max(n, m);
    const a = Array.from({ length: L }, (_, i) => i % n + 1), c = Array.from({ length: L }, (_, i) => s[i % m]), bad = L % Math.min(n, m) !== 0;
    const cell = (v, i, len) => `<div class="rc ${i >= len ? "rep" : ""}" style="animation-delay:${i * 40}ms">${v}</div>`;
    $(".rec", b).innerHTML = `<div class="rec-grid" style="grid-template-columns:auto repeat(${L},minmax(38px,1fr))"><div class="lb">1:${n}</div>${a.map((v, i) => cell(v, i, n)).join("")}<div class="lb">c(${s.join(", ")})</div>${c.map((v, i) => cell(v, i, m)).join("")}<div class="lb">sum</div>${a.map((v, i) => `<div class="rc res" style="animation-delay:${200 + i * 40}ms">${v + c[i]}</div>`).join("")}</div>
      ${codeBox(`1:${n} + c(${s.join(", ")})`)}<div class="banner ${bad ? "bad" : "ok"}">${bad ? `Warning: longer object length is not a multiple of shorter object length (${L} vs ${Math.min(n, m)})` : `No warning: ${L} is a multiple of ${Math.min(n, m)}.`}</div>`;
    if (bad) alarm(null);
  };
  b.addEventListener("input", draw); draw(); return el;
};

LABS.matrix = () => {
  const [el, b] = labShell("Lab", "Filling the deposit boxes", "Pick a shape and press Fill. Click a box, a row label or a column label to open it.");
  b.innerHTML = `<div class="row"><label class="f">nrow <select id="mx-r">${[1, 2, 3, 4, 6, 12].map(r => `<option ${r === 4 ? "selected" : ""}>${r}</option>`).join("")}</select></label>
    <button class="chip" id="mx-by">byrow = FALSE</button><button class="btn primary" id="mx-go">▶ Fill</button><button class="chip" id="mx-rec">show * 1:3 multipliers</button></div>
    <div id="mx-code"></div><div class="mat-wrap"></div><div class="mini" id="mx-out">${con([["in", "Click a box, a row label or a column label."]])}</div>`;
  let byrow = false, rec = false, timer;
  const shape = () => { const r = +$("#mx-r", b).value; return [r, 12 / r]; };
  const val = (i, j, r, c) => byrow ? i * c + j + 1 : j * r + i + 1;
  const draw = (upto = 12) => {
    const [r, c] = shape();
    $("#mx-code", b).innerHTML = codeBox(`boxes = matrix(1:12, nrow = ${r}, ncol = ${c}${byrow ? ", byrow = TRUE" : ""})`);
    let h = `<table class="mat"><tr><th></th>${Array.from({ length: c }, (_, j) => `<th class="clk" data-c="${j}">[,${j + 1}]</th>`).join("")}</tr>`;
    for (let i = 0; i < r; i++) { h += `<tr><th class="clk" data-r="${i}">[${i + 1},]</th>`; for (let j = 0; j < c; j++) { const v = val(i, j, r, c), k = j * r + i; h += `<td data-i="${i}" data-j="${j}" class="${v > upto ? "empty" : ""}">${v}${rec ? `<sub>×${k % 3 + 1}</sub>` : ""}</td>`; } h += "</tr>"; }
    $(".mat-wrap", b).innerHTML = h + "</table>";
    if (rec) $("#mx-out", b).innerHTML = con([["in", "> boxes * 1:3"], ["out", "The multiplier runs 1, 2, 3, 1, 2, 3… DOWN the columns, box by box,\nno matter how the matrix was filled."]]);
  };
  b.addEventListener("click", e => {
    const [r, c] = shape(), t = e.target.closest("td,th.clk"); if (!t) return;
    $$("td", b).forEach(td => td.classList.remove("sel")); let expr, vals = [];
    if (t.dataset.r !== undefined) { const i = +t.dataset.r; expr = `boxes[${i + 1}, ]`; $$(`td[data-i="${i}"]`, b).forEach(td => td.classList.add("sel")); for (let j = 0; j < c; j++) vals.push(val(i, j, r, c)); }
    else if (t.dataset.c !== undefined) { const j = +t.dataset.c; expr = `boxes[, ${j + 1}]`; $$(`td[data-j="${j}"]`, b).forEach(td => td.classList.add("sel")); for (let i = 0; i < r; i++) vals.push(val(i, j, r, c)); }
    else { const i = +t.dataset.i, j = +t.dataset.j; expr = `boxes[${i + 1}, ${j + 1}]`; t.classList.add("sel"); vals = [val(i, j, r, c)]; }
    $("#mx-out", b).innerHTML = con([["in", "> " + expr], ["out", printVec(vals, "num")]]);
  });
  $("#mx-by", b).onclick = e => { byrow = !byrow; e.target.textContent = `byrow = ${byrow ? "TRUE" : "FALSE"}`; e.target.classList.toggle("on", byrow); draw(); e.stopPropagation(); };
  $("#mx-rec", b).onclick = e => { rec = !rec; e.target.classList.toggle("on", rec); draw(); e.stopPropagation(); };
  $("#mx-r", b).onchange = () => draw();
  $("#mx-go", b).onclick = e => { e.stopPropagation(); clearInterval(timer); let k = 0; draw(0); timer = setInterval(() => { draw(++k); if (k >= 12) clearInterval(timer); }, REDUCED ? 0 : 170); };
  draw(); return el;
};

LABS.apply = () => {
  const [el, b] = labShell("Sweep", "The laser sweep: apply()", "MARGIN = 1 sweeps each row. MARGIN = 2 sweeps each column. Press Sweep.");
  const names = ["Ghost", "Viper", "Tinker", "Nova"], days = ["Mon", "Tue", "Wed"], mat = [[12, 8, 15], [9, 11, 7], [14, 10, 6], [13, 9, 16]];
  b.innerHTML = `<div class="row"><button class="chip on" data-m="1">MARGIN = 1</button><button class="chip" data-m="2">MARGIN = 2</button><select id="ap-f"><option>sum</option><option>mean</option><option>max</option><option>min</option></select><button class="btn primary" id="ap-go">▶ Sweep</button></div><div id="ap-c"></div><div class="mat-wrap"></div><div class="mini"></div>`;
  let M1 = 1, busy = false;
  const F = { sum: a => a.reduce((x, y) => x + y, 0), mean: a => a.reduce((x, y) => x + y, 0) / a.length, max: a => Math.max(...a), min: a => Math.min(...a) };
  const res = () => { const f = F[$("#ap-f", b).value]; return M1 === 1 ? mat.map(f) : [0, 1, 2].map(j => f(mat.map(r => r[j]))); };
  const draw = (upto = 99, sweep = -1) => {
    const f = $("#ap-f", b).value, rs = res();
    $("#ap-c", b).innerHTML = codeBox(`apply(take, MARGIN = ${M1}, FUN = ${f})`);
    let h = `<table class="mat"><tr><th></th>${days.map(d => `<th>${d}</th>`).join("")}${M1 === 1 ? `<th>${f}</th>` : ""}</tr>`;
    mat.forEach((r, i) => { h += `<tr><th>${names[i]}</th>${r.map((v, j) => `<td class="${(M1 === 1 ? i : j) === sweep ? "sweep" : ""}">${v}</td>`).join("")}${M1 === 1 ? `<td class="${i < upto ? "res" : "empty"}">${i < upto ? +rs[i].toFixed(2) : ""}</td>` : ""}</tr>`; });
    if (M1 === 2) h += `<tr><th>${f}</th>${rs.map((v, j) => `<td class="${j < upto ? "res" : "empty"}">${j < upto ? +v.toFixed(2) : ""}</td>`).join("")}</tr>`;
    $(".mat-wrap", b).innerHTML = h + "</table>";
    const nm = M1 === 1 ? names : days;
    $(".mini", b).innerHTML = upto >= 99 ? con([["in", `> apply(take, ${M1}, ${f})`], ["out", printVec(rs.map(v => +v.toFixed(6)), "num", nm)]]) : con([["in", "sweeping…"]]);
  };
  const sweep = async () => { if (busy) return; busy = true; const n = M1 === 1 ? 4 : 3; for (let k = 0; k < n; k++) { draw(k, k); await sleep(REDUCED ? 0 : 380); } draw(); busy = false; };
  $$("[data-m]", b).forEach(c => c.onclick = () => { M1 = +c.dataset.m; $$("[data-m]", b).forEach(x => x.classList.toggle("on", x === c)); draw(); });
  $("#ap-f", b).onchange = () => draw(); $("#ap-go", b).onclick = sweep; draw(); return el;
};

LABS.list = () => {
  const [el, b] = labShell("Lab", "Open the backpack", "Each pocket is one item. Pick an extraction and see whether you get a smaller backpack or the item itself.");
  const P = [["tools", '[1] "drill"  "laptop" "rope"  '], ["cash", "[1] 2500 1200"], ["map", '     [,1]    [,2]  \n[1,] "vault" "exit"\n[2,] "guard" "van" ']];
  const ops = [["backpack[1]", [0], true], ["backpack[[1]]", [0], false], ["backpack$cash", [1], false], ['backpack["cash"]', [1], true], ['backpack[c("tools", "map")]', [0, 2], true], ["backpack$map[1, 2]", [2], "x"], ["backpack[[c(1, 3)]]", [0], "rope"]];
  b.innerHTML = `<div class="bag" id="bp-src">${P.map((p, i) => `<div class="pocket" data-i="${i}"><div class="cn">$${p[0]}</div><div class="cv">${esc(p[1])}</div></div>`).join("")}</div>
    <div class="row" style="margin-top:14px">${ops.map((o, i) => `<button class="chip" data-o="${i}">${esc(o[0])}</button>`).join("")}</div><div id="bp-out" style="margin-top:12px"></div>`;
  $$("[data-o]", b).forEach(btn => btn.onclick = () => {
    const [ex, idx, kind] = ops[+btn.dataset.o];
    $$("[data-o]", b).forEach(x => x.classList.toggle("on", x === btn));
    $$("#bp-src .pocket", b).forEach(c => c.classList.toggle("hl", idx.includes(+c.dataset.i)));
    let body, verdict;
    if (kind === true) { body = `<div class="bag">${idx.map(i => `<div class="pocket"><div class="cn">$${P[i][0]}</div><div class="cv">${esc(P[i][1])}</div></div>`).join("")}</div>`; verdict = `is.list → <b style="color:var(--green)">TRUE</b>. A smaller backpack: you can't do math on it.`; }
    else if (kind === false) { body = `<div class="loose"><div class="cv" style="font-family:var(--f-mono);white-space:pre">${esc(P[idx[0]][1])}</div></div>`; verdict = `is.list → <b style="color:var(--red)">FALSE</b>. The item itself: ready to use.`; }
    else if (kind === "x") { body = `<div class="loose"><span style="font-family:var(--f-mono)">[1] "exit"</span></div>`; verdict = "$ takes the matrix out, then [1, 2] opens row 1, column 2."; }
    else { body = `<div class="loose"><span style="font-family:var(--f-mono)">[1] "rope"</span></div>`; verdict = "[[c(1, 3)]] digs in twice: item 1 (tools), then element 3 inside it."; }
    $("#bp-out", b).innerHTML = `<div class="dim">&gt; ${esc(ex)}</div>${body}<div class="verdict">${verdict}</div>`;
  });
  $("[data-o]", b).click(); return el;
};

LABS.paths = () => {
  const [el, b] = labShell("Recon", "Where is the file?", "Pick a working directory, then type a path for read.csv(). R looks for relative paths starting from the working directory.");
    const wds = ["/Users/rookie/heist", "/Users/rookie/heist/intel", "/Users/rookie/heist/notes"];
  const files = ["/Users/rookie/heist/intel/intel.csv", "/Users/rookie/heist/intel/report.Rmd", "/Users/rookie/heist/notes/notes.Rmd"];
  b.innerHTML = `<div class="row">${wds.map((w, i) => `<button class="chip" data-w="${i}">setwd("${w.replace("/Users/rookie/", "~/")}")</button>`).join("")}</div>
    <div class="split"><div class="tree"></div><div><label class="f">read.csv("<input type="text" id="pt-in" value="intel.csv" style="font-family:var(--f-mono)">")</label><div class="mini" id="pt-out"></div><p class="explain" id="pt-ex"></p></div></div>`;
  let wd = 1;
  const resolve = p => { if (p.startsWith("/")) return p; if (p.startsWith("~/")) return "/Users/rookie/" + p.slice(2); const parts = wds[wd].split("/"); for (const s of p.split("/")) { if (s === "..") parts.pop(); else if (s && s !== ".") parts.push(s); } return parts.join("/"); };
  const draw = () => {
    $$("[data-w]", b).forEach((c, i) => c.classList.toggle("on", i === wd));
    const w = wds[wd];
    $(".tree", b).innerHTML = ["heist/", "├── intel/", "│   ├── intel.csv", "│   └── report.Rmd", "└── notes/", "    └── notes.Rmd"].map((l, i) => {
      const full = [wds[0], wds[1], files[0], files[1], wds[2], files[2]][i];
      return `<span class="${full === w ? "wd" : full.endsWith(".csv") ? "file" : ""}">${esc(l)}${full === w ? "   ← getwd()" : ""}</span>`;
    }).join("\n");
    const p = $("#pt-in", b).value, full = resolve(p), ok = files.includes(full) && full.endsWith(".csv");
    const rel = files[0].replace(w + "/", "");
    const good = w === wds[0] ? "intel/intel.csv" : w === wds[1] ? "intel.csv" : "../intel/intel.csv";
    $("#pt-out", b).innerHTML = ok ? con([["in", `> getwd()`], ["out", `[1] "${w}"`], ["in", `> intel = read.csv("${p}")`], ["out", "(3 rows read)"]])
      : con([["in", `> getwd()`], ["out", `[1] "${w}"`], ["in", `> intel = read.csv("${p}")`], ["err", `Error in file(file, "rt") : cannot open the connection`], ["warn", `In addition: Warning message:\nIn file(file, "rt") :\n  cannot open file '${p}': No such file or directory`]]);
    $("#pt-ex", b).innerHTML = `From this working directory, the relative path is <code>${good}</code>. The absolute path <code>${files[0]}</code> works from anywhere, but it breaks on anyone else's computer.`;
  };
  $$("[data-w]", b).forEach(c => c.onclick = () => { wd = +c.dataset.w; draw(); });
  $("#pt-in", b).oninput = draw; draw(); return el;
};

LABS.duplicated = () => {
  const [el, b] = labShell("Detector", "The counterfeit detector", "duplicated() scans in one direction and flags anything it has already seen.");
  const s = ["A17", "B22", "A17", "C09", "B22", "A17"];
  const fwd = s.map((v, i) => s.slice(0, i).includes(v)), bwd = s.map((v, i) => s.slice(i + 1).includes(v));
  const modes = [["duplicated(serials)", fwd, 1], ["duplicated(serials, fromLast = TRUE)", bwd, -1], ["duplicated(serials) | duplicated(serials, fromLast = TRUE)", fwd.map((v, i) => v || bwd[i]), 0], ["!duplicated(serials)", fwd.map(v => !v), 1]];
  b.innerHTML = `<div class="row">${modes.map((m, i) => `<button class="chip" data-m="${i}">${esc(m[0])}</button>`).join("")}</div><div class="cells"></div><div class="mini"></div>`;
  let run = 0;
  $$("[data-m]", b).forEach(c => c.onclick = async () => {
    const [ex, v, dir] = modes[+c.dataset.m], my = ++run;
    $$("[data-m]", b).forEach(x => x.classList.toggle("on", x === c));
    const cells = () => $$(".cell", b);
    $(".cells", b).innerHTML = s.map((x, i) => `<div class="cell"><div class="nm">[${i + 1}]</div><div class="vl">${x}</div><div class="ps">…</div></div>`).join("");
    const order = dir === -1 ? [5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5];
    for (const i of order) { if (my !== run) return; const cl = cells()[i]; cl.classList.toggle("sel", v[i]); cl.querySelector(".ps").textContent = v[i] ? "TRUE" : "FALSE"; await sleep(REDUCED ? 0 : 200); }
    $(".mini", b).innerHTML = con([["in", "> " + ex], ["out", printVec(v, "lgl")]]);
  });
  $("[data-m]", b).click(); return el;
};

LABS.regex = () => {
  const [el, b] = labShell("Code-breaker", "Crack the pattern", "Type a pattern exactly as you would inside grepl(\"...\", x) in R. Matches glow, and each target cracks when your pattern catches exactly its strings.");
  const X = ["vault99", "OPEN", "1234", "gold_bar", "gold.bar", "x9Y8", "Ghost", "Viper"];
  const T = [["only letters and digits, start to end", "^[A-Za-z0-9]+$"], ["contains a digit", "[0-9]"], ["ends with a digit", "[0-9]$"], ["contains a literal dot", "\\."], ["starts with a capital letter", "^[A-Z]"]];
  b.innerHTML = `<div class="row"><label class="f" style="flex:1">pattern <input type="text" id="rx-in" value="^[A-Z]" style="width:100%"></label></div>
    <div class="row" style="margin-top:8px">${['^[A-Z]', '[0-9]', '\\\\.', '.', '^[A-Za-z0-9]+$', 'o', 'bar$'].map(p => `<button class="chip" data-p="${esc(p)}">"${esc(p)}"</button>`).join("")}</div>
    <div class="regex-list"></div><div class="mini"></div><div class="targets"></div>`;
  const cracked = new Set();
  const draw = () => {
    const raw = $("#rx-in", b).value; let re, err = null;
    try { re = new RegExp(raw.replace(/\\\\/g, "\\"), "g"); } catch (e) { err = e.message; }
    const hits = X.map(x => { if (!re) return false; re.lastIndex = 0; return re.test(x); });
    $(".regex-list", b).innerHTML = X.map((x, i) => {
      let shown = esc(x);
      if (re && hits[i]) { re.lastIndex = 0; shown = esc(x).replace(new RegExp(re.source, "g"), m => m ? `<mark>${m}</mark>` : m); }
      return `<div class="rx ${hits[i] ? "hit" : ""}"><span>${shown}</span><span class="idx">[${i + 1}]</span></div>`;
    }).join("");
    const code = `x = c(${X.map(x => `"${x}"`).join(", ")})`;
    $(".mini", b).innerHTML = err ? con([["in", `> grepl("${raw}", x)`], ["err", "Error: invalid regular expression"]])
      : con([["in", `> grepl("${raw}", x)`], ["out", printVec(hits, "lgl")], ["in", `> grep("${raw}", x)`], ["out", printVec(hits.map((h, i) => h ? i + 1 : null).filter(v => v !== null), "num")]]);
    T.forEach(([name, p], i) => { const r = new RegExp(p.replace(/\\\\/g, "\\")); const want = X.map(x => r.test(x)); if (!err && want.every((w, k) => w === hits[k])) { if (!cracked.has(i)) { cracked.add(i); const t = $$(".target", b)[i]; if (t) { const r2 = t.getBoundingClientRect(); coinBurst(r2.left + r2.width / 2, r2.top, 14); } } } });
    $(".targets", b).innerHTML = T.map(([name], i) => `<span class="target ${cracked.has(i) ? "cracked" : ""}">${cracked.has(i) ? "✓ " : "○ "}${name}</span>`).join("");
  };
  $("#rx-in", b).oninput = draw; $$("[data-p]", b).forEach(c => c.onclick = () => { $("#rx-in", b).value = c.dataset.p; draw(); });
  draw(); return el;
};

LABS.order = () => {
  const [el, b] = labShell("Lineup", "sort() gives values, order() gives positions", "Press the buttons and watch each suspect keep their original position number as they move.");
  const names = ["Ghost", "Viper", "Tinker", "Nova", "Blaze", "Echo"], v = [29, 34, 51, 26, 40, 23];
  const ord = v.map((x, i) => i).sort((a, c) => v[a] - v[c] || a - c);
  b.innerHTML = `<div class="row"><button class="chip on" data-s="0">crew$age</button><button class="chip" data-s="1">order(crew$age)</button></div>
    <div style="position:relative;height:140px;margin:14px 0" id="lu"></div><div class="mini"></div>`;
  const lu = $("#lu", b), W = 100 / 6;
  lu.innerHTML = names.map((n, i) => `<div class="cell" data-i="${i}" style="position:absolute;left:${i * W}%;width:calc(${W}% - 6px);bottom:0;transition:left .8s cubic-bezier(.6,-.3,.3,1.3),transform .8s"><div class="nm">was [${i + 1}]</div><div style="height:${v[i] * 1.6}px;background:linear-gradient(var(--gold-soft),transparent);border-top:2px solid var(--gold)"></div><div class="vl">${v[i]}</div><div class="ps">${n}</div></div>`).join("");
  const draw = sorted => {
    const pos = sorted ? ord : v.map((_, i) => i);
    pos.forEach((i, k) => { const c = $(`[data-i="${i}"]`, lu); c.style.left = `${k * W}%`; });
    $(".mini", b).innerHTML = sorted ? con([["in", "> order(crew$age)"], ["out", printVec(ord.map(i => i + 1), "num")], ["in", "> sort(crew$age)"], ["out", printVec(ord.map(i => v[i]), "num")], ["in", "> crew$codename[order(crew$age)]"], ["out", printVec(ord.map(i => names[i]), "chr")]]) : con([["in", "> crew$age"], ["out", printVec(v, "num")]]);
  };
  $$("[data-s]", b).forEach(c => c.onclick = () => { $$("[data-s]", b).forEach(x => x.classList.toggle("on", x === c)); draw(c.dataset.s === "1"); });
  draw(false); return el;
};

const CREW = [["Ghost", "hacker", "Berlin", 29, 20], ["Viper", "driver", "Tokyo", 34, 15], ["Tinker", "safecracker", "Rio", 51, 25], ["Nova", "inside man", "Berlin", 26, 15], ["Blaze", "explosives", "Tokyo", 40, 15], ["Echo", "lookout", "Denver", 23, 10]];
const JOBS = [["Ghost", "Museum", 4.0, 2025], ["Viper", "Casino", 2.5, 2025], ["Tinker", "Bank", 6.0, 2025], ["Tinker", "Train", 3.5, 2026], ["Nova", "Casino", 1.8, 2026], ["Rook", "Yacht", 5.2, 2026]];
LABS.joins = () => {
  const [el, b] = labShell("Planning table", "Six ways to join", "Green rows matched in both tables. Blue rows exist only in crew. Gold rows exist only in jobs.");
  const J = { inner: 'merge(crew, jobs, by.x = "codename", by.y = "alias")', left: "merge(…, all.x = TRUE)", right: "merge(…, all.y = TRUE)", full: "merge(…, all = TRUE)", anti: "crew[!crew$codename %in% jobs$alias, ]", semi: "crew[crew$codename %in% jobs$alias, ]" };
  b.innerHTML = `<div class="row">${Object.keys(J).map(k => `<button class="chip" data-j="${k}">${k}_join</button>`).join("")}</div><div id="jn-c"></div><div class="dim" id="jn-d"></div><div class="dtable-wrap"></div>
    <div class="legend-row"><span><i style="background:rgba(67,215,154,.4)"></i>matched</span><span><i style="background:rgba(98,210,245,.4)"></i>crew only</span><span><i style="background:rgba(244,195,90,.45)"></i>jobs only</span></div>`;
  $$("[data-j]", b).forEach(c => c.onclick = () => {
    const k = c.dataset.j; $$("[data-j]", b).forEach(x => x.classList.toggle("on", x === c));
    const rows = [], semi = k === "anti" || k === "semi";
    if (semi) CREW.forEach(a => { const has = JOBS.some(x => x[0] === a[0]); if ((k === "semi") === has) rows.push([has ? "m" : "xo", ...a]); });
    else {
      CREW.forEach(a => { const m = JOBS.filter(x => x[0] === a[0]); if (m.length) m.forEach(x => rows.push(["m", ...a, x[1], x[2], x[3]])); else if (k === "left" || k === "full") rows.push(["xo", ...a, null, null, null]); });
      if (k === "right" || k === "full") JOBS.filter(x => !CREW.some(a => a[0] === x[0])).forEach(x => rows.push(["yo", x[0], null, null, null, null, x[1], x[2], x[3]]));
    }
    const hdr = semi ? ["codename", "skill", "city", "age", "cut_pct"] : ["codename", "skill", "city", "age", "cut_pct", "target", "payout", "year"];
    $("#jn-c", b).innerHTML = codeBox(`crew %>% ${k}_join(jobs, by = join_by(codename == alias))\n# base R: ${J[k]}`);
    $("#jn-d", b).textContent = `${rows.length} rows × ${hdr.length} columns`;
    $(".dtable-wrap", b).innerHTML = `<table class="d"><tr>${hdr.map(h => `<th class="l">${h}</th>`).join("")}</tr>${rows.map((r, i) => `<tr class="${r[0]} slide" style="animation-delay:${i * 60}ms">${r.slice(1).map(v => v === null ? `<td class="l na">NA</td>` : `<td class="l">${esc(v)}</td>`).join("")}</tr>`).join("")}</table>`;
  });
  $("[data-j]", b).click(); return el;
};

LABS.pivot = () => {
  const [el, b] = labShell("Reshape", "Wide ⇄ long", "Press the button and watch every cell travel. Names duplicate, headers drop into rows, and values stack into one column.");
  const P = ["Ghost", "Viper", "Tinker"], Y = ["y2025", "y2026"], V = [[0.8, 0], [0.4, 0], [1.5, 0.9]];
  b.innerHTML = `<div class="row"><button class="btn primary" id="pv-go">pivot_longer()</button></div><div class="pv-stage" id="pv"></div><div id="pv-code"></div>`;
  const st = $("#pv", b); let long = false; const cells = [];
  const mk = (txt, cls) => { const d = document.createElement("div"); d.className = "pv-cell " + cls; d.textContent = txt; st.appendChild(d); cells.push(d); return d; };
  const H0 = mk("codename", "h"), HW = Y.map(y => mk(y, "h")), HL = ["year", "take"].map(y => mk(y, "h"));
  const N = [], YR = [], VL = [];
  P.forEach((p, i) => Y.forEach((y, j) => { N.push([mk(p, ""), i, j]); YR.push([mk(y, "y" + j), i, j]); VL.push([mk(V[i][j], "y" + j), i, j]); }));
  const at = (el, x, y, o = 1) => { el.style.transform = `translate(${x}px,${y}px)`; el.style.opacity = o; };
  const layout = () => {
    const X = [0, 100, 200], R = r => 36 + r * 34;
    at(H0, X[0], 0); HW.forEach((h, j) => at(h, X[1 + j], 0, long ? 0 : 1)); HL.forEach((h, j) => at(h, X[1 + j], 0, long ? 1 : 0));
    N.forEach(([e, i, j]) => at(e, X[0], long ? R(2 * i + j) : R(i), long || j === 0 ? 1 : 0));
    YR.forEach(([e, i, j]) => at(e, long ? X[1] : X[1 + j], long ? R(2 * i + j) : 0, long ? 1 : 0));
    VL.forEach(([e, i, j]) => at(e, long ? X[2] : X[1 + j], long ? R(2 * i + j) : R(i)));
    st.style.height = (long ? 36 + 6 * 34 : 36 + 3 * 34) + 10 + "px";
    $("#pv-go", b).textContent = long ? "pivot_wider()" : "pivot_longer()";
    $("#pv-code", b).innerHTML = codeBox(long ? 'takes_wide %>%\n  pivot_longer(!codename, names_to = "year", values_to = "take")    # 3 rows → 6 rows' : 'takes_long %>%\n  pivot_wider(names_from = year, values_from = take)                # 6 rows → 3 rows');
  };
  $("#pv-go", b).onclick = () => { long = !long; layout(); };
  layout(); return el;
};

/* dplyr pipeline builder on vault_log */
LABS.dplyr = () => {
  const [el, b] = labShell("Planner", "Plan the pipeline", "Add steps. Each one shows its dplyr code and the base-R way. Press Run in R to check the plan against real dplyr.");
  const COLS = ["night", "casino", "guards", "cash_k", "alarm", "shift"], NUM = ["night", "guards", "cash_k"];
  const DATA = LAB.vault_log.map(r => ({ night: r[0], casino: r[1], guards: r[2], cash_k: r[3], alarm: r[4], shift: r[5] }));
  const V = { filter: "filter", select: "select", arrange: "arrange", mutate: "mutate", summarise: "group_by + summarise", count: "count", slice_max: "slice_max", distinct: "distinct" };
  let steps = [{ v: "filter", col: "shift", op: "==", val: "night" }, { v: "summarise", g: "casino", fn: "mean", col: "cash_k" }];
  b.innerHTML = `<div class="steps"></div><div class="row" style="margin-top:10px"><select id="dp-add">${Object.entries(V).map(([k, v]) => `<option value="${k}">+ ${v}</option>`).join("")}</select><button class="btn" id="dp-addb">Add step</button><button class="btn primary" id="dp-run">▶ Run in R</button></div>
    <div class="split"><div><div class="dim">the plan</div><div id="dp-code"></div></div><div><div class="dim" id="dp-dim"></div><div class="dtable-wrap" id="dp-tab"></div></div></div><div id="dp-live"></div>`;
  const fmt = v => v === null ? "NA" : typeof v === "boolean" ? (v ? "TRUE" : "FALSE") : typeof v === "number" ? (Number.isInteger(v) ? String(v) : (+v.toFixed(3)).toString()) : v;
  const lit = (col, v) => col === "alarm" ? (v === "TRUE" ? "TRUE" : "FALSE") : NUM.includes(col) ? v : `"${v}"`;
  function run(){
    let cols = [...COLS], rows = DATA.map(r => ({ ...r })), grouped = false, err = null;
    const need = c => { if (!cols.includes(c)) throw new Error(`object '${c}' not found`); };
    try {
      for (const s of steps) {
        if (s.v === "filter") { need(s.col); const val = s.col === "alarm" ? s.val === "TRUE" : NUM.includes(s.col) ? +s.val : s.val; const f = { "==": (a, b) => a === b, "!=": (a, b) => a !== b, ">": (a, b) => a > b, "<": (a, b) => a < b, ">=": (a, b) => a >= b, "<=": (a, b) => a <= b }[s.op]; rows = rows.filter(r => f(r[s.col], val)); }
        else if (s.v === "select") { const keep = cols.filter(c => (s.cols || []).includes(c)); if (!keep.length) throw new Error("select() needs at least one column"); cols = keep; }
        else if (s.v === "arrange") { need(s.col); rows = rows.map((r, i) => [r, i]).sort((a, c) => { const x = a[0][s.col], y = c[0][s.col]; const d = x < y ? -1 : x > y ? 1 : 0; return (s.desc ? -d : d) || a[1] - c[1]; }).map(x => x[0]); }
        else if (s.v === "mutate") { const defs = { cash_m: ["cash_k / 1000", r => r.cash_k / 1000, ["cash_k"]], risk: ['ifelse(alarm, "HIGH", "low")', r => r.alarm ? "HIGH" : "low", ["alarm"]], per_guard: ["cash_k / guards", r => r.cash_k / r.guards, ["cash_k", "guards"]] }; const d = defs[s.what]; d[2].forEach(need); rows.forEach(r => r[s.what] = d[1](r)); if (!cols.includes(s.what)) cols.push(s.what); }
        else if (s.v === "summarise" || s.v === "count") {
          const g = s.v === "count" ? s.col : s.g; if (g) need(g); if (s.v === "summarise" && s.fn !== "n") need(s.col);
          const groups = new Map(); rows.forEach(r => { const k = g ? String(r[g]) : "_"; if (!groups.has(k)) groups.set(k, { key: r[g], rs: [] }); groups.get(k).rs.push(r); });
          const keys = [...groups.values()].sort((a, c) => (a.key > c.key ? 1 : a.key < c.key ? -1 : 0));
          const F = { mean: a => a.reduce((x, y) => x + y, 0) / a.length, sum: a => a.reduce((x, y) => x + y, 0), max: a => Math.max(...a), min: a => Math.min(...a), n: a => a.length };
          const out = s.v === "count" ? "n" : s.fn === "n" ? "n" : `${s.fn}_${s.col}`;
          rows = keys.map(k => { const o = g ? { [g]: k.key } : {}; o[out] = s.v === "count" ? k.rs.length : F[s.fn](k.rs.map(r => +r[s.col])); return o; });
          cols = g ? [g, out] : [out]; grouped = true;
        }
        else if (s.v === "slice_max") { need(s.col); const mx = Math.max(...rows.map(r => r[s.col])); rows = rows.filter(r => r[s.col] === mx); }
        else if (s.v === "distinct") { need(s.col); const seen = new Set(); rows = rows.filter(r => { const k = String(r[s.col]); if (seen.has(k)) return false; seen.add(k); return true; }).map(r => ({ [s.col]: r[s.col] })); cols = [s.col]; }
      }
    } catch (e) { err = e.message; }
    return { cols, rows, err, grouped };
  }
  function codeOf(s){
    if (s.v === "filter") return `filter(${s.col} ${s.op} ${lit(s.col, s.val)})`;
    if (s.v === "select") return `select(${(s.cols || []).join(", ")})`;
    if (s.v === "arrange") return `arrange(${s.desc ? `desc(${s.col})` : s.col})`;
    if (s.v === "mutate") return `mutate(${s.what} = ${{ cash_m: "cash_k / 1000", risk: 'ifelse(alarm, "HIGH", "low")', per_guard: "cash_k / guards" }[s.what]})`;
    if (s.v === "summarise") return `${s.g ? `group_by(${s.g}) %>%\n  ` : ""}summarise(${s.fn === "n" ? "n = n()" : `${s.fn}_${s.col} = ${s.fn}(${s.col})`})`;
    if (s.v === "count") return `count(${s.col})`;
    if (s.v === "slice_max") return `slice_max(${s.col})`;
    return `distinct(${s.col})`;
  }
  function baseOf(s){
    if (s.v === "filter") return `df[df$${s.col} ${s.op} ${lit(s.col, s.val)}, ]`;
    if (s.v === "select") return `df[, c(${(s.cols || []).map(c => `"${c}"`).join(", ")})]`;
    if (s.v === "arrange") return `df[order(${s.desc ? "-" : ""}df$${s.col}), ]`;
    if (s.v === "mutate") return `df$${s.what} = ...`;
    if (s.v === "summarise") return s.g ? `aggregate(${s.col} ~ ${s.g}, data = df, FUN = ${s.fn === "n" ? "length" : s.fn})` : `${s.fn === "n" ? "nrow(df)" : `${s.fn}(df$${s.col})`}`;
    if (s.v === "count") return `table(df$${s.col})`;
    if (s.v === "slice_max") return `df[df$${s.col} == max(df$${s.col}), ]`;
    return `unique(df["${s.col}"])`;
  }
  const code = () => "vault_log" + steps.map(s => " %>%\n  " + codeOf(s)).join("");
  const opt = (arr, v) => arr.map(x => `<option ${String(x) === String(v) ? "selected" : ""}>${x}</option>`).join("");
  function render(){
    $(".steps", b).innerHTML = `<div class="dim">vault_log  (60 nights × 6 columns)</div>` + steps.map((s, i) => {
      let f = "";
      if (s.v === "filter") f = `<label class="f">column<select data-k="col">${opt(COLS, s.col)}</select></label><label class="f">op<select data-k="op">${opt(["==", "!=", ">", "<", ">=", "<="], s.op)}</select></label><label class="f">value<input type="text" data-k="val" value="${esc(s.val)}" size="10"></label>`;
      else if (s.v === "select") f = `<div class="cols-pick">${COLS.concat(["cash_m", "risk", "per_guard"]).map(c => `<label><input type="checkbox" data-c="${c}" ${(s.cols || []).includes(c) ? "checked" : ""}>${c}</label>`).join("")}</div>`;
      else if (s.v === "arrange") f = `<label class="f">column<select data-k="col">${opt(COLS, s.col)}</select></label><label class="f">desc()<input type="checkbox" data-k="desc" ${s.desc ? "checked" : ""}></label>`;
      else if (s.v === "mutate") f = `<label class="f">new column<select data-k="what">${opt(["cash_m", "risk", "per_guard"], s.what)}</select></label>`;
      else if (s.v === "summarise") f = `<label class="f">group_by<select data-k="g"><option value="">(none)</option>${opt(["casino", "shift", "alarm"], s.g)}</select></label><label class="f">function<select data-k="fn">${opt(["mean", "sum", "max", "min", "n"], s.fn)}</select></label><label class="f">of<select data-k="col">${opt(NUM, s.col)}</select></label>`;
      else f = `<label class="f">column<select data-k="col">${opt(s.v === "slice_max" ? NUM : COLS, s.col)}</select></label>`;
      return `<div class="step" data-i="${i}"><span class="pipe">%&gt;%</span><b style="font-family:var(--f-mono);font-size:.85rem">${s.v === "summarise" ? "summarise" : s.v}</b>${f}<button class="rm" title="Remove step" aria-label="Remove step">✕</button><div class="base">base R: ${esc(baseOf(s))}</div></div>`;
    }).join("");
    const r = run();
    $("#dp-code", b).innerHTML = codeBox(code());
    if (r.err) { $("#dp-dim", b).textContent = "ALARM"; $("#dp-tab", b).innerHTML = con([["err", `Error: ${r.err}`], ["in", "A later step used a column an earlier step removed."]]); return; }
    $("#dp-dim", b).textContent = `${r.grouped ? "# A tibble: " : ""}${r.rows.length} × ${r.cols.length}${r.rows.length > 12 ? " (first 12 shown)" : ""}`;
    $("#dp-tab", b).innerHTML = `<table class="d"><tr>${r.cols.map(c => `<th class="${NUM.includes(c) || c.includes("_") || c === "n" ? "" : "l"}">${c}</th>`).join("")}</tr>${r.rows.slice(0, 12).map((row, i) => `<tr class="slide" style="animation-delay:${i * 25}ms">${r.cols.map(c => `<td class="${typeof row[c] === "number" ? "" : "l"}">${esc(fmt(row[c]))}</td>`).join("")}</tr>`).join("")}</table>`;
  }
  b.addEventListener("input", e => {
    const st = e.target.closest(".step"); if (!st) return; const s = steps[+st.dataset.i];
    if (e.target.dataset.c) { const c = e.target.dataset.c; s.cols = e.target.checked ? [...(s.cols || []), c] : (s.cols || []).filter(x => x !== c); }
    else if (e.target.dataset.k) s[e.target.dataset.k] = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    const pos = e.target.selectionStart; const keep = e.target.type === "text" ? e.target.dataset.k : null; render();
    if (keep) { const inp = $(`.step[data-i="${st.dataset.i}"] [data-k="${keep}"]`, b); inp.focus(); inp.setSelectionRange(pos, pos); }
  });
  b.addEventListener("click", e => { if (e.target.classList.contains("rm")) { steps.splice(+e.target.closest(".step").dataset.i, 1); render(); } });
  $("#dp-addb", b).onclick = () => {
    const v = $("#dp-add", b).value;
    steps.push({ filter: { v, col: "guards", op: "<=", val: "5" }, select: { v, cols: ["night", "casino", "cash_k"] }, arrange: { v, col: "cash_k", desc: true }, mutate: { v, what: "risk" }, summarise: { v, g: "casino", fn: "mean", col: "cash_k" }, count: { v, col: "casino" }, slice_max: { v, col: "cash_k" }, distinct: { v, col: "casino" } }[v]);
    render();
  };
  $("#dp-run", b).onclick = async () => {
    const out = $("#dp-live", b); out.innerHTML = `<div class="mini">${con([["in", "Starting R…"]])}</div>`;
    try { const res = await runLive(code(), { chunk: true, replay: [DPLYR_SETUP] }); out.innerHTML = ""; const r = renderLive(res); r.classList.add("mini"); out.appendChild(r); if (res.lines.some(l => l.t === "err")) alarm(out); }
    catch (e) { out.innerHTML = `<div class="mini">${con([["err", LIVE.msg || String(e)]])}</div>`; }
  };
  render(); return el;
};

/* plot control room: SVG base-R look-alike on mtcars */
LABS.plot = () => {
  const [el, b] = labShell("Control room", "The plot control room", "Every control is a real plot() argument. Press Run in R to compare with R's own drawing.");
  const D = LAB.mtcars.map(r => ({ name: r[0], mpg: r[1], hp: r[2], am: r[3], wt: r[4] }));
  const COL = ["black", "orange", "steelblue", "tomato", "#33a02c", "purple"], PCH = [1, 2, 3, 4, 0, 5, 15, 16, 17, 19];
  b.innerHTML = `<div class="plot-grid"><div><svg class="plot-svg" viewBox="0 0 520 400"></svg></div><div class="ctrls">
    <label class="f">x<select id="pl-x"><option>hp</option><option>wt</option></select></label>
    <label class="f">type<select id="pl-type"><option>p</option><option>l</option><option>b</option></select></label>
    <label class="f">pch<select id="pl-pch">${PCH.map(p => `<option ${p === 1 ? "selected" : ""}>${p}</option>`).join("")}</select></label>
    <label class="f">cex <input type="range" id="pl-cex" min="0.5" max="3" step="0.25" value="1"></label>
    <label class="f">col<select id="pl-col">${COL.map(c => `<option>${c}</option>`).join("")}</select></label>
    <label class="f">lty / lwd<select id="pl-lty"><option value="1">1 solid</option><option value="2">2 dashed</option><option value="3">3 dotted</option></select></label>
    <label class="f full">main<input type="text" id="pl-main" value="Miles/Gallon v.s. Horsepower"></label>
    <label class="f">xlab<input type="text" id="pl-xlab" value="Horsepower"></label><label class="f">ylab<input type="text" id="pl-ylab" value="Miles/Gallon"></label>
    <label class="f"><span><input type="checkbox" id="pl-grp"> color by am + legend</span></label><label class="f"><span><input type="checkbox" id="pl-txt"> text() labels</span></label>
    </div></div><div id="pl-code"></div><div class="row" style="margin-top:8px"><button class="btn primary" id="pl-run">▶ Run in R</button></div><div id="pl-live"></div>`;
  const pretty = (lo, hi) => { const raw = (hi - lo) / 5, p = Math.pow(10, Math.floor(Math.log10(raw))), s = [1, 2, 5, 10].map(k => k * p).find(k => k >= raw) || 10 * p, t = []; for (let v = Math.ceil(lo / s) * s; v <= hi + 1e-9; v += s) t.push(+v.toFixed(6)); return t; };
  const shape = (pch, x, y, r, col) => {
    const f = [15, 16, 17, 19].includes(pch), st = `stroke="${col}" stroke-width="1.3" fill="${f ? col : "none"}"`;
    if (pch === 1 || pch === 16 || pch === 19) return `<circle cx="${x}" cy="${y}" r="${pch === 19 ? r * 1.1 : r}" ${st}/>`;
    if (pch === 2 || pch === 17) return `<path d="M${x} ${y - r * 1.2}L${x + r * 1.1} ${y + r * .8}L${x - r * 1.1} ${y + r * .8}Z" ${st}/>`;
    if (pch === 0 || pch === 15) return `<rect x="${x - r}" y="${y - r}" width="${2 * r}" height="${2 * r}" ${st}/>`;
    if (pch === 5) return `<path d="M${x} ${y - r * 1.3}L${x + r * 1.3} ${y}L${x} ${y + r * 1.3}L${x - r * 1.3} ${y}Z" ${st}/>`;
    if (pch === 3) return `<path d="M${x - r * 1.2} ${y}H${x + r * 1.2}M${x} ${y - r * 1.2}V${y + r * 1.2}" ${st}/>`;
    return `<path d="M${x - r} ${y - r}L${x + r} ${y + r}M${x + r} ${y - r}L${x - r} ${y + r}" ${st}/>`;
  };
  const g = id => $("#" + id, b);
  function draw(){
    const X = g("pl-x").value, type = g("pl-type").value, pch = +g("pl-pch").value, cex = +g("pl-cex").value, col = g("pl-col").value, lty = +g("pl-lty").value, grp = g("pl-grp").checked, txt = g("pl-txt").checked;
    const main = g("pl-main").value, xlab = g("pl-xlab").value, ylab = g("pl-ylab").value;
    const xs = D.map(d => d[X]), ys = D.map(d => d.mpg), xr = [Math.min(...xs), Math.max(...xs)], yr = [Math.min(...ys), Math.max(...ys)];
    const pad = r => [r[0] - .04 * (r[1] - r[0]), r[1] + .04 * (r[1] - r[0])], xl = pad(xr), yl = pad(yr);
    const L = 62, R = 500, T = 50, B = 340, sx = v => L + (v - xl[0]) / (xl[1] - xl[0]) * (R - L), sy = v => B - (v - yl[0]) / (yl[1] - yl[0]) * (B - T);
    const cols = D.map(d => grp ? (d.am ? "#33a02c" : "#a6cee3") : col), r = 3.3 * cex;
    let s = `<rect x="${L}" y="${T}" width="${R - L}" height="${B - T}" fill="none" stroke="#000"/>`;
    pretty(xl[0], xl[1]).filter(v => v >= xl[0] && v <= xl[1]).forEach(v => s += `<line x1="${sx(v)}" x2="${sx(v)}" y1="${B}" y2="${B + 6}" stroke="#000"/><text x="${sx(v)}" y="${B + 20}" font-size="12" text-anchor="middle">${v}</text>`);
    pretty(yl[0], yl[1]).filter(v => v >= yl[0] && v <= yl[1]).forEach(v => s += `<line x1="${L - 6}" x2="${L}" y1="${sy(v)}" y2="${sy(v)}" stroke="#000"/><text x="${L - 10}" y="${sy(v)}" font-size="12" text-anchor="middle" transform="rotate(-90 ${L - 10} ${sy(v)})">${v}</text>`);
    s += `<text x="${(L + R) / 2}" y="30" font-size="15" font-weight="700" text-anchor="middle">${esc(main)}</text><text x="${(L + R) / 2}" y="${B + 42}" font-size="13" text-anchor="middle">${esc(xlab)}</text><text x="18" y="${(T + B) / 2}" font-size="13" text-anchor="middle" transform="rotate(-90 18 ${(T + B) / 2})">${esc(ylab)}</text>`;
    if (type !== "p") s += `<polyline points="${D.map(d => `${sx(d[X])},${sy(d.mpg)}`).join(" ")}" fill="none" stroke="${grp ? "#555" : col}" stroke-width="${lty === 1 ? 1.2 : 1.4}" stroke-dasharray="${lty === 2 ? "6 4" : lty === 3 ? "1.5 3" : ""}" ${type === "b" ? 'stroke-dashoffset="0"' : ""}/>`;
    if (type !== "l") D.forEach((d, i) => s += shape(pch, sx(d[X]), sy(d.mpg), r, cols[i]));
    if (txt) D.forEach(d => s += `<text x="${sx(d[X]) + 6}" y="${sy(d.mpg) + 3}" font-size="6.5">${esc(d.name)}</text>`);
    if (grp) s += `<g transform="translate(${R - 128},${T + 12})"><rect width="118" height="58" fill="#fff" stroke="#000"/><text x="59" y="16" font-size="11" text-anchor="middle">Transmission</text>${shape(pch, 16, 32, 3.3, "#a6cee3")}<text x="28" y="36" font-size="11">Automatic</text>${shape(pch, 16, 48, 3.3, "#33a02c")}<text x="28" y="52" font-size="11">Manual</text></g>`;
    $("svg", b).innerHTML = s;
    const args = [`x = mtcars$${X}`, "y = mtcars$mpg"];
    if (type !== "p") args.push(`type = "${type}"`); if (pch !== 1) args.push(`pch = ${pch}`); if (cex !== 1) args.push(`cex = ${cex}`);
    if (lty !== 1 && type !== "p") args.push(`lty = ${lty}`);
    args.push(grp ? 'col = ifelse(mtcars$am == 1, "#33a02c", "#a6cee3")' : col !== "black" ? `col = "${col}"` : null);
    if (main) args.push(`main = "${main}"`); if (xlab) args.push(`xlab = "${xlab}"`); if (ylab) args.push(`ylab = "${ylab}"`);
    let code = `plot(${args.filter(Boolean).join(",\n     ")})`;
    if (grp) code += `\nlegend("topright", legend = c("Automatic", "Manual"),\n       col = c("#a6cee3", "#33a02c"), pch = ${pch}, title = "Transmission")`;
    if (txt) code += `\ntext(x = mtcars$${X}, y = mtcars$mpg, rownames(mtcars), cex = 0.5, pos = 4)`;
    $("#pl-code", b).innerHTML = codeBox(code) + (type !== "p" ? `<p class="explain"><b>Lines join points in row order</b>, not left to right, which is why they zigzag. Sort the data by x first to get a clean line.</p>` : "");
    b._code = code;
  }
  b.addEventListener("input", draw);
  $("#pl-run", b).onclick = async () => { const out = $("#pl-live", b); out.innerHTML = `<div class="mini">${con([["in", "Starting R…"]])}</div>`; try { const res = await runLive(b._code, { width: 560, height: 430 }); out.innerHTML = ""; out.appendChild(renderLive(res)); } catch (e) { out.innerHTML = `<div class="mini">${con([["err", LIVE.msg || String(e)]])}</div>`; } };
  draw(); return el;
};
