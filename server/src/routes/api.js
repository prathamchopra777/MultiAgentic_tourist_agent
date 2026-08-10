const express = require('express');
const router = express.Router();
const RecommendationController = require('../controllers/recommendationController');

// Test endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'API is running' });
});

// Main recommendation endpoint
router.post('/recommendations', RecommendationController.getRecommendations);

module.exports = router;
