const axios = require('axios');
const { resolveLocation } = require('../data/bangladeshRegions');
const { getCrop } = require('../data/bdCropProfiles');

/**
 * Crop Intelligence & Early Warning engine.
 *
 * Pipeline:
 *   location + crop + sowing date
 *     -> fetch a 7-day forecast for the district coordinates (Open-Meteo)
 *     -> reduce the forecast to agronomic indicators
 *     -> run the crop's threshold rules for its current growth stage
 *     -> return ranked, action-shaped risks plus the evidence behind them
 *
 * Integrity rules this file follows:
 *   - Every risk states the numbers it fired on, so nothing is unexplained.
 *   - Wording is always "conditions favour X" / "go and check", never a
 *     diagnosis, and never a pesticide product or dose.
 *   - If the forecast cannot be reached we return clearly-flagged sample data
 *     with dataMode 'demo'. The UI surfaces that flag prominently and the
 *     figures are never presented as live.
 *
 * Swapping in another weather provider (BMD, a paid API, on-farm sensors)
 * only means replacing fetchForecast() — nothing downstream knows the source.
 */

const FORECAST_BASE = 'https://api.open-meteo.com/v1/forecast';
const FORECAST_DAYS = 7;
const REQUEST_TIMEOUT_MS = 8000;

// Small in-process cache. District-level forecasts change slowly, and this
// keeps a watchlist refresh from firing a dozen identical upstream requests.
const forecastCache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000;

const s = (en, bn) => ({ en, bn });

// --------------------------------------------------------------- forecast

async function fetchForecast(lat, lon) {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = forecastCache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return { ...cached.data, dataMode: 'cached' };
  }

  const { data } = await axios.get(FORECAST_BASE, {
    timeout: REQUEST_TIMEOUT_MS,
    params: {
      latitude: lat,
      longitude: lon,
      daily: [
        'weather_code',
        'temperature_2m_max',
        'temperature_2m_min',
        'precipitation_sum',
        'precipitation_probability_max',
        'wind_speed_10m_max',
      ].join(','),
      hourly: ['temperature_2m', 'relative_humidity_2m', 'precipitation'].join(','),
      forecast_days: FORECAST_DAYS,
      timezone: 'Asia/Dhaka',
    },
  });

  const normalised = { raw: data, dataMode: 'live' };
  forecastCache.set(key, { at: Date.now(), data: normalised });
  return normalised;
}

/**
 * Deterministic stand-in used only when the forecast provider is unreachable.
 * Values are ordinary, unremarkable Bangladeshi weather so the UI can be
 * demonstrated; they are always returned with dataMode 'demo'.
 */
function buildDemoForecast() {
  const today = new Date();
  const time = [];
  const tMax = [];
  const tMin = [];
  const rain = [];
  const rainProb = [];
  const wind = [];
  const code = [];

  for (let i = 0; i < FORECAST_DAYS; i += 1) {
    const day = new Date(today);
    day.setDate(today.getDate() + i);
    time.push(day.toISOString().slice(0, 10));
    tMax.push(30 + ((i * 3) % 4));
    tMin.push(20 + (i % 3));
    rain.push(i % 3 === 0 ? 6 : 0);
    rainProb.push(i % 3 === 0 ? 55 : 15);
    wind.push(12 + ((i * 5) % 9));
    code.push(i % 3 === 0 ? 61 : 2);
  }

  const hourlyTime = [];
  const hourlyTemp = [];
  const hourlyHumidity = [];
  const hourlyPrecip = [];
  for (let i = 0; i < FORECAST_DAYS * 24; i += 1) {
    const hour = new Date(today);
    hour.setHours(today.getHours() + i, 0, 0, 0);
    hourlyTime.push(hour.toISOString().slice(0, 16));
    const hourOfDay = hour.getHours();
    hourlyTemp.push(24 + 7 * Math.sin(((hourOfDay - 8) / 24) * 2 * Math.PI));
    hourlyHumidity.push(hourOfDay >= 20 || hourOfDay <= 7 ? 82 : 62);
    hourlyPrecip.push(0);
  }

  return {
    dataMode: 'demo',
    raw: {
      daily: {
        time,
        weather_code: code,
        temperature_2m_max: tMax,
        temperature_2m_min: tMin,
        precipitation_sum: rain,
        precipitation_probability_max: rainProb,
        wind_speed_10m_max: wind,
      },
      hourly: {
        time: hourlyTime,
        temperature_2m: hourlyTemp,
        relative_humidity_2m: hourlyHumidity,
        precipitation: hourlyPrecip,
      },
    },
  };
}

