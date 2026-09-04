const { COUNTRIES, DEFAULT_COUNTRY } = require('../data/countries');
const { listRegions } = require('../data/bangladeshRegions');
const sendError = require('../utils/sendError');

// GET /api/locations/options
// Returns the country list plus Bangladesh's divisions and their districts,
// so address forms can be filled without any third-party lookup.
const getLocationOptions = async (req, res) => {
  try {
    const regions = listRegions();

    const divisions = [];
    for (let i = 0; i < regions.length; i++) {
      const region = regions[i];

      const districts = [];
      for (let j = 0; j < region.districts.length; j++) {
        districts.push(region.districts[j].name.en);
      }

      divisions.push({ name: region.name.en, districts });
    }

    res.json({
      countries: COUNTRIES,
      defaultCountry: DEFAULT_COUNTRY,
      divisions,
    });
  } catch (err) {
    sendError(res, 500, 'Failed to load location options', err);
  }
};

module.exports = { getLocationOptions };
