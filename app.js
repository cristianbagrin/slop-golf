import { analyse, strokes, words, KIND_LABEL, GREEN, parFor } from "./detector.js";
import { HOLES, WRITERS } from "./holes.js";
import { writeHole, judgePutt, clean } from "./api.js";

const $ = (s) => document.querySelector(s);
const connect = $("polli-connect");
const ta = $("#text");
const backdrop = $("#backdrop");
const ROUND = 5;

let apiKey = null;
let round = [];
let at = 0;
let live = false;
let busy = false;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);
const rel = (n, par) => (n === par ? "E" : n < par ? `−${par - n}` : `+${n - par}`);

/* ---------- connect ---------- */
function syncKey() {
  apiKey = connect?.apiKey || null;
  $("#mode").innerHTML = apiKey
    ? `Connected. A judge now checks each putt. <button type="button" id="fresh" class="linkish">Play a fresh round</button> written live by five models.`
    : "Playing the free practice course. Connect to play fresh holes written live by five models.";
  $("#fresh")?.addEventListener("click", () => startLive());
}
connect?.addEventListener("change", syncKey);
customElements.whenDefined("polli-connect").then(syncKey).catch(() => {});

/* ---------- rounds ---------- */
function makeHole(spec, writer, text) {
  const t = clean(text);
  const a = analyse(t);
  return { spec, writer, original: t, text: t, par: parFor(a), arrived: a.slop, done: false };
}

async function startPractice() {
  const course = await (await fetch("data/course.json")).json();
  live = false;
  round = course.map((c) => makeHole(HOLES.find((h) => h.id === c.hole), WRITERS.find((w) => w.id === c.model), c.text));
  at = 0;
  $("#summary").hidden = true;
  showHole();
}

function startLive() {
  if (!apiKey || busy) return;
  live = true;
  const holes = shuffle(HOLES).slice(0, ROUND);
  const writers = shuffle(WRITERS);
  round = holes.map((spec, i) => ({ spec, writer: writers[i % writers.length], pending: null, done: false }));
  at = 0;
  $("#summary").hidden = true;
  showHole();
}

// Writes a live hole; a paragraph that arrives already clean gets one more try.
function fetchHole(i) {
  const h = round[i];
  if (!h || h.original || h.pending) return h?.pending;
  const key = apiKey;
  h.pending = (async () => {
    let text = await writeHole(key, h.spec, h.writer);
    for (let k = 0; k < 2 && analyse(text).slop < 30; k++) {
      const next = await writeHole(key, h.spec, h.writer);
      if (analyse(next).slop > analyse(text).slop) text = next;
    }
    Object.assign(h, makeHole(h.spec, h.writer, text));
  })();
  h.pending.catch(() => (h.pending = null));
  return h.pending;
}

/* ---------- scorecard ---------- */
function renderCard() {
  const head = $(".card thead tr"), par = $(".card .par"), you = $(".card .you");
  for (const row of [head, par, you]) while (row.children.length > 1) row.lastChild.remove();
  let tp = 0, ty = 0, done = 0;
  round.forEach((h, i) => {
    head.insertAdjacentHTML("beforeend", `<th scope="col" class="${i === at && !h.done ? "now" : ""}">${i + 1}</th>`);
    par.insertAdjacentHTML("beforeend", `<td>${h.par ?? "·"}</td>`);
    const s = h.done ? h.score : null;
    you.insertAdjacentHTML("beforeend", `<td class="${s == null ? "" : s <= h.par ? "under" : "over"}">${s ?? ""}</td>`);
    if (h.done) { tp += h.par; ty += h.score; done++; }
  });
  head.insertAdjacentHTML("beforeend", `<th scope="col">Total</th>`);
  const known = round.every((h) => h.par != null);
  par.insertAdjacentHTML("beforeend", `<td>${known ? round.reduce((n, h) => n + h.par, 0) : "·"}</td>`);
  you.insertAdjacentHTML("beforeend", `<td>${done ? `${ty} (${rel(ty, tp)})` : ""}</td>`);
}

