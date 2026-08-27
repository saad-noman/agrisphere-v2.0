const express = require('express');

const router = express.Router();

const {
  submitDiseaseCase,
  searchTags,
  createTag,
  deleteTag,

  getDiseaseCases,
  getDiseaseCase,
  getDiseaseMatches,
  submitDiagnosisReport,

  createDisease,
  getDiseases,
  getDisease,
  deleteDisease,
} = require('../controllers/diseaseController');

const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

const { diseaseUpload, verifyImageContent } = require('../middleware/uploadMiddleware');

router.get('/tags', protect, searchTags);
router.delete( '/tags/:tagId', protect, requireRole('expert'), deleteTag );
router.post('/tags', protect, requireRole('expert'), createTag);

router.post('/', protect, diseaseUpload.array('images', 5), verifyImageContent, submitDiseaseCase);

router.get('/library', protect, getDiseases);
router.get('/library/:id', protect, getDisease);
router.post('/library', protect, requireRole('expert'), createDisease);
router.delete('/library/:id', protect, requireRole('expert'), deleteDisease);

router.get('/', protect, getDiseaseCases);

router.post('/:caseId/diagnosis', protect, requireRole('expert'), submitDiagnosisReport);
router.get('/:caseId/matches', protect, getDiseaseMatches);

router.get('/:caseId', protect, getDiseaseCase);

module.exports = router;
