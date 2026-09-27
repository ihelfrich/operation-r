/* ---------- pages ---------- */
const DPLYR_SETUP = M.find(m => m.id === "m7").setup;
let revealAll = false;
const pad2 = n => String(n).padStart(2, "0");

function transcript(id){ return (OUT.out[id] || []).map(x => `<pre class="${x.t}">${esc(x.x)}</pre>`).join(""); }
function monitor(src){ return `<div class="monitor"><span class="rec">REC</span><img alt="R plot" src="${src}"></div>`; }

function editor(code, onRun){
  const w = document.createElement("div"); w.className = "editor";
  w.innerHTML = `<pre class="hl" aria-hidden="true"></pre><textarea spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="R code, editable"></textarea>`;
  const ta = $("textarea", w), pre = $("pre", w);
  const sync = () => { pre.innerHTML = hl(ta.value) + "\n"; };
  ta.value = code; sync();
  ta.addEventListener("input", () => { sync(); w.dispatchEvent(new CustomEvent("edit")); startR().catch(() => {}); });
  ta.addEventListener("keydown", e => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); onRun(); }
    if (e.key === "Tab") { e.preventDefault(); ta.setRangeText("  ", ta.selectionStart, ta.selectionEnd, "end"); sync(); }
  });
  w.get = () => ta.value; w.set = v => { ta.value = v; sync(); };
  return w;
}

function chunk(b, m){
  const el = document.createElement("div"); el.className = "chunk";
  el.innerHTML = `<div class="chunk-bar"><span class="tag">\`\`\`{r ${b.code}}</span><span class="edited" hidden>edited</span><button class="btn rs" hidden>Reset</button><button class="btn cp">Copy</button><button class="btn primary run">▶ Run</button></div>
    <div class="ed"></div>${b.norun ? `<div class="norun-note">This chunk needs files on your own computer, so it only runs in RStudio. You can still edit it and try something else.</div>` : ""}<div class="outwrap">${b.norun ? "" : `<div class="predict">▸ Predict the output out loud, then press Run. You can edit the code, too.</div>`}</div>`;
  const run = $(".run", el), ow = $(".outwrap", el), rs = $(".rs", el), edtag = $(".edited", el);
  const ed = editor(b.src, () => doRun()); $(".ed", el).appendChild(ed);
  ed.addEventListener("edit", () => { const ch = ed.get() !== b.src; rs.hidden = !ch; edtag.hidden = !ch; });
  rs.onclick = () => { ed.set(b.src); rs.hidden = edtag.hidden = true; showRecorded(); };
  const cp = $(".cp", el); cp.onclick = () => navigator.clipboard?.writeText(ed.get()).then(() => { cp.textContent = "Copied"; setTimeout(() => cp.textContent = "Copy", 1200); }).catch(() => {});
  const showRecorded = () => {
    if (b.norun) { ow.innerHTML = ""; return; }
    ow.innerHTML = `<div class="console">${transcript(b.code)}</div>` + (OUT.plots[b.code] ? monitor(OUT.plots[b.code]) : "") + `<div class="src-note">recorded in R 4.6.1</div>`;
    el.dataset.shown = 1;
    if ((OUT.out[b.code] || []).some(x => x.t === "err")) alarm(el);
  };
  const doRun = async () => {
    if (ed.get() === b.src && !b.norun) { showRecorded(); return; }
    ow.innerHTML = `<div class="predict lv">${LIVE.state === "ready" ? "Running…" : "Starting R in your browser (about 40 MB the first time)…"}</div>`;
    const upd = (s, msg) => { const x = $(".lv", ow); if (x && s === "loading") x.textContent = msg; }; LIVE.listeners.add(upd);
    run.disabled = true;
    try {
      const idx = m.blocks.indexOf(b);
      const replay = [m.setup, ...m.blocks.slice(0, idx).filter(x => x.code && !x.norun).map(x => x.src)];
      const res = await runLive(ed.get(), { replay, chunk: true });
      ow.innerHTML = ""; ow.appendChild(renderLive(res)); ow.insertAdjacentHTML("beforeend", `<div class="src-note live">ran live in your browser</div>`);
      if (res.lines.some(l => l.t === "err")) alarm(el);
    } catch (e) { ow.innerHTML = con([["err", LIVE.msg || String(e)]]); }
    finally { run.disabled = false; LIVE.listeners.delete(upd); }
  };
  run.onclick = () => (el.dataset.shown && ed.get() === b.src) ? (ow.innerHTML = `<div class="predict">▸ Predict the output out loud, then press Run.</div>`, el.dataset.shown = "") : doRun();
  el._show = showRecorded;
  if (revealAll && !b.norun) showRecorded();
  return el;
}

