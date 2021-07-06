var express = require('express');
var router = express.Router();
const mainController = require("../controllers/main");

/* GET home page. */
router.get('/', mainController.getIndex);

router.post('/upload', mainController.uploadFile);

router.post('/saveFile', mainController.saveFile);

router.post('/deleteFile', mainController.deleteFile);

router.post('/removeAllMacro', mainController.removeAllMacro);

module.exports = router;
