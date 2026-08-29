const llm = require('../services/llmService');
const { retrievePublicContext, PLATFORM_ROUTES } = require('../services/aiRetrievalService');
const sendError = require('../utils/sendError');

// Builds the JSON-only prompt asking the LLM to classify a message: whether
// it is in scope, what data to retrieve, and which routes are relevant.
// Routes come from PLATFORM_ROUTES and are re-validated in `chat()`.
function buildClassifierPrompt() {
  const routeLines = PLATFORM_ROUTES.map((r) => `${r.link} — ${r.label}`).join('\n');
  return [
    'You are the intent-understanding layer for AgriSphere, an agriculture platform assistant.',
    'Read the user\'s latest message, using the conversation history for context (e.g. resolving "it"/"that" in a follow-up), and output ONLY a single JSON object — no prose, no markdown code fences, nothing before or after it.',
    'JSON shape (all fields required):',
    '{',
    '  "inScope": boolean,           // true if the message is about agriculture/farming (crops, soil, pests, diseases, weather, yields, etc.) in ANY wording, OR about using the AgriSphere platform (finding people/pages, account, appointments, navigation) in ANY wording. False only for topics genuinely unrelated to both, e.g. general trivia, unrelated coding help, entertainment, other companies/products.',
    '  "needsExperts": boolean,      // true if answering well benefits from real AgriSphere expert profiles (the user wants to find/contact/consult/compare a specialist)',
    '  "needsOrganizations": boolean,// true if answering well benefits from real AgriSphere organization listings',
    '  "needsDiseases": boolean,     // true if answering well benefits from AgriSphere\'s disease-library entries',
    '  "topRated": boolean,          // true only if the user specifically wants the best/highest-rated results',
    '  "listAll": boolean,           // true if the user wants a broad listing rather than one narrow specific match',
    '  "searchQuery": string,        // a short plain-text phrase of the concrete subject to search for (crop, disease, specialization, location, etc.) — empty string if nothing is worth searching',
    '  "routes": string[]            // zero or more route paths, copied EXACTLY from the list below, that the user is trying to reach or would benefit from seeing; [] if none clearly apply. Never write a path that is not in the list.',
    '}',
    '',
    'AVAILABLE PLATFORM ROUTES (choose only from this list, copy the path exactly):',
    routeLines,
  ].join('\n');
}

// Defaults used when classification is unavailable: search broadly rather
// than assuming nothing is relevant.
const DEFAULT_INTENT = {
  inScope: true,
  needsExperts: true,
  needsOrganizations: true,
  needsDiseases: true,
  topRated: false,
  listAll: false,
  searchQuery: '',
  routes: null,
};

// Classifies a message with the LLM. Falls back to DEFAULT_INTENT when the
// provider is unreachable or returns something unusable.
async function classifyIntent(message, history) {
  if (!llm.isConfigured()) return { ...DEFAULT_INTENT };
  try {
    const messages = [
      { role: 'system', content: buildClassifierPrompt() },
      ...history,
      { role: 'user', content: message },
    ];
    const parsed = await llm.chatJson(messages, { temperature: 0 });
    return {
      inScope: Boolean(parsed.inScope),
      needsExperts: Boolean(parsed.needsExperts),
      needsOrganizations: Boolean(parsed.needsOrganizations),
      needsDiseases: Boolean(parsed.needsDiseases),
      topRated: Boolean(parsed.topRated),
      listAll: Boolean(parsed.listAll),
      searchQuery: typeof parsed.searchQuery === 'string' ? parsed.searchQuery.slice(0, 200) : '',
      routes: Array.isArray(parsed.routes) ? parsed.routes.filter((r) => typeof r === 'string') : [],
    };
  } catch (err) {
    console.error('Assistant: intent classification failed, using default intent —', err.message);
    return { ...DEFAULT_INTENT };
  }
}

