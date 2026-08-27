const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const CropAnalysis = require('../models/CropAnalysis');
const { getDiseaseReport } = require('../services/agriKnowledgeService');
const sendError = require('../utils/sendError');

const ML_DIR = path.join(__dirname, '..', 'ml_models');
const pythonExecutable =
  process.env.PYTHON || process.env.PYTHON_PATH || (process.platform === 'win32' ? 'python' : 'python3');

// To run a Python CV inference script and return its parsed JSON output
function runInference(script, imagePath) {
  return new Promise((resolve, reject) => {
    const proc = spawn(pythonExecutable, [path.join(ML_DIR, script), imagePath], { cwd: ML_DIR });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => (stdout += d.toString()));
    proc.stderr.on('data', (d) => (stderr += d.toString()));
    proc.on('error', (err) => reject(err));
    proc.on('close', (code) => {
      if (code !== 0 && !stdout.trim()) {
        return reject(new Error(stderr.trim() || 'Inference process failed'));
      }
      try {
        const lastLine = stdout.trim().split('\n').filter(Boolean).pop();
        resolve(JSON.parse(lastLine));
      } catch (e) {
        reject(new Error('Could not parse inference output'));
      }
    });
  });
}

const confidencePct = (c) => (typeof c === 'number' ? Math.round(c * 100) : null);

// POST /api/crop-analysis/detect-disease
// To detect a crop disease from an uploaded image and generate its report
const detectDisease = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'An image file is required' });
  const imagePath = req.file.path;
  const publicImage = `/uploads/crop-analysis/${req.file.filename}`;

  try {
    const prediction = await runInference('disease_detect.py', imagePath);
    if (prediction.error) {
      return res.status(422).json({ message: `Image could not be analyzed (${prediction.error})` });
    }

    const { report, source: reportSource } = await getDiseaseReport(prediction.label, prediction.crop);

    const saved = await CropAnalysis.create({
      user: req.user._id,
      kind: 'disease',
      image: publicImage,
      label: report.diseaseName || prediction.label,
      crop: prediction.crop || report.affectedCrop || '',
      confidence: prediction.confidence,
      lowConfidence: Boolean(prediction.lowConfidence),
      modelUsed: prediction.model,
      alternatives: prediction.alternatives || [],
      report,
      reportSource,
    });

    res.json({
      _id: saved._id,
      kind: 'disease',
      image: publicImage,
      prediction: {
        label: prediction.label,
        crop: prediction.crop || null,
        healthy: Boolean(prediction.healthy),
        confidence: prediction.confidence,
        confidencePct: confidencePct(prediction.confidence),
        lowConfidence: Boolean(prediction.lowConfidence),
        model: prediction.model,
        alternatives: (prediction.alternatives || []).map((a) => ({
          ...a,
          confidencePct: confidencePct(a.confidence),
        })),
        note: prediction.note || null,
      },
      report,
      reportSource,
    });
  } catch (err) {
    sendError(res, 500, 'Disease detection failed', err);
  }
};

// GET /api/crop-analysis/history
// To get the logged-in user's past crop analysis history
const getHistory = async (req, res) => {
  try {
    const filter = { user: req.user._id };
    if (req.query.kind === 'identify' || req.query.kind === 'disease') filter.kind = req.query.kind;
    const history = await CropAnalysis.find(filter).sort({ createdAt: -1 }).limit(50).lean();
    res.json(history);
  } catch (err) {
    sendError(res, 500, 'Failed to fetch history', err);
  }
};

// GET /api/crop-analysis/history/:id
// To get a single crop analysis record by id
const getHistoryItem = async (req, res) => {
  try {
    const item = await CropAnalysis.findOne({ _id: req.params.id, user: req.user._id }).lean();
    if (!item) return res.status(404).json({ message: 'Analysis not found' });
    res.json(item);
  } catch (err) {
    sendError(res, 500, 'Failed to fetch analysis', err);
  }
};

// DELETE /api/crop-analysis/history/:id
// To delete a crop analysis record and its stored image
const deleteHistoryItem = async (req, res) => {
  try {
    const item = await CropAnalysis.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!item) return res.status(404).json({ message: 'Analysis not found' });
    if (item.image) {
      fs.unlink(path.join(__dirname, '..', item.image.replace(/^\//, '')), () => {});
    }
    res.json({ message: 'Deleted', id: req.params.id });
  } catch (err) {
    sendError(res, 500, 'Failed to delete analysis', err);
  }
};

module.exports = { detectDisease, getHistory, getHistoryItem, deleteHistoryItem };
