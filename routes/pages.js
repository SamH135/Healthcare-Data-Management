const express = require('express');
const router = express.Router();
const { wss } = require('../app');
const authController = require('../controllers/auth')(wss);

router.get("/", (req, res) => {
    res.render("index");
});

router.get("/manage-nodes", (req, res) => {
    res.render("manage-nodes");
});

router.get("/single-patient-data", (req, res) => {
    res.render("single-patient-data");
});

router.get("/condition-proportion", (req, res) => {
    res.render("condition-proportion");
});

router.get("/condition-by-age-group", (req, res) => {
    res.render("condition-by-age-group");
});

router.get("/input-data", (req, res) => {
    res.render("input-data");
});

router.post('/sendTransaction', authController.sendTransaction);
router.post('/requestData', authController.requestData);
router.post('/addPatient', authController.addPatient);

module.exports = router;