# Slop Golf

[![Made with pollinations.ai](https://raw.githubusercontent.com/pollinations/pollinations/123ed07456106a4f752c0a22c584e8cadd2db6a8/packages/ui/src/brand/badge-made-with.svg)](https://pollinations.ai/?ref=badge)

A writing game about the LLM voice. A model writes a paragraph: a LinkedIn post, a cover letter, a wedding toast. You edit it until it sounds like a person wrote it. Strokes are words changed, so the fewest wins.

**Play:** https://slop-golf.pollinations.app

## How a hole works

- **The tee.** A mystery model writes the paragraph for a short brief. It's one of GPT-5.4 nano, MiniMax M3.1 Flash, GLM 5.3 Flash, Grok 4.20 or Mistral Large 3.
- **The hazards.** The tells of the LLM voice are highlighted as you type, each with a one-line fix:
  - **Bunkers** are structure: negated antithesis ("not X, it's Y"), "rather than", rule of three, "from X to Y", balanced contrasts ("rich without being heavy"), trailing -ing clauses, significance inflation, drumrolls, tidy closers.
  - **Water** is tell-words (*delve, tapestry, seamless, journey…*), which count more in clusters.
  - **Rough** is stock phrases, empty transitions, em dashes, hedges and flat sentence rhythm.
- **Slop.** A score from 0 to 99 for hazard density per 100 words. Get it to 20 or under to be on the green.
- **The putt.** A judge model reads the original and your edit and checks you kept the point, so deleting everything doesn't count.
- **Par.** Set from how much slop the paragraph arrived with: about 1.8 words of editing per point you need to remove.
- **The reveal.** After each hole you find out which model wrote it. The round ends with whose voice was sloppiest.

The hazards come from a working ghostwriter's checklist for de-AI-ing prose. Its main rule is *density, not any single word*: one hit means little, and a cluster is the fingerprint. So each hazard is cheap and the score is per 100 words. The rules are tuned so that plain human paragraphs score 0 while most model paragraphs arrive between 25 and 70. They're rules, not a classifier, so they miss things and sometimes flag a line a person would write.

## How it uses Pollinations

- **Writers:** each live hole is written by one of five text models through `POST /v1/chat/completions`. Each request has a random seed and a small random detail ("You live in a small town", "You've had a long week"), so holes don't repeat.
- **Judge:** `openai/gpt-5.4-mini` checks each putt and returns JSON (`ok` plus a note for the player).
- **Users pay with their own Pollen** through [Pollinations Connect](https://github.com/pollinations/pollinations/blob/main/BRING_YOUR_OWN_POLLEN.md). A round costs well under a hundredth of a Pollen. The app holds no key.
- **No sign-in needed to try it:** a five-hole practice course, pre-written by the five models, is free to play. Connect to get fresh holes and the judge.

## Files

| File | What it does |
| --- | --- |
| `index.html`, `style.css`, `app.js` | The page and the game |
| `detector.js` | The hazards and the slop score (pure functions, runs on every keystroke) |
| `holes.js` | The briefs and the writer models |
| `api.js` | Pollinations calls: writing a hole, judging a putt |
| `data/course.json` | The practice course |
| `tools/gen-course.mjs` | Rewrites the practice course: `POLLINATIONS_API_KEY=sk_... node tools/gen-course.mjs` |
| `tools/sample.mjs`, `tools/calibrate.mjs` | Sample paragraphs from every model, and check the score against human text |

No build step. To run it locally, serve the folder (`python3 -m http.server`) and open it.

MIT licence.
