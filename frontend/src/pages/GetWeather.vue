<template>
  <div class="weather-page">
    <header class="weather-header">
      <div class="header-content">
        <h1>Live Meteorological Data</h1>
        <p class="subtitle">
          Real-time weather insights, precipitation, soil moisture, and agricultural forecasts powered by Open-Meteo.
        </p>
      </div>

      <div class="controls-bar">
        <button class="btn-location" @click="getGeoLocation" :disabled="loading">
          <span v-if="loading" class="spinner"></span>
          <span v-else>📍 Use My Location</span>
        </button>

        <form @submit.prevent="searchCity" class="search-form">
          <div class="search-input-wrap">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search city (e.g. Dhaka, London, Tokyo)..."
              class="search-input"
            />
            <button type="submit" class="btn-search" :disabled="loading || !searchQuery.trim()">
              Search
            </button>
          </div>
        </form>
      </div>

      <div v-if="searchResults.length > 0" class="search-results-dropdown">
        <div
          v-for="city in searchResults"
          :key="city.id"
          class="search-result-item"
          @click="selectCity(city)"
        >
          <strong>{{ city.name }}</strong>
          <span class="city-subtext">{{ city.admin1 ? city.admin1 + ', ' : '' }}{{ city.country }}</span>
        </div>
      </div>
    </header>

    <div v-if="errorMessage" class="error-banner">
      ⚠️ {{ errorMessage }}
    </div>

    <div v-if="locationName" class="location-bar">
      <span class="location-icon">📍</span>
      <span class="location-text">{{ locationName }}</span>
      <span class="coords-tag">({{ coords.lat.toFixed(2) }}°, {{ coords.lon.toFixed(2) }}°)</span>
    </div>

    <div v-if="currentWeather && !loading" class="weather-main-grid">
      <section class="current-weather-card">
        <div class="card-header">
          <h2>Current Conditions</h2>
          <span class="live-pill">LIVE NOW</span>
        </div>

        <div class="current-hero">
          <div class="weather-icon-lg">{{ getWeatherIcon(currentWeather.weather_code) }}</div>
          <div class="hero-temp">
            <span class="temp-val">{{ Math.round(currentWeather.temperature_2m) }}</span>
            <span class="temp-unit">°C</span>
          </div>
        </div>

        <div class="condition-badge">
          {{ getWeatherDescription(currentWeather.weather_code) }}
        </div>

        <div class="feels-like">
          Feels like {{ Math.round(currentWeather.apparent_temperature ?? currentWeather.temperature_2m) }}°C
        </div>

        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-icon">🌡️</div>
            <div class="metric-info">
              <span class="metric-label">Temperature</span>
              <span class="metric-val">{{ currentWeather.temperature_2m }} °C</span>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon">💧</div>
            <div class="metric-info">
              <span class="metric-label">Humidity</span>
              <span class="metric-val">{{ currentWeather.relative_humidity_2m }} %</span>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon">🌧️</div>
            <div class="metric-info">
              <span class="metric-label">Rainfall</span>
              <span class="metric-val">{{ currentRainfall }} mm</span>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon">🌱</div>
            <div class="metric-info">
              <span class="metric-label">Soil Moisture</span>
              <span class="metric-val">{{ currentSoilMoisture }} %</span>
            </div>
          </div>
        </div>

        <div class="wind-info-pill">
          💨 <strong>Wind Speed:</strong> {{ currentWeather.wind_speed_10m }} km/h
          <span class="dot-sep">•</span>
          🌧️ <strong>Rain Chance:</strong> {{ currentRainChance }}%
        </div>

        <div class="farming-tip-card">
          <h4>🌾 Farming Insight</h4>
          <p>{{ getFarmingAdvice(currentWeather, currentRainChance, currentSoilMoisture) }}</p>
        </div>

        <div class="predict-cta-box">
          <div class="cta-text-wrap">
            <span class="cta-title">Predict Crop Using Live Weather</span>
            <p class="cta-desc">
              Load these 4 weather parameters into the Crop Recommendation page.
            </p>
          </div>
          <button type="button" class="btn-predict-cta" @click="goToCropPrediction">
            Load Data & Predict Crop 
          </button>
        </div>
      </section>

      <!-- RIGHT SIDE: FORECAST VIEW -->
      <section class="forecast-section">
        <!-- Tab Selector: 7-Day vs Hourly -->
        <div class="forecast-header">
          <h2>Weather Forecast</h2>
          <div class="tab-buttons">
            <button
              :class="['tab-btn', { active: activeTab === 'daily' }]"
              @click="activeTab = 'daily'"
            >
              📅 7-Day Forecast
            </button>
            <button
              :class="['tab-btn', { active: activeTab === 'hourly' }]"
              @click="activeTab = 'hourly'"
            >
              ⏱️ 24-Hour Tables
            </button>
          </div>
        </div>

        <!-- TAB 1: 7-DAY FORECAST (SINGLE COLUMN) -->
        <div v-if="activeTab === 'daily' && dailyForecast.length" class="daily-forecast-wrap">
          <p class="hourly-subtitle">7-Day Agricultural Weather Forecast</p>
          <div class="daily-single-column">
            <div v-for="day in dailyForecast" :key="day.date" class="daily-card">
              <div class="day-col">
                <span class="day-name">{{ formatDayName(day.date) }}</span>
                <span class="day-date">{{ formatDateShort(day.date) }}</span>
              </div>

              <div class="icon-col">
                <span class="weather-icon-sm">{{ getWeatherIcon(day.weather_code) }}</span>
                <span class="weather-desc-sm">{{ getWeatherDescription(day.weather_code) }}</span>
              </div>

              <div class="rain-col">
                <span class="rain-badge">💧 {{ day.rain_prob }}% rain</span>
              </div>

              <div class="temp-col">
                <span class="temp-max">{{ Math.round(day.temp_max) }}°</span>
                <span class="temp-divider">/</span>
                <span class="temp-min">{{ Math.round(day.temp_min) }}°C</span>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 2: 24-HOUR HOURLY TABLES (12 & 12 COLUMNS) -->
        <div v-if="activeTab === 'hourly' && (hourlyCol1.length || hourlyCol2.length)" class="hourly-forecast-tables-wrap">
          <p class="hourly-subtitle">Next 24 Hours Detailed Forecast </p>
          
          <div class="hourly-tables-grid">
            <!-- COLUMN 1: FIRST 12 HOURS -->
            <div class="table-column">
              <div class="column-header-title">Hours 1 – 12</div>
              <div class="table-responsive">
                <table class="weather-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Condition</th>
                      <th>Temp</th>
                      <th>Rain %</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in hourlyCol1" :key="item.time">
                      <td class="time-cell">{{ item.hourLabel }}</td>
                      <td class="condition-cell">
                        <span class="table-icon">{{ getWeatherIcon(item.weather_code) }}</span>
                      </td>
                      <td class="temp-cell">{{ Math.round(item.temp) }}°C</td>
                      <td class="rain-cell">
                        <span :class="['table-rain-badge', { 'high-rain': item.rain_prob > 50 }]">
                          💧 {{ item.rain_prob }}%
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- COLUMN 2: NEXT 12 HOURS -->
            <div class="table-column">
              <div class="column-header-title">Hours 13 – 24</div>
              <div class="table-responsive">
                <table class="weather-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Condition</th>
                      <th>Temp</th>
                      <th>Rain %</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in hourlyCol2" :key="item.time">
                      <td class="time-cell">{{ item.hourLabel }}</td>
                      <td class="condition-cell">
                        <span class="table-icon">{{ getWeatherIcon(item.weather_code) }}</span>
                      </td>
                      <td class="temp-cell">{{ Math.round(item.temp) }}°C</td>
                      <td class="rain-cell">
                        <span :class="['table-rain-badge', { 'high-rain': item.rain_prob > 50 }]">
                          💧 {{ item.rain_prob }}%
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Loading Skeleton Placeholder -->
    <div v-else-if="loading" class="loading-state">
      <div class="spinner-large"></div>
      <p>Fetching local weather & forecast from Open-Meteo...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const loading = ref(false);
