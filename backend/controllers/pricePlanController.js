const mongoose = require('mongoose');
const PricePlan = require('../models/PricePlan');
const Fertilizer = require('../models/Fertilizer');
const Pesticide = require('../models/Pesticide');
const Crop = require('../models/Crop');
const sendError = require('../utils/sendError');
const {
  resolvePrices,
  isConfigured,
  PriceUnavailableError,
} = require('../services/commodityPriceService');

const CATEGORIES = ['seed', 'fertilizer', 'pesticide', 'other'];

// Money is rounded to 2 decimals at every step so totals cannot drift.
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return NaN;
  return Number(value);
};

// Validates items and recalculates every subtotal and the grand total
const buildItems = (rawItems) => {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { error: 'At least one item is required' };
  }
  if (rawItems.length > 200) {
    return { error: 'A plan cannot contain more than 200 items' };
  }

  const items = [];
  for (const [index, raw] of rawItems.entries()) {
    const position = index + 1;
    const name = String(raw?.name || '').trim();
    if (!name) return { error: `Item ${position}: name is required` };

    const quantity = toNumber(raw?.quantity);
    if (!Number.isFinite(quantity) || quantity < 0) {
      return { error: `Item ${position}: quantity must be zero or greater` };
    }

    const unitPrice = toNumber(raw?.unitPrice);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return { error: `Item ${position}: unit price must be zero or greater` };
    }

    const category = CATEGORIES.includes(raw?.category) ? raw.category : 'other';
    const priceSource = raw?.priceSource === 'live' ? 'live' : 'manual';

    items.push({
      name: name.slice(0, 120),
      category,
      quantity: round2(quantity),
      unit: String(raw?.unit || 'unit').trim().slice(0, 24) || 'unit',
      unitPrice: round2(unitPrice),
      subtotal: round2(round2(quantity) * round2(unitPrice)),
      notes: String(raw?.notes || '').trim().slice(0, 500),
      priceSource,
      priceSymbol: raw?.priceSymbol ? String(raw.priceSymbol).trim() : null,
      priceCurrency: String(raw?.priceCurrency || 'USD').trim() || 'USD',
      priceRetrievedAt: raw?.priceRetrievedAt ? new Date(raw.priceRetrievedAt) : null,
    });
  }

  const grandTotal = round2(items.reduce((sum, item) => sum + item.subtotal, 0));
  return { items, grandTotal };
};

// GET /api/price-plans/prices?items=urea,wheat
// To look up live unit prices for the named items
const lookupPrices = async (req, res) => {
  try {
    const raw = req.query.items;
    const names = (Array.isArray(raw) ? raw : String(raw || '').split(','))
      .map((n) => String(n).trim())
      .filter(Boolean)
      .slice(0, 25);

    if (names.length === 0) {
      return res.status(400).json({ message: 'At least one item name is required' });
    }

    if (!isConfigured()) {
      return res.status(503).json({
        message: 'Live pricing is not configured on this server',
        results: [],
      });
    }

    const data = await resolvePrices(names);
    res.json(data);
  } catch (err) {
    if (err instanceof PriceUnavailableError) {
      // A provider problem, so no price is returned
      return res.status(503).json({ message: err.message, results: [] });
    }
    sendError(res, 500, 'Failed to look up prices', err);
  }
};

// GET /api/price-plans/catalog
// To suggest item names from the farm data the project already stores
const getCatalog = async (req, res) => {
  try {
    const [fertilizers, pesticides, crops] = await Promise.all([
      Fertilizer.find().select('name category').sort({ name: 1 }).limit(200).lean(),
      Pesticide.find().select('name category').sort({ name: 1 }).limit(200).lean(),
      Crop.find({ farmer: req.user._id }).select('cropType').limit(100).lean(),
    ]);

    const seeds = [...new Set(crops.map((c) => c.cropType).filter(Boolean))].map((name) => ({
      name,
      category: 'seed',
    }));

    res.json({
      seed: seeds,
      fertilizer: fertilizers.map((f) => ({ name: f.name, category: 'fertilizer' })),
      pesticide: pesticides.map((p) => ({ name: p.name, category: 'pesticide' })),
    });
  } catch (err) {
    sendError(res, 500, 'Failed to load item catalog', err);
  }
};

// POST /api/price-plans/calculate
// To validate and total a draft plan without saving it
const calculatePlan = async (req, res) => {
  try {
    const { items, grandTotal, error } = buildItems(req.body?.items);
    if (error) return res.status(400).json({ message: error });
    res.json({ items, grandTotal });
  } catch (err) {
    sendError(res, 500, 'Failed to calculate plan', err);
  }
};

