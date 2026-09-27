# Operation R

A free, heist-themed, interactive course in R. Ten missions take you from your first variable to dplyr pipelines, base graphics and simulation.

**Play it:** https://ihelfrich.github.io/operation-r/

- Every code chunk is editable and runs **real R in your browser** via [webR](https://docs.r-wasm.org/webr/latest/).
- **39 coding jobs** are checked by R itself, which compares your answer with a reference solution and tells you what differs.
- Physics labs (built on [Matter.js](https://brm.io/matter-js/)) for coercion, indexing, sampling, cross joins and the Central Limit Theorem.
- Progress is stored only in your own browser. There are no accounts and no tracking.

## Missions

| # | Mission | Topics |
|---|---|---|
| 1 | The Safehouse | RStudio, R Markdown, operators, types, NA/NULL/NaN, logic |
| 2 | The Loot Line | vectors, coercion, `seq()`/`rep()`, indexing, recycling, factors, matrices |
| 3 | The Vault Grid | `t()`, `solve()`, `apply()`, arrays, lists, data frames |
| 4 | The Intel Files | data frames, `rbind()`/`cbind()`, reading files, paths |
| 5 | The Sweep | `which()`, `sample()`, `%in%`, `duplicated()`, regex, `subset()`, `order()` |
| 6 | The Getaway Plan | stacking tables and `merge()` joins |
| 7 | The Pipeline | dplyr and tidyr |
| 8 | The Surveillance Tapes | base R graphics |
| 9 | The Playbook | functions, control flow, loops, the apply family, strings |
| 10 | The Odds | simulation, probability, the bootstrap, the CLT |
| ◎ | The Big Score | capstone jobs |

## Building

The site is a single file, `docs/index.html`, generated from `src/`.

```bash
cd src
python3 export.py          # lesson code -> snippets.json, jobs.json
Rscript run.R              # run every chunk in R, record output and plots -> outputs.json
Rscript labdata.R          # data for the labs -> labdata.json
Rscript testjobs.R         # every job's solution must print PASS
python3 build_site.py      # -> ../docs/index.html
```

Requires R with `jsonlite`, `dplyr`, `tidyr` and `base64enc`. Lesson content lives in `src/content_heist.py`.