const errorMessage = ref('');
const activeTab = ref('daily');
const searchQuery = ref('');
const searchResults = ref([]);

const coords = reactive({ lat: 23.8103, lon: 90.4125 }); // Default: Dhaka
const locationName = ref('');

const currentWeather = ref(null);
const currentRainChance = ref(0);
const currentRainfall = ref(0);
const currentSoilMoisture = ref(0);

const dailyForecast = ref([]);
const hourlyCol1 = ref([]); // First 12 hours
const hourlyCol2 = ref([]); // Next 12 hours

function goToCropPrediction() {
  if (!currentWeather.value) return;
  router.push({
    path: '/farming-recommendation',
    query: {
      fromWeather: 'true',
      temperature: currentWeather.value.temperature_2m,
      humidity: currentWeather.value.relative_humidity_2m,
      rainfall: currentRainfall.value,
      moisture: currentSoilMoisture.value,
    },
  });
}

onMounted(() => {
  getGeoLocation();
});

// 1. Browser Geolocation API
function getGeoLocation() {
  errorMessage.value = '';
  loading.value = true;
  searchResults.value = [];

  if (!navigator.geolocation) {
    errorMessage.value = 'Geolocation is not supported by your browser. Showing default location.';
    fetchWeatherByCoords(coords.lat, coords.lon, 'Dhaka, Bangladesh');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      coords.lat = position.coords.latitude;
      coords.lon = position.coords.longitude;
      reverseGeocode(coords.lat, coords.lon);
      fetchWeatherByCoords(coords.lat, coords.lon);
    },
    (err) => {
      let msg = 'Could not access location.';
      switch (err.code) {
        case err.PERMISSION_DENIED:
          msg = 'Location permission denied. You can search for your city above.';
          break;
        case err.POSITION_UNAVAILABLE:
          msg = 'Location information unavailable.';
          break;
        case err.TIMEOUT:
          msg = 'Location request timed out.';
          break;
      }
      errorMessage.value = msg;
      // Fallback to default
      fetchWeatherByCoords(coords.lat, coords.lon, 'Dhaka, Bangladesh');
    },
    { timeout: 10000 }
  );
}