// POST /api/price-plans
const createPlan = async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ message: 'Plan name is required' });

    const { items, grandTotal, error } = buildItems(req.body?.items);
    if (error) return res.status(400).json({ message: error });

    const plan = await PricePlan.create({
      farmer: req.user._id,
      name: name.slice(0, 140),
      notes: String(req.body?.notes || '').trim().slice(0, 1000),
      items,
      grandTotal,
      currency: String(req.body?.currency || 'USD').trim() || 'USD',
      pricesUpdatedAt: items.some((i) => i.priceSource === 'live') ? new Date() : null,
      priceSourceName: items.some((i) => i.priceSource === 'live') ? 'CommodityPriceAPI' : null,
    });

    res.status(201).json(plan);
  } catch (err) {
    sendError(res, 500, 'Failed to save plan', err);
  }
};

// GET /api/price-plans
const listPlans = async (req, res) => {
  try {
    const plans = await PricePlan.find({ farmer: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json(plans);
  } catch (err) {
    sendError(res, 500, 'Failed to load plans', err);
  }
};

// To load a plan only if it belongs to the requesting user
async function loadOwnedPlan(id, userId) {
  if (!mongoose.isValidObjectId(id)) return { error: 400, message: 'Invalid plan id' };
  const plan = await PricePlan.findById(id);
  if (!plan) return { error: 404, message: 'Plan not found' };
  if (plan.farmer.toString() !== userId.toString()) {
    return { error: 403, message: 'Not authorized for this plan' };
  }
  return { plan };
}

// GET /api/price-plans/:id
const getPlan = async (req, res) => {
  try {
    const { plan, error, message } = await loadOwnedPlan(req.params.id, req.user._id);
    if (error) return res.status(error).json({ message });
    res.json(plan);
  } catch (err) {
    sendError(res, 500, 'Failed to load plan', err);
  }
};

// PUT /api/price-plans/:id
const updatePlan = async (req, res) => {
  try {
    const { plan, error, message } = await loadOwnedPlan(req.params.id, req.user._id);
    if (error) return res.status(error).json({ message });

    if (req.body?.name !== undefined) {
      const name = String(req.body.name).trim();
      if (!name) return res.status(400).json({ message: 'Plan name is required' });
      plan.name = name.slice(0, 140);
    }
    if (req.body?.notes !== undefined) {
      plan.notes = String(req.body.notes).trim().slice(0, 1000);
    }

    if (req.body?.items !== undefined) {
      const built = buildItems(req.body.items);
      if (built.error) return res.status(400).json({ message: built.error });
      plan.items = built.items;
      plan.grandTotal = built.grandTotal;
    }

    await plan.save();
    res.json(plan);
  } catch (err) {
    sendError(res, 500, 'Failed to update plan', err);
  }
};

// POST /api/price-plans/:id/refresh
// Re-prices a saved plan against current live prices
const refreshPlanPrices = async (req, res) => {
  try {
    const { plan, error, message } = await loadOwnedPlan(req.params.id, req.user._id);
    if (error) return res.status(error).json({ message });

    if (!isConfigured()) {
      return res.status(503).json({ message: 'Live pricing is not configured on this server' });
    }

    const { results, fetchedAt } = await resolvePrices(plan.items.map((i) => i.name));
    const byName = new Map(results.map((r) => [r.name.toLowerCase(), r]));

    const unavailable = [];
    plan.items = plan.items.map((item) => {
      const hit = byName.get(item.name.toLowerCase());
      if (!hit || !hit.available) {
        // Keeps the previous price when none is published
        unavailable.push(item.name);
        return item;
      }
      item.unitPrice = round2(hit.unitPrice);
      item.subtotal = round2(item.quantity * round2(hit.unitPrice));
      item.priceSource = 'live';
      item.priceSymbol = hit.symbol || null;
      item.priceCurrency = hit.currency || 'USD';
      item.priceRetrievedAt = fetchedAt;
      return item;
    });

    plan.grandTotal = round2(plan.items.reduce((sum, i) => sum + i.subtotal, 0));
    plan.pricesUpdatedAt = fetchedAt;
    plan.priceSourceName = 'CommodityPriceAPI';
    await plan.save();

    res.json({ plan, unavailable });
  } catch (err) {
    if (err instanceof PriceUnavailableError) {
      return res.status(503).json({ message: err.message });
    }
    sendError(res, 500, 'Failed to refresh prices', err);
  }
};

// DELETE /api/price-plans/:id
const deletePlan = async (req, res) => {
  try {
    const { plan, error, message } = await loadOwnedPlan(req.params.id, req.user._id);
    if (error) return res.status(error).json({ message });
    await plan.deleteOne();
    res.json({ message: 'Plan deleted' });
  } catch (err) {
    sendError(res, 500, 'Failed to delete plan', err);
  }
};

module.exports = {
  lookupPrices,
  getCatalog,
  calculatePlan,
  createPlan,
  listPlans,
  getPlan,
  updatePlan,
  refreshPlanPrices,
  deletePlan,
  // exported for tests
  buildItems,
};
