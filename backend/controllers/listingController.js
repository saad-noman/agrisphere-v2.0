const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Listing = require('../models/Listing');
const Order = require('../models/Order');
const Notification = require('../models/Notification');
const sendError = require('../utils/sendError');
const { buildAddress } = require('../utils/address');
const { escapeRegex } = require('../utils/escapeRegex');

// Shapes a listing for the client. Only the seller's display name is exposed.
function shapeListing(listing, viewerId) {
  const farmer = listing.farmer;
  const isPopulated = farmer && typeof farmer === 'object' && farmer.name;

  let sellerId = '';
  if (isPopulated) sellerId = String(farmer._id);
  else if (farmer) sellerId = String(farmer);

  return {
    _id: listing._id,
    cropType: listing.cropType,
    category: listing.category || 'crop',
    quantity: listing.quantity,
    unit: listing.unit,
    price: listing.price,
    currency: listing.currency,
    address: listing.address || {},
    status: listing.status,
    photo: listing.photo || null,
    latitude: listing.latitude,
    longitude: listing.longitude,
    description: listing.description || '',
    sellerId,
    sellerName: isPopulated ? farmer.name : '',
    isOwner: viewerId ? sellerId === String(viewerId) : false,
    createdAt: listing.createdAt,
  };
}

// Validates the fields shared by create and update
function readListingInput(body) {
  const cropType = String(body.cropType || '').trim();
  if (!cropType) return { error: 'Crop name is required' };

  const quantity = Number(body.quantity);
  if (!Number.isFinite(quantity) || quantity < 0) {
    return { error: 'Quantity must be zero or greater' };
  }

  const price = Number(body.price);
  if (!Number.isFinite(price) || price < 0) {
    return { error: 'Price must be zero or greater' };
  }

  return {
    values: {
      cropType: cropType.slice(0, 120),
      category: ['crop','seed','pesticide','fertilizer','equipment','other'].includes(body.category)
        ? body.category
        : 'crop',
      quantity,
      unit: String(body.unit || 'kg').trim().slice(0, 24) || 'kg',
      price,
      currency: String(body.currency || 'BDT').trim().slice(0, 8) || 'BDT',
      description: String(body.description || '').trim().slice(0, 500),
      address: buildAddress(body),
      latitude: body.latitude === undefined || body.latitude === '' ? null : Number(body.latitude),
      longitude: body.longitude === undefined || body.longitude === '' ? null : Number(body.longitude),
    },
  };
}

// How the browse list may be ordered. Kept as a whitelist so a client can
// never inject an arbitrary sort expression.
const SORTS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  priceLow: { price: 1 },
  priceHigh: { price: -1 },
  quantityHigh: { quantity: -1 },
  cropAsc: { cropType: 1 },
};

const CATEGORIES = ['crop', 'seed', 'pesticide', 'fertilizer', 'equipment', 'other'];

// Case-insensitive "contains" match on an escaped user string
function contains(value) {
  return { $regex: escapeRegex(value), $options: 'i' };
}

// Builds the crop-name matcher. Each whitespace-separated word must appear
// somewhere in the crop name (or the description), in any order, so "red
// lentil" still finds "Lentil (red)" and a single letter still matches.
function buildSearchClause(search) {
  const words = search.split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;

  const clauses = [];
  for (let i = 0; i < words.length; i++) {
    clauses.push({
      $or: [{ cropType: contains(words[i]) }, { description: contains(words[i]) }],
    });
  }

  return { $and: clauses };
}

// GET /api/listings
// Public browse of active listings, with search, filters and sorting
const listListings = async (req, res) => {
  try {
    const filter = { status: 'active' };

    const search = String(req.query.search || '').trim();
    const searchClause = search ? buildSearchClause(search) : null;
    if (searchClause) Object.assign(filter, searchClause);

    const district = String(req.query.district || '').trim();
    if (district) filter['address.district'] = contains(district);

    const division = String(req.query.division || '').trim();
    if (division) filter['address.division'] = contains(division);

    const country = String(req.query.country || '').trim();
    if (country) filter['address.country'] = contains(country);

    const category = String(req.query.category || '').trim();
    if (CATEGORIES.includes(category)) filter.category = category;

    const unit = String(req.query.unit || '').trim();
    if (unit) filter.unit = contains(unit);

    // Price bounds are only applied when they parse as real numbers
    const priceRange = {};
    const minPrice = Number(req.query.minPrice);
    const maxPrice = Number(req.query.maxPrice);
    if (req.query.minPrice !== undefined && req.query.minPrice !== '' && Number.isFinite(minPrice)) {
      priceRange.$gte = minPrice;
    }
    if (req.query.maxPrice !== undefined && req.query.maxPrice !== '' && Number.isFinite(maxPrice)) {
      priceRange.$lte = maxPrice;
    }
    if (Object.keys(priceRange).length > 0) filter.price = priceRange;

    const sort = SORTS[req.query.sort] || SORTS.newest;

    const listings = await Listing.find(filter)
      .populate('farmer', 'name')
      .sort(sort)
      .limit(200)
      .lean();

    const viewerId = req.user ? req.user._id : null;
    const results = [];
    for (let i = 0; i < listings.length; i++) {
      results.push(shapeListing(listings[i], viewerId));
    }

    res.json(results);
  } catch (err) {
    sendError(res, 500, 'Failed to load listings', err);
  }
};

