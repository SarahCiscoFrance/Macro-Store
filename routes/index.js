var express = require("express");
var router = express.Router();
const mainController = require("../controllers/main");

/* GET home page. */
router.get("/", mainController.getIndex);

router.get("/expert", mainController.getExpert);

router.get("/advanced", mainController.getAdvanced);

router.post("/upload", mainController.uploadFile);

router.post("/saveFile", mainController.saveFile);

router.post("/deleteFile", mainController.deleteFile);

router.post("/deleteMacroOnDevice", mainController.deleteMacroOnDevice);

router.post("/removeAllFile", mainController.removeAllFile);

router.post("/changeMacroActivationStatus", mainController.changeMacroActivationStatus);

router.post("/setCurrentConfiAsBackup", mainController.setCurrentConfiAsBackup);

router.get("/edit-device/:deviceId", mainController.getDevice);

router.post("/linkBackupToDevice", mainController.linkBackupToDevice);

router.post("/unlinkBackupFromDevice", mainController.unlinkBackupFromDevice);

router.get("/restoreShowroomToDefault", mainController.restoreShowroomToDefault);

router.post("/saveTemplate", mainController.saveTemplate)

router.get("/deleteTemplate/:id", mainController.deleteTemplate)

router.get("/loadTemplate/:id", mainController.loadTemplate)

router.get("/githubMacro", mainController.getGithubMacro)

router.post("/githubMacro", mainController.declareGithubMacro)

router.get("/deleteGithubMacro/:id", mainController.deleteGithubMacro)

router.post("/addGithubMacroToDevice", mainController.addGithubMacroToDevice)

module.exports = router;
