// Samples paragraphs from every writer for a few holes and prints the low scorers, to find missed tells.
import { HOLES, WRITERS } from "../holes.js";
import { writeHole } from "../api.js";
import { analyse } from "../detector.js";
const holes = process.argv.slice(2).length ? HOLES.filter((h) => process.argv.slice(2).includes(h.id)) : HOLES;
const jobs = [];
for (const h of holes) for (const w of WRITERS) jobs.push(writeHole("dummy", h, w).then((t) => ({ h, w, t })).catch((e) => ({ h, w, t: "", e })));
const res = await Promise.all(jobs);
for (const r of res.sort((a, b) => analyse(a.t).slop - analyse(b.t).slop)) {
  const a = analyse(r.t);
  console.log(`\n[${a.slop}] ${r.h.id} / ${r.w.label}${r.e ? " ERR " + r.e : ""}\n${a.slop < 35 ? r.t : r.t.slice(0, 90) + "…"}`);
}
