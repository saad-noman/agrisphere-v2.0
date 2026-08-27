const express = require('express');
const router = express.Router();
const { listExperts, getExpert } = require('../controllers/expertController');

router.get('/', listExperts);
router.get('/:id', getExpert);

module.exports = router;
