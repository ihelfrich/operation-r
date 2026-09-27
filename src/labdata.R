suppressPackageStartupMessages(library(jsonlite))
src <- jsonlite::fromJSON("snippets.json", simplifyVector = FALSE)[[1]]$setup
eval(parse(text = src))
vals <- list(`3` = quote(3), `3L` = quote(3L), `"3"` = quote("3"), `TRUE` = quote(TRUE), `3.5` = quote(3.5),
             `NA` = quote(NA), `"TRUE"` = quote("TRUE"), `2i` = quote(2i), `NULL` = quote(NULL), `NaN` = quote(NaN),
             `"hello"` = quote("hello"), `0` = quote(0))
pr <- function(x) paste(capture.output(suppressWarnings(print(x))), collapse = "\n")
scan <- lapply(names(vals), function(k) {
  v <- eval(vals[[k]])
  list(lit = k, class = pr(class(v)), is_numeric = pr(is.numeric(v)), is_character = pr(is.character(v)),
       as_numeric = pr(suppressWarnings(as.numeric(v))), as_character = pr(as.character(v)), as_logical = pr(as.logical(v)),
       length = pr(length(v)),
       warn = tryCatch({ as.numeric(v); "" }, warning = function(w) conditionMessage(w)))
})
out <- list(
  vault_log = unname(lapply(seq_len(nrow(vault_log)), function(i) unname(as.list(vault_log[i, ])))),
  mtcars = lapply(rownames(mtcars), function(n) list(n, mtcars[n, "mpg"], mtcars[n, "hp"], mtcars[n, "am"], mtcars[n, "wt"])),
  scan = scan)
writeLines(toJSON(out, auto_unbox = TRUE, digits = NA, null = "null"), "labdata.json")
cat("ok\n")
