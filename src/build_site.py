"""Build docs/index.html (the GitHub Pages site) from content, recorded R outputs and scripts."""
import json, content_heist as C
out = json.load(open("outputs.json")); lab = json.load(open("labdata.json"))
data = {"M": C.M, "CAP": C.CAPSTONE, "OUT": {"out": out["out"], "quiz": out["quiz"], "plots": out["plots"]}, "LAB": lab}
js = "\n".join(open(f).read() for f in ["core.js", "live_web.js", "labs_a.js", "labs_phys.js", "pages.js"])
head, body = open("shell.html").read().split("<header", 1)
head = head.replace("__CSS__", open("heist.css").read())
body = ("<header" + body).replace("__DATA__", json.dumps(data).replace("</", "<\\/")).replace("__JS__", js)
icon = "data:image/svg+xml," + "%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='14' fill='%2307142A' stroke='%23F4C35A' stroke-width='3'/%3E%3Ctext x='16' y='22' font-size='16' text-anchor='middle' fill='%23F4C35A' font-family='Arial' font-weight='bold'%3ER%3C/text%3E%3C/svg%3E"
meta = ('<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '<meta name="description" content="Operation R: a free, heist-themed, interactive R course. Ten missions, live R in your browser, physics labs and coding jobs checked by real R.">\n'
        '<meta property="og:title" content="Operation R">\n<meta property="og:description" content="Learn R by pulling off one long job. Live R in your browser, graded by real R.">\n'
        f'<link rel="icon" href="{icon}">\n')
doc = f'<!doctype html>\n<html lang="en">\n<head>\n{meta}{head}</head>\n<body>\n{body}\n</body>\n</html>\n'
open("../docs/index.html", "w").write(doc); print("docs/index.html", len(doc))