/* ---------- the hole ---------- */
function setButtons(on) {
  for (const id of ["#putt", "#reset", "#concede"]) $(id).disabled = !on;
  ta.disabled = !on;
}

async function showHole() {
  const h = round[at];
  $("#result").hidden = true;
  $("#status").textContent = "";
  $("#hole-no").textContent = `Hole ${at + 1} of ${round.length}`;
  $("#hole-title").textContent = h.spec.title;
  $("#hole-task").textContent = `The brief: ${h.spec.task}.`;
  renderCard();
  if (!h.original) {
    setButtons(false);
    ta.value = "";
    backdrop.innerHTML = "";
    $("#hazards").innerHTML = "";
    $("#status").textContent = "A mystery model is writing this hole…";
    try {
      await fetchHole(at);
    } catch (e) {
      $("#status").innerHTML = `${esc(errorText(e))} <button type="button" class="linkish" id="retry">Try again</button>`;
      $("#retry").onclick = showHole;
      return;
    }
    $("#status").textContent = "";
    renderCard();
  }
  if (live) fetchHole(at + 1)?.catch(() => {});
  ta.value = h.text;
  setButtons(!h.done);
  update();
}

function errorText(e) {
  if (e?.status === 401 || e?.status === 403) return "Your Pollinations connection has expired. Disconnect and connect again.";
  if (e?.status === 402) return "Your Pollen balance or this app's budget is used up.";
  return "The model didn't answer.";
}

function update() {
  const h = round[at];
  h.text = ta.value;
  const a = analyse(h.text);
  let html = "", pos = 0;
  a.hits.forEach((hit, i) => {
    html += esc(h.text.slice(pos, hit.start)) + `<mark class="${hit.rule.kind}" data-i="${i}">${esc(h.text.slice(hit.start, hit.end))}</mark>`;
    pos = hit.end;
  });
  backdrop.innerHTML = html + esc(h.text.slice(pos)) + "\n";
  ta.style.height = "auto";
  ta.style.height = ta.scrollHeight + 2 + "px";

  $("#slop").textContent = a.slop;
  $("#slop-fill").style.width = a.slop + "%";
  $("#slop-fill").classList.toggle("green", a.slop <= GREEN);
  const s = strokes(h.original, h.text);
  $("#strokes").textContent = s;
  $("#par-hint").textContent = `· par ${h.par}`;

  const items = a.hits.map(
    (hit, i) =>
      `<li tabindex="0" data-i="${i}"><p><span class="kind ${hit.rule.kind}">${KIND_LABEL[hit.rule.kind]}</span> <b>${esc(hit.rule.name)}</b> · <q>${esc(hit.text)}</q></p><p class="tip">${esc(hit.rule.tip)}</p></li>`
  );
  if (a.rhythm)
    items.push(
      `<li><p><span class="kind rough">Rough</span> <b>Flat rhythm</b> · every sentence is about ${a.rhythm.mean} words</p><p class="tip">Vary it. A short sentence. Then one long enough to carry a real idea and land somewhere.</p></li>`
    );
  $("#hazards").innerHTML = items.length ? items.join("") : `<li><span class="none">Clear. Nothing left that reads like a model.</span></li>`;
  return { a, s };
}

ta.addEventListener("input", () => {
  update();
  $("#status").textContent = "";
});
const spot = (e, on) => {
  const li = e.target.closest?.("li[data-i]");
  if (li) backdrop.querySelector(`mark[data-i="${li.dataset.i}"]`)?.classList.toggle("on", on);
};
$("#hazards").addEventListener("mouseover", (e) => spot(e, true));
$("#hazards").addEventListener("mouseout", (e) => spot(e, false));
$("#hazards").addEventListener("focusin", (e) => spot(e, true));
$("#hazards").addEventListener("focusout", (e) => spot(e, false));

$("#reset").addEventListener("click", () => {
  ta.value = round[at].original;
  update();
  $("#status").textContent = "Back on the tee.";
});

$("#concede").addEventListener("click", () => finish({ conceded: true }));

