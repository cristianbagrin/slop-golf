// Writes data/course.json: the free practice course, one paragraph per hole from a different model.
// Keeps a paragraph that arrives with real slop (35+), trying up to five times per hole.
// Usage: POLLINATIONS_API_KEY=sk_... node tools/gen-course.mjs
import { writeFile } from "node:fs/promises";
import { HOLES, WRITERS } from "../holes.js";
import { writeHole } from "../api.js";
import { analyse } from "../detector.js";
const key = process.env.POLLINATIONS_API_KEY;
const plan = [["marathon", 0], ["ramen", 3], ["apology", 4], ["toast", 1], ["update", 2]];
const out = await Promise.all(plan.map(async ([id, wi]) => {
  const hole = HOLES.find((h) => h.id === id), w = WRITERS[wi];
  let best = "";
  for (let k = 0; k < 5 && analyse(best).slop < 35; k++) {
    const t = await writeHole(key, hole, w).catch(() => "");
    if (analyse(t).slop > analyse(best).slop) best = t;
  }
  console.log(`\n## ${hole.title} — ${w.label} — slop ${analyse(best).slop}\n${best}`);
  return { hole: id, model: w.id, text: best };
}));
await writeFile("data/course.json", JSON.stringify(out, null, 1));