// ------------------------------------------------------------- indicators

const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
const round1 = (v) => Math.round(v * 10) / 10;

/** Reduces a raw forecast into the numbers the rules actually reason about. */
function computeIndicators(forecast) {
  const daily = forecast.raw?.daily || {};
  const hourly = forecast.raw?.hourly || {};

  const days = (daily.time || []).map((date, i) => ({
    date,
    weatherCode: daily.weather_code?.[i] ?? null,
    tempMax: daily.temperature_2m_max?.[i] ?? null,
    tempMin: daily.temperature_2m_min?.[i] ?? null,
    rain: daily.precipitation_sum?.[i] ?? 0,
    rainChance: daily.precipitation_probability_max?.[i] ?? 0,
    windMax: daily.wind_speed_10m_max?.[i] ?? 0,
  }));

  const tempMaxes = days.map((d) => d.tempMax).filter((v) => v !== null);
  const tempMins = days.map((d) => d.tempMin).filter((v) => v !== null);
  const rains = days.map((d) => d.rain);
  const winds = days.map((d) => d.windMax);

  const humidityValues = (hourly.relative_humidity_2m || []).filter((v) => v !== null);
  const humidHours = humidityValues.filter((v) => v >= 85).length;

  // Longest run of days with effectively no rain, counted from today onward.
  let dryStreak = 0;
  let currentDry = 0;
  days.forEach((d) => {
    if (d.rain < 1) {
      currentDry += 1;
      dryStreak = Math.max(dryStreak, currentDry);
    } else {
      currentDry = 0;
    }
  });

  // Heaviest rain landing in any rolling 3-day window — the waterlogging cue.
  let maxThreeDayRain = 0;
  for (let i = 0; i + 3 <= rains.length; i += 1) {
    maxThreeDayRain = Math.max(maxThreeDayRain, rains[i] + rains[i + 1] + rains[i + 2]);
  }

  const firstRainDay = days.find((d) => d.rain >= 5 || d.rainChance >= 60) || null;
  const heaviestDay = days.reduce((best, d) => (!best || d.rain > best.rain ? d : best), null);
  const hottestDay = days.reduce(
    (best, d) => (!best || (d.tempMax ?? -99) > (best.tempMax ?? -99) ? d : best),
    null
  );

  const avgTempMax = avg(tempMaxes);
  const avgTempMin = avg(tempMins);

  return {
    days,
    avgTemp: round1((avgTempMax + avgTempMin) / 2),
    avgTempMax: round1(avgTempMax),
    avgTempMin: round1(avgTempMin),
    maxTemp: round1(Math.max(...tempMaxes, -99)),
    minTemp: round1(Math.min(...tempMins, 99)),
    avgHumidity: round1(avg(humidityValues)),
    maxHumidity: round1(Math.max(...humidityValues, 0)),
    humidHours,
    totalRain: round1(rains.reduce((a, b) => a + b, 0)),
    maxDailyRain: round1(Math.max(...rains, 0)),
    maxThreeDayRain: round1(maxThreeDayRain),
    wetDays: rains.filter((r) => r >= 1).length,
    dryStreak,
    maxWind: round1(Math.max(...winds, 0)),
    // Difference between day high and night low — cool nights after warm days
    // are what produce the long dew periods many fungal diseases need.
    diurnalRange: round1(avgTempMax - avgTempMin),
    firstRainDay,
    heaviestDay,
    hottestDay,
  };
}

// ------------------------------------------------------------------ stage

function daysBetween(from, to) {
  return Math.floor((to.getTime() - from.getTime()) / 86400000);
}

function resolveStage(crop, sowingDate) {
  const das = Math.max(0, daysBetween(new Date(sowingDate), new Date()));
  const stage =
    crop.stages.find((st) => das >= st.from && das <= st.to) ||
    crop.stages[crop.stages.length - 1];
  return { stage, daysAfterSowing: das };
}

// ------------------------------------------------------------------ rules

const SEVERITY_ORDER = { low: 1, medium: 2, high: 3, critical: 4 };

function bumpSeverity(level, steps = 1) {
  const keys = ['low', 'medium', 'high', 'critical'];
  const idx = Math.min(keys.length - 1, keys.indexOf(level) + steps);
  return keys[idx];
}

function makeEvidence(labelEn, labelBn, value, unit, threshold) {
  return { label: s(labelEn, labelBn), value, unit, threshold };
}

