const axios = require('axios');

const PROVIDER = (process.env.LLM_PROVIDER || 'openai-compatible').toLowerCase();
const MODEL = process.env.LLM_MODEL || 'minimax/minimax-m3:free';
const OLLAMA_URL = (process.env.OLLAMA_URL || 'http://localhost:11434').replace(/\/$/, '');
const OPENAI_BASE_URL = (process.env.LLM_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
const OPENAI_KEY = process.env.LLM_API_KEY || '';
const TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS || 45000);

class LlmUnavailableError extends Error {
  constructor(message) {
    super(message || 'LLM service unavailable');
    this.name = 'LlmUnavailableError';
  }
}

// To check whether an LLM endpoint is configured (not whether it is currently up)
function isConfigured() {
  if (PROVIDER === 'openai-compatible') return Boolean(OPENAI_BASE_URL);
  return Boolean(OLLAMA_URL);
}

// To send a chat request to the configured LLM provider and return its reply text
async function chat(messages, options = {}) {
  const temperature = options.temperature ?? 0.3;
  const wantJson = Boolean(options.json);

  try {
    if (PROVIDER === 'openai-compatible') {
      if (!OPENAI_BASE_URL) throw new LlmUnavailableError('LLM_BASE_URL not set');
      const headers = { 'Content-Type': 'application/json' };
      if (OPENAI_KEY) headers.Authorization = `Bearer ${OPENAI_KEY}`;

      const body = {
        model: MODEL,
        messages,
        temperature,
      };
      if (wantJson) body.response_format = { type: 'json_object' };

      const { data } = await axios.post(`${OPENAI_BASE_URL}/chat/completions`, body, {
        headers,
        timeout: TIMEOUT_MS,
      });
      const content = data?.choices?.[0]?.message?.content;
      if (!content) throw new LlmUnavailableError('Empty response from LLM');
      return content.trim();
    }

    const body = {
      model: MODEL,
      messages,
      stream: false,
      options: { temperature },
    };
    if (wantJson) body.format = 'json';

    const { data } = await axios.post(`${OLLAMA_URL}/api/chat`, body, {
      timeout: TIMEOUT_MS,
    });
    const content = data?.message?.content;
    if (!content) throw new LlmUnavailableError('Empty response from Ollama');
    return content.trim();
  } catch (err) {
    if (err instanceof LlmUnavailableError) throw err;
    throw new LlmUnavailableError(
      `LLM request failed (${PROVIDER}/${MODEL}): ${err.code || err.message}`
    );
  }
}

// To ask the LLM for a JSON reply and parse it, tolerating markdown fences
async function chatJson(messages, options = {}) {
  const raw = await chat(messages, { ...options, json: true });
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        /* fall through */
      }
    }
    throw new LlmUnavailableError('LLM did not return valid JSON');
  }
}

module.exports = {
  chat,
  chatJson,
  isConfigured,
  LlmUnavailableError,
  MODEL,
  PROVIDER,
};
