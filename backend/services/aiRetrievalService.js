const Expert = require('../models/Expert');
const Organization = require('../models/Organization');
const Disease = require('../models/Disease');

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'i', 'you', 'he', 'she', 'it',
  'we', 'they', 'me', 'my', 'your', 'who', 'what', 'where', 'when', 'why', 'how', 'which', 'can',
  'could', 'would', 'should', 'do', 'does', 'did', 'for', 'of', 'in', 'on', 'at', 'to', 'and', 'or',
  'but', 'with', 'about', 'from', 'into', 'this', 'that', 'these', 'those', 'there', 'here', 'please',
  'tell', 'show', 'list', 'find', 'give', 'need', 'want', 'looking', 'recommend', 'recommendation',
  'best', 'top', 'good', 'near', 'any', 'some', 'get', 'me', 'us', 'am', 'know', 'about',
  'suggest', 'suggestion', 'suggested', 'rated', 'rating', 'take', 'takes',
  'see', 'view', 'display', 'browse', 'open', 'go', 'goto', 'search', 'searching',
  'all', 'every', 'available', 'help', 'helping', 'available', 'please', 'kindly',
]);

// To split a free-text query into the meaningful keywords worth searching for
function extractKeywords(text) {
  return String(text || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

// To build a case-insensitive "matches any keyword" filter across the given fields
function buildKeywordSearch(keywords, fields) {
  if (!keywords.length) return {};
  const pattern = keywords.map(escapeRegex).join('|');
  return { $or: fields.map((f) => ({ [f]: { $regex: pattern, $options: 'i' } })) };
}

// To search public expert profiles matching a free-text query
async function searchExperts(term, options = {}) {
  const { limit = 4, topRated = false, listIntent = false } = options;
  const keywords = extractKeywords(term);
  const filter =
    listIntent && !keywords.length
      ? {}
      : buildKeywordSearch(keywords, [
          'fullName', 'specialization', 'expertiseCategory', 'areasOfExpertise', 'district', 'upazila', 'organization',
        ]);
  const select =
    'fullName specialization expertiseCategory experience organization district upazila availabilityStatus ratingAverage ratingCount';

  let experts = [];
  if (topRated) {
    experts = await Expert.find({ ...filter, ratingCount: { $gt: 0 } })
      .select(select)
      .sort({ ratingAverage: -1, ratingCount: -1 })
      .limit(limit)
      .lean();
  }
  if (!experts.length) {
    experts = await Expert.find(filter)
      .select(select)
      .sort(topRated ? { ratingAverage: -1, ratingCount: -1 } : { fullName: 1 })
      .limit(limit)
      .lean();
  }

  return experts.map((e) => ({
    type: 'expert',
    title: e.fullName || 'Agricultural expert',
    detail: [
      e.specialization,
      e.expertiseCategory,
      e.experience ? `${e.experience} yrs experience` : null,
      e.organization,
      [e.upazila, e.district].filter(Boolean).join(', '),
      e.availabilityStatus,
      e.ratingCount ? `★${e.ratingAverage} (${e.ratingCount} review${e.ratingCount === 1 ? '' : 's'})` : 'Not yet rated',
    ].filter(Boolean).join(' • '),
    link: `/experts/${e._id}`,
  }));
}

// To search public organizations matching a free-text query
async function searchOrganizations(term, options = {}) {
  const { limit = 4, topRated = false, listIntent = false } = options;
  const keywords = extractKeywords(term);
  const filter =
    listIntent && !keywords.length
      ? {}
      : buildKeywordSearch(keywords, ['name', 'category', 'description', 'district', 'upazila']);
  const select = 'name category description district upazila isConsultationCenter ratingAverage ratingCount';

  let orgs = [];
  if (topRated) {
    orgs = await Organization.find({ ...filter, ratingCount: { $gt: 0 } })
      .select(select)
      .sort({ ratingAverage: -1, ratingCount: -1 })
      .limit(limit)
      .lean();
  }
  if (!orgs.length) {
    orgs = await Organization.find(filter)
      .select(select)
      .sort(topRated ? { ratingAverage: -1, ratingCount: -1 } : { name: 1 })
      .limit(limit)
      .lean();
  }

  return orgs.map((o) => ({
    type: 'organization',
    title: o.name || 'Organization',
    detail: [
      o.category,
      o.isConsultationCenter ? 'Consultation center' : null,
      [o.upazila, o.district].filter(Boolean).join(', '),
      o.description ? o.description.slice(0, 140) : null,
      o.ratingCount ? `★${o.ratingAverage} (${o.ratingCount} review${o.ratingCount === 1 ? '' : 's'})` : 'Not yet rated',
    ].filter(Boolean).join(' • '),
    link: `/organizations/${o._id}`,
  }));
}

// To search the public disease library matching a free-text query
async function searchDiseaseLibrary(term, limit = 4) {
  const keywords = extractKeywords(term);
  const filter = buildKeywordSearch(keywords, ['name', 'description']);
  const diseases = await Disease.find(filter)
    .select('name description')
    .limit(limit)
    .lean();

  return diseases.map((d) => ({
    type: 'disease',
    title: d.name,
    detail: (d.description || '').slice(0, 200),
    link: '/disease-library',
  }));
}

// Gathers public experts, organizations and diseases matching the query.
// `intent` comes from the assistant's classification step; without it every
// entity type is searched with the raw query.
async function retrievePublicContext(query, intent = {}) {
  const {
    needsExperts = true,
    needsOrganizations = true,
    needsDiseases = true,
    topRated = false,
    listAll = false,
    searchQuery,
  } = intent;

  const term = (searchQuery || query || '').toString().slice(0, 200);

  const [experts, organizations, diseases] = await Promise.all([
    needsExperts
      ? searchExperts(term, { topRated, listIntent: listAll, limit: listAll ? 6 : 4 }).catch(() => [])
      : Promise.resolve([]),
    needsOrganizations
      ? searchOrganizations(term, { topRated, listIntent: listAll, limit: listAll ? 6 : 4 }).catch(() => [])
      : Promise.resolve([]),
    needsDiseases ? searchDiseaseLibrary(term).catch(() => []) : Promise.resolve([]),
  ]);

  const results = [...experts, ...organizations, ...diseases];
  return { results, hasResults: results.length > 0 };
}

const PLATFORM_ROUTES = [
  { label: 'Find agricultural experts', link: '/experts' },
  { label: 'Browse organizations', link: '/organizations' },
  { label: 'Services map', link: '/map' },
  { label: 'Disease library', link: '/disease-library' },
  { label: 'Submit a disease case for expert diagnosis', link: '/disease-submission' },
  { label: 'AI crop identification & disease detection', link: '/crop-analysis' },
  { label: 'Crop / soil-based crop recommendation', link: '/farming-recommendation' },
  { label: 'Weather', link: '/get-weather' },
  { label: 'Message an expert', link: '/messages' },
  { label: 'Request a consultation', link: '/consultations/request' },
  { label: 'Your consultations and appointments', link: '/consultations' },
  { label: 'Your profile dashboard', link: '/profile-dashboard' },
  { label: 'Farm records and dashboard', link: '/farm-records' },
];

module.exports = {
  retrievePublicContext,
  searchExperts,
  searchOrganizations,
  searchDiseaseLibrary,
  PLATFORM_ROUTES,
};
