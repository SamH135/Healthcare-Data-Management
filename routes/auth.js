const express = require('express');
const { wss } = require('../app');
const authController = require('../controllers/auth')(wss);
const router = express.Router();

// Add routes here
// router.post('/register', authController.register);

module.exports = router;