// The holes (writing tasks) and the models that write them.
export const HOLES = [
  { id: "marathon", title: "LinkedIn post", task: "a LinkedIn post announcing that you just finished your first marathon" },
  { id: "barista", title: "Cover letter", task: "the opening paragraph of a cover letter for a barista job at a neighbourhood café" },
  { id: "launch", title: "Launch email", task: "an email announcing the launch of a small budgeting app to its waitlist" },
  { id: "ramen", title: "Restaurant review", task: "a short online review of a ramen shop you liked" },
  { id: "apology", title: "Apology email", task: "an email to a client apologising for missing a deadline by two days" },
  { id: "taipei", title: "Travel blog", task: "the opening paragraph of a travel blog post about a first weekend in Taipei" },
  { id: "toast", title: "Wedding toast", task: "a short toast at your sister's wedding" },
  { id: "update", title: "Team update", task: "a Slack update to your team explaining that a project is delayed by a week" },
];

export const WRITERS = [
  { id: "openai/gpt-5.4-nano", label: "GPT-5.4 nano" },
  { id: "minimax/minimax-m3.1-flash", label: "MiniMax M3.1 Flash" },
  { id: "z-ai/glm-5.3-flash", label: "GLM 5.3 Flash" },
  { id: "x-ai/grok-4.20", label: "Grok 4.20" },
  { id: "mistralai/mistral-large-3", label: "Mistral Large 3" },
];

// A small random detail per hole, so the same model doesn't write the same paragraph twice
// (identical requests are served from cache).
const DETAILS = [
  "You are in your twenties.", "You are in your forties.", "You live in a small town.", "You live in a big city.",
  "Keep it upbeat.", "Keep it a little understated.", "Mention one concrete number.", "Mention a friend by first name.",
  "You are writing on a phone, in a hurry.", "You've had a long week.",
];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export const writerMessages = (hole, detail = pick(DETAILS)) => [
  { role: "user", content: `Write ${hole.task}. Make it polished and engaging. ${detail} One paragraph of about 90 words. Plain text only: no title, no hashtags, no emoji, no placeholders in brackets.` },
];
