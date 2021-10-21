var express = require("express");
var router = express.Router();
const mainController = require("../controllers/main");

/* GET home page. */
router.get("/", mainController.getIndex);

router.post("/upload", mainController.uploadFile);

router.post("/saveFile", mainController.saveFile);

router.post("/deleteFile", mainController.deleteFile);

router.post("/deleteMacroOnDevice", mainController.deleteMacroOnDevice);

router.post("/removeAllFile", mainController.removeAllFile);

router.post("/changeMacroActivationStatus", mainController.changeMacroActivationStatus);

router.get("/edit-device/:deviceId", mainController.getDevice);

router.post("/linkBackupToDevice", mainController.linkBackupToDevice);

router.post("/unlinkBackupFromDevice", mainController.unlinkBackupFromDevice);

router.get("/restoreShowroomToDefault", mainController.restoreShowroomToDefault);

module.exports = router;
