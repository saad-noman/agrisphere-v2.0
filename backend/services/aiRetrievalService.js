const Expert = require('../models/Expert');
const Organization = require('../models/Organization');
const Disease = require('../models/Disease');

// A recommendation returns between 1 and 5 matches whenever any exist
const MIN_RECOMMENDATIONS = 1;
const MAX_RECOMMENDATIONS = 5;

// Escapes characters that would otherwise be treated as regex syntax
function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Common words that are not worth searching for
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

// Splits a free-text query into the meaningful keywords worth searching for
function extractKeywords(text) {
  const words = String(text || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/);

  const keywords = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    if (word.length < 3) continue;
    if (STOPWORDS.has(word)) continue;

    keywords.push(word);
  }

  return keywords;
}

// Builds a case-insensitive "matches any keyword" filter across the given fields
function buildKeywordSearch(keywords, fields) {
  if (keywords.length === 0) return {};

  const escapedKeywords = [];
  for (let i = 0; i < keywords.length; i++) {
    escapedKeywords.push(escapeRegex(keywords[i]));
  }
  const pattern = escapedKeywords.join('|');

  const conditions = [];
  for (let i = 0; i < fields.length; i++) {
    const condition = {};
    condition[fields[i]] = { $regex: pattern, $options: 'i' };
    conditions.push(condition);
  }

  return { $or: conditions };
}

// Keeps a requested limit inside the allowed recommendation range
function capLimit(limit) {
  if (!limit) return MAX_RECOMMENDATIONS;
  if (limit < MIN_RECOMMENDATIONS) return MIN_RECOMMENDATIONS;
  if (limit > MAX_RECOMMENDATIONS) return MAX_RECOMMENDATIONS;
  return limit;
}

// Joins the non-empty parts of a summary line
function joinDetails(parts) {
  const filled = [];

  for (let i = 0; i < parts.length; i++) {
    if (parts[i]) {
      filled.push(parts[i]);
    }
  }

  return filled.join(' • ');
}

// Builds a rating label, or says the item has no ratings yet
function buildRatingLabel(ratingAverage, ratingCount) {
  if (!ratingCount) return 'Not yet rated';

  let reviewWord = 'reviews';
  if (ratingCount === 1) {
    reviewWord = 'review';
  }

  return `★${ratingAverage} (${ratingCount} ${reviewWord})`;
}

// Joins an upazila and district into one place label
function buildPlaceLabel(upazila, district) {
  const parts = [];

  if (upazila) parts.push(upazila);
  if (district) parts.push(district);

  return parts.join(', ');
}

const EXPERT_FIELDS =
  'fullName specialization expertiseCategory experience organization district upazila availabilityStatus ratingAverage ratingCount';

const ORGANIZATION_FIELDS =
  'name category description district upazila isConsultationCenter ratingAverage ratingCount';

const RATING_SORT = { ratingAverage: -1, ratingCount: -1 };

// Searches public expert profiles matching a free-text query
async function searchExperts(term, options = {}) {
  const limit = capLimit(options.limit);
  const topRated = options.topRated === true;
  const listIntent = options.listIntent === true;
  const ensureResults = options.ensureResults === true;

  const keywords = extractKeywords(term);

  // "Show me all experts" has no keywords, so nothing is filtered out
  let filter = {};
  if (!listIntent || keywords.length > 0) {
    filter = buildKeywordSearch(keywords, [
      'fullName',
      'specialization',
      'expertiseCategory',
      'areasOfExpertise',
      'district',
      'upazila',
      'organization',
    ]);
  }

  let experts = [];

  // Prefer experts who actually have ratings when top-rated is asked for
  if (topRated) {
    const ratedFilter = Object.assign({}, filter, { ratingCount: { $gt: 0 } });

    experts = await Expert.find(ratedFilter)
      .select(EXPERT_FIELDS)
      .sort(RATING_SORT)
      .limit(limit)
      .lean();
  }

  if (experts.length === 0) {
    let sortOption = { fullName: 1 };
    if (topRated) {
      sortOption = RATING_SORT;
    }

    experts = await Expert.find(filter)
      .select(EXPERT_FIELDS)
      .sort(sortOption)
      .limit(limit)
      .lean();
  }

  // The user asked for a recommendation but nothing matched their words, so
  // suggest the best-rated experts instead of answering with nothing.
  if (experts.length === 0 && ensureResults) {
    experts = await Expert.find({})
      .select(EXPERT_FIELDS)
      .sort(RATING_SORT)
      .limit(limit)
      .lean();
  }

  const results = [];

  for (let i = 0; i < experts.length; i++) {
    const expert = experts[i];

    let experienceLabel = null;
    if (expert.experience) {
      experienceLabel = `${expert.experience} yrs experience`;
    }

    results.push({
      type: 'expert',
      title: expert.fullName || 'Agricultural expert',
      detail: joinDetails([
        expert.specialization,
        expert.expertiseCategory,
        experienceLabel,
        expert.organization,
        buildPlaceLabel(expert.upazila, expert.district),
        expert.availabilityStatus,
        buildRatingLabel(expert.ratingAverage, expert.ratingCount),
      ]),
      link: `/experts/${expert._id}`,
    });
  }

  return results;
}

