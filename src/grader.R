.norm <- function(x) {
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
