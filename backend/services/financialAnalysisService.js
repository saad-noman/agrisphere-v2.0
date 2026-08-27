const Crop = require('../models/Crop');
const ProductionRecord = require('../models/ProductionRecord');
const Expense = require('../models/Expense');

const {
getSupportedSymbols,
getLatestRates,
} = require('./commodityPriceService');

const normalize = (value) => {
return String(value || '')
.trim()
.toLowerCase();
};

const buildCommodityLookup = (symbols) => {
const lookup = new Map();

for (const item of symbols) {
if (!item.symbol) continue;

lookup.set(normalize(item.symbol), item);
lookup.set(normalize(item.name), item);

}

return lookup;
};

// To calculate a farmer's revenue, cost and profit summary using live commodity prices
const calculateFinancialAnalysis = async (farmerId) => {
const crops = await Crop.find({
farmer: farmerId,
}).lean();

const cropIds = crops.map((crop) => crop._id);

const productionRecords = await ProductionRecord.find({
crop: { $in: cropIds },
})
.populate('crop')
.lean();

const expenses = await Expense.find({
farmer: farmerId,
}).lean();

const supportedSymbols = await getSupportedSymbols();

const commodityLookup = buildCommodityLookup(supportedSymbols);

const requestedSymbols = new Set();

for (const crop of crops) {
const cropName = normalize(crop.cropType);

const commodity = commodityLookup.get(cropName);

if (commodity) {
  requestedSymbols.add(commodity.symbol);
}

}

const latestRates = await getLatestRates(
Array.from(requestedSymbols)
);

const rates = latestRates.rates || {};
const metadata = latestRates.metadata || {};

const cropAnalysis = crops.map((crop) => {
const cropName = normalize(crop.cropType);

const commodity = commodityLookup.get(cropName);

if (!commodity) {
  return {
    cropId: crop._id,
    crop: crop.name,
    cropType: crop.cropType,
    production: 0,
    revenue: null,
    marketPrice: null,
    priceUnit: null,
    currency: null,
    status: 'price_unavailable',
    message: 'No matching commodity is supported by the external API',
  };
}

const symbol = commodity.symbol;
const price = rates[symbol];

const cropProductionRecords = productionRecords.filter(
  (record) =>
    record.crop &&
    record.crop._id.toString() === crop._id.toString()
);

const production = cropProductionRecords.reduce(
  (total, record) => total + Number(record.quantity || 0),
  0
);

if (price === undefined || price === null) {
  return {
    cropId: crop._id,
    crop: crop.name,
    cropType: crop.cropType,
    production,
    revenue: null,
    marketPrice: null,
    priceUnit: commodity.unit?.symbol || null,
    currency: commodity.currency?.code || null,
    symbol,
    status: 'price_unavailable',
    message: 'Latest price is unavailable',
  };
}

const revenue = production * Number(price);

return {
  cropId: crop._id,
  crop: crop.name,
  cropType: crop.cropType,
  production,
  productionUnit: cropProductionRecords[0]?.unit || 'kg',
  marketPrice: Number(price),
  priceUnit:
    metadata[symbol]?.unit ||
    commodity.unit?.symbol ||
    null,
  currency:
    metadata[symbol]?.quote ||
    commodity.currency?.code ||
    null,
  symbol,
  revenue,
  status: 'calculated',
};

});

const totalRevenue = cropAnalysis.reduce(
(total, crop) =>
total + (crop.revenue !== null ? Number(crop.revenue) : 0),
0
);

const totalCost = expenses.reduce(
(total, expense) =>
total + Number(expense.amount || 0),
0
);

const costMap = {};

for (const expense of expenses) {
const category = expense.category || 'other';

if (!costMap[category]) {
  costMap[category] = 0;
}

costMap[category] += Number(expense.amount || 0);

}

const costSummary = Object.entries(costMap).map(
([category, amount]) => ({
category,
amount,
})
);

const profit = totalRevenue - totalCost;

const profitMargin =
totalRevenue > 0
? (profit / totalRevenue) * 100
: 0;

return {
summary: {
totalRevenue,
totalCost,
profit,
profitMargin: Number(profitMargin.toFixed(2)),
},

costSummary,

crops: cropAnalysis,

marketPrices: cropAnalysis
  .filter((crop) => crop.marketPrice !== null)
  .map((crop) => ({
    crop: crop.cropType,
    symbol: crop.symbol,
    price: crop.marketPrice,
    unit: crop.priceUnit,
    currency: crop.currency,
  })),

generatedAt: new Date(),

};
};

module.exports = {
calculateFinancialAnalysis,
};