// To keep only routes the model proposed that actually exist in
// PLATFORM_ROUTES — the platform's route list stays the single source of
// truth, the model can never cause an invented link to reach the user.
function resolveRoutes(proposedLinks) {
  if (proposedLinks === null) return PLATFORM_ROUTES.slice(0, 4); // no classification available
  const byLink = new Map(PLATFORM_ROUTES.map((r) => [r.link, r]));
  const matched = proposedLinks.map((link) => byLink.get(link)).filter(Boolean);
  return matched.slice(0, 5);
}

// To build the instructions that steer the AI assistant's replies
function buildSystemPrompt() {
  return [
    'You are AgriSphere Assistant — the general-purpose assistant for the whole AgriSphere web application, not just a farming Q&A bot.',
    'You help with: (1) agriculture/farming topics — crops, soil, irrigation, fertilizers, pests and plant diseases, sustainable/organic farming;',
    '(2) navigating AgriSphere — pointing users to the right page/feature for experts, organizations, resources, consultations, appointments, maps, and their own profile;',
    '(3) recommending experts or organizations from the PROJECT CONTEXT; (4) explaining how AgriSphere features/workflows work; (5) using the AgriSphere platform in general (account, messages, notifications, ratings).',
    'Understand what the user means, not just the exact words they used — questions can be phrased indirectly, conversationally, or as incomplete sentences (e.g. "why is my field producing less this year" is an agriculture question; "I can\'t find my old appointments" is a platform-navigation question). Use the recent conversation history to understand follow-up messages that don\'t repeat earlier context.',
    'STRICT SCOPE: only agriculture/farming topics and the AgriSphere platform itself. If the message is genuinely about neither (e.g. general trivia, unrelated coding help, entertainment), briefly and politely decline and restate your scope — do not attempt to answer it.',
    'WHEN THE USER ASKS FOR EXPERTS/ORGANIZATIONS (e.g. "suggest an expert", "give me experts", "who can help with tomato disease", "I need someone to look at my farm"): list the actual [expert] and [organization] entries you can see in PROJECT CONTEXT below by name, with their specialization and location, and tell the user they can open each one from the links the app is rendering. Do NOT respond with a generic "I cannot recommend specific experts" — the PROJECT CONTEXT is exactly where the recommendations come from. Only if PROJECT CONTEXT contains zero [expert]/[organization] entries should you say none were found and point them to the /experts or /organizations page from RELEVANT PLATFORM PAGES.',
    'WHEN THE USER ASKS FOR NAVIGATION (e.g. "take me to the expert details page", "where can I see experts", "how do I message an expert", "where are my appointments"): tell them which AgriSphere page to open using the entries in RELEVANT PLATFORM PAGES below. Describe the page in plain language — the app renders the clickable links separately, so do not paste raw URLs.',
    'RECOMMENDATIONS: only recommend experts/organizations that appear in the PROJECT CONTEXT below — never invent one. When asked for the "best" or "top-rated", prefer the ones with the highest star rating shown in PROJECT CONTEXT and mention their rating and review count; if an item has no rating yet, say so instead of guessing one.',
    'Ground your answer in the PROJECT CONTEXT provided when it is relevant, and clearly attribute platform-specific facts to AgriSphere.',
    'When project context is insufficient, you may add reliable general agricultural knowledge, and make clear it is general information rather than platform data.',
    'Prefer verified/retrieved information over speculation. Be concise, practical and friendly. Never invent experts, organizations, ratings, links or statistics.',
    'NEVER write a path, URL or route such as "/experts/abc123" or a raw database id anywhere in your reply, even as an example or to describe where something is — the app always renders clickable links for experts, organizations and pages separately from your text. Refer to items by name only.',
    'Answer only what the user actually asked. Do not add unrelated suggestions, disclaimers about being an AI, or a closing remark offering further help unless the user asked for one. Stop the reply as soon as the question is fully answered — do not pad it with extra unrelated paragraphs.',
    'Never reveal or ask for passwords, tokens, private messages, or any private user data.',
  ].join(' ');
}