// 2. Fetch Open-Meteo Weather Data
async function fetchWeatherByCoords(lat, lon, customName = '') {
  loading.value = true;
  errorMessage.value = '';

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,soil_moisture_0_to_1cm,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max&timezone=auto`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to retrieve weather data from Open-Meteo API.');
    const data = await res.json();

    currentWeather.value = data.current;

    const currentHourIdx = new Date().getHours();

    // Current hour rain probability
    currentRainChance.value =
      data.hourly?.precipitation_probability?.[currentHourIdx] ??
      data.daily?.precipitation_probability_max?.[0] ??
      0;

    // Current Rainfall in mm
    const rainMm =
      data.current?.precipitation ??
      data.hourly?.precipitation?.[currentHourIdx] ??
      data.daily?.precipitation_sum?.[0] ??
      0;
    currentRainfall.value = Number(rainMm).toFixed(1);

    // Current Soil Moisture in % (soil_moisture_0_to_1cm is in m³/m³)
    const smVal = data.hourly?.soil_moisture_0_to_1cm?.[currentHourIdx] ?? 0.35;
    currentSoilMoisture.value = Math.round(smVal * 100);

    // Format 7-Day Daily Forecast
    if (data.daily) {
      const dates = data.daily.time || [];
      dailyForecast.value = dates.map((dateStr, idx) => ({
        date: dateStr,
        weather_code: data.daily.weather_code[idx],
        temp_max: data.daily.temperature_2m_max[idx],
        temp_min: data.daily.temperature_2m_min[idx],
        rain_prob: data.daily.precipitation_probability_max[idx] ?? 0,
        wind_max: data.daily.wind_speed_10m_max[idx],
      }));
    }

    // Format Next 24 Hours Forecast into 2 columns (12 + 12 hours)
    if (data.hourly) {
      const times = data.hourly.time || [];
      const nowIdx = Math.max(0, currentHourIdx);
      const next24 = times.slice(nowIdx, nowIdx + 24);

      const formatted = next24.map((timeStr, idx) => {
        const actualIdx = nowIdx + idx;
        const d = new Date(timeStr);
        const hourLabel = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return {
          time: timeStr,
          hourLabel,
          temp: data.hourly.temperature_2m[actualIdx],
          humidity: data.hourly.relative_humidity_2m[actualIdx],
          rain_prob: data.hourly.precipitation_probability[actualIdx] ?? 0,
          weather_code: data.hourly.weather_code[actualIdx],
        };
      });

      hourlyCol1.value = formatted.slice(0, 12);
      hourlyCol2.value = formatted.slice(12, 24);
    }

    if (customName) {
      locationName.value = customName;
    } else if (!locationName.value) {
      locationName.value = `Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)}`;
    }
  } catch (err) {
    errorMessage.value = err.message || 'Error connecting to weather service.';
  } finally {
    loading.value = false;
  }
}

// 3. Search City via Open-Meteo Geocoding API
async function searchCity() {
  if (!searchQuery.value.trim()) return;
  errorMessage.value = '';
  loading.value = true;

  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    searchQuery.value
  )}&count=5&language=en&format=json`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      searchResults.value = data.results;
    } else {
      errorMessage.value = `No cities found matching "${searchQuery.value}".`;
      searchResults.value = [];
    }
  } catch (err) {
    errorMessage.value = 'Failed to search location.';
  } finally {
    loading.value = false;
  }
}

