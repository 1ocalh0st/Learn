const { pool } = require("../db");
const { processScreenshots } = require("../utils/image.utils");

// 测试项目管理
async function createProject(name, description) {
    const [result] = await pool.query(
        "INSERT INTO test_projects (name, description) VALUES (?, ?)",
        [name, description]
    );
    return result.insertId;
}

async function getProjects() {
    const [projects] = await pool.query(
        "SELECT * FROM test_projects ORDER BY created_at DESC"
    );
    return projects;
}

async function getProjectById(id) {
    const [projects] = await pool.query(
        "SELECT * FROM test_projects WHERE id = ?",
        [id]
    );
    return projects[0] || null;
}

async function updateProject(id, name, description) {
    const [result] = await pool.query(
        "UPDATE test_projects SET name = ?, description = ? WHERE id = ?",
        [name, description, id]
    );
    return result.affectedRows > 0;
}

async function deleteProject(id) {
    const [result] = await pool.query(
        "DELETE FROM test_projects WHERE id = ?",
        [id]
    );
    return result.affectedRows > 0;
}

// 测试用例管理
async function createTestCase(projectId, name, type, config, aiGenerated = 0) {
    const [result] = await pool.query(
        "INSERT INTO test_cases (project_id, name, type, config, ai_generated) VALUES (?, ?, ?, ?, ?)",
        [projectId, name, type, JSON.stringify(config), aiGenerated]
    );
    return result.insertId;
}

async function getTestCases(projectId, type = null) {
    let query = "SELECT * FROM test_cases WHERE project_id = ? AND status = 'active'";
    const params = [projectId];

    if (type) {
        query += " AND type = ?";
        params.push(type);
    }

    query += " ORDER BY created_at DESC";

    const [cases] = await pool.query(query, params);
    return cases.map(c => ({
        ...c,
        config: typeof c.config === 'string' ? JSON.parse(c.config) : c.config
    }));
}

async function getTestCaseById(id) {
    const [cases] = await pool.query(
        "SELECT * FROM test_cases WHERE id = ?",
        [id]
    );
    if (cases.length === 0) return null;
    const testCase = cases[0];
    return {
        ...testCase,
        config: typeof testCase.config === 'string' ? JSON.parse(testCase.config) : testCase.config
    };
}

async function updateTestCase(id, name, type, config) {
    const [result] = await pool.query(
        "UPDATE test_cases SET name = ?, type = ?, config = ? WHERE id = ?",
        [name, type, JSON.stringify(config), id]
    );
    return result.affectedRows > 0;
}

async function deleteTestCase(id) {
    const [result] = await pool.query(
        "UPDATE test_cases SET status = 'archived' WHERE id = ?",
        [id]
    );
    return result.affectedRows > 0;
}

// 测试执行记录
async function createExecution(testCaseId, status, result, duration, errorMessage = null) {
    const [execution] = await pool.query(
        "INSERT INTO test_executions (test_case_id, status, result, duration, error_message) VALUES (?, ?, ?, ?, ?)",
        [testCaseId, status, JSON.stringify(result), duration, errorMessage]
    );
    return execution.insertId;
}

async function getExecutions(testCaseId = null, projectId = null, page = 1, pageSize = 20) {
    // 列表查询不选取 result 列，避免大JSON导致MySQL排序内存溢出 (Out of sort memory)
    let baseQuery = " FROM test_executions e JOIN test_cases c ON e.test_case_id = c.id";
    let whereClause = "";
    const params = [];

    if (testCaseId) {
        whereClause = " WHERE e.test_case_id = ?";
        params.push(testCaseId);
    } else if (projectId) {
        whereClause = " WHERE c.project_id = ?";
        params.push(projectId);
    }

    // 获取总数
    const [countResult] = await pool.query("SELECT COUNT(*) as total" + baseQuery + whereClause, params);
    const total = countResult[0].total;

    // 获取分页数据
    let dataQuery = "SELECT e.id, e.test_case_id, e.status, e.duration, e.error_message, e.executed_at, c.name as test_case_name" + baseQuery + whereClause;
    dataQuery += " ORDER BY e.executed_at DESC LIMIT ? OFFSET ?";

    const offset = (page - 1) * pageSize;
    const [executions] = await pool.query(dataQuery, [...params, pageSize, offset]);

    return {
        items: executions.map(e => ({ ...e, result: {} })),
        total,
        page,
        pageSize
    };
}

// 剥离result中的截图base64数据，用标记替换
function stripScreenshots(result) {
    const stripped = { ...result };
    if (stripped.screenshot) {
        stripped.hasScreenshot = true;
        delete stripped.screenshot;
    }
    if (Array.isArray(stripped.steps)) {
        stripped.steps = stripped.steps.map(s => {
            if (s.detail && s.detail.screenshot) {
                return { ...s, detail: { ...s.detail, hasScreenshot: true, screenshot: undefined } };
            }
            return s;
        });
    }
    return stripped;
}

async function getExecutionById(id) {
    const [executions] = await pool.query(
        "SELECT * FROM test_executions WHERE id = ?",
        [id]
    );
    if (executions.length === 0) return null;
    const execution = executions[0];
    const result = typeof execution.result === 'string' ? JSON.parse(execution.result) : (execution.result || {});

    // Re-hydrate screenshots if they are stored as paths
    const fs = require('fs').promises;
    const path = require('path');

    const loadScreenshot = async (filename) => {
        if (!filename) return null;
        if (filename.startsWith('data:image')) return filename.replace(/^data:image\/\w+;base64,/, "");
        try {
            const data = await fs.readFile(path.join(__dirname, '../public/screenshots', filename));
            return data.toString('base64');
        } catch (e) {
            return null;
        }
    };

    if (result.screenshotPath) {
        result.screenshot = await loadScreenshot(result.screenshotPath);
    }
    if (result.steps && Array.isArray(result.steps)) {
        for (const step of result.steps) {
            if (step.detail && step.detail.screenshotPath) {
                step.detail.screenshot = await loadScreenshot(step.detail.screenshotPath);
            }
        }
    }

    return {
        ...execution,
        result
    };
}

async function updateExecutionStatus(id, status, result, errorMessage = null) {
    // Process screenshots in result before saving
    const processedResult = await processScreenshots(result);

    const duration = processedResult && processedResult.duration ? processedResult.duration : null;
    const [execution] = await pool.query(
        "UPDATE test_executions SET status = ?, result = ?, duration = ?, error_message = ? WHERE id = ?",
        [status, JSON.stringify(processedResult), duration, errorMessage, id]
    );
    return execution.affectedRows > 0;
}

module.exports = {
    // 项目
    createProject,
    getProjects,
    getProjectById,
    updateProject,
    deleteProject,

    // 用例
    createTestCase,
    getTestCases,
    getTestCaseById,
    updateTestCase,
    deleteTestCase,

    // 执行
    createExecution,
    getExecutions,
    getExecutionById,
    updateExecutionStatus,
    updateExecutionResult
};

async function updateExecutionResult(id, result) {
    // Process screenshots in result before saving
    const processedResult = await processScreenshots(result);

    const [execution] = await pool.query(
        "UPDATE test_executions SET result = ? WHERE id = ?",
        [JSON.stringify(processedResult), id]
    );
    return execution.affectedRows > 0;
}