// To build the retrieved AgriSphere data block sent to the AI assistant
function buildContextBlock(results, routes) {
  const lines = [];
  if (results.length) {
    lines.push('PROJECT CONTEXT (public AgriSphere data):');
    results.forEach((r, i) => {
      lines.push(`${i + 1}. [${r.type}] ${r.title} — ${r.detail || ''} (page: ${r.link})`);
    });
  } else {
    lines.push('PROJECT CONTEXT: no specific matching AgriSphere records were found for this query.');
  }
  if (routes.length) {
    lines.push('', 'RELEVANT PLATFORM PAGES:');
    routes.forEach((r) => lines.push(`- ${r.label} (${r.link})`));
  }
  return lines.join('\n');
}

// Backstop in case the AI assistant leaks a raw route/id despite the prompt rule
const ROUTE_LEAK_RE =
  /\/(?:experts?|organizations?)(?:\/[\w-]+)?\b|\b(?:experts?|organizations?)\/[\w-]{4,}\b|\/(?:consultations(?:\/request)?|disease-library|disease-submission|crop-analysis|farming-recommendation|get-weather|messages|profile-dashboard|farm-records|map)(?:\/[\w-]+)?\b/gi;

// To strip any leaked route/id text out of the assistant's reply
function sanitizeReply(text) {
  return String(text || '')
    .replace(ROUTE_LEAK_RE, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+([.,!?;:])/g, '$1')
    .replace(/\n[ \t]+/g, '\n')
    .trim();
}

// To build a reply from retrieved data alone when the AI model is unavailable.
// This is a technical fallback for outages only — normal operation always
// goes through the LLM for semantic understanding.
function buildFallbackReply(message, results, routes) {
  const parts = [];
  if (results.length) {
    parts.push('Here’s what I found on AgriSphere related to your question:');
    results.slice(0, 6).forEach((r) => {
      parts.push(`• ${r.title}${r.detail ? ` — ${r.detail}` : ''}`);
    });
  } else {
    parts.push(
      "I couldn’t find a specific AgriSphere record for that, but I can still point you to the right place."
    );
  }
  if (routes.length) {
    parts.push('', 'You may find these pages useful:');
    routes.forEach((r) => parts.push(`• ${r.label}`));
  }
  parts.push(
    '',
    '(The AI language model is not reachable right now, so this is a direct search result. ' +
      'Ask an agricultural question and I’ll help as best I can.)'
  );
  return parts.join('\n');
}

// POST /api/assistant/chat
// Answers a chat message: the LLM classifies the request, the backend
// retrieves and validates the data, then the LLM writes the grounded reply.
const chat = async (req, res) => {
  try {
    const message = (req.body?.message || '').toString().trim();
    if (!message) return res.status(400).json({ message: 'A message is required' });
    if (message.length > 2000) {
      return res.status(400).json({ message: 'Message is too long (max 2000 characters)' });
    }

    const history = Array.isArray(req.body?.history)
      ? req.body.history
          .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
          .slice(-6)
          .map((m) => ({ role: m.role, content: m.content.slice(0, 1500) }))
      : [];

    const intent = await classifyIntent(message, history);

    const { results } = await retrievePublicContext(message, intent);
    const routes = resolveRoutes(intent.routes);

    let reply;
    let usedLlm = false;

    if (llm.isConfigured()) {
      try {
        const messages = [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'system', content: buildContextBlock(results, routes) },
          ...history,
          { role: 'user', content: message },
        ];
        reply = await llm.chat(messages, { temperature: 0.3 });
        usedLlm = true;
      } catch (err) {
        console.error('Assistant: LLM chat failed, falling back to retrieval-only reply —', err.message);
        reply = buildFallbackReply(message, results, routes);
      }
    } else {
      reply = buildFallbackReply(message, results, routes);
    }

    res.json({
      reply: sanitizeReply(reply),
      sources: results.slice(0, 6),
      links: routes,
      inScope: intent.inScope,
      usedLlm,
    });
  } catch (err) {
    sendError(res, 500, 'Assistant failed', err);
  }
};

module.exports = { chat };