function selectCity(city) {
  coords.lat = city.latitude;
  coords.lon = city.longitude;
  locationName.value = `${city.name}${city.admin1 ? ', ' + city.admin1 : ''}, ${city.country}`;
  searchResults.value = [];
  searchQuery.value = '';
  fetchWeatherByCoords(coords.lat, coords.lon);
}

// Reverse Geocoding helper
async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
    );
    if (res.ok) {
      const data = await res.json();
      const city = data.city || data.locality || data.principalSubdivision;
      const country = data.countryName;
      if (city || country) {
        locationName.value = [city, country].filter(Boolean).join(', ');
      }
    }
  } catch (e) {
    // Non-critical reverse geocode error
  }
}

// Helpers for Weather Codes & Icons
function getWeatherIcon(code) {
  if (code === 0) return '☀️';
  if (code >= 1 && code <= 3) return '⛅';
  if (code === 45 || code === 48) return '🌫️';
  if (code >= 51 && code <= 55) return '🌦️';
  if (code >= 61 && code <= 65) return '🌧️';
  if (code >= 71 && code <= 77) return '❄️';
  if (code >= 80 && code <= 82) return '☔';
  if (code >= 95 && code <= 99) return '⛈️';
  return '🌡️';
}

function getWeatherDescription(code) {
  const descriptions = {
    0: 'Clear Sky',
    1: 'Mainly Clear',
    2: 'Partly Cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing Rime Fog',
    51: 'Light Drizzle',
    53: 'Moderate Drizzle',
    55: 'Dense Drizzle',
    61: 'Slight Rain',
    63: 'Moderate Rain',
    65: 'Heavy Rain',
    71: 'Slight Snow',
    73: 'Moderate Snow',
    75: 'Heavy Snow',
    80: 'Slight Rain Showers',
    81: 'Moderate Rain Showers',
    82: 'Violent Rain Showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with Hail',
    99: 'Heavy Thunderstorm',
  };
  return descriptions[code] || 'Moderate Weather';
}

function getFarmingAdvice(current, rainProb, soilMoisture) {
  if (rainProb > 60) {
    return 'High probability of rain today. Postpone pesticide application and heavy irrigation.';
  }
  if (soilMoisture < 25) {
    return 'Low soil moisture level. Irrigation is recommended for optimal crop health.';
  }
  if (current.temperature_2m > 33) {
    return 'High temperatures detected. Ensure adequate soil moisture to protect crops from heat stress.';
  }
  if (current.wind_speed_10m > 25) {
    return 'Strong wind alert! Take precautions for tall or vulnerable crops.';
  }
  return 'Favorable conditions for field operations, fertilizing, and crop monitoring.';
}

function formatDayName(dateStr) {
  const date = new Date(dateStr);
  const today = new Date().toISOString().split('T')[0];
  if (dateStr === today) return 'Today';
  return date.toLocaleDateString(undefined, { weekday: 'short' });
}

