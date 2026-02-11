const { pool } = require("../db");
const path = require("path");
const fs = require("fs").promises;
const ejs = require("ejs");

// 报告存储目录
const REPORTS_DIR = path.join(__dirname, "../reports");

// 确保报告目录存在
async function ensureReportsDir() {
    try {
        await fs.access(REPORTS_DIR);
    } catch {
        await fs.mkdir(REPORTS_DIR, { recursive: true });
    }
}

// 创建测试报告
async function createReport(projectId, executionIds, summary) {
    await ensureReportsDir();

    const reportId = Date.now();
    const fileName = `report_${reportId}.html`;
    const filePath = path.join(REPORTS_DIR, fileName);

    // 生成HTML报告 (使用EJS模板 - 将在下一步创建模板)
    const htmlContent = await generateReportHTML(summary, executionIds);
    await fs.writeFile(filePath, htmlContent);

    // 保存到数据库
    const [result] = await pool.query(
        "INSERT INTO test_reports (project_id, execution_ids, summary, file_path) VALUES (?, ?, ?, ?)",
        [projectId, JSON.stringify(executionIds), JSON.stringify(summary), filePath]
    );

    return {
        id: result.insertId,
        filePath,
        fileName
    };
}

// 获取报告列表
async function getReports(projectId = null) {
    let query = "SELECT * FROM test_reports";
    const params = [];

    if (projectId) {
        query += " WHERE project_id = ?";
        params.push(projectId);
    }

    query += " ORDER BY created_at DESC";

    const [reports] = await pool.query(query, params);
    return reports.map(r => ({
        ...r,
        execution_ids: typeof r.execution_ids === 'string' ? JSON.parse(r.execution_ids) : r.execution_ids,
        summary: typeof r.summary === 'string' ? JSON.parse(r.summary) : r.summary
    }));
}

// 获取报告详情
async function getReportById(id) {
    const [reports] = await pool.query(
        "SELECT * FROM test_reports WHERE id = ?",
        [id]
    );

    if (reports.length === 0) return null;

    const report = reports[0];
    return {
        ...report,
        execution_ids: typeof report.execution_ids === 'string' ? JSON.parse(report.execution_ids) : report.execution_ids,
        summary: typeof report.summary === 'string' ? JSON.parse(report.summary) : report.summary
    };
}

