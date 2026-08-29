const User = require('../models/User');
const Expert = require('../models/Expert');
const Organization = require('../models/Organization');
const sendError = require('../utils/sendError');

// GET /api/stats/platform
// To get platform-wide totals shown on the public home page
const getPlatformStats = async (req, res) => {
  try {
    const [experts, farmers, organizations] = await Promise.all([
      Expert.countDocuments(),
      User.countDocuments({ role: 'farmer' }),
      Organization.countDocuments(),
    ]);

    res.json({ experts, farmers, organizations });
  } catch (err) {
    sendError(res, 500, 'Something went wrong', err);
  }
};

module.exports = { getPlatformStats };