/**
 * Disease and pest pressure rules.
 *
 * A rule fires when the forecast sits inside the temperature band and above
 * the humidity floor that the organism needs, and the crop is in a stage where
 * that organism does damage. The output says pressure is building — never that
 * the disease is present.
 */
function evaluateBiologicalRisks(crop, stage, indicators) {
  const risks = [];
  const entries = [
    ...(crop.diseases || []).map((d) => ({ ...d, category: 'disease' })),
    ...(crop.pests || []).map((p) => ({ ...p, category: 'pest' })),
  ];

  entries.forEach((item) => {
    if (item.stages && !item.stages.includes(stage.id)) return;

    const humidityOk = indicators.avgHumidity >= (item.humidityMin ?? 0)
      && indicators.avgHumidity <= (item.humidityMax ?? 100);
    const tempOk =
      indicators.avgTemp >= (item.tempMin ?? -99) && indicators.avgTemp <= (item.tempMax ?? 99);
    if (!humidityOk || !tempOk) return;

    // Extra qualifiers some organisms need
    if (item.needsNightCooling && indicators.diurnalRange < 6) return;
    if (item.needsWindRain && (indicators.wetDays < 2 || indicators.maxWind < 20)) return;

    // How far past the humidity floor we are drives severity.
    const margin = indicators.avgHumidity - (item.humidityMin ?? 0);
    let severity = margin >= 8 ? 'high' : margin >= 3 ? 'medium' : 'low';
    if (item.priority === 'high') severity = bumpSeverity(severity);

    const confidence = indicators.humidHours >= 40 ? 'high' : indicators.humidHours >= 20 ? 'medium' : 'low';

    risks.push({
      id: `${item.category}_${item.id}`,
      category: item.category,
      subject: item.name,
      severity,
      confidence,
      when: severity === 'critical' || severity === 'high' ? '24h' : '48h',
      whatsHappening: s(
        `Forecast conditions over the next ${FORECAST_DAYS} days favour ${item.name.en.toLowerCase()} in ${crop.name.en.toLowerCase()} at the ${stage.name.en.toLowerCase()} stage.`,
        `আগামী ${FORECAST_DAYS} দিনের আবহাওয়া ${crop.name.bn}-এর ${stage.name.bn} ধাপে ${item.name.bn} বাড়ার জন্য অনুকূল।`
      ),
      whyItMatters: item.why,
      actions: item.actions,
      evidence: [
        makeEvidence(
          'Average humidity',
          'গড় আর্দ্রতা',
          indicators.avgHumidity,
          '%',
          `≥ ${item.humidityMin}%`
        ),
        makeEvidence(
          'Average temperature',
          'গড় তাপমাত্রা',
          indicators.avgTemp,
          '°C',
          `${item.tempMin}–${item.tempMax} °C`
        ),
        makeEvidence('Humid hours (≥85%)', 'আর্দ্র ঘণ্টা (৮৫%+)', indicators.humidHours, 'h', null),
      ],
    });
  });

  return risks;
}