// 生成HTML报告内容
async function generateReportHTML(summary, executionIds) {
    const testService = require("./test.service");

    // 获取每个执行记录的完整数据（含截图）
    const executions = [];
    for (const id of executionIds) {
        try {
            const exec = await testService.getExecutionById(id);
            if (exec) {
                const testCase = await testService.getTestCaseById(exec.test_case_id);
                executions.push({ ...exec, testCase });
            }
        } catch { /* skip */ }
    }

    // SVG Icons
    const icons = {
        pass: '<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16"><path fill-rule="evenodd" clip-rule="evenodd" d="M24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44ZM32.5429 20.3015L21.4985 31.8797L15.4571 25.5453C14.8878 24.9484 14.8878 23.9806 15.4571 23.3838C16.0264 22.7869 16.9493 22.7869 17.5186 23.3838L21.986 28.0673L31.42 17.6534L31.5583 17.525C32.1265 17.062 33.0487 17.1594 33.5137 17.8105C33.9113 18.3672 33.8829 19.1088 33.4893 19.646L32.5429 20.3015Z" fill="#00b42a"/></svg>',
        fail: '<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16"><path fill-rule="evenodd" clip-rule="evenodd" d="M24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44ZM15.3976 17.5186C14.8118 16.9328 14.8118 15.9831 15.3976 15.3973C15.9834 14.8115 16.9331 14.8115 17.5189 15.3973L24.0003 21.8787L30.4817 15.3973C31.0675 14.8115 32.0172 14.8115 32.603 15.3973C33.1887 15.9831 33.1887 16.9328 32.603 17.5186L26.1216 24L32.603 30.4814C33.1887 31.0672 33.1887 32.0169 32.603 32.6027C32.0172 33.1885 31.0675 33.1885 30.4817 32.6027L24.0003 26.1213L17.5189 32.6027C16.9331 33.1885 15.9834 33.1885 15.3976 32.6027C14.8118 32.0169 14.8118 31.0672 15.3976 30.4814L21.879 24L15.3976 17.5186Z" fill="#f53f3f"/></svg>',
        chart: '<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="24" height="24" stroke="currentColor" stroke-width="4"><path d="M6 6V42H42" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 30L22 22L30 30L42 14" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        camera: '<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="20" height="20" stroke="currentColor" stroke-width="4"><path d="M15 12L18 6H30L33 12H42C43.1046 12 44 12.8954 44 14V40C44 41.1046 43.1046 42 42 42H6C4.89543 42 4 41.1046 4 40V14C4 12.8954 4.89543 12 6 12H15Z" stroke-linejoin="round"/><circle cx="24" cy="28" r="8"/></svg>'
    };

    const template = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>测试报告 - <%= new Date().toLocaleString() %></title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f0f2f5; padding: 20px; min-height: 100vh; color: #1d2129; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: white; border-bottom: 1px solid #e5e6eb; padding: 24px 30px; display: flex; align-items: center; justify-content: space-between; }
        .header-left { display: flex; align-items: center; gap: 12px; }
        h1 { font-size: 20px; margin: 0; font-weight: 500; display: flex; align-items: center; gap: 8px; }
        .timestamp { color: #86909c; font-size: 14px; }
        .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: #e5e6eb; padding: 1px 0; margin-bottom: 20px; }
        .stat-card { background: white; padding: 24px; text-align: center; }
        .stat-value { font-size: 32px; font-weight: bold; margin: 8px 0; line-height: 1.2; }
        .stat-label { color: #86909c; font-size: 14px; }
        .passed .stat-value { color: #00b42a; }
        .failed .stat-value { color: #f53f3f; }
        .total .stat-value { color: #165dff; }
        .pass-rate .stat-value { color: #0fc6c2; }
        .content { padding: 0 30px 30px; }
        .exec-card { border: 1px solid #e5e6eb; border-radius: 4px; margin-bottom: 16px; overflow: hidden; }
        .exec-header { padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; background: #f7f8fa; font-weight: 500; }
        .exec-header.pass { border-left: 4px solid #00b42a; }
        .exec-header.fail { border-left: 4px solid #f53f3f; }
        .exec-body { padding: 16px; }
        .step-item { padding: 8px 12px; margin: 4px 0; border-radius: 2px; font-size: 14px; display: flex; align-items: center; gap: 8px; }
        .step-item.pass { background: #e8ffea; color: #00b42a; }
        .step-item.fail { background: #ffece8; color: #f53f3f; }
        .step-icon { display: flex; align-items: center; width: 16px; height: 16px; flex-shrink: 0; }
        .step-msg { flex: 1; color: #1d2129; }
        .step-action { font-weight: bold; margin-right: 8px; }
        .screenshot-section { margin-top: 16px; border-top: 1px solid #f2f3f5; padding-top: 12px; }
        .screenshot-section h3 { font-size: 16px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
        .screenshot-img { max-width: 100%; border: 1px solid #e5e6eb; border-radius: 4px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        .tag { padding: 2px 8px; border-radius: 2px; font-size: 12px; line-height: 20px; }
        .tag.pass { background: #e8ffea; color: #00b42a; }
        .tag.fail { background: #ffece8; color: #f53f3f; }
        .tag.type { background: #f2f3f5; color: #4e5969; margin-left: 8px; }
        .perf-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 12px 0; }
        .perf-item { background: #f7f8fa; padding: 12px; border-radius: 4px; text-align: center; }
        .perf-item .label { font-size: 12px; color: #86909c; margin-bottom: 4px; }
        .perf-item .value { font-size: 16px; font-weight: 600; }
        .error-box { background: #fff7f7; border: 1px solid #fcc; color: #f53f3f; padding: 12px; border-radius: 4px; margin-bottom: 12px; }
        
        /* Image Preview Overlay */
        #image-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.85); display: none; align-items: center; justify-content: center;
            z-index: 1000; cursor: zoom-out;
        }
        #image-overlay img { max-width: 90%; max-height: 90%; box-shadow: 0 0 20px rgba(0,0,0,0.5); border-radius: 4px; }
        .clickable-img { cursor: zoom-in; transition: opacity 0.2s; }
        .clickable-img:hover { opacity: 0.9; }
    </style>
</head>
<body>
    <div id="image-overlay" onclick="this.style.display='none'">
        <img id="overlay-img" src="" alt="Preview">
    </div>
    <script>
        function showImage(src) {
            const overlay = document.getElementById('image-overlay');
            const img = document.getElementById('overlay-img');
            img.src = src;
            overlay.style.display = 'flex';
        }
    </script>
    <div class="container">
        <div class="header">
            <div class="header-left">
                <h1><%- icons.chart %> 自动化测试报告</h1>
            </div>
            <div class="timestamp">生成时间: <%= new Date().toLocaleString('zh-CN') %></div>
        </div>

        <div class="summary">
            <div class="stat-card">
                <div class="stat-value total"><%= summary.total || 0 %></div>
                <div class="stat-label">总用例数</div>
            </div>
            <div class="stat-card">
                <div class="stat-value passed"><%= summary.passed || 0 %></div>
                <div class="stat-label">通过</div>
            </div>
            <div class="stat-card">
                <div class="stat-value failed"><%= summary.failed || 0 %></div>
                <div class="stat-label">失败</div>
            </div>
            <div class="stat-card">
                <div class="stat-value pass-rate"><%= summary.passRate || '0%' %></div>
                <div class="stat-label">通过率</div>
            </div>
        </div>

        <div class="content">
            <% executions.forEach(function(exec, idx) { %>
            <div class="exec-card">
                <div class="exec-header <%= exec.status === 'passed' ? 'pass' : 'fail' %>">
                    <span>
                        #<%= idx + 1 %> <%= exec.testCase ? exec.testCase.name : '用例#' + exec.test_case_id %>
                        <span class="tag type"><%= exec.testCase ? exec.testCase.type.toUpperCase() : '' %></span>
                    </span>
                    <span>
                        <span class="tag <%= exec.status === 'passed' ? 'pass' : 'fail' %>">
                            <%= exec.status === 'passed' ? 'PASS' : 'FAIL' %>
                        </span>
                        <% if (exec.duration) { %> <span style="color:#86909c;margin-left:8px"><%= exec.duration %>ms</span><% } %>
                    </span>
                </div>
                <div class="exec-body">
                    <% if (exec.error_message) { %>
                    <div class="error-box"><%- icons.fail %> <%= exec.error_message %></div>
                    <% } %>

                    <% var result = exec.result || {}; %>

                    <% if (result.steps) { %>
                    <% result.steps.forEach(function(s, si) { %>
                    <div class="step-item <%= s.success ? 'pass' : 'fail' %>">
                        <span class="step-icon"><%- s.success ? icons.pass : icons.fail %></span>
                        <div class="step-msg">
                            <span class="step-action"><%= s.action %></span>
                            <%= (s.message || '').replace(/^\[(PASS|FAIL)\] /, '') %>
                        </div>
                        <% if (s.duration) { %><span style="font-size:12px;opacity:0.6"><%= s.duration %>ms</span><% } %>
                    </div>
                    <% if (s.detail && s.detail.screenshot) { %>
                    <div style="margin-top:8px;margin-left:24px;">
                        <img src="data:image/png;base64,<%= s.detail.screenshot %>" 
                             class="clickable-img"
                             onclick="showImage(this.src)"
                             style="max-height:200px;border:1px solid #eee;border-radius:4px;" />
                    </div>
                    <% } %>
                    <% }); %>
                    <% } %>

                    <% if (result.assertions) { %>
                    <% result.assertions.forEach(function(a) { %>
                    <div class="step-item <%= a.passed ? 'pass' : 'fail' %>">
                        <span class="step-icon"><%- a.passed ? icons.pass : icons.fail %></span>
                        <div class="step-msg"><%= (a.message || '').replace(/^\[(PASS|FAIL)\] /, '') %></div>
                    </div>
                    <% }); %>
                    <% } %>

                    <% if (result.screenshot) { %>
                    <div class="screenshot-section">
                        <h3><%- icons.camera %> 页面截图</h3>
                        <img src="data:image/png;base64,<%= result.screenshot %>" 
                             class="screenshot-img clickable-img" 
                             onclick="showImage(this.src)" />
                    </div>
                    <% } %>
                    
                    <% if (result.metrics) { /* Load test metrics simplified */ %>
                        <div style="margin-top:10px;font-size:14px;white-space:pre-wrap;font-family:monospace;background:#f8f9fa;padding:10px;"><%= result.summary || '' %></div>
                    <% } %>
                </div>
            </div>
            <% }); %>
        </div>
    </div>
</body>
</html>
    `;

    return ejs.render(template, { summary, executionIds, executions, icons });
}

module.exports = {
    createReport,
    getReports,
    getReportById,
    REPORTS_DIR
};
