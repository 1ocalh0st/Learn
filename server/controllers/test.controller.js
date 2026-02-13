const testService = require("../services/test.service");
const { z } = require("zod");

// 验证模式
const CreateProjectDTO = z.object({
    name: z.string().min(1).max(255),
    description: z.string().optional()
});

const CreateTestCaseDTO = z.object({
    projectId: z.number(),
    name: z.string().min(1).max(255),
    type: z.enum(['api', 'ui', 'load']),
    config: z.object({}).passthrough()
});

// 项目控制器
async function createProject(req, res) {
    try {
        const parsed = CreateProjectDTO.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                code: "VALIDATION_ERROR",
                message: parsed.error.issues[0]?.message || "invalid params"
            });
        }

        const { name, description } = parsed.data;
        const id = await testService.createProject(name, description);

        return res.json({
            code: "OK",
            message: "项目创建成功",
            data: { id, name, description }
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({
            code: "SERVER_ERROR",
            message: "服务器错误"
        });
    }
}

async function getProjects(req, res) {
    try {
        const projects = await testService.getProjects();
        return res.json({
            code: "OK",
            data: projects
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({
            code: "SERVER_ERROR",
            message: "服务器错误"
        });
    }
}

async function updateProject(req, res) {
    try {
        const { id } = req.params;
        const parsed = CreateProjectDTO.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                code: "VALIDATION_ERROR",
                message: "invalid params"
            });
        }

        const { name, description } = parsed.data;
        const success = await testService.updateProject(parseInt(id), name, description);

        if (!success) {
            return res.status(404).json({
                code: "NOT_FOUND",
                message: "项目不存在"
            });
        }

        return res.json({
            code: "OK",
            message: "项目更新成功"
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({
            code: "SERVER_ERROR",
            message: "服务器错误"
        });
    }
}

async function deleteProject(req, res) {
    try {
        const { id } = req.params;
        const success = await testService.deleteProject(parseInt(id));

        if (!success) {
            return res.status(404).json({
                code: "NOT_FOUND",
                message: "项目不存在"
            });
        }

        return res.json({
            code: "OK",
            message: "项目删除成功"
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({
            code: "SERVER_ERROR",
            message: "服务器错误"
        });
    }
}

// 测试用例控制器
async function createTestCase(req, res) {
    try {
        const parsed = CreateTestCaseDTO.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                code: "VALIDATION_ERROR",
                message: parsed.error.issues[0]?.message || "invalid params"
            });
        }

        const { projectId, name, type, config } = parsed.data;
        const id = await testService.createTestCase(projectId, name, type, config);

        return res.json({
            code: "OK",
            message: "测试用例创建成功",
            data: { id, projectId, name, type, config }
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({
            code: "SERVER_ERROR",
            message: "服务器错误"
        });
    }
}

async function getTestCases(req, res) {
    try {
        const { projectId, type } = req.query;
        const cases = await testService.getTestCases(
            parseInt(projectId),
            type || null
        );

        return res.json({
            code: "OK",
            data: cases
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({
            code: "SERVER_ERROR",
            message: "服务器错误"
        });
    }
}

async function updateTestCase(req, res) {
    try {
        const { id } = req.params;
        const { name, type, config } = req.body;

        const success = await testService.updateTestCase(
            parseInt(id),
            name,
            type,
            config
        );

        if (!success) {
            return res.status(404).json({
                code: "NOT_FOUND",
                message: "测试用例不存在"
            });
        }

        return res.json({
            code: "OK",
            message: "测试用例更新成功"
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({
            code: "SERVER_ERROR",
            message: "服务器错误"
        });
    }
}

async function deleteTestCase(req, res) {
    try {
        const { id } = req.params;
        const success = await testService.deleteTestCase(parseInt(id));

        if (!success) {
            return res.status(404).json({
                code: "NOT_FOUND",
                message: "测试用例不存在"
            });
        }

        return res.json({
            code: "OK",
            message: "测试用例删除成功"
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({
            code: "SERVER_ERROR",
            message: "服务器错误"
        });
    }
}

// 执行测试
async function executeTestCase(req, res) {
    try {
        const { id } = req.params;
        const testCase = await testService.getTestCaseById(parseInt(id));

        if (!testCase) {
            return res.status(404).json({
                code: "NOT_FOUND",
                message: "测试用例不存在"
            });
        }

        // 创建执行记录
        const executionId = await testService.createExecution(
            testCase.id,
            'running',
            {},
            0
        );

        // 异步执行测试（在后台执行）
        executeTest(testCase, executionId).catch(console.error);

        return res.json({
            code: "OK",
            message: "测试已开始执行",
            data: { executionId }
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({
            code: "SERVER_ERROR",
            message: "服务器错误"
        });
    }
}

// 后台执行测试
async function executeTest(testCase, executionId) {
    const startTime = Date.now();

    try {
        let result;

        const onProgress = async (partialResult) => {
            try {
                await testService.updateExecutionResult(executionId, partialResult);
            } catch (err) {
                console.error('Failed to update progress', err);
            }
        };

        // 根据测试类型调用不同的执行引擎
        if (testCase.type === 'api') {
            const apiTester = require('../engines/api-tester');
            result = await apiTester.execute(testCase.config, onProgress);
        } else if (testCase.type === 'ui') {
            const uiTester = require('../engines/ui-tester');
            result = await uiTester.execute(testCase.config, onProgress);
        } else if (testCase.type === 'load') {
            const loadTester = require('../engines/load-tester');
            result = await loadTester.execute(testCase.config, onProgress);
        }

        const duration = Date.now() - startTime;

        // 更新执行记录
        await testService.updateExecutionStatus(
            executionId,
            result.success ? 'passed' : 'failed',
            result,
            result.error || null
        );

        // 如果失败，发送通知
        if (!result.success) {
            const notificationService = require('../services/notification.service');
            const execution = await testService.getExecutionById(executionId);
            await notificationService.sendTestFailureReport(testCase, execution);
        }
    } catch (error) {
        const duration = Date.now() - startTime;
        await testService.updateExecutionStatus(
            executionId,
            'failed',
            { error: error.message },
            error.message
        );
    }
}

// 获取执行历史
async function getExecutions(req, res) {
    try {
        const { testCaseId, projectId, page, pageSize } = req.query;
        const result = await testService.getExecutions(
            testCaseId ? parseInt(testCaseId) : null,
            projectId ? parseInt(projectId) : null,
            page ? parseInt(page) : 1,
            pageSize ? parseInt(pageSize) : 20
        );

        return res.json({
            code: "OK",
            data: result.items,
            total: result.total,
            page: result.page,
            pageSize: result.pageSize
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({
            code: "SERVER_ERROR",
            message: "服务器错误"
        });
    }
}

// 获取单个执行详情（含完整result，含截图）
async function getExecutionDetail(req, res) {
    try {
        const { id } = req.params;
        const execution = await testService.getExecutionById(parseInt(id));

        if (!execution) {
            return res.status(404).json({
                code: "NOT_FOUND",
                message: "执行记录不存在"
            });
        }

        return res.json({
            code: "OK",
            data: execution
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({
            code: "SERVER_ERROR",
            message: "服务器错误"
        });
    }
}

module.exports = {
    createProject,
    getProjects,
    updateProject,
    deleteProject,
    createTestCase,
    getTestCases,
    updateTestCase,
    deleteTestCase,
    executeTestCase,
    getExecutions,
    getExecutionDetail
};