// Searches public organizations matching a free-text query
async function searchOrganizations(term, options = {}) {
  const limit = capLimit(options.limit);
  const topRated = options.topRated === true;
  const listIntent = options.listIntent === true;
  const ensureResults = options.ensureResults === true;

  const keywords = extractKeywords(term);

  let filter = {};
  if (!listIntent || keywords.length > 0) {
    filter = buildKeywordSearch(keywords, ['name', 'category', 'description', 'district', 'upazila']);
  }

  let organizations = [];

  if (topRated) {
    const ratedFilter = Object.assign({}, filter, { ratingCount: { $gt: 0 } });

    organizations = await Organization.find(ratedFilter)
      .select(ORGANIZATION_FIELDS)
      .sort(RATING_SORT)
      .limit(limit)
      .lean();
  }

  if (organizations.length === 0) {
    let sortOption = { name: 1 };
    if (topRated) {
      sortOption = RATING_SORT;
    }

    organizations = await Organization.find(filter)
      .select(ORGANIZATION_FIELDS)
      .sort(sortOption)
      .limit(limit)
      .lean();
  }

  // Same fallback as experts: suggest the best-rated rather than nothing
  if (organizations.length === 0 && ensureResults) {
    organizations = await Organization.find({})
      .select(ORGANIZATION_FIELDS)
      .sort(RATING_SORT)
      .limit(limit)
      .lean();
  }

  const results = [];

  for (let i = 0; i < organizations.length; i++) {
    const organization = organizations[i];

    let consultationLabel = null;
    if (organization.isConsultationCenter) {
      consultationLabel = 'Consultation center';
    }

    let shortDescription = null;
    if (organization.description) {
      shortDescription = organization.description.slice(0, 140);
    }

    results.push({
      type: 'organization',
      title: organization.name || 'Organization',
      detail: joinDetails([
        organization.category,
        consultationLabel,
        buildPlaceLabel(organization.upazila, organization.district),
        shortDescription,
        buildRatingLabel(organization.ratingAverage, organization.ratingCount),
      ]),
      link: `/organizations/${organization._id}`,
    });
  }

  return results;
}

// Searches the public disease library matching a free-text query
async function searchDiseaseLibrary(term, limit = 4) {
  const keywords = extractKeywords(term);
  const filter = buildKeywordSearch(keywords, ['name', 'description']);

  const diseases = await Disease.find(filter)
    .select('name description')
    .limit(limit)
    .lean();

  const results = [];

  for (let i = 0; i < diseases.length; i++) {
    const disease = diseases[i];
    const description = disease.description || '';

    results.push({
      type: 'disease',
      title: disease.name,
      detail: description.slice(0, 200),
      link: '/disease-library',
    });
  }

  return results;
}

// Gathers public experts, organizations and diseases matching the query.
// `intent` comes from the assistant's classification step; without it every
// entity type is searched with the raw query.
async function retrievePublicContext(query, intent = {}) {
  let needsExperts = true;
  if (intent.needsExperts === false) {
    needsExperts = false;
  }

  let needsOrganizations = true;
  if (intent.needsOrganizations === false) {
    needsOrganizations = false;
  }

  let needsDiseases = true;
  if (intent.needsDiseases === false) {
    needsDiseases = false;
  }

  const topRated = intent.topRated === true;
  const listAll = intent.listAll === true;

  let term = query || '';
  if (intent.searchQuery) {
    term = intent.searchQuery;
  }
  term = String(term).slice(0, 200);

  // When the user asks for people or places, answer with at least one
  // suggestion instead of an empty result.
  let experts = [];
  if (needsExperts) {
    try {
      experts = await searchExperts(term, {
        topRated,
        listIntent: listAll,
        limit: MAX_RECOMMENDATIONS,
        ensureResults: true,
      });
    } catch (err) {
      experts = [];
    }
  }

  let organizations = [];
  if (needsOrganizations) {
    try {
      organizations = await searchOrganizations(term, {
        topRated,
        listIntent: listAll,
        limit: MAX_RECOMMENDATIONS,
        ensureResults: true,
      });
    } catch (err) {
      organizations = [];
    }
  }

  let diseases = [];
  if (needsDiseases) {
    try {
      diseases = await searchDiseaseLibrary(term);
    } catch (err) {
      diseases = [];
    }
  }

  const results = experts.concat(organizations).concat(diseases);

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
  MIN_RECOMMENDATIONS,
  MAX_RECOMMENDATIONS,
};
