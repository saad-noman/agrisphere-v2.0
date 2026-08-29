const axios = require('axios');

const API_BASE_URL = 'https://api.commoditypriceapi.com/v2';
const TIMEOUT_MS = Number(process.env.COMMODITY_TIMEOUT_MS || 12000);
const CACHE_TTL_MS = Number(process.env.COMMODITY_CACHE_TTL_MS || 10 * 60 * 1000);

// Raised when live pricing cannot be obtained
class PriceUnavailableError extends Error {
  constructor(message) {
    super(message || 'Live pricing is currently unavailable');
    this.name = 'PriceUnavailableError';
  }
}

const isConfigured = () => Boolean(process.env.COMMODITY_API_KEY);

const getApiKey = () => {
  if (!process.env.COMMODITY_API_KEY) {
    throw new PriceUnavailableError('COMMODITY_API_KEY is not configured');
  }

  return process.env.COMMODITY_API_KEY;
};

// Caches upstream responses, which are rate limited
const cache = new Map();

const readCache = (key) => {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.value;
};

const writeCache = (key, value) => {
  cache.set(key, { at: Date.now(), value });
  return value;
};

// Converts any upstream failure into one error type
const toPriceError = (err) => {
  if (err instanceof PriceUnavailableError) return err;
  const status = err.response?.status;
  if (status === 401 || status === 403) {
    return new PriceUnavailableError('Price provider rejected the configured API key');
  }
  if (status === 429) {
    return new PriceUnavailableError('Price provider rate limit reached. Please try again shortly.');
  }
  if (err.code === 'ECONNABORTED') {
    return new PriceUnavailableError('Price provider timed out');
  }
  return new PriceUnavailableError('Price provider is currently unreachable');
};

// To get all supported commodity symbols from the external API
const getSupportedSymbols = async () => {
  const cached = readCache('symbols');
  if (cached) return cached;

  try {
    const response = await axios.get(`${API_BASE_URL}/symbols`, {
      headers: { 'x-api-key': getApiKey() },
      timeout: TIMEOUT_MS,
    });

    if (!response.data?.success) {
      throw new PriceUnavailableError('Failed to fetch commodity symbols');
    }

    const symbols = Array.isArray(response.data.symbols) ? response.data.symbols : [];
    return writeCache('symbols', symbols);
  } catch (err) {
    throw toPriceError(err);
  }
};

// To get the latest market prices for the given commodity symbols
const getLatestRates = async (symbols) => {
  if (!symbols || symbols.length === 0) {
    return { success: true, rates: {}, metadata: {} };
  }

  const key = `rates:${[...symbols].sort().join(',')}`;
  const cached = readCache(key);
  if (cached) return cached;

  try {
    const response = await axios.get(`${API_BASE_URL}/rates/latest`, {
      params: { symbols: symbols.join(',') },
      headers: { 'x-api-key': getApiKey() },
      timeout: TIMEOUT_MS,
    });

    const data = response.data || {};
    // A malformed body is treated as unavailable
    if (!data.rates || typeof data.rates !== 'object') {
      throw new PriceUnavailableError('Price provider returned an unexpected response');
    }
    return writeCache(key, data);
  } catch (err) {
    throw toPriceError(err);
  }
};

const normalize = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();

// To find the commodity symbol matching a free-text item name
const buildSymbolLookup = (symbols) => {
  const lookup = new Map();
  for (const item of symbols) {
    if (!item?.symbol) continue;
    lookup.set(normalize(item.symbol), item);
    if (item.name) lookup.set(normalize(item.name), item);
  }
  return lookup;
};

// Provider names are usually qualified (e.g. "Rice, Thailand 5%"), so an
// exact match on a plain name like "rice" rarely succeeds. Falls back to a
// whole-word match on the symbol code and display name.
const findCommodity = (name, symbols, lookup) => {
  const exact = lookup.get(name);
  if (exact) return exact;

  if (name.length < 3) return null;
  const nameWords = new Set(name.split(/\s+/).filter(Boolean));

  for (const item of symbols) {
    if (!item?.symbol) continue;
    const haystack = `${normalize(item.symbol)} ${normalize(item.name)}`;
    const haystackWords = haystack.split(/[\s,()%-]+/).filter(Boolean);
    if (haystackWords.some((word) => nameWords.has(word))) {
      return item;
    }
  }
  return null;
};

// Resolves live unit prices by item name. Items the provider does not
// cover come back with `available: false` and no price.
const resolvePrices = async (names = []) => {
  const unique = [...new Set(names.map(normalize).filter(Boolean))];
  if (unique.length === 0) return { results: [], fetchedAt: new Date() };

  const symbols = await getSupportedSymbols();
  const lookup = buildSymbolLookup(symbols);

  const matched = new Map();
  for (const name of unique) {
    const hit = findCommodity(name, symbols, lookup);
    if (hit) matched.set(name, hit);
  }

  const wanted = [...new Set([...matched.values()].map((m) => m.symbol))];
  const latest = await getLatestRates(wanted);
  const rates = latest.rates || {};
  const metadata = latest.metadata || {};

  const results = unique.map((name) => {
    const commodity = matched.get(name);
    if (!commodity) {
      return { name, available: false, reason: 'Not covered by the price provider' };
    }

    const rate = rates[commodity.symbol];
    const price = typeof rate === 'number' ? rate : Number(rate?.price ?? rate?.rate);
    if (!Number.isFinite(price) || price <= 0) {
      return { name, available: false, reason: 'No current price published for this item' };
    }

    const meta = metadata[commodity.symbol] || {};
    return {
      name,
      available: true,
      symbol: commodity.symbol,
      displayName: commodity.name || commodity.symbol,
      unitPrice: price,
      unit: meta.unit || commodity.unit || null,
      currency: meta.currency || 'USD',
      updatedAt: meta.updated || meta.timestamp || null,
    };
  });

  return {
    results,
    source: 'CommodityPriceAPI',
    fetchedAt: new Date(),
  };
};

module.exports = {
  getSupportedSymbols,
  getLatestRates,
  resolvePrices,
  isConfigured,
  PriceUnavailableError,
};