/** Weather rules that apply to any crop, tuned by that crop's thresholds. */
function evaluateWeatherRisks(crop, stage, indicators, location) {
  const risks = [];
  const th = crop.thresholds;
  const sensitive = crop.sensitiveStages || {};

  // ---- Heat stress ------------------------------------------------------
  if (indicators.maxTemp >= th.heatStressTemp) {
    const critical = indicators.maxTemp >= th.heatCriticalTemp;
    const stageSensitive = (sensitive.heat || []).includes(stage.id);
    let severity = critical ? 'high' : 'medium';
    if (stageSensitive) severity = bumpSeverity(severity);

    risks.push({
      id: 'heat_stress',
      category: 'heat',
      severity,
      confidence: 'high',
      when: severity === 'critical' ? 'now' : '48h',
      whatsHappening: s(
        `Daytime highs reach ${indicators.maxTemp} °C this week${
          indicators.hottestDay ? ` (peak on ${indicators.hottestDay.date})` : ''
        }, above the ${th.heatStressTemp} °C stress point for ${crop.name.en.toLowerCase()}.`,
        `এই সপ্তাহে দিনের সর্বোচ্চ তাপমাত্রা ${indicators.maxTemp} °সে. পর্যন্ত উঠবে, যা ${crop.name.bn}-এর জন্য ${th.heatStressTemp} °সে. এর চাপসীমার উপরে।`
      ),
      whyItMatters: stageSensitive
        ? s(
            `Your crop is at the ${stage.name.en.toLowerCase()} stage, when heat directly reduces the number of grains or fruit that set. Damage done now cannot be recovered later.`,
            `আপনার ফসল এখন ${stage.name.bn} ধাপে আছে, যখন গরম সরাসরি দানা বা ফল ধরার সংখ্যা কমিয়ে দেয়। এই সময়ের ক্ষতি পরে আর পোষানো যায় না।`
          )
        : s(
            'Sustained heat raises water demand and slows growth, even outside the most sensitive stages.',
            'টানা গরমে পানির চাহিদা বাড়ে এবং গাছের বাড়া ধীর হয়ে যায়, সবচেয়ে সংবেদনশীল ধাপ না হলেও।'
          ),
      actions: [
        s(
          'Irrigate in the early morning or after sunset so water is not lost to evaporation.',
          'ভোরে বা সূর্য ডোবার পর সেচ দিন যাতে পানি বাষ্প হয়ে না যায়।'
        ),
        s(
          'Keep a thin water layer or mulch to hold soil moisture and cool the root zone.',
          'মাটির রস ধরে রাখতে ও শিকড় ঠান্ডা রাখতে পাতলা পানি বা মালচ দিন।'
        ),
        s(
          'Postpone urea top-dressing and any spraying until the hot spell passes.',
          'গরম কমা পর্যন্ত ইউরিয়া উপরি প্রয়োগ ও স্প্রে পিছিয়ে দিন।'
        ),
      ],
      evidence: [
        makeEvidence('Highest forecast temperature', 'সর্বোচ্চ পূর্বাভাসিত তাপমাত্রা', indicators.maxTemp, '°C', `≥ ${th.heatStressTemp} °C`),
        makeEvidence('Average daytime high', 'গড় দিনের সর্বোচ্চ', indicators.avgTempMax, '°C', null),
      ],
    });
  }

  // ---- Cold stress ------------------------------------------------------
  if (indicators.minTemp <= th.coldStressTemp) {
    const stageSensitive = (sensitive.cold || []).includes(stage.id);
    risks.push({
      id: 'cold_stress',
      category: 'cold',
      severity: stageSensitive ? 'high' : 'medium',
      confidence: 'high',
      when: '48h',
      whatsHappening: s(
        `Night temperatures drop to ${indicators.minTemp} °C, at or below the ${th.coldStressTemp} °C cold threshold for ${crop.name.en.toLowerCase()}.`,
        `রাতের তাপমাত্রা ${indicators.minTemp} °সে. পর্যন্ত নামবে, যা ${crop.name.bn}-এর ${th.coldStressTemp} °সে. ঠান্ডা-সীমার সমান বা নিচে।`
      ),
      whyItMatters: s(
        'Cold nights slow root activity and nutrient uptake, and can damage young seedlings or cause flowers to drop.',
        'ঠান্ডা রাতে শিকড়ের কাজ ও খাদ্য গ্রহণ কমে যায়; কচি চারার ক্ষতি হতে পারে বা ফুল ঝরে যেতে পারে।'
      ),
      actions: [
        s(
          'Give a light evening irrigation — water in the field keeps night temperature a little higher.',
          'সন্ধ্যায় হালকা সেচ দিন — জমিতে পানি থাকলে রাতের তাপমাত্রা কিছুটা বেশি থাকে।'
        ),
        s(
          'Delay transplanting or sowing until the cold spell passes.',
          'ঠান্ডা কমা পর্যন্ত চারা রোপণ বা বীজ বপন পিছিয়ে দিন।'
        ),
      ],
      evidence: [
        makeEvidence('Lowest forecast temperature', 'সর্বনিম্ন পূর্বাভাসিত তাপমাত্রা', indicators.minTemp, '°C', `≤ ${th.coldStressTemp} °C`),
      ],
    });
  }

  // ---- Heavy rain -------------------------------------------------------
  if (indicators.maxDailyRain >= th.heavyRainMm) {
    risks.push({
      id: 'heavy_rain',
      category: 'rain',
      severity: indicators.maxDailyRain >= th.heavyRainMm * 1.5 ? 'high' : 'medium',
      confidence: 'medium',
      when: '48h',
      whatsHappening: s(
        `Up to ${indicators.maxDailyRain} mm of rain is forecast in a single day${
          indicators.heaviestDay ? ` (${indicators.heaviestDay.date})` : ''
        }.`,
        `এক দিনেই ${indicators.maxDailyRain} মিমি পর্যন্ত বৃষ্টির পূর্বাভাস রয়েছে${
          indicators.heaviestDay ? ` (${indicators.heaviestDay.date})` : ''
        }।`
      ),
      whyItMatters: s(
        'Heavy rain washes away recently applied fertiliser and pesticide, and can knock down flowers and young plants.',
        'ভারী বৃষ্টিতে সদ্য দেওয়া সার ও কীটনাশক ধুয়ে যায় এবং ফুল ও কচি গাছ নুয়ে পড়তে পারে।'
      ),
      actions: [
        s(
          'Do not apply fertiliser or spray in the 24 hours before this rain — it will be wasted.',
          'এই বৃষ্টির আগের ২৪ ঘণ্টায় সার বা স্প্রে দেবেন না — সব নষ্ট হবে।'
        ),
        s('Clear drainage channels now, while the field is still workable.', 'জমি চলাচলের উপযোগী থাকতেই এখনই নালা পরিষ্কার করুন।'),
      ],
      evidence: [
        makeEvidence('Heaviest single day', 'সবচেয়ে বেশি বৃষ্টির দিন', indicators.maxDailyRain, 'mm', `≥ ${th.heavyRainMm} mm`),
        makeEvidence('Total 7-day rain', '৭ দিনের মোট বৃষ্টি', indicators.totalRain, 'mm', null),
      ],
    });
  }

  // ---- Waterlogging / flood ---------------------------------------------
  if (indicators.maxThreeDayRain >= th.waterloggingMm) {
    const stageSensitive = (sensitive.flood || []).includes(stage.id);
    let severity = 'high';
    if (stageSensitive) severity = bumpSeverity(severity);
    if (location.traits.haor || location.traits.coastal) severity = bumpSeverity(severity);

    risks.push({
      id: 'waterlogging',
      category: 'flood',
      severity,
      confidence: 'medium',
      when: 'now',
      whatsHappening: s(
        `${indicators.maxThreeDayRain} mm of rain is forecast across three days, above the ${th.waterloggingMm} mm level at which ${crop.name.en.toLowerCase()} fields start to waterlog.`,
        `তিন দিনে ${indicators.maxThreeDayRain} মিমি বৃষ্টির পূর্বাভাস, যা ${crop.name.bn} জমিতে জলাবদ্ধতা শুরুর ${th.waterloggingMm} মিমি সীমার উপরে।`
      ),
      whyItMatters: location.traits.haor
        ? s(
            'Haor fields fill fast and drain slowly. Standing water starves roots of air within two to three days, and a standing crop close to harvest can be lost outright.',
            'হাওরের জমি দ্রুত ভরে যায় কিন্তু পানি নামে ধীরে। দুই-তিন দিন পানি জমে থাকলেই শিকড় বাতাস পায় না, আর কাটার কাছাকাছি ফসল পুরোপুরি নষ্ট হয়ে যেতে পারে।'
          )
        : s(
            'Standing water starves roots of air within two to three days and invites root and stem rot.',
            'দুই-তিন দিন পানি জমে থাকলেই শিকড় বাতাস পায় না এবং শিকড় ও কাণ্ড পচা রোগ দেখা দেয়।'
          ),
      actions: [
        s('Open and deepen drainage channels today, before the rain starts.', 'বৃষ্টি শুরুর আগেই আজ নালা কেটে গভীর করুন।'),
        s(
          'If the crop is close to harvest, bring the harvest forward rather than risk the whole field.',
          'ফসল কাটার কাছাকাছি হলে পুরো জমি ঝুঁকিতে না ফেলে আগেভাগে কেটে ফেলুন।'
        ),
        s(
          'Move stored seed, fertiliser and harvested produce off the ground and under cover.',
          'সংরক্ষিত বীজ, সার ও কাটা ফসল মাটি থেকে উঁচুতে ও ছাউনির নিচে সরিয়ে নিন।'
        ),
      ],
      evidence: [
        makeEvidence('Heaviest 3-day rain', 'সবচেয়ে বেশি ৩ দিনের বৃষ্টি', indicators.maxThreeDayRain, 'mm', `≥ ${th.waterloggingMm} mm`),
        makeEvidence('Days with rain', 'বৃষ্টির দিন', indicators.wetDays, 'd', null),
      ],
    });
  }

  // ---- Storm / wind -----------------------------------------------------
  if (indicators.maxWind >= th.windDamageKmh) {
    const stageSensitive = (sensitive.wind || []).includes(stage.id);
    risks.push({
      id: 'storm_wind',
      category: 'wind',
      severity: stageSensitive ? 'high' : 'medium',
      confidence: 'medium',
      when: '48h',
      whatsHappening: s(
        `Winds up to ${indicators.maxWind} km/h are forecast, above the ${th.windDamageKmh} km/h level where ${crop.name.en.toLowerCase()} starts to lodge.`,
        `${indicators.maxWind} কিমি/ঘণ্টা পর্যন্ত বাতাসের পূর্বাভাস, যা ${crop.name.bn} নুয়ে পড়া শুরুর ${th.windDamageKmh} কিমি/ঘণ্টা সীমার উপরে।`
      ),
      whyItMatters: stageSensitive
        ? s(
            'A lodged crop at this stage is hard to harvest, dries unevenly and loses grain to the ground.',
            'এই ধাপে গাছ নুয়ে পড়লে কাটা কঠিন হয়, অসমানভাবে শুকায় এবং দানা মাটিতে ঝরে যায়।'
          )
        : s(
            'Strong wind tears leaves and creates wounds that bacteria and fungi enter through.',
            'জোরালো বাতাসে পাতা ছিঁড়ে যায় এবং সেই ক্ষত দিয়ে জীবাণু ও ছত্রাক ঢোকে।'
          ),
      actions: [
        s('Stake or tie tall plants and check that supports are firm.', 'লম্বা গাছে খুঁটি দিন বা বেঁধে দিন এবং খুঁটি শক্ত আছে কিনা দেখুন।'),
        s('Postpone spraying — it will drift and be wasted.', 'স্প্রে পিছিয়ে দিন — বাতাসে উড়ে গিয়ে নষ্ট হবে।'),
      ],
      evidence: [
        makeEvidence('Strongest forecast wind', 'সবচেয়ে জোরালো পূর্বাভাসিত বাতাস', indicators.maxWind, 'km/h', `≥ ${th.windDamageKmh} km/h`),
      ],
    });
  }

  // ---- Irrigation need --------------------------------------------------
  const waterSensitive = (sensitive.water || []).includes(stage.id);
  if (indicators.dryStreak >= th.dryDayThreshold) {
    let severity = waterSensitive ? 'high' : 'medium';
    if (location.traits.droughtProne && waterSensitive) severity = bumpSeverity(severity);
    // A rainless week under heavy humidity and dew loses far less soil water
    // than a rainless week of dry heat, so it should not outrank a disease
    // warning generated by that same humidity.
    if (indicators.avgHumidity >= 85) severity = waterSensitive ? 'medium' : 'low';

    risks.push({
      id: 'irrigation_need',
      category: 'irrigation',
      severity,
      confidence: 'high',
      when: waterSensitive ? '24h' : 'week',
      whatsHappening: s(
        `${indicators.dryStreak} days in a row with almost no rain are forecast, and only ${indicators.totalRain} mm is expected all week.`,
        `টানা ${indicators.dryStreak} দিন প্রায় বৃষ্টিহীন থাকার পূর্বাভাস, আর পুরো সপ্তাহে মাত্র ${indicators.totalRain} মিমি বৃষ্টি হতে পারে।`
      ),
      whyItMatters: waterSensitive
        ? s(
            `${crop.name.en} at the ${stage.name.en.toLowerCase()} stage is at its most water-sensitive. A dry week now costs yield that later irrigation cannot bring back.`,
            `${crop.name.bn} এখন ${stage.name.bn} ধাপে আছে, যখন পানির প্রয়োজন সবচেয়ে বেশি। এই সময় এক সপ্তাহ শুকনো গেলে যে ফলন কমে, পরে সেচ দিয়ে তা আর ফেরানো যায় না।`
          )
        : s(
            'Soil moisture will fall steadily. Plan irrigation before plants show visible stress, not after.',
            'মাটির রস ক্রমশ কমবে। গাছে ক্ষতির লক্ষণ দেখা দেওয়ার আগেই সেচের পরিকল্পনা করুন।'
          ),
      actions: [
        s(
          'Check soil moisture at 10 cm depth — if it crumbles dry in your hand, irrigate.',
          '১০ সেমি গভীরে মাটির রস দেখুন — হাতে নিলে ঝুরঝুরে শুকনো লাগলে সেচ দিন।'
        ),
        s(
          'Irrigate early morning or evening, and confirm your pump or canal turn in advance.',
          'ভোরে বা সন্ধ্যায় সেচ দিন এবং পাম্প বা খালের পালা আগেভাগে ঠিক করে রাখুন।'
        ),
      ],
      evidence: [
        makeEvidence('Consecutive dry days', 'টানা শুকনো দিন', indicators.dryStreak, 'd', `≥ ${th.dryDayThreshold} d`),
        makeEvidence('Total 7-day rain', '৭ দিনের মোট বৃষ্টি', indicators.totalRain, 'mm', null),
      ],
    });
  }

  // ---- Nutrient timing --------------------------------------------------
  // Rain within the next two days makes a top-dressing a wasted purchase.
  const nextTwoDaysRain = indicators.days.slice(0, 2).reduce((sum, d) => sum + d.rain, 0);
  if (nextTwoDaysRain >= 10) {
    risks.push({
      id: 'fertiliser_timing',
      category: 'nutrient',
      severity: 'low',
      confidence: 'medium',
      when: '48h',
      whatsHappening: s(
        `About ${round1(nextTwoDaysRain)} mm of rain is expected in the next two days.`,
        `আগামী দুই দিনে প্রায় ${round1(nextTwoDaysRain)} মিমি বৃষ্টি হতে পারে।`
      ),
      whyItMatters: s(
        'Urea applied just before rain is largely washed away or lost as gas. That is money spent for no benefit.',
        'বৃষ্টির ঠিক আগে ইউরিয়া দিলে বেশিরভাগই ধুয়ে যায় বা গ্যাস হয়ে উড়ে যায়। এতে টাকা খরচ হয় কিন্তু কোনো লাভ হয় না।'
      ),
      actions: [
        s('Hold any planned urea top-dressing until two days after the rain stops.', 'পরিকল্পিত ইউরিয়া উপরি প্রয়োগ বৃষ্টি থামার দুই দিন পর পর্যন্ত পিছিয়ে দিন।'),
        s('Apply to moist — not flooded — soil for the best uptake.', 'সবচেয়ে ভালো ফল পেতে ভেজা মাটিতে দিন, ডুবে থাকা মাটিতে নয়।'),
      ],
      evidence: [
        makeEvidence('Rain in next 2 days', 'আগামী ২ দিনের বৃষ্টি', round1(nextTwoDaysRain), 'mm', '≥ 10 mm'),
      ],
    });
  }

  // ---- Harvest window ---------------------------------------------------
  const lastStage = crop.stages[crop.stages.length - 1];
  if (stage.id === lastStage.id && (indicators.totalRain >= 30 || indicators.maxWind >= th.windDamageKmh)) {
    risks.push({
      id: 'harvest_window',
      category: 'harvest',
      severity: location.traits.haor ? 'critical' : 'high',
      confidence: 'medium',
      when: 'now',
      whatsHappening: s(
        `Your crop is at harvest stage and ${indicators.totalRain} mm of rain with winds up to ${indicators.maxWind} km/h is forecast this week.`,
        `আপনার ফসল কাটার ধাপে আছে, আর এই সপ্তাহে ${indicators.totalRain} মিমি বৃষ্টি ও ${indicators.maxWind} কিমি/ঘণ্টা পর্যন্ত বাতাসের পূর্বাভাস রয়েছে।`
      ),
      whyItMatters: s(
        'A ripe crop caught by rain and wind lodges, sprouts in the head and loses both weight and market grade. The safe window is the dry days before the rain, not after.',
        'পাকা ফসল বৃষ্টি ও বাতাসে পড়ে গেলে শীষেই গজিয়ে যায়, ওজন কমে এবং বাজারদর পড়ে যায়। নিরাপদ সময় হলো বৃষ্টির আগের শুকনো দিনগুলো, পরে নয়।'
      ),
      actions: [
        s(
          `Bring the harvest forward to the dry days${
            indicators.firstRainDay ? ` before ${indicators.firstRainDay.date}` : ''
          } if 80% of the crop is ripe.`,
          `৮০% ফসল পাকা থাকলে${
            indicators.firstRainDay ? ` ${indicators.firstRainDay.date} তারিখের আগের` : ''
          } শুকনো দিনেই কেটে ফেলুন।`
        ),
        s('Arrange labour and threshing space now, not on the day.', 'শ্রমিক ও মাড়াইয়ের জায়গা আজই ঠিক করে রাখুন, কাটার দিন নয়।'),
        s('Prepare covered, raised storage for the harvested crop.', 'কাটা ফসলের জন্য উঁচু ও ছাউনিযুক্ত সংরক্ষণের ব্যবস্থা করুন।'),
      ],
      evidence: [
        makeEvidence('Total 7-day rain', '৭ দিনের মোট বৃষ্টি', indicators.totalRain, 'mm', null),
        makeEvidence('Strongest forecast wind', 'সবচেয়ে জোরালো বাতাস', indicators.maxWind, 'km/h', null),
      ],
    });
  }

  return risks;
}

