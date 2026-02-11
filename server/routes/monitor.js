const express = require("express");
const monitorController = require("../controllers/monitor.controller");

const router = express.Router();

// 监控相关路由
router.post("/errors", monitorController.logError);
router.get("/errors", monitorController.getErrors);
router.get("/stats", monitorController.getErrorStats);

module.exports = router;
