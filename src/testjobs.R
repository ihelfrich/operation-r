suppressPackageStartupMessages({library(jsonlite); library(dplyr); library(tidyr)})
source("grader.R")
jobs <- fromJSON("jobs.json", simplifyVector = FALSE)
for (j in jobs) {
  r1 <- .grade(j$solution, j$setup, j$solution, j$check, isTRUE(j$unordered))
  r2 <- .grade(j$starter, j$setup, j$solution, j$check, isTRUE(j$unordered))
  cat(sprintf("%-10s solution: %-5s | starter: %s\n", j$id, r1, substr(r2, 1, 70)))
}
