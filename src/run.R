suppressPackageStartupMessages({library(jsonlite); library(dplyr); library(tidyr)})
options(width = 60, warn = 1)
Sys.setenv(LANG = "en_US.UTF-8")
sn <- fromJSON("snippets.json", simplifyVector = FALSE)
fmt_call <- function(cl) { if (is.null(cl)) return(NULL); d <- paste(deparse(cl, width.cutoff = 500L)[1], collapse = ""); if (startsWith(d, "eval(exprs")) NULL else d }
run_code <- function(src, env) {
  exprs <- parse(text = src, keep.source = TRUE)
  srcs <- vapply(attr(exprs, "srcref"), function(s) paste(as.character(s), collapse = "\n"), "")
  tr <- list()
  add <- function(type, text) tr[[length(tr) + 1]] <<- list(t = type, x = text)
  for (i in seq_along(exprs)) {
    lines <- strsplit(srcs[i], "\n")[[1]]
    add("in", paste0(c("> ", rep("+ ", length(lines) - 1)), lines, collapse = "\n"))
    warns <- character()
    res <- tryCatch(withCallingHandlers({
      o <- capture.output(v <- withVisible(eval(exprs[[i]], env)))
      if (v$visible) o <- c(o, capture.output(print(v$value)))
      if (length(o)) add("out", paste(o, collapse = "\n"))
      NULL
    }, warning = function(w) {
      cl <- fmt_call(conditionCall(w)); m <- conditionMessage(w)
      warns <<- c(warns, if (is.null(cl)) m else if (nchar(cl) + nchar(m) > 50) paste0("In ", cl, " :\n  ", m) else paste0("In ", cl, " : ", m))
      invokeRestart("muffleWarning")
    }, message = function(m) invokeRestart("muffleMessage")),
    error = function(e) {
      if (inherits(e, "rlang_error")) {
        txt <- paste(capture.output(print(e)), collapse = "\n")
        txt <- sub("^<error/[^>]*>\n", "", txt); txt <- sub("\n---\nBacktrace:.*$", "", txt)
        paste0("Error in ", sub("^Error in ", "", txt))
      } else {
        cl <- fmt_call(conditionCall(e)); m <- conditionMessage(e)
        if (is.null(cl)) paste0("Error: ", m) else if (nchar(cl) + nchar(m) > 50) paste0("Error in ", cl, " : \n  ", m) else paste0("Error in ", cl, " : ", m)
      }
    })
    if (length(warns)) add("warn", paste0(if (length(warns) == 1) "Warning message:\n" else "Warning messages:\n", paste(warns, collapse = "\n")))
    if (!is.null(res)) { add("err", res); break }
  }
  tr
}
out <- list(); quiz <- list(); plots <- list()
for (lec in sn) {
  env <- new.env(parent = globalenv())
  if (nzchar(lec$setup)) eval(parse(text = lec$setup), env)
  for (b in lec$blocks) {
    if (!is.null(b$seed)) set.seed(b$seed)
    if (isTRUE(b$plot)) { f <- tempfile(fileext = ".png"); png(f, width = 620, height = 440, res = 96) }
    out[[b$id]] <- run_code(b$src, env)
    if (isTRUE(b$plot)) { dev.off(); plots[[b$id]] <- paste0("data:image/png;base64,", base64enc::base64encode(f)) }
  }
  for (q in lec$quiz) {
    tr <- run_code(q$src, new.env(parent = env))
    o <- vapply(Filter(function(z) z$t != "in", tr), function(z) z$x, "")
    quiz[[q$id]] <- paste(o, collapse = "\n")
  }
}
try(detach(mtcars), silent = TRUE)
data <- list(
  iris = lapply(split(iris, seq_len(nrow(iris))), function(r) list(r[[1]], r[[2]], r[[3]], r[[4]], as.character(r[[5]]))),
  mtcars = lapply(rownames(mtcars), function(n) list(n, mtcars[n, "mpg"], mtcars[n, "hp"], mtcars[n, "am"], mtcars[n, "cyl"], mtcars[n, "wt"])),
  relig = lapply(1:4, function(i) c(relig_income$religion[i], as.list(unname(unlist(relig_income[i, 2:4]))))),
  relig_cols = names(relig_income)[2:4]
)
names(data$iris) <- NULL
writeLines(toJSON(list(out = out, quiz = quiz, plots = plots, data = data), auto_unbox = TRUE, digits = NA, null = "null"), "outputs.json")
cat("done", length(out), "blocks", length(quiz), "quiz", length(plots), "plots\n")