function hashN(s){ let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }
function quizCard(m, q, i, label){
  const qid = `${m.id}_q${i}`, answer = q.answer ?? OUT.quiz[qid];
  const opts = [...q.choices], pos = hashN(qid) % (opts.length + 1); opts.splice(pos, 0, answer);
  const mono = !!q.code || /[()"\[]/.test(answer);
  const el = document.createElement("div"); el.className = "qcard";
  el.innerHTML = `<div class="qhead"><span class="qnum">${label}</span><div class="q">${q.q}</div></div>${q.code ? `<pre class="code">${hl(q.code)}</pre>` : ""}
    <div class="choices">${opts.map((o, k) => `<button class="choice" data-k="${k}">${mono ? `<pre>${esc(o)}</pre>` : esc(o)}</button>`).join("")}</div><div class="whyslot"></div>`;
  const btns = $$(".choice", el);
  const settle = k => {
    btns.forEach((b, j) => { b.disabled = true; if (j === pos) b.classList.add("right"); else if (j === k) b.classList.add("wrong"); });
    const ok = k === pos;
    $(".whyslot", el).innerHTML = `<div class="why"><span class="res ${ok ? "ok" : "no"}">${ok ? "Clean." : "Busted."}</span> ${q.why}${q.code ? `<div class="console" style="margin-top:8px;border-radius:6px"><pre class="in">R says:</pre><pre>${esc(answer)}</pre></div>` : ""}</div>`;
  };
  btns.forEach((b, k) => b.onclick = () => { SAVE.quiz[qid] = k === pos ? 1 : 0; persist(); settle(k); if (k === pos) { const r = b.getBoundingClientRect(); coinBurst(r.left + r.width / 2, r.top, 10); } else alarm(el); });
  return el;
}

function jobCard(m, j, i){
  const id = `${m.id}_j${i}`, el = document.createElement("div"); el.className = "job" + (SAVE.jobs[id] ? " solved" : "");
  const setup = m.setup + "\n" + (j.setup || "");
  el.innerHTML = `<div class="job-h"><span class="no">JOB ${pad2(i + 1)}</span><b>${j.title}</b><span class="stampslot">${SAVE.jobs[id] ? `<span class="stamp">CRACKED</span>` : ""}</span><span class="pay">$${j.pay.toFixed(1)}M</span></div>
    <p class="job-p">${j.prompt}</p>${j.setup ? `<details style="margin:8px 16px 0"><summary class="dim" style="cursor:pointer">already set up for you</summary><pre class="code" style="border-radius:8px;border:1px solid var(--line)">${hl(j.setup)}</pre></details>` : ""}
    <div class="chunk"><div class="chunk-bar"><span class="tag">your code: replace every ___</span><button class="btn rs">Reset</button><button class="btn primary go">▶ Run &amp; check</button></div><div class="ed"></div><div class="outwrap"></div></div>
    <div class="verdict-slot"></div><div class="job-foot"><button class="btn hint-b">Hint</button><button class="btn danger peek">Reveal solution (half pay)</button></div><div class="hint" hidden>${j.hint}</div>`;
  const saved = SAVE.code?.[id];
  const ed = editor(saved || j.starter, () => go()); $(".ed", el).appendChild(ed);
  const ow = $(".outwrap", el), vs = $(".verdict-slot", el), gob = $(".go", el);
  ed.addEventListener("edit", () => { SAVE.code = SAVE.code || {}; SAVE.code[id] = ed.get(); persist(); });
  $(".rs", el).onclick = () => { ed.set(j.starter); if (SAVE.code) delete SAVE.code[id]; persist(); };
  $(".hint-b", el).onclick = () => { $(".hint", el).hidden = !$(".hint", el).hidden; };
  $(".peek", el).onclick = () => { if (!SAVE.jobs[id]) SAVE.peek[id] = 1; persist(); ed.set(j.solution); vs.innerHTML = `<div class="verdict-box info">Solution loaded. Run it, then read why it works. Solving it now pays half.</div>`; };
  async function go(){
    const code = ed.get();
    if (code.includes("___")) { vs.innerHTML = `<div class="verdict-box fail">Fill in every ___ blank first.</div>`; alarm(el); return; }
    gob.disabled = true; ow.innerHTML = `<div class="predict lv">${LIVE.state === "ready" ? "Running your plan…" : "Starting R in your browser (about 40 MB the first time)…"}</div>`;
    const upd = (s, msg) => { const x = $(".lv", ow); if (x && s === "loading") x.textContent = msg; }; LIVE.listeners.add(upd);
    try {
      const res = await runLive(code, { replay: [setup], chunk: true });
      ow.innerHTML = ""; ow.appendChild(renderLive(res));
      const verdict = await gradeLive(code, setup, j.solution, j.check || "", !!j.unordered);
      if (verdict === "PASS") {
        const first = !SAVE.jobs[id]; SAVE.jobs[id] = 1; persist();
        const pay = j.pay * (SAVE.peek[id] ? .5 : 1);
        vs.innerHTML = `<div class="verdict-box pass">✓ CRACKED. R checked your answer against the target and it matches.${first ? ` +$${pay.toFixed(2)}M` : ""}</div>`;
        el.classList.add("solved"); $(".stampslot", el).innerHTML = `<span class="stamp">CRACKED</span>`;
        if (first) { const r = gob.getBoundingClientRect(); coinBurst(r.left + r.width / 2, r.top, 60); toast(`${SAVE.codename || "ROOKIE"} +$${pay.toFixed(1)}M`); updateTake(); nav(); }
      } else { vs.innerHTML = `<div class="verdict-box fail">${esc(verdict)}</div>`; alarm(el); }
    } catch (e) { vs.innerHTML = `<div class="verdict-box fail">${esc(LIVE.msg || String(e))} Live R is needed to check jobs. Use Reveal solution to study the answer instead.</div>`; }
    finally { gob.disabled = false; LIVE.listeners.delete(upd); }
  }
  gob.onclick = go;
  return el;
}

function typewriter(el, text){
  if (REDUCED) { el.textContent = text; return; }
  el.setAttribute("aria-label", text); let k = 0; el.textContent = "";
  const caret = document.createElement("span"); caret.className = "caret";
  const t = setInterval(() => { k += 2; el.textContent = text.slice(0, k); el.appendChild(caret); if (k >= text.length) { clearInterval(t); setTimeout(() => caret.remove(), 1500); } }, 16);
}

function missionPage(m){
  const p = document.createElement("div"); p.className = "page";
  const hs = m.blocks.filter(b => b.h), [jd, jn] = jobsDone(m);
  p.innerHTML = `<div class="file-tab"><b>CLASSIFIED</b> ${m.lec} · ${m.room} · jobs ${jd}/${jn}</div>
    <h1 class="m-title"><span class="n">MISSION ${pad2(m.num)}</span><br>${esc(m.title)}</h1><p class="m-tag">${m.tagline}</p>
    <div class="brief"><span class="lbl">BRIEFING</span><span class="tw"></span></div>
    <ul class="objectives">${m.objectives.map(o => `<li>${esc(o)}</li>`).join("")}</ul>
    <ul class="toc">${hs.map((h, i) => `<li><a href="#${m.id}" data-sec="${m.id}-s${i}">${esc(h.h)}</a></li>`).join("")}<li><a href="#${m.id}" data-sec="${m.id}-jobs">The jobs</a></li><li><a href="#${m.id}" data-sec="${m.id}-quiz">Interrogation</a></li></ul><div class="prose"></div>`;
  typewriter($(".tw", p), m.brief);
  const pr = $(".prose", p); let hi = 0;
  for (const b of m.blocks) {
    if (b.h) pr.insertAdjacentHTML("beforeend", `<h2 class="sec-h" id="${m.id}-s${hi++}">${esc(b.h)}</h2>`);
    else if (b.p) pr.insertAdjacentHTML("beforeend", `<p>${b.p}</p>`);
    else if (b.ul) pr.insertAdjacentHTML("beforeend", `<ul>${b.ul.map(x => `<li>${x}</li>`).join("")}</ul>`);
    else if (b.trap) pr.insertAdjacentHTML("beforeend", `<div class="trap"><b class="lbl">TRIPWIRE</b>${b.trap}</div>`);
    else if (b.table) pr.insertAdjacentHTML("beforeend", `<div class="tbl-wrap"><table class="t"><tr>${b.table[0].map(x => `<th>${x}</th>`).join("")}</tr>${b.table.slice(1).map(r => `<tr>${r.map(x => `<td>${x}</td>`).join("")}</tr>`).join("")}</table></div>`);
    else if (b.math) pr.insertAdjacentHTML("beforeend", `<div class="math"><math display="block"><mfrac><mrow><msqrt><mi>n</mi></msqrt><mo>(</mo><mover><mi>X</mi><mo>¯</mo></mover><mo>−</mo><mi>μ</mi><mo>)</mo></mrow><mover><mi>σ</mi><mo>^</mo></mover></mfrac><mover><mo>→</mo><mi>d</mi></mover><mi mathvariant="script">N</mi><mo>(</mo><mn>0</mn><mo>,</mo><mn>1</mn><mo>)</mo></math><code>$$${esc(b.math)}$$</code></div>`);
    else if (b.code) pr.appendChild(chunk(b, m));
    else if (b.lab && LABS[b.lab]) { try { pr.appendChild(LABS[b.lab]()); } catch (e) { console.error(b.lab, e); } }
  }
  const js = document.createElement("section"); js.className = "jobs";
  js.innerHTML = `<h2 class="sec-h" id="${m.id}-jobs">The jobs</h2><p class="explain">Real R checks every answer. Store your final answer in <code>ans</code> unless the job says otherwise. Each job you crack adds to the take.</p>`;
  m.jobs.forEach((j, i) => js.appendChild(jobCard(m, j, i))); p.appendChild(js);
  const qz = document.createElement("section"); qz.className = "quiz";
  qz.innerHTML = `<h2 class="sec-h" id="${m.id}-quiz">Interrogation</h2><p class="explain">Answer before you look anything up. Wrong answers trip the alarm, and that's where the learning is.</p>`;
  m.quiz.forEach((q, i) => qz.appendChild(quizCard(m, q, i, `Q${i + 1}`))); p.appendChild(qz);
  const i = M.indexOf(m), pv = M[i - 1], nx = M[i + 1];
  p.insertAdjacentHTML("beforeend", `<div class="pager">${pv ? `<a href="#${pv.id}"><small>← Mission ${pad2(pv.num)}</small>${pv.title}</a>` : `<a href="#home"><small>←</small>The map</a>`}${nx ? `<a class="nx" href="#${nx.id}"><small>Mission ${pad2(nx.num)} →</small>${nx.title}</a>` : `<a class="nx" href="#final"><small>Final →</small>The Big Score</a>`}</div>`);
  $$("[data-sec]", p).forEach(a => a.onclick = e => { e.preventDefault(); document.getElementById(a.dataset.sec)?.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth" }); });
  return p;
}

function mapSVG(){
  const pos = [[30, 30], [180, 30], [330, 30], [480, 30], [480, 150], [330, 150], [180, 150], [30, 150], [30, 270], [180, 270]];
  const rooms = M.map((m, k) => { const [x, y] = pos[k], [d, n] = jobsDone(m); return `<a href="#${m.id}" class="room ${d === n ? "done" : ""}"><rect x="${x}" y="${y}" width="130" height="92" rx="4"/><text class="rn" x="${x + 10}" y="${y + 26}">${pad2(m.num)}</text><text x="${x + 10}" y="${y + 48}">${esc(m.room)}</text><text x="${x + 10}" y="${y + 66}" fill="#8FA8C9">${m.lec}</text><text x="${x + 10}" y="${y + 82}" fill="#F4C35A">${"■".repeat(d)}${"□".repeat(n - d)}</text></a>`; }).join("");
  const [fd, fn] = [CAP.jobs.filter((_, i) => SAVE.jobs[`final_j${i}`]).length, CAP.jobs.length];
  const route = [...pos.map(([x, y]) => [x + 65, y + 46]), [470, 316]].map(([x, y]) => `${x},${y}`).join(" ");
  return `<svg class="map" viewBox="0 0 640 380" role="img" aria-label="Heist map: ten missions and the vault">
    <polyline class="route" points="${route}"/>${rooms}
    <a href="#final" class="room ${fd === fn ? "done" : ""}"><rect x="330" y="270" width="280" height="92" rx="4" style="stroke-width:2.5"/><circle cx="560" cy="316" r="30" fill="none" stroke="#F4C35A" stroke-width="3"/><circle cx="560" cy="316" r="6" fill="#F4C35A"/><text class="rn" x="342" y="298">VAULT</text><text x="342" y="318">The Big Score</text><text x="342" y="340" fill="#F4C35A">${"■".repeat(fd)}${"□".repeat(fn - fd)}</text></a>
    <line class="laser" x1="165" y1="10" x2="165" y2="130"/><line class="laser" x1="315" y1="135" x2="315" y2="255" style="animation-delay:-1.2s"/><line class="laser" x1="465" y1="255" x2="465" y2="375" style="animation-delay:-.6s"/></svg>`;
}

function homePage(){
  const p = document.createElement("div"), t = takeTotal(); p.className = "page";
  p.innerHTML = `<div class="hero"><div><div class="file-tab"><b>TOP SECRET</b> crew briefing</div><h1>Operation <em>R</em></h1>
    <p>Learn R by pulling off one long job. Ten missions take you from your first variable to dplyr pipelines, plots and simulation. Every code chunk is live R you can edit, every job is checked by real R, and every answer you crack adds to the take.</p>
    <div class="crew-cards"><div class="dossier"><span class="role">Your codename</span><b><input id="codename" maxlength="14" aria-label="Your codename" value="${esc(SAVE.codename || "ROOKIE")}"></b><span class="stat">saved in this browser only</span></div>
    <div class="dossier"><span class="role">Current take</span><b style="color:var(--gold)">$${t.toFixed(1)}M</b><span class="stat">of $${MAXTAKE.toFixed(1)}M · ${rankOf(t)}</span></div>
    <div class="dossier"><span class="role">Jobs cracked</span><b>${ALLJOBS.filter(j => SAVE.jobs[j.id]).length} / ${ALLJOBS.length}</b><span class="stat">R grades every one</span></div></div></div>
    <div class="map-wrap">${mapSVG()}</div></div>
    <div class="loop"><div><span class="k">STEP 1</span><b>Predict</b><span>Read each chunk and say the output out loud before you run it.</span></div><div><span class="k">STEP 2</span><b>Run &amp; break</b><span>Press Run, then change the code and run it again. Errors trip the alarm, and that's fine.</span></div><div><span class="k">STEP 3</span><b>Crack the jobs</b><span>Write your own code. Real R checks it and pays out.</span></div></div>
    <h2 class="sec-h">The case files</h2><p class="prose">Three tables are loaded in every mission, in every chunk and in the console: <code>crew</code> (six specialists), <code>jobs</code> (the ledger, including a stranger called Rook), and <code>vault_log</code> (60 nights of casino surveillance, simulated with <code>set.seed(1337)</code> so every computer gets the same numbers).</p>`;
  const cn = $("#codename", p);
  cn.addEventListener("input", () => { SAVE.codename = cn.value.toUpperCase().replace(/[^A-Z0-9 _-]/g, ""); cn.value = SAVE.codename; persist(); });
  const cf = M.find(m => m.id === "m4").blocks.find(b => b.code === "m4_casefiles");
  p.appendChild(chunk(cf, M.find(m => m.id === "m4")));
  return p;
}

function finalPage(){
  const p = document.createElement("div"); p.className = "page";
  const done = () => CAP.jobs.every((_, i) => SAVE.jobs[`final_j${i}`]);
  p.innerHTML = `<div class="file-tab"><b>FINAL</b> everything at once</div><h1 class="m-title"><span class="n">THE VAULT</span><br>The Big Score</h1><p class="m-tag">${CAP.brief}</p>
    <div class="bigvault ${done() ? "open" : ""}"><svg viewBox="0 0 320 320"><circle cx="160" cy="160" r="150" fill="#0D2342" stroke="#8FA8C9" stroke-width="6"/><g class="door"><circle cx="160" cy="160" r="128" fill="#16263D" stroke="#62D2F5" stroke-width="3"/>${Array.from({ length: 24 }, (_, k) => `<line x1="160" y1="44" x2="160" y2="${k % 2 ? 56 : 64}" stroke="#8FA8C9" transform="rotate(${k * 15} 160 160)"/>`).join("")}<circle cx="160" cy="160" r="50" fill="#223A5C" stroke="#F4C35A" stroke-width="4"/><path d="M160 110V210M110 160H210" stroke="#F4C35A" stroke-width="8" stroke-linecap="round"/><circle cx="160" cy="160" r="14" fill="#F4C35A"/></g><text x="160" y="170" text-anchor="middle" font-family="Saira Stencil One" font-size="34" fill="#F4C35A" opacity="${done() ? 1 : 0}">$${MAXTAKE.toFixed(0)}M</text></svg></div>
    <div class="jobs" style="margin-top:10px"></div>`;
  const js = $(".jobs", p); CAP.jobs.forEach((j, i) => js.appendChild(jobCard(CAP, j, i)));
  const obs = setInterval(() => { if (!document.body.contains(p)) return clearInterval(obs); const v = $(".bigvault", p); if (done() && !v.classList.contains("open")) { v.classList.add("open"); $("text", v).setAttribute("opacity", 1); for (let k = 0; k < 5; k++) setTimeout(() => coinBurst(innerWidth * (0.2 + 0.15 * k), innerHeight * .3, 50), k * 250); toast("THE VAULT IS OPEN"); } }, 800);
  return p;
}

function nav(){
  const cur = location.hash.slice(1) || "home";
  $("#nav").innerHTML = `<div class="nav-label">Base</div><a href="#home" class="${cur === "home" ? "on" : ""}"><span class="ix">⌂</span>The map<span></span></a><div class="nav-label">Missions</div>` +
    M.map(m => { const [d, n] = jobsDone(m); return `<a href="#${m.id}" class="${cur === m.id ? "on" : ""}"><span class="ix">${pad2(m.num)}</span>${m.title}<span class="pg ${d === n ? "full" : ""}">${d}/${n}</span></a>`; }).join("") +
    `<div class="nav-label">Finale</div><a href="#final" class="${cur === "final" ? "on" : ""}"><span class="ix">◎</span>The Big Score<span class="pg">${CAP.jobs.filter((_, i) => SAVE.jobs["final_j" + i]).length}/${CAP.jobs.length}</span></a>`;
}
let firstRoute = true;
function route(){
  const id = location.hash.slice(1) || "home", m = M.find(x => x.id === id);
  const label = m ? pad2(m.num) : id === "final" ? "◎" : "R";
  const swap = () => { const main = $("#main"); main.innerHTML = ""; main.appendChild(m ? missionPage(m) : id === "final" ? finalPage() : homePage()); nav(); window.scrollTo(0, 0); $(".side").classList.remove("open"); };
  if (firstRoute) { firstRoute = false; swap(); } else vaultDoors(label, swap);
}
window.addEventListener("hashchange", route);
$("#t-reveal").onclick = e => { revealAll = !revealAll; e.currentTarget.setAttribute("aria-pressed", revealAll); if (revealAll) $$(".chunk").forEach(c => { if (!c.dataset.shown && c._show) c._show(); }); };
$("#t-present").onclick = e => { const on = document.body.classList.toggle("present"); e.currentTarget.setAttribute("aria-pressed", on); };
$("#menu").onclick = () => $(".side").classList.toggle("open");
$("#stop-r").onclick = () => stopR();
document.addEventListener("keydown", e => { if (e.target.closest("input,textarea,select")) return; const i = M.findIndex(m => m.id === location.hash.slice(1));
  if (e.key === "ArrowRight" && i >= 0) location.hash = i < M.length - 1 ? M[i + 1].id : "final";
  if (e.key === "ArrowLeft" && i > 0) location.hash = M[i - 1].id; });

/* floating R console */
(function(){
  const d = document.createElement("div"); d.className = "drawer"; d.hidden = true;
  d.innerHTML = `<div class="drawer-h"><b>R CONSOLE</b><span class="st"></span><button class="btn" id="dr-clear">Clear</button><button class="btn" id="dr-x" aria-label="Close console">✕</button></div>
    <div class="console dr-out"><pre class="in">Real R 4.6, running in this page. crew, jobs and vault_log are loaded.</pre><pre class="in">Enter runs · Shift+Enter new line · ↑ ↓ history · library(dplyr) works too</pre></div>
    <div class="sb-in"><span>&gt;</span><textarea id="dr-in" rows="1" spellcheck="false" autocapitalize="off" aria-label="Type R code"></textarea></div>`;
  document.body.appendChild(d);
  const fab = document.createElement("button"); fab.className = "fab"; fab.innerHTML = `<span class="r">R</span>Console`; document.body.appendChild(fab);
  const out = $(".dr-out", d), inp = $("#dr-in", d), st = $(".st", d), hist = []; let hi = 0, seeded = false;
  LIVE.listeners.add((s, msg) => { st.textContent = s === "ready" ? "● live" : s === "loading" ? "starting…" : s === "failed" ? "unavailable" : ""; st.dataset.s = s; if (s === "failed") out.insertAdjacentHTML("beforeend", `<pre class="err">${esc(msg)}</pre>`); });
  const open = async () => { d.hidden = false; fab.hidden = true; inp.focus(); try { await startR(); } catch (e) {} };
  fab.onclick = open; $("#dr-x", d).onclick = () => { d.hidden = true; fab.hidden = false; };
  $("#dr-clear", d).onclick = () => { out.innerHTML = ""; };
  inp.addEventListener("input", () => { inp.style.height = "auto"; inp.style.height = inp.scrollHeight + "px"; });
  inp.addEventListener("keydown", async e => {
    if (e.key === "ArrowUp" && !inp.value.includes("\n") && hist.length) { e.preventDefault(); hi = Math.max(0, hi - 1); inp.value = hist[hi]; }
    if (e.key === "ArrowDown" && !inp.value.includes("\n") && hist.length) { e.preventDefault(); hi = Math.min(hist.length, hi + 1); inp.value = hist[hi] || ""; }
    if (e.key !== "Enter" || e.shiftKey) return;
    e.preventDefault(); const code = inp.value; if (!code.trim()) return;
    hist.push(code); hi = hist.length; inp.value = ""; inp.style.height = "auto";
    const pend = document.createElement("pre"); pend.className = "in"; pend.textContent = code.split("\n").map((l, i) => (i ? "+ " : "> ") + l).join("\n"); out.appendChild(pend);
    try { const res = await runLive(code, { width: 520, height: 380 }); pend.remove(); out.appendChild(renderLive(res)); if (res.lines.some(l => l.t === "err")) alarm(d); }
    catch (err) { out.insertAdjacentHTML("beforeend", `<pre class="err">${esc(LIVE.msg || String(err))}</pre>`); }
    out.scrollTop = out.scrollHeight;
  });
})();

updateTake(false); route();
