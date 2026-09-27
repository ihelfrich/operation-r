import json, content_heist as C
out = []
for m in C.M:
    blocks = [{"id": b["code"], "src": b["src"], "plot": b.get("plot", False), "seed": b.get("seed")} for b in m["blocks"] if "code" in b and not b.get("norun")]
    quiz = [{"id": f'{m["id"]}_q{i}', "src": q["code"]} for i, q in enumerate(m["quiz"]) if q.get("code")]
    out.append({"id": m["id"], "setup": m["setup"], "blocks": blocks, "quiz": quiz})
jobs = []
for m in C.M + [C.CAPSTONE]:
    for i, j in enumerate(m["jobs"]):
        jobs.append({"id": f'{m["id"]}_j{i}', "setup": m["setup"] + "\n" + j.get("setup", ""), "solution": j["solution"], "check": j.get("check", ""), "starter": j["starter"], "unordered": j.get("unordered", False)})
json.dump(out, open("snippets.json", "w"), indent=1)
json.dump(jobs, open("jobs.json", "w"), indent=1)
