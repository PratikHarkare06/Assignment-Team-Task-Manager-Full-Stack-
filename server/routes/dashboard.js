const express = require('express');
const router = express.Router();
const { getStats, getOverdueTasks, getChartData, getMemberStats } = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/stats', getStats);
router.get('/overdue', getOverdueTasks);
router.get('/chart-data', getChartData);
router.get('/member-stats', getMemberStats);

module.exports = router;
