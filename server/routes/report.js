const express = require("express");
const reportController = require("../controllers/report.controller");

const router = express.Router();

// 报告相关路由
router.post("/", reportController.generateReport);
router.get("/", reportController.getReports);
router.get("/:id", reportController.getReportById);
router.get("/:id/download", reportController.downloadReport);

module.exports = router;
