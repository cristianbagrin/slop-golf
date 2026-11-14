// Pollinations calls: a model writes the hole, a judge checks the putt. Browser and Node 22+.
import { WRITERS, writerMessages } from "./holes.js";

const API = "https://gen.pollinations.ai";
const TIMEOUT_MS = 45000;
export const JUDGE = "openai/gpt-5.4-mini";

async function chat(key, model, messages, json = false) {
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 800 * attempt));
    try {
      const res = await fetch(`${API}/v1/chat/completions`, {
        method: "POST",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, max_tokens: 4000, seed: Math.floor(Math.random() * 2 ** 31), ...(json ? { response_format: { type: "json_object" } } : {}) }),
      });
      if (!res.ok) {
        const err = new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
        err.status = res.status;
        throw err;
      }
      const j = await res.json();
      const out = j.choices?.[0]?.message?.content ?? "";
      if (!out.trim()) throw new Error("empty reply");
      return out;
    } catch (e) {
      lastErr = e;
      if (e.status && e.status < 500 && e.status !== 429) break;
    }
  }
  throw lastErr;
}

// Models sometimes add a greeting, a subject line, a sign-off or [placeholders]. Keep the paragraph.
export function clean(text) {
  return text
    .replace(/\r/g, "")
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l && !/\[[^\]]+\]/.test(l) && !/^(subject|title)\s*:/i.test(l))
    .filter((l) => !/^(?:dear|hi|hello|hey)\b[^.!?]{0,40},$/i.test(l))
    .filter((l) => !/^(?:best|regards|cheers|thanks|sincerely|warmly|kind regards|best regards)[,!.]?$/i.test(l))
    .join(" ")
    .replace(/\*\*?|__|#+\s/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function writeHole(key, hole, writer) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = clean(await chat(key, writer.id, writerMessages(hole)));
    if ((text.match(/\S+/g) || []).length >= 40) return text;
  }
  throw new Error("The model's paragraph came back empty.");
}

export const randomWriter = () => WRITERS[Math.floor(Math.random() * WRITERS.length)];

// Did the edit keep the point? Rewording, cutting filler and adding plausible detail are fine.
export async function judgePutt(key, hole, original, edited) {
  const raw = await chat(
    key,
    JUDGE,
    [
      {
        role: "system",
        content:
          'You referee a writing game. The player edits an AI-written paragraph so it sounds like a person wrote it. Decide whether the EDITED text still does the same job as the ORIGINAL: same situation, same purpose, the key facts or request kept, readable English. Rewording, cutting filler, changing tone and adding plausible personal detail are all fine. Deleting the point, writing gibberish or changing the subject is not. Reply with JSON only: {"ok": true or false, "note": one short, friendly sentence for the player}.',
      },
      { role: "user", content: `TASK: ${hole.task}\n\nORIGINAL:\n${original}\n\nEDITED:\n${edited}` },
    ],
    true
  );
  const m = String(raw).match(/\{[\s\S]*\}/);
  const j = JSON.parse(m ? m[0] : raw);
  return { ok: j.ok === true, note: String(j.note || "").slice(0, 240) };
}