function formatDateShort(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
</script>

<style scoped>
.weather-page {
  max-width: 1280px;
  margin: 0 auto;
  padding: 1.5rem;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  color: var(--text-dark);
  box-sizing: border-box;
}

/* Header matching Farming Recommendation Page */
.weather-header {
  background: var(--brand-banner);
  color: #ffffff;
  padding: 2rem;
  border-radius: 16px;
  margin-bottom: 1.5rem;
  box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.25);
  position: relative;
  box-sizing: border-box;
}

.badge {
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(4px);
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #ffffff;
}

.weather-header h1 {
  margin: 0.75rem 0 0.5rem 0;
  font-size: 2.2rem;
  font-weight: 800;
  color: #ffffff;
}

.subtitle {
  color: #ffffff;
  font-size: 1rem;
  margin: 0 0 1.5rem 0;
  max-width: 750px;
  font-weight: 600;
}

.controls-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
}

.btn-location {
  background: var(--surface);
  color: var(--text-dark);
  border: none;
  padding: 0.75rem 1.25rem;
  border-radius: 10px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  white-space: nowrap;
}

.btn-location:hover {
  background: var(--green-50);
  transform: translateY(-1px);
}

.search-form {
  flex: 1;
  min-width: 260px;
}

.search-input-wrap {
  display: flex;
  gap: 0.5rem;
}

.search-input {
  flex: 1;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.95);
  color: var(--text-dark);
  font-size: 0.95rem;
  font-weight: 600;
  outline: none;
  min-width: 0;
}

.btn-search {
  background: var(--brand-fill);
  color: #ffffff;
  border: none;
  padding: 0.75rem 1.25rem;
  border-radius: 10px;
  font-weight: 800;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;
}

.btn-search:hover:not(:disabled) {
  background: var(--brand-fill);
}

/* Search Dropdown */
.search-results-dropdown {
  background: var(--surface);
  color: var(--text-dark);
  border-radius: 12px;
  margin-top: 0.5rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  max-height: 220px;
  overflow-y: auto;
}

.search-result-item {
  padding: 0.75rem 1rem;
  cursor: pointer;
  border-bottom: 1px solid var(--bg);
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--text-dark);
}

.search-result-item:hover {
  background: var(--green-50);
}

.city-subtext {
  font-size: 0.85rem;
  color: var(--text-dark);
}

/* Banners */
.error-banner {
  background: var(--danger-100);
  color: var(--text-dark);
  border: 1px solid var(--danger);
  padding: 1rem;
  border-radius: 12px;
  margin-bottom: 1.5rem;
  font-weight: 700;
}

.location-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--green-50);
  border: 1px solid var(--green-50);
  padding: 0.75rem 1.25rem;
  border-radius: 12px;
  margin-bottom: 1.5rem;
  font-weight: 800;
  color: var(--text-dark);
  word-break: break-word;
}

.coords-tag {
  color: var(--text-dark);
  font-weight: 700;
  font-size: 0.85rem;
  white-space: nowrap;
}

/* Main Grid (Left: Current, Right: Forecast) */
.weather-main-grid {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 1.5rem;
  align-items: start;
  color: var(--text-dark);
}

@media (max-width: 950px) {
  .weather-main-grid {
    grid-template-columns: 1fr;
  }
}

/* Left Card: Current Weather */
.current-weather-card {
  background: var(--surface);
  border: 1px solid var(--green-50);
  border-radius: 16px;
  padding: 1.25rem;
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.05);
  box-sizing: border-box;
  min-width: 0;
  overflow: hidden;
  color: var(--text-dark);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.card-header h2 {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--text-dark);
  word-break: break-word;
}

.live-pill {
  background: var(--green-50);
  color: var(--text-dark);
  font-size: 0.7rem;
  font-weight: 800;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  border: 1px solid var(--green-50);
  white-space: nowrap;
}

.current-hero {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}

.weather-icon-lg {
  font-size: 3.5rem;
  line-height: 1;
  flex-shrink: 0;
}

.hero-temp {
  display: flex;
  align-items: flex-start;
}

.temp-val {
  font-size: 3.4rem;
  font-weight: 900;
  line-height: 1;
  color: var(--text-dark);
}

.temp-unit {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--text-dark);
  margin-top: 0.25rem;
}

