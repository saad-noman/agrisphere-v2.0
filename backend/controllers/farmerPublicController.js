const mongoose = require('mongoose');
const User = require('../models/User');
const Listing = require('../models/Listing');
const sendError = require('../utils/sendError');
const { escapeRegex } = require('../utils/escapeRegex');

// Only these fields ever leave the server for a public profile — no email,
// no phone, no address line.
function shapePublicFarmer(user, crops) {
  const address = user.address || {};

  return {
    _id: user._id,
    name: user.name,
    district: address.district || null,
    division: address.division || address.state || null,
    country: address.country || null,
    crops: crops || [],
  };
}

// Collects the distinct crops each farmer currently has listed
async function cropsByFarmer(farmerIds) {
  const listings = await Listing.find({ farmer: { $in: farmerIds }, status: 'active' })
    .select('farmer cropType')
    .lean();

  const map = new Map();

  for (let i = 0; i < listings.length; i++) {
    const key = String(listings[i].farmer);
    const existing = map.get(key) || [];

    if (!existing.includes(listings[i].cropType)) {
      existing.push(listings[i].cropType);
    }

    map.set(key, existing);
  }

  return map;
}

// GET /api/farmers/public
// Farmers who opted their profile into marketplace discovery
const listPublicFarmers = async (req, res) => {
  try {
    const filter = { role: 'farmer', isPublic: true };

    const district = String(req.query.district || '').trim();
    if (district) {
      filter['address.district'] = { $regex: escapeRegex(district), $options: 'i' };
    }

    const farmers = await User.find(filter)
      .select('name address isPublic')
      .sort({ name: 1 })
      .limit(100)
      .lean();

    const ids = [];
    for (let i = 0; i < farmers.length; i++) ids.push(farmers[i]._id);

    const cropMap = await cropsByFarmer(ids);

    const crop = String(req.query.crop || '').trim().toLowerCase();
    const results = [];

    for (let i = 0; i < farmers.length; i++) {
      const farmer = farmers[i];
      const crops = cropMap.get(String(farmer._id)) || [];

      // When filtering by crop, only keep farmers listing that crop
      if (crop) {
        let matches = false;
        for (let j = 0; j < crops.length; j++) {
          if (crops[j].toLowerCase().includes(crop)) matches = true;
        }
        if (!matches) continue;
      }

      results.push(shapePublicFarmer(farmer, crops));
    }

    res.json(results);
  } catch (err) {
    sendError(res, 500, 'Failed to load farmer profiles', err);
  }
};

// GET /api/farmers/:id/public
// One public profile. No authentication required.
const getPublicFarmer = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid farmer id' });
    }

    const farmer = await User.findOne({ _id: req.params.id, role: 'farmer', isPublic: true })
      .select('name address isPublic')
      .lean();

    if (!farmer) {
      // Also covers a farmer who has not opted in
      return res.status(404).json({ message: 'This farmer profile is not public' });
    }

    const cropMap = await cropsByFarmer([farmer._id]);
    res.json(shapePublicFarmer(farmer, cropMap.get(String(farmer._id)) || []));
  } catch (err) {
    sendError(res, 500, 'Failed to load the farmer profile', err);
  }
};

module.exports = { listPublicFarmers, getPublicFarmer };
