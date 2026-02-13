const express = require("express");
const reportController = require("../controllers/report.controller");
const auth = require("../middleware/auth");

const router = express.Router();

// 所有报告路由需要认证
router.use(auth);

// 报告相关路由
router.post("/", reportController.generateReport);
router.get("/", reportController.getReports);
router.get("/:id", reportController.getReportById);
router.get("/:id/download", reportController.downloadReport);
router.delete("/:id", reportController.deleteReport);

module.exports = router;