.condition-badge {
  display: inline-block;
  max-width: 100%;
  background: var(--green-50);
  color: var(--text-dark);
  font-weight: 800;
  padding: 0.4rem 0.9rem;
  border-radius: 20px;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  word-break: break-word;
  overflow-wrap: break-word;
  box-sizing: border-box;
}

.feels-like {
  color: var(--text-dark);
  font-size: 0.9rem;
  margin-bottom: 1.25rem;
  font-weight: 700;
}

/* 4 Core Metrics Grid */
.metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
  margin-bottom: 1rem;
  width: 100%;
  box-sizing: border-box;
}

.metric-card {
  background: var(--green-50);
  border: 1px solid var(--green-dark);
  border-radius: 12px;
  padding: 0.75rem 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0; /* Allow auto-scaling without pushing out container */
  box-sizing: border-box;
  color: var(--text-dark);
  overflow: hidden;
}

.metric-icon {
  font-size: 1.4rem;
  flex-shrink: 0;
}

.metric-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  flex: 1;
}

.metric-label {
  font-size: 0.62rem;
  color: var(--text-dark);
  text-transform: uppercase;
  font-weight: 800;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.metric-val {
  font-size: 1.05rem;
  font-weight: 900;
  color: var(--text-dark);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wind-info-pill {
  background: var(--green-50);
  border: 1px solid var(--text-dark);
  border-radius: 10px;
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
  color: var(--text-dark);
  margin-bottom: 1.25rem;
  word-break: break-word;
  font-weight: 700;
}

.dot-sep {
  margin: 0 0.3rem;
  color: var(--text-dark);
}

.farming-tip-card {
  background: var(--green-50);
  border: 1px solid var(--text-dark);
  border-radius: 12px;
  padding: 1rem;
  color: var(--text-dark);
  word-break: break-word;
  overflow-wrap: break-word;
}

.farming-tip-card h4 {
  margin: 0 0 0.4rem 0;
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--text-dark);
}

.farming-tip-card p {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.4;
  color: var(--text-dark);
  font-weight: 600;
}

/* Right Column: Forecast Section */
.forecast-section {
  background: var(--surface);
  border: 1px solid var(--green-50);
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.05);
  box-sizing: border-box;
  min-width: max-content;
  overflow: hidden;
  color: var(--text-dark);
}

.forecast-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.forecast-header h2 {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--text-dark);
}

.tab-buttons {
  display: flex;
  gap: 0.4rem;
  background: var(--green-50);
  padding: 0.25rem;
  border-radius: 10px;
}

