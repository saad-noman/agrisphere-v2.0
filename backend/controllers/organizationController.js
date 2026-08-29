const fs = require('fs');
const path = require('path');
const Organization = require('../models/Organization');
const Rating = require('../models/Rating');
const sendError = require('../utils/sendError');


const deleteUploadedFile = (imagePath) => {
  if (!imagePath) return;
  fs.unlink(path.join('uploads', path.basename(imagePath)), () => {});
};

// GET /api/organizations
// To list/search organizations, optionally filtered by name, category, district or upazila
const listOrganizations = async (req, res) => {
  try {
    const search = req.query.search;
    const category = req.query.category;
    const district = req.query.district;
    const upazila = req.query.upazila;
    const sort = req.query.sort;

    const filter = {};

    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    if (category) {
      filter.category = { $regex: category, $options: 'i' };
    }

    if (district) {
      filter.district = { $regex: district, $options: 'i' };
    }

    if (upazila) {
      filter.upazila = { $regex: upazila, $options: 'i' };
    }

    // Sort by rating when asked, otherwise alphabetically by name
    let sortOption = { name: 1 };
    if (sort === 'rating') {
      sortOption = { ratingAverage: -1, ratingCount: -1 };
    }

    const organizations = await Organization.find(filter).sort(sortOption);
    res.json(organizations);
  } catch (err) {
    sendError(res, 500, 'Something went wrong', err);
  }
};

// GET /api/organizations/mine
// To list the organizations the logged-in owner has added
const getMyOrganizations = async (req, res) => {
  try {
    const organizations = await Organization.find({ ownerId: req.user._id }).sort({ name: 1 });
    res.json(organizations);
  } catch (err) {
    sendError(res, 500, 'Something went wrong', err);
  }
};

// GET /api/organizations/:id
// To get a single organization's details
const getOrganization = async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    res.json(organization);
  } catch (err) {
    sendError(res, 500, 'Something went wrong', err);
  }
};

// POST /api/organizations
// To create a new organization owned by the logged-in user
const createOrganization = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Organization name is required' });
    }

    const organization = await Organization.create({
      ...req.body,
      ownerId: req.user._id,
      photo: req.file ? `/uploads/${req.file.filename}` : undefined,
    });

    res.status(201).json(organization);
  } catch (err) {
    sendError(res, 500, 'Something went wrong', err);
  }
};

// PUT /api/organizations/:id
// To update an organization the logged-in user owns
const updateOrganization = async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    if (organization.ownerId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only edit your own organizations' });
    }

    const {
      name,
      category,
      description,
      address,
      district,
      upazila,
      latitude,
      longitude,
      contactNumber,
      email,
      website,
      openingHours,
      isConsultationCenter,
    } = req.body;

    Object.assign(organization, {
      name,
      category,
      description,
      address,
      district,
      upazila,
      latitude,
      longitude,
      contactNumber,
      email,
      website,
      openingHours,
      isConsultationCenter,
    });

    if (req.file) {
      deleteUploadedFile(organization.photo);
      organization.photo = `/uploads/${req.file.filename}`;
    }

    await organization.save();
    res.json(organization);
  } catch (err) {
    sendError(res, 500, 'Something went wrong', err);
  }
};

// DELETE /api/organizations/:id/photo
// To remove an organization's photo
const deleteOrganizationPhoto = async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    if (organization.ownerId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only edit your own organizations' });
    }

    deleteUploadedFile(organization.photo);
    organization.photo = null;
    await organization.save();

    res.json(organization);
  } catch (err) {
    sendError(res, 500, 'Something went wrong', err);
  }
};

// DELETE /api/organizations/:id
// To delete an organization the logged-in user owns
const deleteOrganization = async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    if (organization.ownerId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own organizations' });
    }

    deleteUploadedFile(organization.photo);
    await organization.deleteOne();
    await Rating.deleteMany({ targetType: 'organization', targetId: organization._id });
    res.json({ message: 'Organization deleted' });
  } catch (err) {
    sendError(res, 500, 'Something went wrong', err);
  }
};

module.exports = {
  listOrganizations,
  getMyOrganizations,
  getOrganization,
  createOrganization,
  updateOrganization,
  deleteOrganizationPhoto,
  deleteOrganization,
};
