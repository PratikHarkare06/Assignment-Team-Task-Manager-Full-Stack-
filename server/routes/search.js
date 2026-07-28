const express = require('express');
const router = express.Router();
const { search } = require('../controllers/searchController');
const { protect } = require('../middleware/auth');

router.get('/', protect, search);

module.exports = router;
