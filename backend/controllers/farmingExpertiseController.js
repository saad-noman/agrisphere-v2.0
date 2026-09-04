const fs = require('fs');
const path = require('path');
const FarmingExpertiseRequest = require('../models/FarmingExpertiseRequest');
const Notification = require('../models/Notification');
const sendError = require('../utils/sendError');

// POST /api/farming-expertise
// To submit a new farming expertise request
const createRequest = async (req, res) => {
  try {
    const { cropName, comment } = req.body;

    if (!cropName || !cropName.trim()) {
      return res.status(400).json({ message: 'Crop name is required' });
    }

    const newRequest = await FarmingExpertiseRequest.create({
      farmer: req.user.id,
      cropName: cropName.trim(),
      comment: comment ? comment.trim() : '',
      status: 'pending',
    });

    const populated = await FarmingExpertiseRequest.findById(newRequest._id)
      .populate('farmer', 'name email');

    res.status(201).json({
      message: 'Farming expertise request submitted successfully',
      request: populated,
    });
  } catch (err) {
    console.error('createRequest error:', err);
    sendError(res, 500, 'Failed to submit request', err);
  }
};

// GET /api/farming-expertise
// To list farming expertise requests
const getRequests = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'farmer') {
      filter.farmer = req.user.id;
    }

    const requests = await FarmingExpertiseRequest.find(filter)
      .populate('farmer', 'name email address')
      .populate('response.expert', 'name email')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (err) {
    console.error('getRequests error:', err);
    sendError(res, 500, 'Failed to fetch requests', err);
  }
};

// GET /api/farming-expertise/stock-images
// To list the available stock crop images
const getStockImages = async (req, res) => {
  try {
    const stockDir = path.join(__dirname, '../uploads/stock-crops');

    if (!fs.existsSync(stockDir)) {
      fs.mkdirSync(stockDir, { recursive: true });
    }

    const files = fs.readdirSync(stockDir);
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

    const stockImages = files
      .filter((file) => imageExtensions.includes(path.extname(file).toLowerCase()))
      .map((file) => {
        const nameWithoutExt = path.basename(file, path.extname(file));
        return {
          filename: file,
          name: nameWithoutExt.replace(/_/g, ' '),
          url: `/uploads/stock-crops/${file}`,
        };
      });

    res.json(stockImages);
  } catch (err) {
    console.error('getStockImages error:', err);
    sendError(res, 500, 'Failed to fetch stock images', err);
  }
};

// GET /api/farming-expertise/:id
// To get a single farming expertise request's details
const getRequestById = async (req, res) => {
  try {
    const request = await FarmingExpertiseRequest.findById(req.params.id)
      .populate('farmer', 'name email address')
      .populate('response.expert', 'name email');

    if (!request) {
      return res.status(404).json({ message: 'Expertise request not found' });
    }

    if (req.user.role === 'farmer' && request.farmer._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(request);
  } catch (err) {
    console.error('getRequestById error:', err);
    sendError(res, 500, 'Failed to fetch request details', err);
  }
};

// POST /api/farming-expertise/:id/respond
// To let an expert respond to a farming expertise request
const provideExpertise = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, selectedStockImage } = req.body;

    if (!description || !description.trim()) {
      return res.status(400).json({ message: 'Description is required' });
    }

    const expertiseRequest = await FarmingExpertiseRequest.findById(id);
    if (!expertiseRequest) {
      return res.status(404).json({ message: 'Expertise request not found' });
    }

    let attachment = null;
    let attachmentType = null;

    if (req.file) {
      attachment = `/uploads/expertise-attachments/${req.file.filename}`;
      const ext = path.extname(req.file.filename).toLowerCase();
      attachmentType = ext === '.pdf' ? 'upload_pdf' : 'upload_image';
    } else if (selectedStockImage && selectedStockImage.trim()) {
      attachment = selectedStockImage.trim();
      attachmentType = 'stock_image';
    }

    expertiseRequest.response = {
      expert: req.user.id,
      expertName: req.user.name || 'Agricultural Expert',
      description: description.trim(),
      attachment,
      attachmentType,
      answeredAt: new Date(),
    };

    expertiseRequest.status = 'answered';
    await expertiseRequest.save();

    await Notification.create({
      userId: expertiseRequest.farmer,
      message: `An expert has provided expertise for your ${expertiseRequest.cropName} request.`,
      link: '/farming-expertise/request',
    });

    const populated = await FarmingExpertiseRequest.findById(id)
      .populate('farmer', 'name email address')
      .populate('response.expert', 'name email');

    res.json({
      message: 'Farming expertise provided successfully',
      request: populated,
    });
  } catch (err) {
    console.error('provideExpertise error:', err);
    sendError(res, 500, 'Failed to submit expertise response', err);
  }
};

module.exports = {
  createRequest,
  getRequests,
  getStockImages,
  getRequestById,
  provideExpertise,
};
