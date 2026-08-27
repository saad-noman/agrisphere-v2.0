const https = require('https');
const sendError = require('../utils/sendError');

// GET /api/weather
// To get the current weather and forecast for a location
const getWeather = async (req, res) => {
  try {
    const lat = req.query.lat || 23.8103;
    const lon = req.query.lon || 90.4125;

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&timezone=auto`;

    https.get(url, (apiRes) => {
      let data = '';
      apiRes.on('data', (chunk) => {
        data += chunk;
      });
      apiRes.on('end', () => {
        try {
          const json = JSON.parse(data);
          return res.status(apiRes.statusCode).json(json);
        } catch (e) {
          return res.status(500).json({ message: 'Invalid JSON response from weather API' });
        }
      });
    }).on('error', (err) => {
      return sendError(res, 500, 'Failed to fetch weather data', err);
    });
  } catch (error) {
    return sendError(res, 500, 'Failed to fetch weather data', error);
  }
};

module.exports = {
  getWeather,
};
