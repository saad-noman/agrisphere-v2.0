const Expert = require('../models/Expert');
const sendError = require('../utils/sendError');

// GET /api/experts
// To list/search experts, optionally filtered by name, specialization, district or upazila
const listExperts = async (req, res) => {
  try {
    const search = req.query.search;
    const specialization = req.query.specialization;
    const district = req.query.district;
    const upazila = req.query.upazila;
    const sort = req.query.sort;

    const filter = {};

    // Free-text search looks at both the name and the specialization
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { specialization: { $regex: search, $options: 'i' } },
      ];
    }

    if (specialization) {
      filter.specialization = { $regex: specialization, $options: 'i' };
    }

    if (district) {
      filter.district = { $regex: district, $options: 'i' };
    }

    if (upazila) {
      filter.upazila = { $regex: upazila, $options: 'i' };
    }

    // Sort by rating when asked, otherwise alphabetically by name
    let sortOption = { fullName: 1 };
    if (sort === 'rating') {
      sortOption = { ratingAverage: -1, ratingCount: -1 };
    }

    const experts = await Expert.find(filter).sort(sortOption);
    res.json(experts);
  } catch (err) {
    sendError(res, 500, 'Something went wrong', err);
  }
};

// GET /api/experts/:id
// To get a single expert's profile
const getExpert = async (req, res) => {
  try {
    const expert = await Expert.findById(req.params.id);
    if (!expert) {
      return res.status(404).json({ message: 'Expert not found' });
    }
    res.json(expert);
  } catch (err) {
    sendError(res, 500, 'Something went wrong', err);
  }
};

module.exports = { listExperts, getExpert };
