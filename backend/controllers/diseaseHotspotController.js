const DiseaseCase = require('../models/DiseaseCase');
const User = require('../models/User');
const Notification = require('../models/Notification');
const sendError = require('../utils/sendError');
const { listRegions } = require('../data/bangladeshRegions');

const RECENT_DAYS = 14;
const ALERT_THRESHOLD = 3;

// district name (lowercased) -> approximate centre, reused from the existing
// Bangladesh reference data so no coordinates are invented
let districtIndex = null;

function getDistrictIndex() {
  if (districtIndex) return districtIndex;

  districtIndex = new Map();
  const regions = listRegions();

  for (let i = 0; i < regions.length; i++) {
    const districts = regions[i].districts;

    for (let j = 0; j < districts.length; j++) {
      const district = districts[j];
      districtIndex.set(district.name.en.toLowerCase(), {
        name: district.name.en,
        lat: district.lat,
        lon: district.lon,
      });
    }
  }

  return districtIndex;
}

// Groups recent disease cases by the reporting farmer's district
async function buildHotspots() {
  const since = new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000);

  const cases = await DiseaseCase.find({ createdAt: { $gte: since } })
    .populate('farmer', 'address')
    .select('crop diagnosisReport farmer createdAt')
    .lean();

  const index = getDistrictIndex();
  const groups = new Map();

  for (let i = 0; i < cases.length; i++) {
    const item = cases[i];
    const address = item.farmer && item.farmer.address ? item.farmer.address : null;
    if (!address || !address.district) continue;

    const key = String(address.district).trim().toLowerCase();
    const place = index.get(key);
    // Without a known centre there is nothing safe to plot
    if (!place) continue;

    let diseaseName = 'Unspecified';
    if (item.diagnosisReport && item.diagnosisReport.diseaseName) {
      diseaseName = item.diagnosisReport.diseaseName;
    }

    const groupKey = `${key}::${diseaseName.toLowerCase()}`;
    const existing = groups.get(groupKey);

    if (existing) {
      existing.count += 1;
    } else {
      groups.set(groupKey, {
        district: place.name,
        districtKey: key,
        diseaseName,
        latitude: place.lat,
        longitude: place.lon,
        count: 1,
      });
    }
  }

  return Array.from(groups.values());
}

// GET /api/disease-hotspots
// District-level density of recent disease reports for the heatmap
const getHotspots = async (req, res) => {
  try {
    const hotspots = await buildHotspots();

    res.json({
      hotspots,
      windowDays: RECENT_DAYS,
      threshold: ALERT_THRESHOLD,
    });
  } catch (err) {
    sendError(res, 500, 'Failed to load disease hotspots', err);
  }
};

// POST /api/disease-hotspots/alerts
// Notifies farmers in districts where reports of one disease crossed the
// threshold. Re-running this does not create duplicate notifications.
const runHotspotAlerts = async (req, res) => {
  try {
    const hotspots = await buildHotspots();
    const since = new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000);

    let created = 0;

    for (let i = 0; i < hotspots.length; i++) {
      const hotspot = hotspots[i];
      if (hotspot.count < ALERT_THRESHOLD) continue;

      const message =
        `⚠ Increased ${hotspot.diseaseName} reports in ${hotspot.district} — check your crop.`;

      const farmers = await User.find({
        role: 'farmer',
        'address.district': { $regex: `^${hotspot.district}$`, $options: 'i' },
      })
        .select('_id')
        .lean();

      for (let j = 0; j < farmers.length; j++) {
        // Skip anyone who already got this alert inside the current window
        const existing = await Notification.findOne({
          userId: farmers[j]._id,
          message,
          createdAt: { $gte: since },
        }).lean();

        if (existing) continue;

        await Notification.create({
          userId: farmers[j]._id,
          message,
          link: '/map',
        });

        created += 1;
      }
    }

    res.json({ alertsCreated: created, hotspots: hotspots.length });
  } catch (err) {
    sendError(res, 500, 'Failed to run hotspot alerts', err);
  }
};

module.exports = { getHotspots, runHotspotAlerts, buildHotspots };
