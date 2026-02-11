const express = require("express");
const aiController = require("../controllers/ai.controller");

const router = express.Router();

// AI生成相关路由 (预留接口)
router.post("/generate", aiController.generateTestCases);

module.exports = router;
