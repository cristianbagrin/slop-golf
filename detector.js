// Finds the tells of the LLM voice in a paragraph. Pure functions, no network: it runs on every keystroke.
// The principle (from a ghostwriter's de-AI checklist): density, not any single word. One hit is
// nothing; a cluster is the fingerprint. So each hazard is cheap and the score is per 100 words.

const W = (words) => new RegExp(`\\b(?:${words.join("|")})\\b`, "gi");

// kind: bunker = structure, water = tell-words, rough = stock phrases and filler.
export const RULES = [
  {
    id: "antithesis",
    kind: "bunker",
    name: "Negated antithesis",
    tip: "\"Not X, it's Y\" sounds crisp and says little. Is it really either/or? Write the grey, or just say Y.",
    weight: 3,
    re: [
      /\bnot (?:just|only|merely|simply)\b[^.;!?]{0,60}?(?:[,;—–]\s*|\s)(?:but|it'?s|it is|they'?re|that'?s)\b/gi,
      /\bmore than (?:just )?[\w' -]{1,40}?[;,—–]\s*(?:it|they|this)\b/gi,
      /\b(?:is|was|are|were)(?:n'?t| not) (?:just |only |really )?about\b[^.;!?]{1,50}?[;,—–.]\s*(?:it'?s|it is|it was|but|they'?re)\b/gi,
      /\bmore than just\b/gi,
      /\b(?:[\w'-]+ ){0,3}rather than (?:[\w'-]+ ){0,4}[\w'-]+/gi,
      /\bless (?:like|about) [^.;!?]{1,40}? and more (?:like|about)\b/gi,
      /\banything but\b/gi,
      /\bI thought I knew[^.;!?]{0,60}?, but\b/gi,
    ],
  },
  {
    id: "balance",
    kind: "bunker",
    name: "Balanced contrast",
    tip: "\"Rich without being heavy\", \"just the right chew\": a tidy hedge that every review uses. Say what it actually tasted or felt like.",
    weight: 2,
    re: [
      /\b[\w'-]+ without (?:being|feeling|tasting|getting|looking) (?:too |overly )?[\w'-]+/gi,
      /\bjust the right (?:amount of )?[\w'-]+/gi,
      /\bwithout (?:compromising|sacrificing|losing|breaking|skimping on) [\w'-]+/gi,
      /\bperfect(?:ly)? (?:balance[ds]?|chewy|cooked|seasoned|crispy|tender)\b/gi,
    ],
  },
  {
    id: "fromto",
    kind: "bunker",
    name: "From X to Y",
    tip: "A sweep from one thing to another sounds thorough without saying what happened. Name the one thing that mattered.",
    weight: 2,
    re: [/\bfrom (?!\d)[\w' -]{3,40}? to (?!\d)[\w' -]{3,40}?(?=[,.;—]| and\b)/gi],
  },
  {
    id: "three",
    kind: "bunker",
    name: "Rule of three",
    tip: "Three items feel complete, so models reach for them by reflex. Use the real number: often one, sometimes two or four.",
    weight: 2,
    re: [/\b(?:[\w'-]+ ){0,3}[\w'-]+, (?:[\w'-]+ ){0,5}[\w'-]+,? (?:and|or) (?:[\w'-]+ ){0,2}[\w'-]+\b/gi],
    // End the highlight at the list, not at the preposition after it.
    trim: (m) => m.replace(/ (?:for|to|with|of|in|on|at|without|from|the|a|an|as|by|are|is|was|were)$/i, ""),
    // A real list: three short items, no pronouns or clause-starters (that's two clauses, not a list).
    accept: (m) => {
      const items = m.split(/,\s*(?:and |or )?|\s(?:and|or)\s/).map((x) => x.trim()).filter(Boolean);
      if (items.length < 3) return false;
      // Check only the list itself: the first item's last word, the middle, the last item's first word.
      const parts = [items[0].split(" ").pop(), ...items.slice(1, -1), items[items.length - 1].split(" ")[0]];
      const starter = /^(?:all|which|who|that|so|but|then|when|while|because|if|and|or)\b/i;
      const pronoun = /\b(?:i|i'll|i'm|i've|me|you|you'll|we|we'll|he|she|they|it|it's|tell)\b/i;
      return !items.slice(1).some((x) => starter.test(x)) && !parts.some((x) => pronoun.test(x));
    },
  },
  {
    id: "ing",
    kind: "bunker",
    name: "Trailing -ing clause",
    tip: "A comma and an -ing verb that certifies why the sentence matters. Cut it, or make it a real claim.",
    weight: 2,
    re: [/,\s(?:highlighting|underscoring|showcasing|emphasi[sz]ing|reflecting|ensuring|fostering|demonstrating|reinforcing|signal+ing|paving the way|cementing|solidifying|making (?:it|this|them) (?:a|an|the|more))\b[^.!?]*/gi],
  },
  {
    id: "inflation",
    kind: "bunker",
    name: "Significance inflation",
    tip: "Words that announce importance instead of showing it. Say what actually happened.",
    weight: 3,
    re: [/\b(?:stands? as a testament|(?:a )?(?:true )?testament to|plays? an? (?:key|pivotal|crucial|vital|important) role|pivotal moment|marks? a (?:significant|pivotal|major) (?:shift|milestone|step)|cannot be overstated|speaks volumes|game[- ]changer)\b/gi],
  },
  {
    id: "drumroll",
    kind: "bunker",
    name: "Drumroll",
    tip: "Announcing the point before making it. Just make it.",
    weight: 2,
    re: [/\b(?:here'?s the (?:thing|kicker|truth|catch)|(?:two|three|four|five) (?:things|lessons|reasons) (?:stand out|I learned)|let'?s dive in|buckle up|the (?:best part|result|answer|secret|kicker)\?)/gi],
  },
  {
    id: "ending",
    kind: "bunker",
    name: "Nothing-ending or vague attribution",
    tip: "A closer that sums up what was just said, or 'studies show' with no study. Cut it or name the source.",
    weight: 2,
    re: [/\b(?:in conclusion|at the end of the day|all in all|in summary|studies (?:show|suggest)|research (?:shows|suggests)|experts (?:say|agree|believe)|(?:I'll|we'll|I will|we will) definitely be back|definitely (?:be |coming )back|planning my return|let me know if you have any questions|in the meantime|something special|delivers on every level|here'?s to\b[^.!?]*)/gi],
  },
  {
    id: "transition",
    kind: "rough",
    name: "Empty transition",
    tip: "Furthermore, moreover, additionally: filler. Start with the real subject.",
    weight: 1,
    re: [/\b(?:Furthermore|Moreover|Additionally|Consequently|In addition|Notably|Importantly|Ultimately|Overall),/g],
  },
  {
    id: "editorial",
    kind: "rough",
    name: "Editorializing",
    tip: "'It's worth noting that' adds nothing. Note it.",
    weight: 2,
    re: [/\bit'?s (?:important|worth|crucial|essential) to (?:note|remember|recogni[sz]e|mention|understand) that\b/gi],
  },
  {
    id: "stock",
    kind: "rough",
    name: "Stock phrase",
    tip: "A phrase you've read a thousand times. Replace it with the specific thing, or cut it.",
    weight: 2,
    re: [
      W([
        "in today'?s (?:fast-paced|digital|modern) (?:world|age|landscape)", "ever-evolving", "when it comes to", "navigate the complexities",
        "in the realm of", "unlock(?:ing)? (?:the |your )?(?:full )?potential", "to the next level", "embark(?:ed|ing)? on", "warm hug",
        "melt-in-your-mouth", "tucked away", "hidden gem", "highly recommend(?:ed)?", "the wait is (?:finally )?over", "unforeseen circumstances",
        "take full responsibility", "at your (?:earliest )?convenience", "moving forward", "going forward", "finds you well",
        "(?:thrilled|excited|delighted|proud) to (?:announce|share)", "every step of the way", "along the way", "a mix of",
        "perfect (?:balance|blend)", "look no further", "whether you'?re", "peace of mind", "your patience and understanding",
        "greatly appreciated", "don'?t hesitate to", "can'?t wait to", "stay tuned", "I'?m (?:already )?reflecting on", "a world of",
        "rest assured", "I truly believe", "means the world", "beyond grateful", "words cannot express", "with that (?:being )?said",
        "the beauty of", "the power of", "at its core", "it'?s no secret", "a testament", "on a journey", "this journey",
        "(?:would|we'?d|I'?d) love to hear", "love to hear your (?:feedback|thoughts)", "(?:would|I'?d) love to bring", "I have always (?:loved|been passionate)",
        "passionate about", "welcoming energy", "bring (?:that|the) same", "reply to this (?:message|email) anytime", "as an early supporter",
        "made (?:it|the \\w+) (?:feel )?possible", "where I'?ll go next", "what (?:I|we) learned", "it'?s been an? (?:incredible|amazing|wild) (?:ride|journey)",
        "from the bottom of my heart", "couldn'?t have done (?:it|this) without", "in more ways than one",
        "(?:thanks|thank you) for (?:your|the|everyone'?s) (?:patience|flexibility|understanding)(?: and (?:patience|flexibility|understanding))?",
        "appreciate (?:everyone'?s|your) (?:understanding|patience)", "rock[- ]solid", "come out (?:the other side )?stronger", "keep (?:everyone|you) posted",
        "hit an? (?:unexpected )?snag", "wrap everything up", "(?:a )?quick heads[- ]up", "just a quick note", "making solid progress",
        "felt like (?:stepping|a)", "living postcard", "like an? (?:warm|familiar|gentle) embrace", "hum(?:s|med|ming)? with energy", "a blur of",
        "the scent of", "every corner", "wasted no time", "chaotic energy", "a buzz of", "neon-lit", "unfold(?:s|ed)", "the city itself",
        "never disappoints", "(?:has|have) not disappointed", "go-to", "comfort (?:spot|food|meal)", "melts? in(?:to)? (?:the|your)", "a nice vibe",
        "the happy couple", "could not be prouder", "couldn'?t be prouder", "a (?:big|kind|warm) heart", "a lifetime of", "may your (?:days|years|life|marriage)",
        "(?:full of|filled with) (?:laughter|love|joy)", "the simple joy", "constant cheerleader", "the kind of (?:love|soul|person|friend)",
        "grateful for (?:this|the) day", "I'?m confident (?:that )?(?:we'?ll|it'?ll|it will)",
        "heads[- ]up", "(?:a )?city that never (?:really )?sleeps", "electric (?:pulse|energy|atmosphere|buzz)", "(?:humid|warm|damp) (?:embrace|breath)",
        "mingl(?:ed|es|ing) with", "the faint (?:tang|hint|scent|smell)", "flicker(?:ed|ing)? to life", "the thrill of", "under my skin",
        "wove through", "hungry for more", "greeted (?:me|us) with", "somewhere between", "it hit me", "(?:hasn'?t|has not) gone unnoticed",
        "come back stronger", "set us up for", "unexpected (?:roadblocks|challenges|hurdles)", "refine our approach", "hard work and (?:dedication|flexibility)",
        "get it right", "the (?:sizzle|clatter|hum) of", "came alive", "alive with", "a feast for", "couldn'?t help but", "a sensory",
      ]),
    ],
  },
  {
    id: "words",
    kind: "water",
    name: "Tell-word",
    tip: "One is fine. Two or more in a paragraph is the fingerprint. Swap vague for specific, not one fancy word for another.",
    weight: 1,
    re: [
      W([
        "delve[sd]?", "delving", "tapestry", "intricate", "pivotal", "meticulous(?:ly)?", "commendable", "foster(?:s|ed|ing)?",
        "showcas(?:e|es|ed|ing)", "underscor(?:e|es|ed|ing)", "emphasi[sz](?:e|es|ed|ing)", "enhanc(?:e|es|ed|ing)", "robust", "seamless(?:ly)?",
        "elevat(?:e|es|ed|ing)", "leverag(?:e|es|ed|ing)", "landscape", "realm", "navigat(?:e|es|ed|ing)", "vibrant", "bustling", "journey",
        "crucial", "transformative", "resonat(?:e|es|ed|ing)", "synergy", "holistic", "empower(?:s|ed|ing)?", "unwavering", "nuanced",
        "multifaceted", "groundbreaking", "cutting-edge", "beacon", "unleash(?:es|ed|ing)?", "harness(?:es|ed|ing)?", "invaluable",
        "profound(?:ly)?", "testament", "embrac(?:e|es|ed|ing)", "curated", "elevated", "authentic", "comforting", "cozy",
      ]),
    ],
  },
  {
    id: "dash",
    kind: "rough",
    name: "Em dash",
    tip: "Fine now and then. Where a comma or full stop works, use that.",
    weight: 1,
    re: [/—/g],
  },
  {
    id: "hedge",
    kind: "rough",
    name: "Hedge",
    tip: "Stacked hedges sound careful and commit to nothing. Say what you think.",
    weight: 1,
    re: [/\b(?:may|might|could) (?:potentially|possibly)\b|\bit seems (?:that|like)\b|\bmay have caused\b/gi],
  },
];

export const KIND_LABEL = { bunker: "Bunker", water: "Water", rough: "Rough" };

export function words(text) {
  return (text.match(/[\p{L}\p{N}'’-]+/gu) || []).length;
}

function sentences(text) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => words(s))
    .filter((n) => n > 0);
}

// Flat rhythm: four or more sentences, all about the same length.
function flatRhythm(text) {
  const s = sentences(text);
  if (s.length < 4) return null;
  const mean = s.reduce((a, b) => a + b, 0) / s.length;
  const sd = Math.sqrt(s.reduce((a, b) => a + (b - mean) ** 2, 0) / s.length);
  return sd < 4.5 ? { mean: Math.round(mean), sd: Math.round(sd * 10) / 10 } : null;
}

// Returns { hits: [{rule, start, end, text}], rhythm, points, words, slop }.
export function analyse(text) {
  const hits = [];
  const t = text.replace(/[’‘]/g, "'"); // same length, so offsets still match the original
  for (const rule of RULES) {
    for (const re of rule.re) {
      re.lastIndex = 0;
      for (const m of t.matchAll(re)) {
        if (rule.accept && !rule.accept(m[0])) continue;
        const found = rule.trim ? rule.trim(m[0]) : m[0];
        const start = m.index, end = m.index + found.length;
        if (hits.some((h) => start < h.end && end > h.start)) continue; // first rule to claim a span wins
        hits.push({ rule, start, end, text: text.slice(start, end) });
      }
    }
  }
  hits.sort((a, b) => a.start - b.start);

  let points = hits.reduce((p, h) => p + h.rule.weight, 0);
  const tellWords = hits.filter((h) => h.rule.id === "words").length;
  if (tellWords >= 2) points += tellWords - 1; // a cluster counts more than its parts
  const rhythm = flatRhythm(text);
  if (rhythm) points += 3;

  const n = Math.max(words(text), 1);
  const slop = Math.min(99, Math.round((points / n) * 100 * 4));
  return { hits, rhythm, points, words: n, slop };
}

// Word-level edit distance: the strokes you've played.
export function strokes(a, b) {
  const x = a.toLowerCase().match(/[\p{L}\p{N}'’-]+/gu) || [];
  const y = b.toLowerCase().match(/[\p{L}\p{N}'’-]+/gu) || [];
  let prev = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    const cur = [i];
    for (let j = 1; j <= y.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[y.length];
}

export const GREEN = 20; // slop at or below this is on the green
// Par: about 1.8 words of editing for each slop point between the paragraph and the green.
export const parFor = (a) => Math.max(4, Math.ceil(Math.max(0, a.points - (GREEN * a.words) / 400) * 1.8) + 2);
