const axios = require('axios');

const API_BASE_URL = 'https://api.commoditypriceapi.com/v2';

const getApiKey = () => {
if (!process.env.COMMODITY_API_KEY) {
throw new Error('COMMODITY_API_KEY is not configured');
}

return process.env.COMMODITY_API_KEY;
};

// To get all supported commodity symbols from the external API
const getSupportedSymbols = async () => {
const response = await axios.get(`${API_BASE_URL}/symbols`, {
headers: {
'x-api-key': getApiKey(),
},
});

if (!response.data.success) {
throw new Error('Failed to fetch commodity symbols');
}

return response.data.symbols;
};

// To get the latest market prices for the given commodity symbols
const getLatestRates = async (symbols) => {
if (!symbols || symbols.length === 0) {
return {
success: true,
rates: {},
metadata: {},
};
}

const response = await axios.get(`${API_BASE_URL}/rates/latest`, {
params: {
symbols: symbols.join(','),
},
headers: {
'x-api-key': getApiKey(),
},
});

return response.data;
};

module.exports = {
getSupportedSymbols,
getLatestRates,
};

