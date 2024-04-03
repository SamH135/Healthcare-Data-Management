const express = require('express');
const { wss } = require('../app');
const authController = require('../controllers/auth')(wss);
const router = express.Router();

// Add routes here



module.exports = router;