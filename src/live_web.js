/* Live R: official webR (R compiled to WebAssembly), loaded from its CDN on first use. */
const WEBR_URL = "https://webr.r-wasm.org/v0.6.0/";
const LIVE = { state: "off", webR: null, shelter: null, boot: null, listeners: new Set() };
let PKGS = null, STOPPER = null;
function liveStatus(state, msg){ LIVE.state = state; LIVE.msg = msg || ""; LIVE.listeners.forEach(f => f(state, LIVE.msg)); }
function startR(){
  if (LIVE.boot) return LIVE.boot;
  LIVE.boot = (async () => {
    liveStatus("loading", "Starting R in your browser. The first start downloads about 40 MB.");
    const mod = await import(WEBR_URL + "webr.mjs");
    const webR = new mod.WebR({ baseUrl: WEBR_URL, interactive: false });
    await webR.init();
    LIVE.webR = webR; LIVE.shelter = await new webR.Shelter();
    await webR.evalRVoid(`options(width = 60, warn = 1)
      .run <- function(src, env = globalenv()) tryCatch(source(textConnection(src), echo = TRUE, print.eval = TRUE, max.deparse.length = Inf, spaced = FALSE, local = env, prompt.echo = "> ", continue.echo = "+ "), error = function(e) { cl <- conditionCall(e); m <- conditionMessage(e); d <- if (is.null(cl)) "" else paste(deparse(cl, width.cutoff = 500L)[1], collapse = ""); if (!nzchar(d) || grepl("^(eval|withVisible|source)[(]", d)) cat("Error: ", m, "\\n", sep = "", file = stderr()) else cat("Error in ", d, " : ", m, "\\n", sep = "", file = stderr()) })
      .replay <- function(code) invisible(try(suppressWarnings(suppressMessages(capture.output(eval(parse(text = code), envir = .ce)))), silent = TRUE))
      .newchunk <- function() assign(".ce", new.env(parent = globalenv()), envir = globalenv())
      .ce <- globalenv()`);
    await webR.evalRVoid(`.norm <- function(x) {
  if (is.factor(x)) x <- as.character(x)
  if (is.table(x) || (is.array(x) && length(dim(x)) == 1)) { nm <- names(x); x <- as.vector(x); names(x) <- nm }
  if (is.data.frame(x)) {
    x <- as.data.frame(x)
    x <- lapply(x, function(col) if (is.factor(col)) as.character(col) else col)
    x <- unname(x)
  }
  x
}
.grade <- function(student, setup, solution = "", check = "", unordered = FALSE) {
  env <- new.env(parent = globalenv())
  eval(parse(text = setup), env)
  err <- tryCatch({ capture.output(eval(parse(text = student), env)); NULL },
                  error = function(e) conditionMessage(e))
  if (!is.null(err)) return(paste0("ALARM: your code stopped with an error: ", err))
  if (nzchar(check)) {
    r <- tryCatch(eval(parse(text = check), env), error = function(e) paste0("The check hit an error: ", conditionMessage(e)))
    if (isTRUE(r)) return("PASS")
    return(if (is.character(r)) r else "Not yet. The check came back FALSE. Test your answer on a few inputs.")
  }
  if (!exists("ans", envir = env, inherits = FALSE)) return("Not yet. Store your final answer in a variable called ans.")
  senv <- new.env(parent = globalenv())
  eval(parse(text = setup), senv); eval(parse(text = solution), senv)
  a <- .norm(get("ans", envir = env)); b <- .norm(get("ans", envir = senv))
  if (unordered) { a <- sort(unlist(a)); b <- sort(unlist(b)) }
  if (is.data.frame(get("ans", envir = senv)) && !is.data.frame(get("ans", envir = env))) return("Not yet. The target is a data frame (a table), but your ans is not.")
  r <- all.equal(a, b, check.attributes = FALSE, tolerance = 1e-6)
  if (isTRUE(r)) "PASS" else paste0("Not yet. R compared your ans with the target: ", paste(head(r, 2), collapse = "; "))
}
`);
    await webR.evalRVoid(M[0].setup);          // the case files: crew, jobs, vault_log
    liveStatus("ready", "R is running in this page.");
    return webR;
  })().catch(e => { console.error(e); LIVE.boot = null; liveStatus("failed", "Live R could not start in this browser. Recorded outputs and every lab still work. (" + (e && e.message || e) + ")"); throw e; });
  return LIVE.boot;
}
function ensurePkgs(){
  if (PKGS) return PKGS;
  PKGS = (async () => {
    const webR = await startR();
    liveStatus("loading", "Loading dplyr and tidyr (once per visit)…");
    await webR.installPackages(["dplyr", "tidyr"], { quiet: true });
    liveStatus("ready", "R is running in this page.");
  })().catch(e => { PKGS = null; liveStatus("ready", "R is running, but dplyr could not load."); throw e; });
  return PKGS;
}
/* Stop runaway code: tear R down and restart it on the next Run. */
function stopR(){
  try { LIVE.webR && LIVE.webR.close(); } catch (e) {}
  LIVE.webR = null; LIVE.boot = null; PKGS = null;
  liveStatus("off", "R was stopped.");
  if (STOPPER) STOPPER(new Error("Stopped. Your code ran too long, so R was shut down. It restarts on your next Run."));
}
async function runLive(code, opts = {}){
  const stop = new Promise((_, rej) => { STOPPER = rej; });
  const btn = document.getElementById("stop-r"), t0 = Date.now();
  const t = setInterval(() => { if (btn && LIVE.state === "ready" && Date.now() - t0 > 3000) btn.hidden = false; }, 500);
  try { return await Promise.race([runLiveInner(code, opts), stop]); }
  finally { clearInterval(t); if (btn) btn.hidden = true; STOPPER = null; }
}
async function runLiveInner(code, { replay = [], chunk = false, width = 620, height = 440 } = {}){
  const webR = await startR();
  const all = [code, ...replay].join("\n");
  if (/library\((dplyr|tidyr|tibble)\)|%>%|\btibble\(|pivot_(longer|wider)|_join\(/.test(all)) await ensurePkgs();
  const sh = LIVE.shelter;
  try {
    if (chunk) {
      await webR.evalRVoid(".newchunk()");
      for (const c of replay) { await webR.objs.globalEnv.bind(".src", c); await webR.evalRVoid("pdf(NULL); .replay(.src); graphics.off()"); }
    }
    await webR.objs.globalEnv.bind(".src", code);
    const res = await sh.captureR(chunk ? `.run(.src, .ce)` : `.run(.src)`,
      { withAutoprint: false, captureStreams: true, captureConditions: false, captureGraphics: { width, height, bg: "white" } });
    const lines = [];
    for (const o of res.output) {
      if (o.type === "stdout") lines.push({ t: /^[>+] /.test(o.data) ? "in" : "out", x: o.data });
      else if (o.type === "stderr") { const errSeen = lines.some(z => z.t === "err"); lines.push({ t: errSeen || /^Error/.test(o.data) ? "err" : "warn", x: o.data.replace(/^Warning in eval\(ei, envir\) :\s*/, "Warning: ") }); }
    }
    return { lines: mergeLines(lines), images: res.images || [] };
  } finally { try { await sh.purge(); } catch (e) {} }
}
function mergeLines(lines){ const out = []; for (const l of lines) { const p = out[out.length - 1]; if (p && p.t === l.t && l.t !== "in") p.x += "\n" + l.x; else out.push({ ...l }); } return out; }
function renderLive(res){
  const wrap = document.createElement("div");
  wrap.innerHTML = `<div class="console">${res.lines.map(x => `<pre class="${x.t}">${esc(x.x)}</pre>`).join("") || `<pre class="in">(no output)</pre>`}</div>`;
  for (const img of res.images) {
    const pane = document.createElement("div"); pane.className = "monitor"; pane.innerHTML = `<span class="rec">LIVE</span>`;
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; c.style.maxWidth = "100%";
    c.getContext("2d").drawImage(img, 0, 0); pane.appendChild(c); wrap.appendChild(pane);
  }
  return wrap;
}
async function gradeLive(student, setup, solution, check, unordered){
  const webR = await startR();
  if (/library\((dplyr|tidyr)\)|%>%|_join\(|pivot_/.test(setup + student + solution)) await ensurePkgs();
  const g = webR.objs.globalEnv;
  await g.bind(".stu", student); await g.bind(".setup", setup); await g.bind(".sol", solution || ""); await g.bind(".chk", check || "");
  return await webR.evalRString(`.grade(.stu, .setup, .sol, .chk, ${unordered ? "TRUE" : "FALSE"})`);
}
