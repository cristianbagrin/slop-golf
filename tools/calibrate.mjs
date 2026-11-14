import { readFile } from "node:fs/promises";
import { analyse, parFor } from "../detector.js";
const course = JSON.parse(await readFile("data/course.json", "utf8"));
const human = [
  "Ran my first marathon on Sunday in Taipei. 4:41. The last 10k hurt more than anything I've done, and I walked twice near the river. My sister found me at 38k with a bag of dried mango, which is the only reason I finished. Next time I'll train on hills, and I'll stop pretending I like gels.",
  "Sorry, this is two days late and that's on me. I underestimated the data cleanup; the export had about 4,000 duplicate rows and I didn't spot them until Tuesday. The report is attached now. If the late delivery pushes your board meeting, tell me and I'll do the summary slides tonight at no charge.",
];
for (const [label, t] of [...course.map((c) => [c.model, c.text]), ...human.map((t, i) => ["HUMAN" + i, t])]) {
  const a = analyse(t);
  console.log(`${label.padEnd(28)} slop ${String(a.slop).padStart(2)}  pts ${a.points}  words ${a.words}  par ${parFor(a)}  rhythm ${a.rhythm ? a.rhythm.sd : "-"}`);
  for (const h of a.hits) console.log(`    ${h.rule.id.padEnd(10)} ${h.text}`);
}
