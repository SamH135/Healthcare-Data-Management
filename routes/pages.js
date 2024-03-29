const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth'); // Adjust the path based on your actual folder structure

router.get("/", (req, res) => {
    res.render("index");
});

//router.get("/dashboard", authController.dashboard)

module.exports = router;