.tab-btn {
  background: transparent;
  border: none;
  padding: 0.45rem 0.85rem;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 800;
  color: var(--text-dark);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.tab-btn.active {
  background: var(--brand-fill);
  color: #ffffff;
  box-shadow: 0 2px 5px rgba(16, 185, 129, 0.2);
}

/* Daily Forecast List - Single Column */
.daily-single-column {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.daily-card {
  display: grid;
  grid-template-columns: 110px 1fr 130px 100px;
  align-items: center;
  background: var(--green-50);
  border: 1px solid var(--green-dark);
  padding: 0.85rem 1rem;
  border-radius: 12px;
  gap: 0.5rem;
  color: var(--text-dark);
  box-shadow: 0 2px 6px rgba(16, 185, 129, 0.04);
}

@media (max-width: 550px) {
  .daily-card {
    grid-template-columns: 1fr 1fr;
    row-gap: 0.5rem;
  }
}

@media (max-width: 400px) {
  .daily-card {
    grid-template-columns: 1fr;
    text-align: center;
  }
}

.day-col {
  display: flex;
  flex-direction: column;
}

.day-name {
  font-weight: 900;
  color: var(--text-dark);
  font-size: 0.95rem;
}

.day-date {
  font-size: 0.75rem;
  color: var(--text-dark);
  font-weight: 700;
}

.icon-col {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.weather-icon-sm {
  font-size: 1.5rem;
}

.weather-desc-sm {
  font-size: 0.85rem;
  color: var(--text-dark);
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rain-col {
  text-align: center;
}

.rain-badge {
  display: inline-block;
  background: var(--green-50);
  color: var(--text-dark);
  font-size: 0.78rem;
  font-weight: 800;
  padding: 0.25rem 0.6rem;
  border-radius: 12px;
  border: 1px solid var(--green-dark);
  white-space: nowrap; /* Prevents text and % rain wrapping */
}

.temp-col {
  text-align: right;
  font-weight: 800;
  font-size: 0.95rem;
  color: var(--text-dark);
}

.temp-max {
  color: var(--text-dark);
}

.temp-divider {
  color: var(--text-dark);
  margin: 0 0.2rem;
}

.temp-min {
  color: var(--text-dark);
}

/* 24-HOUR HOURLY TABLES (2 COLUMNS: 12 & 12) */
.hourly-subtitle {
  font-size: 0.88rem;
  color: var(--text-dark);
  font-weight: 700;
  margin: 0 0 1rem 0;
}

.hourly-tables-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
}

@media (max-width: 768px) {
  .hourly-tables-grid {
    grid-template-columns: 1fr;
  }
}

.table-column {
  background: var(--green-50);
  border: 1px solid var(--green-dark);
  border-radius: 12px;
  padding: 0.85rem;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.04);
  min-width: flex;
  color: var(--text-dark);
}

.column-header-title {
  font-size: 0.88rem;
  font-weight: 900;
  color: var(--text-dark);
  padding-bottom: 0.6rem;
  margin-bottom: 0.6rem;
  border-bottom: 2px solid var(--green-dark);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.table-responsive {
  width: 100%;
  overflow-x: auto;
}

.weather-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  color: var(--text-dark);
}

.weather-table th {
  background: var(--green-50);
  color: var(--text-dark);
  font-weight: 900;
  text-align: left;
  padding: 0.5rem 0.4rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  border-bottom: 1px solid var(--green-dark);
}

.weather-table td {
  padding: 0.5rem 0.4rem;
  border-bottom: 1px solid var(--green-dark);
  vertical-align: middle;
  color: var(--text-dark);
}

.weather-table tr:hover td {
  background: var(--green-50);
}

.time-cell {
  font-weight: 800;
  color: var(--text-dark);
  white-space: nowrap;
}

.condition-cell {
  text-align: center;
}

.table-icon {
  font-size: 1.2rem;
}

.temp-cell {
  font-weight: 900;
  color: var(--text-dark);
  white-space: nowrap;
}

.rain-cell {
  white-space: nowrap;
}

.day-cell-wrap {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.day-name {
  font-weight: 900;
  color: var(--text-dark);
  font-size: 0.88rem;
}

.day-date {
  font-size: 0.7rem;
  color: var(--text-dark);
  font-weight: 700;
}

.table-rain-badge {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--text-dark);
  background: var(--green-50);
  padding: 0.15rem 0.45rem;
  border-radius: 8px;
  border: 1px solid var(--green-dark);
  white-space: nowrap; /* Prevent wrapping percentage and rain text */
}

.table-rain-badge.high-rain {
  color: var(--text-dark);
  background: var(--info-100);
  border-color: var(--info-100);
}

/* Predict CTA Box */
.predict-cta-box {
  margin-top: 1.25rem;
  background: var(--brand-banner);
  color: var(--text-dark);
  padding: 1.1rem 1.25rem;
  border-radius: 14px;
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.25);
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  box-sizing: border-box;
}

.cta-title {
  font-size: 1rem;
  font-weight: 900;
  display: block;
  margin-bottom: 0.25rem;
  color: var(--text-dark);
}

.cta-desc {
  font-size: 0.84rem;
  margin: 0;
  color: var(--text-dark);
  line-height: 1.35;
  font-weight: 600;
}

.btn-predict-cta {
  background: var(--surface);
  color: var(--text-dark);
  border: none;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  font-weight: 900;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  text-align: center;
  width: 100%;
}

.btn-predict-cta:hover {
  background: var(--green-50);
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
}

/* Loading state */
.loading-state {
  text-align: center;
  padding: 4rem 1rem;
  color: var(--text-dark);
  font-weight: 700;
}

.spinner-large {
  width: 40px;
  height: 40px;
  border: 4px solid var(--green-50);
  border-top-color: var(--green-light);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem auto;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
