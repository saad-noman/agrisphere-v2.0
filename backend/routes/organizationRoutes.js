const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { upload, verifyImageContent } = require('../middleware/uploadMiddleware');
const {
  listOrganizations,
  getMyOrganizations,
  getOrganization,
  createOrganization,
  updateOrganization,
  deleteOrganizationPhoto,
  deleteOrganization,
} = require('../controllers/organizationController');

// Order matters: '/mine' must come before '/:id' or it would be treated as an id.
router.get('/mine', protect, authorize('organization_owner'), getMyOrganizations);
router.get('/:id', getOrganization);
router.get('/', listOrganizations);
router.post('/', protect, authorize('organization_owner'), upload.single('photo'), verifyImageContent, createOrganization);
router.put('/:id', protect, authorize('organization_owner'), upload.single('photo'), verifyImageContent, updateOrganization);
router.delete('/:id/photo', protect, authorize('organization_owner'), deleteOrganizationPhoto);
router.delete('/:id', protect, authorize('organization_owner'), deleteOrganization);

module.exports = router;