const STATUS_BY_SEVERITY = {
  critical: 'critical',
  high: 'warning',
  medium: 'watch',
  low: 'watch',
};

function summariseStatus(risks) {
  if (!risks.length) return 'good';
  const worst = risks.reduce(
    (acc, r) => (SEVERITY_ORDER[r.severity] > SEVERITY_ORDER[acc] ? r.severity : acc),
    'low'
  );
  return STATUS_BY_SEVERITY[worst] || 'watch';
}

// -------------------------------------------------------------- advisory

/**
 * Builds a complete advisory. Never throws for a forecast outage — it falls
 * back to clearly-flagged demo data so the caller always has something to show.
 */
async function generateAdvisory({ divisionId, districtId, upazilaId, cropId, sowingDate, areaValue, areaUnit }) {
  const location = resolveLocation({ divisionId, districtId, upazilaId });
  if (!location) {
    const err = new Error('Unknown location');
    err.status = 400;
    throw err;
  }

  const crop = getCrop(cropId);
  if (!crop) {
    const err = new Error('Unknown crop');
    err.status = 400;
    throw err;
  }

  const sowing = new Date(sowingDate);
  if (Number.isNaN(sowing.getTime())) {
    const err = new Error('Invalid sowing date');
    err.status = 400;
    throw err;
  }

  let forecast;
  let dataMode;
  try {
    forecast = await fetchForecast(location.lat, location.lon);
    dataMode = forecast.dataMode;
  } catch (err) {
    console.error('Crop intelligence: forecast unavailable, falling back to demo data.', err.message);
    forecast = buildDemoForecast();
    dataMode = 'demo';
  }

  const indicators = computeIndicators(forecast);
  const { stage, daysAfterSowing } = resolveStage(crop, sowing);

  const risks = [
    ...evaluateWeatherRisks(crop, stage, indicators, location),
    ...evaluateBiologicalRisks(crop, stage, indicators),
  ].sort((a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity]);

  const status = summariseStatus(risks);
  const actionCount = risks.filter((r) => SEVERITY_ORDER[r.severity] >= SEVERITY_ORDER.medium).length;

  return {
    generatedAt: new Date().toISOString(),
    dataMode, // 'live' | 'cached' | 'demo' — surfaced in the UI, never hidden
    location: {
      divisionId: location.divisionId,
      divisionName: location.divisionName,
      districtId: location.districtId,
      districtName: location.districtName,
      upazilaId: location.upazilaId,
      upazilaName: location.upazilaName,
      label: location.label,
      lat: location.lat,
      lon: location.lon,
      traits: location.traits,
    },
    crop: {
      id: crop.id,
      name: crop.name,
      season: crop.season,
      durationDays: crop.durationDays,
      stages: crop.stages.map(({ id, name, from, to, actions }) => ({ id, name, from, to, actions })),
    },
    field: {
      sowingDate: sowing.toISOString().slice(0, 10),
      daysAfterSowing,
      areaValue: areaValue ?? null,
      areaUnit: areaUnit || null,
    },
    stage: { id: stage.id, name: stage.name, from: stage.from, to: stage.to, actions: stage.actions },
    status,
    actionCount,
    risks,
    indicators: {
      avgTemp: indicators.avgTemp,
      maxTemp: indicators.maxTemp,
      minTemp: indicators.minTemp,
      avgHumidity: indicators.avgHumidity,
      humidHours: indicators.humidHours,
      totalRain: indicators.totalRain,
      maxDailyRain: indicators.maxDailyRain,
      maxThreeDayRain: indicators.maxThreeDayRain,
      wetDays: indicators.wetDays,
      dryStreak: indicators.dryStreak,
      maxWind: indicators.maxWind,
      diurnalRange: indicators.diurnalRange,
    },
    outlook: indicators.days,
    nextRainDate: indicators.firstRainDay ? indicators.firstRainDay.date : null,
  };
}

module.exports = {
  generateAdvisory,
  computeIndicators,
  resolveStage,
  fetchForecast,
  buildDemoForecast,
};
