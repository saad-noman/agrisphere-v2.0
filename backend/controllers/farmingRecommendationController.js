const { spawn } = require('child_process');
const path = require('path');
const FarmingRecommendation = require('../models/FarmingRecommendation');
const sendError = require('../utils/sendError');

// POST /api/farming-recommendation/predict
// To predict the most suitable crop from soil/weather inputs
const predictCrop = (req, res) => {
  try {
    const payload = req.body || {};

    const requiredFields = ['n', 'p', 'k', 'ph', 'temperature', 'humidity', 'moisture', 'rainfall'];
    const missingFields = requiredFields.filter(
      (field) => payload[field] === undefined || payload[field] === null || payload[field] === ''
    );

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: 'All crop input fields are required',
        missingFields,
      });
    }

    const input = requiredFields.map((field) => payload[field]);
    const pythonExecutable = process.env.PYTHON || process.env.PYTHON_PATH || (process.platform === 'win32' ? 'python' : 'python3');
    const scriptPath = path.join(__dirname, '..', 'ml_models', 'farmingrecommendationpredict.py');

    const pythonProcess = spawn(pythonExecutable, [scriptPath, ...input], {
      cwd: path.join(__dirname, '..', 'ml_models'),
    });


    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', async (code) => {
      if (code !== 0) {
        return sendError(res, 500, 'Crop prediction failed', new Error(stderr.trim() || 'The Python inference script exited with an error.'));
      }

      const crop = stdout.trim();
      if (!crop) {
        return res.status(500).json({ message: 'Crop prediction failed' });
      }

      try {
        const savedRecord = await FarmingRecommendation.create({
          user: req.user._id,
          inputs: {
            n: Number(payload.n),
            p: Number(payload.p),
            k: Number(payload.k),
            ph: Number(payload.ph),
            temperature: Number(payload.temperature),
            humidity: Number(payload.humidity),
            moisture: Number(payload.moisture),
            rainfall: Number(payload.rainfall),
          },
          recommendedCrop: crop,
        });

        return res.json({ crop, record: savedRecord });
      } catch (saveError) {
        return sendError(res, 500, 'Failed to save prediction record', saveError);
      }
    });
  } catch (error) {
    return sendError(res, 500, 'Crop prediction failed', error);
  }
};

// GET /api/farming-recommendation/history
// To get the logged-in user's crop recommendation history
const getHistory = async (req, res) => {
  try {
    const history = await FarmingRecommendation.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100);
    return res.json(history);
  } catch (error) {
    return sendError(res, 500, 'Failed to fetch recommendation history', error);
  }
};

// GET /api/farming-recommendation/history/:id
// To get a single crop recommendation record
const getHistoryById = async (req, res) => {
  try {
    const record = await FarmingRecommendation.findOne({ _id: req.params.id, user: req.user._id });
    if (!record) {
      return res.status(404).json({ message: 'Recommendation record not found' });
    }
    return res.json(record);
  } catch (error) {
    return sendError(res, 500, 'Failed to fetch record', error);
  }
};

// DELETE /api/farming-recommendation/history/:id
// To delete a crop recommendation record
const deleteHistory = async (req, res) => {
  try {
    const record = await FarmingRecommendation.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!record) {
      return res.status(404).json({ message: 'Recommendation record not found or unauthorized' });
    }
    return res.json({ message: 'Record deleted successfully', id: req.params.id });
  } catch (error) {
    return sendError(res, 500, 'Failed to delete record', error);
  }
};

module.exports = {
  predictCrop,
  getHistory,
  getHistoryById,
  deleteHistory,

}