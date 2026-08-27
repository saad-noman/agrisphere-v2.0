const sendError = require('../utils/sendError');
const {
calculateFinancialAnalysis,
} = require('../services/financialAnalysisService');

// GET /api/financial-analysis
// To get the farmer's revenue, cost and profit summary
const getFinancialAnalysis = async (req, res) => {
try {
const analysis = await calculateFinancialAnalysis(
req.user.id
);

res.json(analysis);

} catch (err) {
console.error('Financial analysis error:', err);

sendError(res, 500, 'Failed to generate financial analysis', err);

}
};

module.exports = {
getFinancialAnalysis,
};

