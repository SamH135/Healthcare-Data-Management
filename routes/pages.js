const express = require('express');
const router = express.Router();
const { wss } = require('../app');
const authController = require('../controllers/auth')(wss);

router.get("/", (req, res) => {
    res.render("index");
});

router.get("/data-visualization", (req, res) => {
    res.render("data-visualization");
});

router.post('/sendTransaction', authController.sendTransaction);
router.post('/requestData', authController.requestData);

module.exports = router;