// GET /api/listings/:id
// One listing, so the detail page does not have to download the whole list
const getListing = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid listing id' });
    }

    const listing = await Listing.findById(req.params.id).populate('farmer', 'name').lean();
    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    res.json(shapeListing(listing, req.user ? req.user._id : null));
  } catch (err) {
    sendError(res, 500, 'Failed to load the listing', err);
  }
};

// GET /api/listings/mine
const getMyListings = async (req, res) => {
  try {
    const listings = await Listing.find({ farmer: req.user._id })
      .populate('farmer', 'name')
      .sort({ createdAt: -1 })
      .lean();

    const results = [];
    for (let i = 0; i < listings.length; i++) {
      results.push(shapeListing(listings[i], req.user._id));
    }

    res.json(results);
  } catch (err) {
    sendError(res, 500, 'Failed to load your listings', err);
  }
};

// POST /api/listings
const createListing = async (req, res) => {
  try {
    const { values, error } = readListingInput(req.body);
    if (error) return res.status(400).json({ message: error });

    const listing = await Listing.create({
      ...values,
      farmer: req.user._id,
      photo: req.file ? `/uploads/${req.file.filename}` : null,
    });

    res.status(201).json(shapeListing(listing, req.user._id));
  } catch (err) {
    sendError(res, 500, 'Failed to create the listing', err);
  }
};

// Loads a listing only if it belongs to the requesting farmer
async function loadOwnedListing(id, userId) {
  if (!mongoose.isValidObjectId(id)) return { error: 400, message: 'Invalid listing id' };

  const listing = await Listing.findById(id);
  if (!listing) return { error: 404, message: 'Listing not found' };

  if (listing.farmer.toString() !== userId.toString()) {
    return { error: 403, message: 'You can only manage your own listings' };
  }

  return { listing };
}

// PUT /api/listings/:id
const updateListing = async (req, res) => {
  try {
    const { listing, error, message } = await loadOwnedListing(req.params.id, req.user._id);
    if (error) return res.status(error).json({ message });

    const parsed = readListingInput(req.body);
    if (parsed.error) return res.status(400).json({ message: parsed.error });

    Object.assign(listing, parsed.values);
    if (req.file) {
      listing.photo = `/uploads/${req.file.filename}`;
    }

    await listing.save();
    res.json(shapeListing(listing, req.user._id));
  } catch (err) {
    sendError(res, 500, 'Failed to update the listing', err);
  }
};

// PATCH /api/listings/:id/close
const closeListing = async (req, res) => {
  try {
    const { listing, error, message } = await loadOwnedListing(req.params.id, req.user._id);
    if (error) return res.status(error).json({ message });

    listing.status = 'closed';
    await listing.save();

    res.json(shapeListing(listing, req.user._id));
  } catch (err) {
    sendError(res, 500, 'Failed to close the listing', err);
  }
};


// DELETE /api/listings/:id
// Permanently removes a listing the farmer owns. Orders keep their own copy of
// the crop, quantity and price, but they read the pickup point off the listing,
// so a listing still tied to an order in flight is kept until that order ends.
const deleteListing = async (req, res) => {
  try {
    const { listing, error, message } = await loadOwnedListing(req.params.id, req.user._id);
    if (error) return res.status(error).json({ message });

    const liveOrders = await Order.countDocuments({
      listing: listing._id,
      status: { $nin: ['completed', 'cancelled'] },
    });

    if (liveOrders > 0) {
      return res.status(409).json({
        message: 'This listing still has an order in progress. It can be deleted once that order is completed.',
      });
    }

    // Best-effort cleanup of the uploaded photo; a missing file is not an error
    if (listing.photo) {
      fs.unlink(path.join('uploads', path.basename(listing.photo)), () => {});
    }

    await Listing.deleteOne({ _id: listing._id });

    res.json({ _id: String(listing._id), deleted: true });
  } catch (err) {
    sendError(res, 500, 'Failed to delete the listing', err);
  }
};

// POST /api/listings/:id/interest
// An organization/market account records buying interest in a listing and
// the farmer gets an in-app notification.
const expressInterest = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid listing id' });
    }

    const allowedRoles = ['organization_owner', 'market'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Only organization accounts can express interest' });
    }

    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    if (listing.status !== 'active') {
      return res.status(400).json({ message: 'This listing is closed' });
    }

    // Recording interest twice should not duplicate the entry
    let already = false;
    for (let i = 0; i < listing.interestedOrgs.length; i++) {
      if (listing.interestedOrgs[i].toString() === req.user._id.toString()) already = true;
    }

    if (!already) {
      listing.interestedOrgs.push(req.user._id);
      await listing.save();

      await Notification.create({
        userId: listing.farmer,
        message: `${req.user.name} is interested in your ${listing.cropType} listing`,
        link: '/marketplace',
      });
    }

    res.json({
      listingId: listing._id,
      interestedCount: listing.interestedOrgs.length,
      sellerId: String(listing.farmer),
      cropType: listing.cropType,
    });
  } catch (err) {
    sendError(res, 500, 'Failed to record interest', err);
  }
};

module.exports = {
  expressInterest, listListings, getListing, getMyListings, createListing, updateListing,
  closeListing, deleteListing };