$("#putt").addEventListener("click", async () => {
  if (busy) return;
  const h = round[at];
  const { a, s } = update();
  if (a.slop > GREEN) {
    $("#status").textContent = `Not on the green yet: slop ${a.slop}. Get it to ${GREEN} or under.`;
    return;
  }
  if (words(h.text) < Math.max(25, words(h.original) * 0.4)) {
    $("#status").textContent = "Too short to do the job. Keep the message; lose the slop.";
    return;
  }
  if (s === 0) return;
  let note = "";
  if (apiKey) {
    busy = true;
    setButtons(false);
    $("#status").textContent = "The judge is reading it…";
    try {
      const v = await judgePutt(apiKey, h.spec, h.original, h.text);
      note = v.note;
      if (!v.ok) {
        $("#status").textContent = `Lipped out. ${v.note}`;
        return;
      }
    } catch (e) {
      note = "The judge didn't answer, so this one counts on the slop score alone.";
    } finally {
      busy = false;
      if (!h.done) setButtons(true);
    }
  } else {
    note = "Practice round: no judge. Connect and a model checks that you kept the meaning.";
  }
  finish({ strokes: s, slop: a.slop, note });
});

function finish({ conceded = false, strokes: s, slop, note = "" }) {
  const h = round[at];
  h.done = true;
  h.conceded = conceded;
  h.score = conceded ? h.par + 3 : s;
  h.final = conceded ? null : slop;
  setButtons(false);
  $("#status").textContent = "";
  const last = at === round.length - 1;
  const head = conceded ? `Picked up. That's ${h.score} on a par ${h.par}.` : `In the hole: ${h.score} strokes on a par ${h.par} (${rel(h.score, h.par)}).`;
  $("#result").innerHTML = `<p class="big">${head}</p>
    <p>Written by <b>${esc(h.writer.label)}</b>. It arrived with slop ${h.arrived}${conceded ? "" : `; you left it at ${h.final}`}.</p>
    ${note ? `<p>${esc(note)}</p>` : ""}
    <button type="button" id="next">${last ? "See your round" : "Next hole"}</button>`;
  $("#result").hidden = false;
  $("#next").onclick = () => (last ? summary() : (at++, showHole()));
  renderCard();
}

function summary() {
  const tp = round.reduce((n, h) => n + h.par, 0), ty = round.reduce((n, h) => n + h.score, 0);
  const sloppiest = [...round].sort((p, q) => q.arrived - p.arrived)[0];
  const rows = round
    .map((h, i) => `<tr><td>${i + 1}</td><td>${esc(h.spec.title)}</td><td>${esc(h.writer.label)}</td><td>${h.arrived}</td><td>${h.final ?? "–"}</td><td>${h.score} / ${h.par}</td></tr>`)
    .join("");
  $("#summary").innerHTML = `<h2>${ty} on a par ${tp} (${rel(ty, tp)})</h2>
    <p>Sloppiest voice this round: <b>${esc(sloppiest.writer.label)}</b>, which arrived at ${sloppiest.arrived} on the ${esc(sloppiest.spec.title.toLowerCase())}.</p>
    <table><thead><tr><th>Hole</th><th>Brief</th><th>Model</th><th>Slop in</th><th>Out</th><th>Score</th></tr></thead><tbody>${rows}</tbody></table>
    <button type="button" class="primary" id="again">${apiKey ? "Play a fresh round" : "Play the course again"}</button>
    <button type="button" id="share">Copy scorecard</button>`;
  $("#summary").hidden = false;
  $("#summary").scrollIntoView({ behavior: "smooth", block: "start" });
  $("#again").onclick = () => (apiKey ? startLive() : startPractice());
  $("#share").onclick = async () => {
    const line = round.map((h) => (h.score <= h.par ? "⛳" : "🟫")).join("");
    const text = `Slop Golf: ${ty} on a par ${tp} (${rel(ty, tp)}) ${line}\nSloppiest voice: ${sloppiest.writer.label}\nhttps://slop-golf.pollinations.app`;
    try {
      await navigator.clipboard.writeText(text);
      $("#share").textContent = "Copied";
    } catch {
      $("#share").textContent = "Couldn't copy";
    }
  };
}

syncKey();
startPractice().catch(() => ($("#status").textContent = "Couldn't load the course. Reload the page."));
