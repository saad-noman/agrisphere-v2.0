/**
 * Crop profiles for the Crop Intelligence & Early Warning module.
 *
 * What this file is:
 *   A declarative set of agronomic thresholds for crops commonly grown in
 *   Bangladesh. Each profile lists growth stages by days-after-sowing, the
 *   temperature / humidity / rainfall bands that matter for that crop, and the
 *   weather patterns that are known to favour particular diseases and pests.
 *
 * What this file is NOT:
 *   It is not a substitute for a diagnosis and it is not an official
 *   recommendation. Thresholds here are conventional agronomic guidance and
 *   are used to say "conditions favour X, go and check" — never "you have X".
 *   Every advisory carries that framing in the UI. Pesticide names and dosages
 *   are deliberately absent: the advice is always to confirm with an extension
 *   officer or an AgriSphere expert before applying anything.
 *
 * The rule engine in services/cropIntelligenceService.js reads these numbers;
 * adding a crop here is enough to make it appear in the product.
 */

/** Shorthand for a bilingual string. */
const s = (en, bn) => ({ en, bn });

const CROPS = [
  // ------------------------------------------------------------------ RICE
  {
    id: 'rice_aman',
    group: 'rice',
    name: s('Rice — Aman', 'ধান — আমন'),
    season: s('Aman (Jul–Dec)', 'আমন (জুলাই–ডিসেম্বর)'),
    sowingMonths: [6, 7, 8],
    durationDays: 135,
    stages: [
      {
        id: 'establishment',
        name: s('Transplanting & establishment', 'রোপণ ও চারা প্রতিষ্ঠা'),
        from: 0,
        to: 20,
        actions: s(
          'Keep 2–3 cm standing water, fill gaps within 10 days of transplanting.',
          'জমিতে ২–৩ সেমি পানি রাখুন, রোপণের ১০ দিনের মধ্যে ফাঁকা জায়গায় চারা লাগান।'
        ),
      },
      {
        id: 'tillering',
        name: s('Tillering', 'কুশি গজানো'),
        from: 21,
        to: 55,
        actions: s(
          'Top-dress urea in splits, weed twice, keep shallow water.',
          'ইউরিয়া ভাগ করে উপরি প্রয়োগ করুন, দুইবার আগাছা দমন করুন, অল্প পানি রাখুন।'
        ),
      },
      {
        id: 'panicle',
        name: s('Panicle initiation & booting', 'কাইচ থোড় ও থোড়'),
        from: 56,
        to: 85,
        actions: s(
          'Most sensitive stage for water stress — never let the field dry out.',
          'পানির ঘাটতিতে সবচেয়ে ক্ষতিকর ধাপ — জমি শুকাতে দেবেন না।'
        ),
      },
      {
        id: 'flowering',
        name: s('Flowering', 'ফুল আসা'),
        from: 86,
        to: 100,
        actions: s(
          'Avoid any spraying during flowering hours; maintain water.',
          'ফুল ফোটার সময় স্প্রে এড়িয়ে চলুন; পানি ধরে রাখুন।'
        ),
      },
      {
        id: 'grainfill',
        name: s('Grain filling', 'দানা গঠন'),
        from: 101,
        to: 125,
        actions: s(
          'Keep light irrigation until dough stage, then drain.',
          'দানা শক্ত হওয়া পর্যন্ত হালকা সেচ দিন, এরপর পানি সরিয়ে দিন।'
        ),
      },
      {
        id: 'maturity',
        name: s('Maturity & harvest', 'পাকা ও কাটা'),
        from: 126,
        to: 999,
        actions: s(
          'Harvest at 80–85% golden grain; do not delay if storms are forecast.',
          '৮০–৮৫% শীষ সোনালি হলে কাটুন; ঝড়ের পূর্বাভাস থাকলে দেরি করবেন না।'
        ),
      },
    ],
    thresholds: {
      optimalTempMin: 22,
      optimalTempMax: 32,
      heatStressTemp: 35,
      heatCriticalTemp: 38,
      coldStressTemp: 15,
      heavyRainMm: 50,
      waterloggingMm: 100,
      windDamageKmh: 45,
      dryDayThreshold: 5,
    },
    sensitiveStages: {
      heat: ['flowering', 'grainfill'],
      cold: ['flowering'],
      flood: ['establishment', 'tillering'],
      wind: ['grainfill', 'maturity'],
      water: ['panicle', 'flowering'],
    },
    diseases: [
      {
        id: 'blast',
        name: s('Rice blast', 'ব্লাস্ট রোগ'),
        humidityMin: 88,
        tempMin: 20,
        tempMax: 30,
        needsNightCooling: true,
        stages: ['tillering', 'panicle', 'flowering'],
        why: s(
          'Long humid nights with cool mornings let blast spores infect leaves and neck. Neck blast at flowering can empty whole panicles.',
          'লম্বা আর্দ্র রাত আর ঠান্ডা ভোরে ব্লাস্টের জীবাণু পাতা ও শীষের গোড়ায় আক্রমণ করে। ফুল আসার সময় গলা ব্লাস্ট হলে পুরো শীষ চিটা হয়ে যায়।'
        ),
        actions: [
          s(
            'Walk the field early morning and look for spindle-shaped spots with grey centres on leaves.',
            'ভোরে জমিতে ঘুরে পাতায় ধূসর কেন্দ্রসহ মাকু-আকৃতির দাগ আছে কিনা দেখুন।'
          ),
          s(
            'Stop any further urea top-dressing until the weather dries — extra nitrogen makes blast worse.',
            'আবহাওয়া শুকনো না হওয়া পর্যন্ত ইউরিয়া উপরি প্রয়োগ বন্ধ রাখুন — বাড়তি নাইট্রোজেন ব্লাস্ট বাড়ায়।'
          ),
          s(
            'If you find spots on more than a few plants, send a photo through AI Crop Disease Analysis or ask an expert before spraying anything.',
            'কয়েকটির বেশি গাছে দাগ পেলে স্প্রে করার আগে ছবি দেখে রোগ শনাক্ত করুন বা বিশেষজ্ঞের পরামর্শ নিন।'
          ),
        ],
      },
      {
        id: 'bacterial_blight',
        name: s('Bacterial leaf blight', 'ব্যাকটেরিয়াল লিফ ব্লাইট'),
        humidityMin: 85,
        tempMin: 28,
        tempMax: 40,
        needsWindRain: true,
        stages: ['tillering', 'panicle'],
        why: s(
          'Warm, wet, windy weather spreads the bacteria field to field through leaf wounds and splashing water.',
          'গরম, ভেজা ও বাতাসযুক্ত আবহাওয়ায় পাতার ক্ষত ও ছিটকে পড়া পানির মাধ্যমে জীবাণু এক জমি থেকে আরেক জমিতে ছড়ায়।'
        ),
        actions: [
          s(
            'Check for yellow wavy streaks starting from leaf tips and edges.',
            'পাতার আগা ও কিনারা থেকে শুরু হওয়া হলুদ ঢেউ খেলানো দাগ আছে কিনা দেখুন।'
          ),
          s(
            'Drain the field for a few days if you can, and avoid moving through wet plants more than needed.',
            'সম্ভব হলে কয়েক দিন জমির পানি সরিয়ে দিন এবং ভেজা গাছের ভেতর অপ্রয়োজনে চলাচল কমান।'
          ),
          s(
            'Hold back nitrogen; it feeds the infection.',
            'নাইট্রোজেন সার দেওয়া বন্ধ রাখুন; এতে রোগ আরও বাড়ে।'
          ),
        ],
      },
      {
        id: 'sheath_blight',
        name: s('Sheath blight', 'খোলপোড়া রোগ'),
        humidityMin: 90,
        tempMin: 28,
        tempMax: 35,
        stages: ['tillering', 'panicle', 'flowering'],
        why: s(
          'Dense, closed canopies that stay wet at the base let sheath blight climb the stem and weaken tillers.',
          'ঘন গাছের গোড়া ভেজা থাকলে খোলপোড়া রোগ কাণ্ড বেয়ে উপরে ওঠে এবং কুশি দুর্বল করে দেয়।'
        ),
        actions: [
          s(
            'Part the canopy and look for oval, water-soaked lesions on sheaths near the water line.',
            'গাছ ফাঁক করে পানির স্তরের কাছে খোলে ডিম্বাকার ভেজা দাগ খুঁজে দেখুন।'
          ),
          s(
            'Drain excess water and remove weeds so air can move through the canopy.',
            'বাড়তি পানি সরান ও আগাছা পরিষ্কার করুন যাতে গাছের ভেতর বাতাস চলাচল করে।'
          ),
        ],
      },
    ],
    pests: [
      {
        id: 'bph',
        name: s('Brown planthopper', 'বাদামী গাছফড়িং'),
        humidityMin: 80,
        tempMin: 25,
        tempMax: 33,
        stages: ['tillering', 'panicle', 'flowering', 'grainfill'],
        why: s(
          'Warm, humid, still weather with continuous standing water builds planthopper numbers fast, and heavy infestation causes hopperburn — circular patches of dried plants.',
          'গরম, আর্দ্র ও বাতাসহীন আবহাওয়ায় জমিতে সবসময় পানি থাকলে গাছফড়িং দ্রুত বাড়ে; বেশি আক্রমণে গোল গোল জায়গায় গাছ শুকিয়ে যায় (হপারবার্ন)।'
        ),
        actions: [
          s(
            'Tap the base of plants over water and see if brown insects fall — check 10 spots across the field.',
            'গাছের গোড়ায় টোকা দিয়ে পানিতে বাদামী পোকা পড়ে কিনা দেখুন — জমির ১০টি জায়গায় পরীক্ষা করুন।'
          ),
          s(
            'Drain the field for 3–4 days; alternate wetting and drying knocks numbers back.',
            '৩–৪ দিন জমির পানি সরিয়ে দিন; ভেজা-শুকনো পালা করলে পোকা কমে।'
          ),
          s(
            'Do not spray broad-spectrum insecticide on sight — it kills the spiders that control this pest. Confirm the count with an expert first.',
            'দেখামাত্র সব-পোকা-মারা কীটনাশক দেবেন না — এতে উপকারী মাকড়সা মরে যায়। আগে বিশেষজ্ঞের সঙ্গে পোকার সংখ্যা যাচাই করুন।'
          ),
        ],
      },
      {
        id: 'stem_borer',
        name: s('Yellow stem borer', 'মাজরা পোকা'),
        humidityMin: 70,
        tempMin: 26,
        tempMax: 35,
        stages: ['tillering', 'panicle'],
        why: s(
          'Steady warm weather speeds up borer generations. Larvae tunnel into stems and cause dead hearts, then white heads at panicle stage.',
          'টানা গরম আবহাওয়ায় মাজরা পোকার বংশবৃদ্ধি দ্রুত হয়। কীড়া কাণ্ডের ভেতর ঢুকে ডেডহার্ট এবং শীষ আসার সময় সাদা শীষ তৈরি করে।'
        ),
        actions: [
          s(
            'Look for dead central shoots that pull out easily, and for egg masses on leaf tips.',
            'সহজে টেনে ওঠে এমন মরা মাঝের কুশি এবং পাতার আগায় ডিমের গাদা খুঁজে দেখুন।'
          ),
          s(
            'Clip and destroy egg masses; set up perches so birds can hunt the moths.',
            'ডিমের গাদা কেটে নষ্ট করুন; পাখি বসার ডাল পুঁতে দিন যাতে পাখি মথ খায়।'
          ),
        ],
      },
    ],
  },

  {
    id: 'rice_boro',
    group: 'rice',
    name: s('Rice — Boro', 'ধান — বোরো'),
    season: s('Boro (Dec–May)', 'বোরো (ডিসেম্বর–মে)'),
    sowingMonths: [11, 0, 1],
    durationDays: 155,
    stages: [
      {
        id: 'establishment',
        name: s('Transplanting & establishment', 'রোপণ ও চারা প্রতিষ্ঠা'),
        from: 0,
        to: 25,
        actions: s(
          'Protect young seedlings from cold; keep a thin water layer overnight.',
          'কচি চারাকে ঠান্ডা থেকে বাঁচান; রাতে জমিতে পাতলা পানি রাখুন।'
        ),
      },
      {
        id: 'tillering',
        name: s('Tillering', 'কুশি গজানো'),
        from: 26,
        to: 65,
        actions: s(
          'Split urea application, weed early, keep 2–3 cm water.',
          'ইউরিয়া ভাগ করে দিন, আগেভাগে আগাছা দমন করুন, ২–৩ সেমি পানি রাখুন।'
        ),
      },
      {
        id: 'panicle',
        name: s('Panicle initiation & booting', 'কাইচ থোড় ও থোড়'),
        from: 66,
        to: 95,
        actions: s(
          'Water demand peaks now — Boro is fully irrigation-dependent.',
          'এখন পানির চাহিদা সবচেয়ে বেশি — বোরো পুরোপুরি সেচনির্ভর।'
        ),
      },
      {
        id: 'flowering',
        name: s('Flowering', 'ফুল আসা'),
        from: 96,
        to: 112,
        actions: s(
          'Heat above 35 °C during flowering causes sterile grain — keep water in the field.',
          'ফুল আসার সময় ৩৫ °সে. এর বেশি গরমে দানা চিটা হয় — জমিতে পানি রাখুন।'
        ),
      },
      {
        id: 'grainfill',
        name: s('Grain filling', 'দানা গঠন'),
        from: 113,
        to: 142,
        actions: s(
          'Maintain irrigation; watch for pre-monsoon storms.',
          'সেচ চালু রাখুন; কালবৈশাখীর দিকে নজর রাখুন।'
        ),
      },
      {
        id: 'maturity',
        name: s('Maturity & harvest', 'পাকা ও কাটা'),
        from: 143,
        to: 999,
        actions: s(
          'In haor areas harvest as soon as 80% of grain is ripe — flash floods arrive without much warning.',
          'হাওর এলাকায় ৮০% ধান পাকলেই কেটে ফেলুন — আগাম বন্যা হঠাৎ চলে আসে।'
        ),
      },
    ],
    thresholds: {
      optimalTempMin: 20,
      optimalTempMax: 32,
      heatStressTemp: 35,
      heatCriticalTemp: 38,
      coldStressTemp: 13,
      heavyRainMm: 45,
      waterloggingMm: 90,
      windDamageKmh: 45,
      dryDayThreshold: 3,
    },
    sensitiveStages: {
      heat: ['flowering', 'grainfill'],
      cold: ['establishment', 'tillering'],
      flood: ['maturity', 'grainfill'],
      wind: ['grainfill', 'maturity'],
      water: ['panicle', 'flowering', 'grainfill'],
    },
    diseases: [
      {
        id: 'blast',
        name: s('Rice blast', 'ব্লাস্ট রোগ'),
        humidityMin: 88,
        tempMin: 18,
        tempMax: 30,
        needsNightCooling: true,
        stages: ['tillering', 'panicle', 'flowering'],
        why: s(
          'Boro season fog with cool nights and warm days is classic blast weather, and neck blast at flowering can cost most of the yield.',
          'বোরো মৌসুমে কুয়াশা, ঠান্ডা রাত আর গরম দিন ব্লাস্টের জন্য আদর্শ; ফুল আসার সময় গলা ব্লাস্ট হলে ফলনের বড় অংশ নষ্ট হয়।'
        ),
        actions: [
          s(
            'Check leaves at sunrise for grey-centred spots, especially in foggy fields.',
            'সূর্য ওঠার সময় পাতায় ধূসর কেন্দ্রের দাগ দেখুন, বিশেষ করে কুয়াশাপ্রবণ জমিতে।'
          ),
          s(
            'Delay the next urea dose until the fog breaks.',
            'কুয়াশা কমা পর্যন্ত পরের ইউরিয়া প্রয়োগ পিছিয়ে দিন।'
          ),
          s(
            'Keep a thin water layer — dry topsoil makes blast worse.',
            'জমিতে পাতলা পানি রাখুন — উপরের মাটি শুকনো থাকলে ব্লাস্ট বাড়ে।'
          ),
        ],
      },
      {
        id: 'sheath_blight',
        name: s('Sheath blight', 'খোলপোড়া রোগ'),
        humidityMin: 90,
        tempMin: 28,
        tempMax: 35,
        stages: ['panicle', 'flowering'],
        why: s(
          'Late-Boro warmth with a dense wet canopy favours sheath blight, which weakens stems just when grain weight is building.',
          'বোরোর শেষ দিকে গরম ও ঘন ভেজা গাছে খোলপোড়া রোগ বাড়ে, ঠিক যখন দানা ভারী হচ্ছে তখনই কাণ্ড দুর্বল করে দেয়।'
        ),
        actions: [
          s(
            'Inspect sheaths near the water line for oval water-soaked lesions.',
            'পানির স্তরের কাছে খোলে ডিম্বাকার ভেজা দাগ আছে কিনা দেখুন।'
          ),
          s(
            'Thin out weeds and drain briefly to open the canopy.',
            'আগাছা পরিষ্কার করুন এবং অল্প সময়ের জন্য পানি সরিয়ে গাছের ভেতর বাতাস চলাচলের সুযোগ দিন।'
          ),
        ],
      },
    ],
    pests: [
      {
        id: 'bph',
        name: s('Brown planthopper', 'বাদামী গাছফড়িং'),
        humidityMin: 80,
        tempMin: 25,
        tempMax: 34,
        stages: ['panicle', 'flowering', 'grainfill'],
        why: s(
          'Warm humid spells late in the Boro season let planthopper numbers explode within two weeks.',
          'বোরোর শেষ দিকে গরম-আর্দ্র আবহাওয়ায় দুই সপ্তাহেই গাছফড়িং অনেক বেড়ে যেতে পারে।'
        ),
        actions: [
          s(
            'Tap plant bases over the water at 10 spots and count what falls.',
            'জমির ১০ জায়গায় গাছের গোড়ায় টোকা দিয়ে পানিতে কত পোকা পড়ে গুনে দেখুন।'
          ),
          s(
            'Drain for a few days and keep alleys open so you can inspect the middle of the field.',
            'কয়েক দিন পানি সরিয়ে দিন এবং জমির মাঝে চলাচলের পথ রাখুন যাতে ভেতরটা দেখা যায়।'
          ),
        ],
      },
    ],
  },

  {
    id: 'rice_aus',
    group: 'rice',
    name: s('Rice — Aus', 'ধান — আউশ'),
    season: s('Aus (Mar–Jul)', 'আউশ (মার্চ–জুলাই)'),
    sowingMonths: [2, 3, 4],
    durationDays: 110,
    stages: [
      { id: 'establishment', name: s('Establishment', 'চারা প্রতিষ্ঠা'), from: 0, to: 18, actions: s('Ensure even germination; irrigate if pre-monsoon rain is late.', 'সমানভাবে চারা গজানো নিশ্চিত করুন; প্রাক-বর্ষার বৃষ্টি দেরি হলে সেচ দিন।') },
      { id: 'tillering', name: s('Tillering', 'কুশি গজানো'), from: 19, to: 48, actions: s('Weed early; Aus competes poorly with weeds.', 'আগেভাগে আগাছা দমন করুন; আউশ আগাছার সঙ্গে ভালো পারে না।') },
      { id: 'panicle', name: s('Panicle initiation', 'কাইচ থোড়'), from: 49, to: 72, actions: s('Watch for pre-monsoon dry spells and irrigate.', 'প্রাক-বর্ষার শুকনো সময়ে খেয়াল রেখে সেচ দিন।') },
      { id: 'flowering', name: s('Flowering', 'ফুল আসা'), from: 73, to: 88, actions: s('Peak heat risk period for Aus.', 'আউশে এই সময়ই গরমের ঝুঁকি সবচেয়ে বেশি।') },
      { id: 'maturity', name: s('Grain filling & harvest', 'দানা গঠন ও কাটা'), from: 89, to: 999, actions: s('Harvest before the main monsoon sets in.', 'পুরোদমে বর্ষা শুরুর আগেই কেটে ফেলুন।') },
    ],
    thresholds: {
      optimalTempMin: 24,
      optimalTempMax: 33,
      heatStressTemp: 36,
      heatCriticalTemp: 39,
      coldStressTemp: 16,
      heavyRainMm: 55,
      waterloggingMm: 110,
      windDamageKmh: 50,
      dryDayThreshold: 4,
    },
    sensitiveStages: {
      heat: ['flowering', 'panicle'],
      cold: [],
      flood: ['establishment', 'maturity'],
      wind: ['maturity'],
      water: ['panicle', 'flowering'],
    },
    diseases: [
      {
        id: 'bacterial_blight',
        name: s('Bacterial leaf blight', 'ব্যাকটেরিয়াল লিফ ব্লাইট'),
        humidityMin: 85,
        tempMin: 28,
        tempMax: 40,
        needsWindRain: true,
        stages: ['tillering', 'panicle'],
        why: s(
          'Pre-monsoon storms tear leaves and splash bacteria between plants in hot humid air.',
          'প্রাক-বর্ষার ঝড়ে পাতা ছিঁড়ে যায় এবং গরম-আর্দ্র আবহাওয়ায় ছিটকে পড়া পানির সঙ্গে জীবাণু ছড়ায়।'
        ),
        actions: [
          s('Look for yellow wavy streaks from leaf tips after a storm.', 'ঝড়ের পর পাতার আগা থেকে হলুদ ঢেউ খেলানো দাগ আছে কিনা দেখুন।'),
          s('Avoid nitrogen top-dressing until leaves dry out.', 'পাতা না শুকানো পর্যন্ত নাইট্রোজেন সার দেবেন না।'),
        ],
      },
    ],
    pests: [
      {
        id: 'stem_borer',
        name: s('Yellow stem borer', 'মাজরা পোকা'),
        humidityMin: 70,
        tempMin: 27,
        tempMax: 36,
        stages: ['tillering', 'panicle'],
        why: s(
          'Hot Aus weather shortens the borer life cycle, so damage builds quickly.',
          'আউশের গরম আবহাওয়ায় মাজরা পোকার জীবনচক্র ছোট হয়ে যায়, তাই ক্ষতি দ্রুত বাড়ে।'
        ),
        actions: [
          s('Check for dead hearts weekly and destroy egg masses.', 'সপ্তাহে একবার মরা কুশি দেখুন ও ডিমের গাদা নষ্ট করুন।'),
        ],
      },
    ],
  },

  // ---------------------------------------------------------------- POTATO
  {
    id: 'potato',
    group: 'tuber',
    name: s('Potato', 'আলু'),
    season: s('Rabi (Nov–Mar)', 'রবি (নভেম্বর–মার্চ)'),
    sowingMonths: [10, 11, 0],
    durationDays: 95,
    stages: [
      { id: 'sprouting', name: s('Sprouting', 'অঙ্কুরোদগম'), from: 0, to: 20, actions: s('Light irrigation only; waterlogging rots seed tubers.', 'শুধু হালকা সেচ দিন; পানি জমলে বীজ আলু পচে যায়।') },
      { id: 'vegetative', name: s('Vegetative growth', 'গাছ বাড়া'), from: 21, to: 45, actions: s('Earth up and apply the first split of top-dressing.', 'মাটি তুলে দিন এবং উপরি সারের প্রথম কিস্তি প্রয়োগ করুন।') },
      { id: 'tuber_init', name: s('Tuber initiation', 'আলু ধরা শুরু'), from: 46, to: 65, actions: s('Keep soil evenly moist — this decides tuber number.', 'মাটি সমানভাবে ভেজা রাখুন — এখানেই আলুর সংখ্যা ঠিক হয়।') },
      { id: 'bulking', name: s('Tuber bulking', 'আলু বড় হওয়া'), from: 66, to: 85, actions: s('Steady moisture; stop nitrogen.', 'নিয়মিত রস রাখুন; নাইট্রোজেন বন্ধ করুন।') },
      { id: 'maturity', name: s('Maturity & harvest', 'পাকা ও তোলা'), from: 86, to: 999, actions: s('Stop irrigation 10 days before lifting so skins set.', 'তোলার ১০ দিন আগে সেচ বন্ধ করুন যাতে খোসা শক্ত হয়।') },
    ],
    thresholds: {
      optimalTempMin: 15,
      optimalTempMax: 25,
      heatStressTemp: 30,
      heatCriticalTemp: 33,
      coldStressTemp: 5,
      heavyRainMm: 30,
      waterloggingMm: 60,
      windDamageKmh: 50,
      dryDayThreshold: 6,
    },
    sensitiveStages: {
      heat: ['tuber_init', 'bulking'],
      cold: ['sprouting', 'vegetative'],
      flood: ['sprouting', 'bulking', 'maturity'],
      wind: [],
      water: ['tuber_init', 'bulking'],
    },
    diseases: [
      {
        id: 'late_blight',
        name: s('Late blight', 'নাবি ধ্বসা'),
        humidityMin: 85,
        tempMin: 10,
        tempMax: 24,
        needsNightCooling: true,
        stages: ['vegetative', 'tuber_init', 'bulking'],
        priority: 'high',
        why: s(
          'Cool nights, fog and humidity above 85% are the exact conditions late blight needs. It can destroy a potato field within a week once it starts, which is why it is the single biggest risk in Bangladeshi potato.',
          'ঠান্ডা রাত, কুয়াশা আর ৮৫% এর বেশি আর্দ্রতা — নাবি ধ্বসার জন্য ঠিক এই আবহাওয়াই দরকার। একবার শুরু হলে এক সপ্তাহেই পুরো জমি নষ্ট করে দিতে পারে, তাই বাংলাদেশে আলুর সবচেয়ে বড় ঝুঁকি এটাই।'
        ),
        actions: [
          s(
            'Inspect the lower leaves today and tomorrow for water-soaked dark patches with a pale green edge, often with white growth underneath in the morning.',
            'আজ ও কালই নিচের পাতায় ফ্যাকাশে সবুজ কিনারাসহ ভেজা কালচে দাগ দেখুন; ভোরে দাগের নিচে সাদা ছত্রাক দেখা যেতে পারে।'
          ),
          s(
            'If the forecast holds, plan a protective spray schedule with your dealer or extension officer before symptoms appear — late blight is far cheaper to prevent than to cure.',
            'পূর্বাভাস এমন থাকলে লক্ষণ দেখা দেওয়ার আগেই ডিলার বা কৃষি অফিসারের সঙ্গে প্রতিরোধমূলক স্প্রের পরিকল্পনা করুন — নাবি ধ্বসা সারানোর চেয়ে ঠেকানো অনেক সস্তা।'
          ),
          s(
            'Remove and bury any infected plants rather than leaving them at the field edge.',
            'আক্রান্ত গাছ তুলে জমির পাশে ফেলে না রেখে মাটিতে পুঁতে দিন।'
          ),
          s(
            'Do not irrigate in the evening; leaves that stay wet overnight spread the disease.',
            'সন্ধ্যায় সেচ দেবেন না; রাতভর ভেজা পাতা রোগ ছড়ায়।'
          ),
        ],
      },
      {
        id: 'early_blight',
        name: s('Early blight', 'আগাম ধ্বসা'),
        humidityMin: 80,
        tempMin: 24,
        tempMax: 30,
        stages: ['vegetative', 'bulking'],
        why: s(
          'Warm days with heavy dew favour early blight, which starts on older leaves and reduces tuber size.',
          'গরম দিন আর ভারী শিশিরে আগাম ধ্বসা বাড়ে; পুরোনো পাতা থেকে শুরু হয়ে আলুর আকার ছোট করে দেয়।'
        ),
        actions: [
          s('Look for brown spots with concentric rings on older leaves.', 'পুরোনো পাতায় গোল গোল বলয়সহ বাদামী দাগ খুঁজে দেখুন।'),
          s('Keep potassium adequate; weak plants are hit hardest.', 'পটাশ সার পর্যাপ্ত রাখুন; দুর্বল গাছেই ক্ষতি বেশি হয়।'),
        ],
      },
    ],
    pests: [
      {
        id: 'aphid',
        name: s('Aphids', 'জাব পোকা'),
        humidityMin: 60,
        tempMin: 18,
        tempMax: 28,
        stages: ['vegetative', 'tuber_init'],
        why: s(
          'Dry, mild weather suits aphids, and they carry potato virus into the crop — a serious problem if you plan to keep seed tubers.',
          'শুকনো ও মাঝারি গরম আবহাওয়ায় জাব পোকা বাড়ে এবং এরা আলুর ভাইরাস ছড়ায় — বীজ আলু রাখতে চাইলে এটি বড় সমস্যা।'
        ),
        actions: [
          s('Turn over young leaves and check for clusters of small green insects.', 'কচি পাতা উল্টে ছোট সবুজ পোকার দল আছে কিনা দেখুন।'),
          s('Use yellow sticky traps at field edges to track numbers.', 'পোকার সংখ্যা বুঝতে জমির কিনারায় হলুদ আঠালো ফাঁদ দিন।'),
        ],
      },
    ],
  },

  // ----------------------------------------------------------------- MAIZE
  {
    id: 'maize',
    group: 'cereal',
    name: s('Maize', 'ভুট্টা'),
    season: s('Rabi & Kharif', 'রবি ও খরিফ'),
    sowingMonths: [10, 11, 0, 1, 5, 6],
    durationDays: 130,
    stages: [
      { id: 'emergence', name: s('Emergence', 'চারা গজানো'), from: 0, to: 15, actions: s('Ensure a firm, moist seedbed; thin to one healthy plant per hill.', 'বীজতলা সমান ও রসালো রাখুন; প্রতি গর্তে একটি সবল গাছ রাখুন।') },
      { id: 'vegetative', name: s('Vegetative (knee-high)', 'গাছ বাড়া'), from: 16, to: 45, actions: s('First urea split and earthing up.', 'ইউরিয়ার প্রথম কিস্তি ও মাটি তুলে দেওয়া।') },
      { id: 'tasseling', name: s('Tasseling & silking', 'মোচা ও সিল্ক আসা'), from: 46, to: 75, actions: s('The most water-sensitive stage — a dry week here cuts yield sharply.', 'পানির জন্য সবচেয়ে সংবেদনশীল ধাপ — এই সময় এক সপ্তাহ শুকনো গেলে ফলন অনেক কমে।') },
      { id: 'grainfill', name: s('Grain filling', 'দানা গঠন'), from: 76, to: 110, actions: s('Keep irrigation regular; support lodged plants after storms.', 'নিয়মিত সেচ দিন; ঝড়ের পর নুয়ে পড়া গাছ ঠিক করে দিন।') },
      { id: 'maturity', name: s('Maturity & harvest', 'পাকা ও কাটা'), from: 111, to: 999, actions: s('Harvest when the husk dries and grain shows a black layer.', 'খোসা শুকিয়ে গেলে ও দানায় কালো স্তর দেখা দিলে কাটুন।') },
    ],
    thresholds: {
      optimalTempMin: 18,
      optimalTempMax: 32,
      heatStressTemp: 35,
      heatCriticalTemp: 38,
      coldStressTemp: 10,
      heavyRainMm: 50,
      waterloggingMm: 80,
      windDamageKmh: 40,
      dryDayThreshold: 5,
    },
    sensitiveStages: {
      heat: ['tasseling'],
      cold: ['emergence'],
      flood: ['emergence', 'vegetative'],
      wind: ['tasseling', 'grainfill', 'maturity'],
      water: ['tasseling', 'grainfill'],
    },
    diseases: [
      {
        id: 'leaf_blight_maize',
        name: s('Northern leaf blight', 'পাতা ঝলসানো রোগ'),
        humidityMin: 85,
        tempMin: 20,
        tempMax: 28,
        stages: ['vegetative', 'tasseling'],
        why: s(
          'Long leaf-wetness periods at mild temperatures let blight lesions expand and cut the leaf area feeding the cob.',
          'মাঝারি তাপমাত্রায় পাতা দীর্ঘ সময় ভেজা থাকলে দাগ বড় হয় এবং মোচায় খাদ্য জোগানো পাতার পরিমাণ কমে যায়।'
        ),
        actions: [
          s('Check middle leaves for long grey-green cigar-shaped lesions.', 'মাঝের পাতায় লম্বা ধূসর-সবুজ সিগার আকৃতির দাগ আছে কিনা দেখুন।'),
        ],
      },
    ],
    pests: [
      {
        id: 'faw',
        name: s('Fall armyworm', 'ফল আর্মিওয়ার্ম'),
        humidityMin: 60,
        tempMin: 24,
        tempMax: 35,
        stages: ['emergence', 'vegetative', 'tasseling'],
        priority: 'high',
        why: s(
          'Warm weather lets fall armyworm complete a generation in about a month. Larvae eat the growing whorl, and young maize can be set back badly within days.',
          'গরম আবহাওয়ায় ফল আর্মিওয়ার্ম প্রায় এক মাসেই এক প্রজন্ম শেষ করে। কীড়া গাছের মাঝের কচি অংশ খেয়ে ফেলে, ফলে কয়েক দিনেই কচি ভুট্টার বড় ক্ষতি হতে পারে।'
        ),
        actions: [
          s(
            'Scout 20 plants across the field for ragged holes and moist sawdust-like droppings in the whorl.',
            'জমির ২০টি গাছে কাটা-ছেঁড়া ছিদ্র এবং মাঝের অংশে ভেজা কাঠের গুঁড়ার মতো বিষ্ঠা আছে কিনা দেখুন।'
          ),
          s(
            'Hand-pick larvae early in the morning — for small fields this alone often keeps damage down.',
            'ভোরে হাতে কীড়া বেছে নিন — ছোট জমিতে অনেক সময় এতেই ক্ষতি নিয়ন্ত্রণে থাকে।'
          ),
          s(
            'Set pheromone traps to know when moth flights start, instead of spraying on a calendar.',
            'ক্যালেন্ডার দেখে স্প্রে না করে ফেরোমন ফাঁদ দিয়ে বুঝুন কখন মথ আসা শুরু হয়েছে।'
          ),
        ],
      },
    ],
  },

  // ----------------------------------------------------------------- WHEAT
  {
    id: 'wheat',
    group: 'cereal',
    name: s('Wheat', 'গম'),
    season: s('Rabi (Nov–Mar)', 'রবি (নভেম্বর–মার্চ)'),
    sowingMonths: [10, 11],
    durationDays: 110,
    stages: [
      { id: 'emergence', name: s('Emergence', 'চারা গজানো'), from: 0, to: 18, actions: s('Timely sowing matters more than anything else for wheat in Bangladesh.', 'বাংলাদেশে গমের জন্য সময়মতো বপনই সবচেয়ে গুরুত্বপূর্ণ।') },
      { id: 'crown_root', name: s('Crown root initiation', 'শিকড় গজানো'), from: 19, to: 30, actions: s('First irrigation at 17–21 days is critical.', '১৭–২১ দিনে প্রথম সেচ খুবই জরুরি।') },
      { id: 'tillering', name: s('Tillering', 'কুশি গজানো'), from: 31, to: 55, actions: s('Second irrigation and top-dressing.', 'দ্বিতীয় সেচ ও উপরি সার প্রয়োগ।') },
      { id: 'heading', name: s('Heading & flowering', 'শীষ ও ফুল আসা'), from: 56, to: 80, actions: s('Heat here causes shrivelled grain.', 'এই সময় গরম হলে দানা চিমসে হয়ে যায়।') },
      { id: 'grainfill', name: s('Grain filling & maturity', 'দানা গঠন ও পাকা'), from: 81, to: 999, actions: s('Late-season heat shortens filling — harvest promptly when ripe.', 'শেষ দিকে গরম পড়লে দানা গঠনের সময় কমে যায় — পাকলেই দ্রুত কাটুন।') },
    ],
    thresholds: {
      optimalTempMin: 15,
      optimalTempMax: 25,
      heatStressTemp: 30,
      heatCriticalTemp: 33,
      coldStressTemp: 4,
      heavyRainMm: 30,
      waterloggingMm: 55,
      windDamageKmh: 45,
      dryDayThreshold: 8,
    },
    sensitiveStages: {
      heat: ['heading', 'grainfill'],
      cold: [],
      flood: ['emergence', 'crown_root'],
      wind: ['grainfill'],
      water: ['crown_root', 'heading'],
    },
    diseases: [
      {
        id: 'blast_wheat',
        name: s('Wheat blast', 'গমের ব্লাস্ট'),
        humidityMin: 85,
        tempMin: 25,
        tempMax: 32,
        needsWindRain: true,
        stages: ['heading'],
        priority: 'high',
        why: s(
          'Warm humid weather with rain during heading is the window when wheat blast attacks the spike. Bangladesh has had confirmed outbreaks, and an infected spike turns white and produces no grain.',
          'শীষ আসার সময় গরম-আর্দ্র আবহাওয়ার সঙ্গে বৃষ্টি হলে গমের ব্লাস্ট শীষে আক্রমণ করে। বাংলাদেশে এর প্রাদুর্ভাব হয়েছে; আক্রান্ত শীষ সাদা হয়ে যায় এবং দানা হয় না।'
        ),
        actions: [
          s(
            'Walk the field daily during heading and look for spikes that have turned white while the stem is still green.',
            'শীষ আসার সময় প্রতিদিন জমি দেখুন — কাণ্ড সবুজ থাকতেই কোনো শীষ সাদা হয়ে গেছে কিনা লক্ষ্য করুন।'
          ),
          s(
            'Report any suspected case to your Upazila Agriculture Office immediately; wheat blast is a reportable outbreak risk, not an ordinary field problem.',
            'সন্দেহ হলে সঙ্গে সঙ্গে উপজেলা কৃষি অফিসে জানান; গমের ব্লাস্ট সাধারণ সমস্যা নয়, এটি প্রাদুর্ভাবের ঝুঁকি হিসেবে জানানো জরুরি।'
          ),
        ],
      },
      {
        id: 'rust',
        name: s('Leaf rust', 'পাতার মরিচা'),
        humidityMin: 80,
        tempMin: 15,
        tempMax: 25,
        stages: ['tillering', 'heading'],
        why: s(
          'Cool humid conditions with dew let rust pustules multiply and drain the leaf before grain fills.',
          'ঠান্ডা-আর্দ্র আবহাওয়া ও শিশিরে মরিচার গুটি বাড়ে এবং দানা গঠনের আগেই পাতা দুর্বল করে দেয়।'
        ),
        actions: [
          s('Look for orange-brown powdery pustules that rub off on your finger.', 'কমলা-বাদামী গুঁড়ো গুটি আঙুলে লেগে যায় কিনা দেখুন।'),
        ],
      },
    ],
    pests: [
      {
        id: 'aphid_wheat',
        name: s('Wheat aphid', 'গমের জাব পোকা'),
        humidityMin: 55,
        tempMin: 15,
        tempMax: 27,
        stages: ['heading', 'grainfill'],
        why: s(
          'Mild dry spells at heading let aphid colonies build on the spike and suck out developing grain.',
          'শীষ আসার সময় মাঝারি শুকনো আবহাওয়ায় শীষে জাব পোকার দল জমে এবং গঠনরত দানার রস চুষে নেয়।'
        ),
        actions: [
          s('Check 10 spikes; treat only if most spikes carry colonies.', '১০টি শীষ দেখুন; বেশিরভাগ শীষে পোকার দল থাকলে তবেই ব্যবস্থা নিন।'),
        ],
      },
    ],
  },

  // ------------------------------------------------------------------ JUTE
  {
    id: 'jute',
    group: 'fibre',
    name: s('Jute', 'পাট'),
    season: s('Kharif-1 (Mar–Aug)', 'খরিফ-১ (মার্চ–আগস্ট)'),
    sowingMonths: [2, 3, 4],
    durationDays: 120,
    stages: [
      { id: 'emergence', name: s('Emergence', 'চারা গজানো'), from: 0, to: 20, actions: s('Thin to proper spacing by day 20; jute suffers badly from crowding.', '২০ দিনের মধ্যে ঘন চারা পাতলা করুন; ঘন থাকলে পাটের ক্ষতি হয়।') },
      { id: 'vegetative', name: s('Stem elongation', 'গাছ লম্বা হওয়া'), from: 21, to: 70, actions: s('Weed twice; this stage decides fibre length.', 'দুইবার আগাছা দমন করুন; এই ধাপেই আঁশের দৈর্ঘ্য ঠিক হয়।') },
      { id: 'mature', name: s('Maturity & cutting', 'পাকা ও কাটা'), from: 71, to: 999, actions: s('Cut at small-pod stage for the best fibre; arrange retting water in advance.', 'সবচেয়ে ভালো আঁশের জন্য ছোট ফল আসার সময় কাটুন; জাগ দেওয়ার পানি আগেই ঠিক করে রাখুন।') },
    ],
    thresholds: {
      optimalTempMin: 24,
      optimalTempMax: 35,
      heatStressTemp: 38,
      heatCriticalTemp: 41,
      coldStressTemp: 15,
      heavyRainMm: 60,
      waterloggingMm: 140,
      windDamageKmh: 55,
      dryDayThreshold: 7,
    },
    sensitiveStages: {
      heat: [],
      cold: ['emergence'],
      flood: ['emergence'],
      wind: ['vegetative', 'mature'],
      water: ['vegetative'],
    },
    diseases: [
      {
        id: 'stem_rot_jute',
        name: s('Stem rot', 'কাণ্ড পচা রোগ'),
        humidityMin: 88,
        tempMin: 25,
        tempMax: 35,
        stages: ['vegetative'],
        why: s(
          'Continuous humidity with waterlogged patches lets stem rot girdle the stem, and affected plants snap in wind.',
          'টানা আর্দ্রতা ও জমে থাকা পানিতে কাণ্ড পচা রোগ গাছের কাণ্ড ঘিরে ফেলে; আক্রান্ত গাছ বাতাসে ভেঙে পড়ে।'
        ),
        actions: [
          s('Clear drainage channels so water does not stand between rows.', 'নালা পরিষ্কার রাখুন যাতে সারির মাঝে পানি না জমে।'),
          s('Pull out and remove plants with dark sunken patches at the base.', 'গোড়ায় কালচে দেবে যাওয়া দাগসহ গাছ তুলে সরিয়ে ফেলুন।'),
        ],
      },
    ],
    pests: [
      {
        id: 'jute_mite',
        name: s('Yellow mite', 'হলুদ মাকড়'),
        humidityMin: 40,
        humidityMax: 70,
        tempMin: 28,
        tempMax: 38,
        stages: ['vegetative'],
        why: s(
          'Hot dry spells favour yellow mite, which curls the top leaves and stunts the stem — directly costing fibre length.',
          'গরম ও শুকনো আবহাওয়ায় হলুদ মাকড় বাড়ে; এটি উপরের পাতা কুঁকড়ে দেয় ও গাছ খাটো করে ফেলে, ফলে আঁশ ছোট হয়।'
        ),
        actions: [
          s('Look at the top 3 leaves for downward curling and a bronze underside.', 'উপরের ৩টি পাতা নিচের দিকে কুঁকড়ে গেছে ও নিচের পিঠ তামাটে হয়েছে কিনা দেখুন।'),
        ],
      },
    ],
  },

  // -------------------------------------------------------------- TOMATO
  {
    id: 'tomato',
    group: 'vegetable',
    name: s('Tomato', 'টমেটো'),
    season: s('Rabi (Oct–Mar)', 'রবি (অক্টোবর–মার্চ)'),
    sowingMonths: [9, 10, 11],
    durationDays: 110,
    stages: [
      { id: 'establishment', name: s('Transplanting', 'চারা রোপণ'), from: 0, to: 15, actions: s('Shade new transplants for 2–3 days; water lightly.', 'নতুন চারায় ২–৩ দিন ছায়া দিন; হালকা পানি দিন।') },
      { id: 'vegetative', name: s('Vegetative growth', 'গাছ বাড়া'), from: 16, to: 40, actions: s('Stake plants early and prune lower leaves for airflow.', 'আগেভাগে খুঁটি দিন এবং নিচের পাতা ছেঁটে বাতাস চলাচলের সুযোগ দিন।') },
      { id: 'flowering', name: s('Flowering & fruit set', 'ফুল ও ফল ধরা'), from: 41, to: 70, actions: s('Night temperature decides fruit set — very hot or very cold nights cause flower drop.', 'রাতের তাপমাত্রাই ফল ধরা ঠিক করে — খুব গরম বা খুব ঠান্ডা রাতে ফুল ঝরে যায়।') },
      { id: 'fruiting', name: s('Fruit development & harvest', 'ফল বড় হওয়া ও তোলা'), from: 71, to: 999, actions: s('Even moisture prevents fruit cracking and blossom-end rot.', 'সমান রস থাকলে ফল ফাটে না এবং গোড়া পচা হয় না।') },
    ],
    thresholds: {
      optimalTempMin: 18,
      optimalTempMax: 29,
      heatStressTemp: 33,
      heatCriticalTemp: 36,
      coldStressTemp: 8,
      heavyRainMm: 30,
      waterloggingMm: 50,
      windDamageKmh: 45,
      dryDayThreshold: 4,
    },
    sensitiveStages: {
      heat: ['flowering', 'fruiting'],
      cold: ['flowering'],
      flood: ['establishment', 'fruiting'],
      wind: ['vegetative', 'fruiting'],
      water: ['flowering', 'fruiting'],
    },
    diseases: [
      {
        id: 'late_blight_tomato',
        name: s('Late blight', 'নাবি ধ্বসা'),
        humidityMin: 85,
        tempMin: 12,
        tempMax: 24,
        needsNightCooling: true,
        stages: ['vegetative', 'flowering', 'fruiting'],
        priority: 'high',
        why: s(
          'The same pathogen as potato late blight. Cool foggy nights above 85% humidity can take out a tomato plot in under a week.',
          'আলুর নাবি ধ্বসার মতোই একই জীবাণু। ঠান্ডা কুয়াশাচ্ছন্ন রাত ও ৮৫% এর বেশি আর্দ্রতায় এক সপ্তাহের কমেই টমেটোর জমি নষ্ট হয়ে যেতে পারে।'
        ),
        actions: [
          s('Check lower leaves and stems for dark water-soaked patches this morning.', 'আজ সকালেই নিচের পাতা ও কাণ্ডে ভেজা কালচে দাগ আছে কিনা দেখুন।'),
          s('Remove affected leaves and keep the canopy open by pruning and staking.', 'আক্রান্ত পাতা তুলে ফেলুন এবং ডাল ছেঁটে ও খুঁটি দিয়ে গাছ ফাঁকা রাখুন।'),
          s('Water at the base in the morning, never overhead in the evening.', 'সকালে গোড়ায় পানি দিন, সন্ধ্যায় উপর থেকে কখনোই নয়।'),
        ],
      },
      {
        id: 'leaf_curl_virus',
        name: s('Leaf curl virus (whitefly-borne)', 'পাতা কোঁকড়ানো ভাইরাস (সাদা মাছি বাহিত)'),
        humidityMin: 40,
        tempMin: 25,
        tempMax: 35,
        stages: ['vegetative', 'flowering'],
        why: s(
          'Warm dry weather multiplies whiteflies, and they carry leaf curl virus. There is no cure once a plant is infected, so controlling the whitefly is the whole battle.',
          'গরম ও শুকনো আবহাওয়ায় সাদা মাছি বাড়ে এবং এরাই পাতা কোঁকড়ানো ভাইরাস ছড়ায়। একবার গাছ আক্রান্ত হলে সারানোর উপায় নেই, তাই সাদা মাছি ঠেকানোই মূল কাজ।'
        ),
        actions: [
          s('Shake plants and watch for tiny white insects flying up from the underside of leaves.', 'গাছ নাড়িয়ে দেখুন পাতার নিচ থেকে ছোট সাদা পোকা উড়ছে কিনা।'),
          s('Put up yellow sticky traps and pull out badly curled plants so they stop being a virus source.', 'হলুদ আঠালো ফাঁদ দিন এবং বেশি কোঁকড়ানো গাছ তুলে ফেলুন যাতে ভাইরাস আর না ছড়ায়।'),
        ],
      },
    ],
    pests: [
      {
        id: 'fruit_borer',
        name: s('Fruit borer', 'ফল ছিদ্রকারী পোকা'),
        humidityMin: 60,
        tempMin: 22,
        tempMax: 32,
        stages: ['flowering', 'fruiting'],
        why: s(
          'Mild humid weather at fruiting suits the borer moth. Each larva can damage several fruits, and damage is invisible until you cut the fruit open.',
          'ফল ধরার সময় মাঝারি আর্দ্র আবহাওয়া এই পোকার জন্য উপযোগী। একটি কীড়াই কয়েকটি ফল নষ্ট করে, আর ফল কাটার আগে ক্ষতি চোখে পড়ে না।'
        ),
        actions: [
          s('Collect and destroy fruits with entry holes twice a week.', 'সপ্তাহে দুইবার ছিদ্রযুক্ত ফল সংগ্রহ করে নষ্ট করুন।'),
          s('Install pheromone traps at about 10 per bigha to track moth activity.', 'মথের গতিবিধি বুঝতে বিঘাপ্রতি প্রায় ১০টি ফেরোমন ফাঁদ দিন।'),
        ],
      },
    ],
  },

  // -------------------------------------------------------------- BRINJAL
  {
    id: 'brinjal',
    group: 'vegetable',
    name: s('Brinjal (Eggplant)', 'বেগুন'),
    season: s('Year-round', 'সারা বছর'),
    sowingMonths: [0, 1, 2, 5, 6, 8, 9, 10],
    durationDays: 150,
    stages: [
      { id: 'establishment', name: s('Transplanting', 'চারা রোপণ'), from: 0, to: 20, actions: s('Use healthy pest-free seedlings; water lightly.', 'রোগমুক্ত সবল চারা লাগান; হালকা পানি দিন।') },
      { id: 'vegetative', name: s('Vegetative growth', 'গাছ বাড়া'), from: 21, to: 55, actions: s('Earth up and remove suckers below the first branch.', 'মাটি তুলে দিন এবং প্রথম ডালের নিচের কুশি ছেঁটে ফেলুন।') },
      { id: 'flowering', name: s('Flowering & fruiting', 'ফুল ও ফল ধরা'), from: 56, to: 999, actions: s('Harvest every 3–4 days; overripe fruit invites borers.', 'প্রতি ৩–৪ দিনে ফল তুলুন; বেশি পাকা ফলে ছিদ্রকারী পোকা আসে।') },
    ],
    thresholds: {
      optimalTempMin: 20,
      optimalTempMax: 32,
      heatStressTemp: 36,
      heatCriticalTemp: 39,
      coldStressTemp: 10,
      heavyRainMm: 40,
      waterloggingMm: 60,
      windDamageKmh: 50,
      dryDayThreshold: 5,
    },
    sensitiveStages: {
      heat: ['flowering'],
      cold: ['establishment'],
      flood: ['establishment', 'vegetative'],
      wind: ['flowering'],
      water: ['flowering'],
    },
    diseases: [
      {
        id: 'bacterial_wilt',
        name: s('Bacterial wilt', 'ব্যাকটেরিয়াজনিত ঢলে পড়া'),
        humidityMin: 80,
        tempMin: 28,
        tempMax: 38,
        stages: ['vegetative', 'flowering'],
        why: s(
          'Hot, wet soil is exactly what bacterial wilt needs. Plants collapse suddenly while still green, and the bacteria stay in the soil for years.',
          'গরম ও ভেজা মাটিই ব্যাকটেরিয়াজনিত ঢলে পড়া রোগের জন্য উপযোগী। গাছ সবুজ থাকতেই হঠাৎ ঢলে পড়ে এবং জীবাণু বছরের পর বছর মাটিতে থেকে যায়।'
        ),
        actions: [
          s('Uproot wilted plants with the soil ball and remove them from the field.', 'ঢলে পড়া গাছ মাটিসহ তুলে জমি থেকে সরিয়ে ফেলুন।'),
          s('Improve drainage and avoid moving irrigation water from an affected plot to a healthy one.', 'পানি নিষ্কাশন ভালো করুন এবং আক্রান্ত জমির সেচের পানি সুস্থ জমিতে নেবেন না।'),
        ],
      },
    ],
    pests: [
      {
        id: 'bsfb',
        name: s('Brinjal shoot & fruit borer', 'বেগুনের ডগা ও ফল ছিদ্রকারী পোকা'),
        humidityMin: 65,
        tempMin: 24,
        tempMax: 34,
        stages: ['vegetative', 'flowering'],
        priority: 'high',
        why: s(
          'This is the main reason brinjal growers over-spray. Warm humid weather keeps generations overlapping, and larvae bore into shoots and fruit where sprays cannot reach them.',
          'বেগুন চাষিরা যে কারণে সবচেয়ে বেশি স্প্রে করেন, এটিই সেই পোকা। গরম-আর্দ্র আবহাওয়ায় একের পর এক প্রজন্ম আসতে থাকে; কীড়া ডগা ও ফলের ভেতর ঢুকে যায় বলে স্প্রে সেখানে পৌঁছায় না।'
        ),
        actions: [
          s('Cut off drooping shoot tips below the damage and destroy them — do this twice a week.', 'ঝুলে পড়া ডগা ক্ষতির নিচ থেকে কেটে নষ্ট করুন — সপ্তাহে দুইবার করুন।'),
          s('Use pheromone traps and remove bored fruit at every picking, rather than spraying on a fixed schedule.', 'নির্দিষ্ট সময় ধরে স্প্রে না করে ফেরোমন ফাঁদ ব্যবহার করুন এবং প্রতিবার ফল তোলার সময় ছিদ্রযুক্ত ফল সরিয়ে ফেলুন।'),
        ],
      },
    ],
  },

  // ----------------------------------------------------------------- ONION
  {
    id: 'onion',
    group: 'vegetable',
    name: s('Onion', 'পেঁয়াজ'),
    season: s('Rabi (Nov–Mar)', 'রবি (নভেম্বর–মার্চ)'),
    sowingMonths: [10, 11],
    durationDays: 110,
    stages: [
      { id: 'establishment', name: s('Transplanting', 'চারা রোপণ'), from: 0, to: 20, actions: s('Keep beds moist but never waterlogged.', 'বেড রসালো রাখুন, কিন্তু পানি জমতে দেবেন না।') },
      { id: 'vegetative', name: s('Leaf growth', 'পাতা বাড়া'), from: 21, to: 55, actions: s('Weed carefully; onion roots are shallow.', 'সাবধানে আগাছা দমন করুন; পেঁয়াজের শিকড় মাটির উপরের দিকে থাকে।') },
      { id: 'bulbing', name: s('Bulb formation', 'কন্দ গঠন'), from: 56, to: 90, actions: s('Steady moisture now decides bulb size.', 'এখন সমান রস থাকলে কন্দ বড় হয়।') },
      { id: 'maturity', name: s('Maturity & curing', 'পাকা ও শুকানো'), from: 91, to: 999, actions: s('Stop irrigation when tops fall; cure in shade before storing.', 'পাতা নুয়ে পড়লে সেচ বন্ধ করুন; সংরক্ষণের আগে ছায়ায় শুকান।') },
    ],
    thresholds: {
      optimalTempMin: 15,
      optimalTempMax: 28,
      heatStressTemp: 33,
      heatCriticalTemp: 36,
      coldStressTemp: 7,
      heavyRainMm: 25,
      waterloggingMm: 45,
      windDamageKmh: 50,
      dryDayThreshold: 5,
    },
    sensitiveStages: {
      heat: ['bulbing'],
      cold: [],
      flood: ['bulbing', 'maturity'],
      wind: [],
      water: ['bulbing'],
    },
    diseases: [
      {
        id: 'purple_blotch',
        name: s('Purple blotch', 'বেগুনি দাগ রোগ'),
        humidityMin: 85,
        tempMin: 21,
        tempMax: 30,
        stages: ['vegetative', 'bulbing'],
        why: s(
          'Long dew periods with warm days let purple blotch spread down the leaves, and bulbs stop sizing once the leaves die back.',
          'দীর্ঘ শিশির আর গরম দিনে বেগুনি দাগ রোগ পাতায় ছড়িয়ে পড়ে; পাতা মরে গেলে কন্দ আর বড় হয় না।'
        ),
        actions: [
          s('Look for small white specks that grow into purple-brown zoned patches.', 'ছোট সাদা ফোঁটা থেকে বেগুনি-বাদামী বলয়যুক্ত দাগ হচ্ছে কিনা দেখুন।'),
          s('Avoid evening irrigation so leaves are dry overnight.', 'সন্ধ্যায় সেচ দেবেন না যাতে রাতে পাতা শুকনো থাকে।'),
        ],
      },
    ],
    pests: [
      {
        id: 'thrips',
        name: s('Onion thrips', 'পেঁয়াজের থ্রিপস'),
        humidityMin: 30,
        humidityMax: 70,
        tempMin: 25,
        tempMax: 35,
        stages: ['vegetative', 'bulbing'],
        why: s(
          'Hot dry weather is thrips weather. They rasp the leaves silver-white, and heavy feeding at bulbing directly shrinks the bulb.',
          'গরম ও শুকনো আবহাওয়াতেই থ্রিপস বাড়ে। এরা পাতা ঘষে রুপালি-সাদা করে ফেলে; কন্দ গঠনের সময় বেশি আক্রমণ হলে কন্দ ছোট থাকে।'
        ),
        actions: [
          s('Check inside the leaf sheath for tiny slender insects; silver streaking is the first sign.', 'পাতার খোলের ভেতরে ছোট সরু পোকা দেখুন; রুপালি দাগই প্রথম লক্ষণ।'),
          s('Irrigate to break the dry spell — thrips numbers drop after rain or sprinkler irrigation.', 'শুকনো ভাব কাটাতে সেচ দিন — বৃষ্টি বা স্প্রিংকলার সেচের পর থ্রিপস কমে।'),
        ],
      },
    ],
  },

  // ---------------------------------------------------------------- LENTIL
  {
    id: 'lentil',
    group: 'pulse',
    name: s('Lentil (Masur)', 'মসুর ডাল'),
    season: s('Rabi (Nov–Mar)', 'রবি (নভেম্বর–মার্চ)'),
    sowingMonths: [10, 11],
    durationDays: 105,
    stages: [
      { id: 'emergence', name: s('Emergence', 'চারা গজানো'), from: 0, to: 20, actions: s('Lentil needs a well-drained seedbed; excess moisture kills seedlings.', 'মসুরের জন্য পানি নিষ্কাশনযুক্ত জমি দরকার; বেশি রসে চারা মরে যায়।') },
      { id: 'vegetative', name: s('Vegetative growth', 'গাছ বাড়া'), from: 21, to: 50, actions: s('One weeding at 25–30 days is usually enough.', '২৫–৩০ দিনে একবার আগাছা দমন সাধারণত যথেষ্ট।') },
      { id: 'flowering', name: s('Flowering & podding', 'ফুল ও ফল ধরা'), from: 51, to: 85, actions: s('A single light irrigation here can lift yield noticeably.', 'এই সময় একবার হালকা সেচ দিলেই ফলন ভালো বাড়ে।') },
      { id: 'maturity', name: s('Maturity & harvest', 'পাকা ও কাটা'), from: 86, to: 999, actions: s('Harvest when most pods turn brown; delay causes shattering.', 'বেশিরভাগ ফল বাদামী হলে কাটুন; দেরি হলে দানা ঝরে যায়।') },
    ],
    thresholds: {
      optimalTempMin: 15,
      optimalTempMax: 27,
      heatStressTemp: 32,
      heatCriticalTemp: 35,
      coldStressTemp: 5,
      heavyRainMm: 25,
      waterloggingMm: 40,
      windDamageKmh: 50,
      dryDayThreshold: 10,
    },
    sensitiveStages: {
      heat: ['flowering'],
      cold: [],
      flood: ['emergence', 'flowering', 'maturity'],
      wind: [],
      water: ['flowering'],
    },
    diseases: [
      {
        id: 'stemphylium',
        name: s('Stemphylium blight', 'স্টেমফাইলিয়াম ব্লাইট'),
        humidityMin: 85,
        tempMin: 18,
        tempMax: 28,
        stages: ['vegetative', 'flowering'],
        priority: 'high',
        why: s(
          'This is the biggest lentil disease in Bangladesh. Warm humid weather at flowering strips the leaves within days and pods fail to fill.',
          'বাংলাদেশে মসুরের সবচেয়ে বড় রোগ এটি। ফুল আসার সময় গরম-আর্দ্র আবহাওয়ায় কয়েক দিনেই পাতা ঝরে যায় এবং ফলে দানা হয় না।'
        ),
        actions: [
          s('Check for light brown spots on upper leaves that quickly join together.', 'উপরের পাতায় হালকা বাদামী দাগ দ্রুত মিলে যাচ্ছে কিনা দেখুন।'),
          s('Do not irrigate into a humid spell; standing moisture accelerates the blight.', 'আর্দ্র আবহাওয়ায় সেচ দেবেন না; জমে থাকা রস রোগ দ্রুত বাড়ায়।'),
        ],
      },
    ],
    pests: [
      {
        id: 'pod_borer_lentil',
        name: s('Pod borer', 'ফল ছিদ্রকারী পোকা'),
        humidityMin: 55,
        tempMin: 20,
        tempMax: 30,
        stages: ['flowering'],
        why: s(
          'Warm settled weather at podding brings borer moths, and larvae feed inside pods where they are hard to spot.',
          'ফল ধরার সময় স্থির গরম আবহাওয়ায় ছিদ্রকারী মথ আসে; কীড়া ফলের ভেতরে খায় বলে সহজে চোখে পড়ে না।'
        ),
        actions: [
          s('Open 10 pods from different plants and check for larvae.', 'বিভিন্ন গাছ থেকে ১০টি ফল খুলে ভেতরে কীড়া আছে কিনা দেখুন।'),
        ],
      },
    ],
  },

  // --------------------------------------------------------------- MUSTARD
  {
    id: 'mustard',
    group: 'oilseed',
    name: s('Mustard', 'সরিষা'),
    season: s('Rabi (Oct–Feb)', 'রবি (অক্টোবর–ফেব্রুয়ারি)'),
    sowingMonths: [9, 10, 11],
    durationDays: 90,
    stages: [
      { id: 'emergence', name: s('Emergence', 'চারা গজানো'), from: 0, to: 15, actions: s('Thin crowded seedlings by day 15.', '১৫ দিনের মধ্যে ঘন চারা পাতলা করুন।') },
      { id: 'vegetative', name: s('Rosette & branching', 'গাছ বাড়া ও ডাল ছাড়া'), from: 16, to: 40, actions: s('First irrigation at 25–30 days.', '২৫–৩০ দিনে প্রথম সেচ দিন।') },
      { id: 'flowering', name: s('Flowering', 'ফুল আসা'), from: 41, to: 65, actions: s('Do not spray insecticide while bees are working the flowers.', 'ফুলে মৌমাছি কাজ করার সময় কীটনাশক স্প্রে করবেন না।') },
      { id: 'siliqua', name: s('Pod filling & maturity', 'ফল গঠন ও পাকা'), from: 66, to: 999, actions: s('Harvest when pods turn yellow-brown to avoid shattering.', 'ফল হলদে-বাদামী হলে কাটুন যাতে দানা ঝরে না যায়।') },
    ],
    thresholds: {
      optimalTempMin: 15,
      optimalTempMax: 27,
      heatStressTemp: 32,
      heatCriticalTemp: 35,
      coldStressTemp: 5,
      heavyRainMm: 25,
      waterloggingMm: 40,
      windDamageKmh: 45,
      dryDayThreshold: 9,
    },
    sensitiveStages: {
      heat: ['flowering', 'siliqua'],
      cold: [],
      flood: ['emergence', 'flowering'],
      wind: ['siliqua'],
      water: ['flowering'],
    },
    diseases: [
      {
        id: 'alternaria_mustard',
        name: s('Alternaria leaf blight', 'অলটারনারিয়া পাতা ঝলসানো'),
        humidityMin: 85,
        tempMin: 18,
        tempMax: 27,
        stages: ['vegetative', 'flowering'],
        why: s(
          'Fog and heavy dew give the spores the long wet period they need, and infected pods produce shrivelled seed with less oil.',
          'কুয়াশা ও ভারী শিশিরে জীবাণুর দরকারি দীর্ঘ ভেজা সময় পাওয়া যায়; আক্রান্ত ফলে দানা চিমসে হয় ও তেল কম হয়।'
        ),
        actions: [
          s('Look for dark concentric ring spots on leaves and pods.', 'পাতা ও ফলে গোল বলয়যুক্ত কালচে দাগ খুঁজে দেখুন।'),
        ],
      },
    ],
    pests: [
      {
        id: 'mustard_aphid',
        name: s('Mustard aphid', 'সরিষার জাব পোকা'),
        humidityMin: 50,
        tempMin: 15,
        tempMax: 25,
        stages: ['flowering', 'siliqua'],
        priority: 'high',
        why: s(
          'Cool, still, foggy weather at flowering is when mustard aphid colonies explode. They cover the flowering shoot and can cut yield by half.',
          'ফুল আসার সময় ঠান্ডা, বাতাসহীন ও কুয়াশাচ্ছন্ন আবহাওয়ায় সরিষার জাব পোকা হু হু করে বাড়ে। এরা ফুলের ডগা ঢেকে ফেলে এবং ফলন অর্ধেক করে দিতে পারে।'
        ),
        actions: [
          s('Inspect the flowering tips — colonies are easy to see as grey-green crusts.', 'ফুলের ডগা দেখুন — ধূসর-সবুজ আস্তরণের মতো পোকার দল সহজেই চোখে পড়ে।'),
          s('Clip and destroy the worst-infested shoot tips early, before the colony spreads down the plant.', 'পোকা গাছের নিচে ছড়ানোর আগেই সবচেয়ে আক্রান্ত ডগা কেটে নষ্ট করুন।'),
          s('If you must spray, do it late afternoon when bees are not active.', 'স্প্রে করতেই হলে বিকেলের শেষে করুন, যখন মৌমাছি কাজ করে না।'),
        ],
      },
    ],
  },

  // ---------------------------------------------------------------- CHILLI
  {
    id: 'chilli',
    group: 'spice',
    name: s('Chilli', 'মরিচ'),
    season: s('Rabi & Kharif', 'রবি ও খরিফ'),
    sowingMonths: [9, 10, 11, 1, 2],
    durationDays: 150,
    stages: [
      { id: 'establishment', name: s('Transplanting', 'চারা রোপণ'), from: 0, to: 20, actions: s('Raised beds prevent seedling collapse.', 'উঁচু বেড করলে চারা ঢলে পড়ে না।') },
      { id: 'vegetative', name: s('Vegetative growth', 'গাছ বাড়া'), from: 21, to: 55, actions: s('Weed and earth up; keep drainage clear.', 'আগাছা দমন ও মাটি তুলে দিন; নালা পরিষ্কার রাখুন।') },
      { id: 'flowering', name: s('Flowering & fruiting', 'ফুল ও ফল ধরা'), from: 56, to: 999, actions: s('Pick regularly; water evenly to prevent fruit drop.', 'নিয়মিত তুলুন; সমান সেচ দিন যাতে ফল ঝরে না যায়।') },
    ],
    thresholds: {
      optimalTempMin: 20,
      optimalTempMax: 32,
      heatStressTemp: 36,
      heatCriticalTemp: 39,
      coldStressTemp: 10,
      heavyRainMm: 35,
      waterloggingMm: 50,
      windDamageKmh: 50,
      dryDayThreshold: 5,
    },
    sensitiveStages: {
      heat: ['flowering'],
      cold: ['establishment'],
      flood: ['establishment', 'vegetative', 'flowering'],
      wind: [],
      water: ['flowering'],
    },
    diseases: [
      {
        id: 'anthracnose',
        name: s('Anthracnose (fruit rot)', 'অ্যানথ্রাকনোজ (ফল পচা)'),
        humidityMin: 85,
        tempMin: 24,
        tempMax: 32,
        stages: ['flowering'],
        why: s(
          'Warm wet weather at fruiting causes sunken dark spots on ripening chillies, and infected fruit cannot be sold.',
          'ফল ধরার সময় গরম-ভেজা আবহাওয়ায় পাকা মরিচে দেবে যাওয়া কালচে দাগ পড়ে; আক্রান্ত ফল বিক্রি করা যায় না।'
        ),
        actions: [
          s('Pick ripe fruit promptly and remove any spotted fruit from the field.', 'পাকা ফল সময়মতো তুলুন এবং দাগযুক্ত ফল জমি থেকে সরিয়ে ফেলুন।'),
        ],
      },
    ],
    pests: [
      {
        id: 'chilli_mite',
        name: s('Yellow mite / thrips complex', 'হলুদ মাকড় ও থ্রিপস'),
        humidityMin: 40,
        humidityMax: 75,
        tempMin: 26,
        tempMax: 36,
        stages: ['vegetative', 'flowering'],
        why: s(
          'Hot dry spells bring mites and thrips together, causing the leaf-curl look farmers call "bokamachi". Growth stops and flowering drops off.',
          'গরম-শুকনো আবহাওয়ায় মাকড় ও থ্রিপস একসঙ্গে আক্রমণ করে; পাতা কুঁকড়ে যায়, গাছ বাড়া বন্ধ হয় এবং ফুল কমে যায়।'
        ),
        actions: [
          s('Check the top leaves for upward or downward curling and a dull bronzed surface.', 'উপরের পাতা উপরে বা নিচে কুঁকড়ে গেছে এবং তামাটে দেখাচ্ছে কিনা দেখুন।'),
          s('Irrigate to raise humidity around the plants; mite pressure falls after rain.', 'গাছের চারপাশে আর্দ্রতা বাড়াতে সেচ দিন; বৃষ্টির পর মাকড়ের চাপ কমে।'),
        ],
      },
    ],
  },
];

/** Public list for the crop picker. */
function listCrops() {
  return CROPS.map((crop) => ({
    id: crop.id,
    name: crop.name,
    group: crop.group,
    season: crop.season,
    durationDays: crop.durationDays,
    sowingMonths: crop.sowingMonths,
    stages: crop.stages.map(({ id, name, from, to, actions }) => ({ id, name, from, to, actions })),
  }));
}

function getCrop(cropId) {
  return CROPS.find((crop) => crop.id === cropId) || null;
}

module.exports = { CROPS, listCrops, getCrop };
