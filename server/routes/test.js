const express = require("express");
const testController = require("../controllers/test.controller");

const router = express.Router();

// 项目相关路由
router.post("/projects", testController.createProject);
router.get("/projects", testController.getProjects);
router.put("/projects/:id", testController.updateProject);
router.delete("/projects/:id", testController.deleteProject);

// 测试用例相关路由
router.post("/cases", testController.createTestCase);
router.get("/cases", testController.getTestCases);
router.put("/cases/:id", testController.updateTestCase);
router.delete("/cases/:id", testController.deleteTestCase);

// 测试执行相关路由
router.post("/cases/:id/execute", testController.executeTestCase);
router.get("/executions", testController.getExecutions);
router.get("/executions/:id", testController.getExecutionDetail);

module.exports = router;
