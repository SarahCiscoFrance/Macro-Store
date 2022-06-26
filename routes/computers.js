var express = require('express');
var router = express.Router();
const computerController = require("../controllers/computers");

/* GET home page. */
router.post("/add", computerController.addComputer);

router.post("/update/:id", computerController.updateComputer)

router.post("/delete/:id", computerController.deleteComputer);

router.post("/action", computerController.sendCommand);

module.exports = router;
