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

    // 生成HTML报告 (使用EJS模板)
    const htmlContent = await generateReportHTML(summary, executionIds, projectId);
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
async function getReports(projectId = null, page = 1, pageSize = 10) {
    let whereClause = "";
    const params = [];

    if (projectId) {
        whereClause = " WHERE project_id = ?";
        params.push(projectId);
    }

    // 获取总数
    const [countResult] = await pool.query("SELECT COUNT(*) as total FROM test_reports" + whereClause, params);
    const total = countResult[0].total;

    // 获取分页数据
    let query = `
        SELECT r.*, p.name as project_name 
        FROM test_reports r 
        LEFT JOIN test_projects p ON r.project_id = p.id
        ${whereClause} 
        ORDER BY r.created_at DESC 
        LIMIT ? OFFSET ?
    `;
    const offset = (page - 1) * pageSize;
    const [reports] = await pool.query(query, [...params, pageSize, offset]);

    return {
        items: reports.map(r => ({
            ...r,
            execution_ids: typeof r.execution_ids === 'string' ? JSON.parse(r.execution_ids) : r.execution_ids,
            summary: typeof r.summary === 'string' ? JSON.parse(r.summary) : r.summary
        })),
        total,
        page,
        pageSize
    };
}

// 获取报告详情
async function getReportById(id) {
    const [reports] = await pool.query(
        `SELECT r.*, p.name as project_name 
         FROM test_reports r 
         LEFT JOIN test_projects p ON r.project_id = p.id 
         WHERE r.id = ?`,
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

// 删除报告
async function deleteReport(id) {
    const report = await getReportById(id);
    if (!report) return false;

    // 删除数据库记录
    await pool.query("DELETE FROM test_reports WHERE id = ?", [id]);

    // 删除文件
    if (report.file_path) {
        try {
            await fs.unlink(report.file_path);
        } catch (e) {
            console.warn(`Failed to delete report file: ${report.file_path}`, e);
        }
    }

    return true;
}

// 生成HTML报告内容
async function generateReportHTML(summary, executionIds, projectId = null) {
    const testService = require("./test.service");

    let projectName = "未知项目";
    if (projectId) {
        const project = await testService.getProjectById(projectId);
        if (project) projectName = project.name;
    }

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

    // Load screenshot helper
    const loadScreenshot = async (pathOrBase64) => {
        if (!pathOrBase64) return '';
        // If it's already base64 (older records), return as is
        if (pathOrBase64.startsWith('data:image') || pathOrBase64.length > 200) { // Simple heuristic
            return pathOrBase64.replace(/^data:image\/\w+;base64,/, "");
        }

        // It's a file path
        try {
            // Assuming images are in ../public/screenshots
            const imagePath = path.join(__dirname, "../public/screenshots", pathOrBase64);
            const imageBuffer = await fs.readFile(imagePath);
            return imageBuffer.toString('base64');
        } catch (e) {
            console.warn(`Failed to load screenshot: ${pathOrBase64}`, e);
            return '';
        }
    };

    // Pre-process screenshots for all executions to avoid async in EJS
    for (const exec of executions) {
        if (exec.result) {
            if (exec.result.screenshotPath) {
                exec.result.screenshot = await loadScreenshot(exec.result.screenshotPath);
            } else if (exec.result.screenshot) {
                // It's base64, remove header if needed for consistency with helper logic
                exec.result.screenshot = exec.result.screenshot.replace(/^data:image\/\w+;base64,/, "");
            }

            if (exec.result.steps) {
                for (const s of exec.result.steps) {
                    if (s.detail) {
                        if (s.detail.screenshotPath) {
                            s.detail.screenshot = await loadScreenshot(s.detail.screenshotPath);
                        } else if (s.detail.screenshot) {
                            s.detail.screenshot = s.detail.screenshot.replace(/^data:image\/\w+;base64,/, "");
                        }
                    }
                }
            }
        }
    }

    const stripAnsi = (text) => (text || '').replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
    for (const exec of executions) {
        if (exec.error_message) exec.error_message = stripAnsi(exec.error_message);
        if (exec.result) {
            if (exec.result.steps) {
                exec.result.steps.forEach(s => { if (s.message) s.message = stripAnsi(s.message); });
            }
            if (exec.result.assertions) {
                exec.result.assertions.forEach(a => { if (a.message) a.message = stripAnsi(a.message); });
            }
        }
    }

    // SVG Icons
    const icons = {
        pass: '<svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
        fail: '<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
        chart: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>',
        camera: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>',
        chevron: '<svg class="w-4 h-4 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>',
        time: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
    };

    const template = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><%= projectName %> - 自动化测试报告</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: '#3b82f6',
                        success: '#10b981',
                        danger: '#ef4444',
                        warning: '#f59e0b',
                        gray: {
                            50: '#f9fafb',
                            100: '#f3f4f6',
                            200: '#e5e7eb',
                            300: '#d1d5db',
                            400: '#9ca3af',
                            500: '#6b7280',
                            600: '#4b5563',
                            700: '#374151',
                            800: '#1f2937',
                            900: '#111827',
                        }
                    }
                }
            }
        }
    </script>
    <style>
        body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background-color: #f3f4f6; }
        .clip-path-slant { clip-path: polygon(0 0, 100% 0, 95% 100%, 0% 100%); }
        .glass-header { 
            background: rgba(255, 255, 255, 0.95); 
            backdrop-filter: blur(10px);
            border-bottom: 1px solid rgba(229, 231, 235, 0.5);
        }
        .summary-card {
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .summary-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }
        .step-row { transition: background-color 0.15s; }
        .step-row:hover { background-color: #f9fafb; }
        
        .collapsed .exec-body { display: none; }
        .collapsed .chevron-icon { transform: rotate(-90deg); }
        .chevron-icon { transition: transform 0.2s; }
        
        .expanded-text { white-space: pre-wrap; }
        .truncate-text { 
           display: -webkit-box;
           -webkit-line-clamp: 2;
           -webkit-box-orient: vertical;
           overflow: hidden;
        }
        
        /* Custom Scrollbar */
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #f1f1f1; }
        ::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }
        
        /* Modal Animation - Improved with simple CSS transitions */
        .modal-enter { opacity: 0; }
        .modal-enter-active { opacity: 1; transition: opacity 0.2s; }
        .modal-exit { opacity: 1; }
        .modal-exit-active { opacity: 0; transition: opacity 0.2s; }
        
        .scale-enter { transform: scale(0.95); opacity: 0; }
        .scale-enter-active { transform: scale(1); opacity: 1; transition: all 0.2s; }
    </style>
</head>
<body class="text-gray-800 antialiased min-h-screen pb-12">

    <!-- Image Preview Modal -->
    <div id="image-modal" class="fixed inset-0 z-50 hidden" style="background-color: rgba(0,0,0,0.9);" onclick="closeImage()">
        <button class="absolute top-4 right-4 text-white hover:text-gray-300 focus:outline-none">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
        <div class="flex items-center justify-center h-full p-4">
            <img id="modal-img" src="" class="max-w-full max-h-full rounded shadow-2xl transform transition-all duration-300" onclick="event.stopPropagation()">
        </div>
    </div>

    <!-- Header -->
    <header class="glass-header sticky top-0 z-40">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <div class="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <%- icons.chart %>
                </div>
                <div>
                    <h1 class="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent"><%= projectName %></h1>
                    <p class="text-xs text-gray-500 font-medium">自动化测试报告 · Test Automation Report</p>
                </div>
            </div>
            <div class="flex items-center gap-4 text-sm text-gray-500">
                <div class="flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full">
                    <%- icons.time %>
                    <span><%= new Date().toLocaleString('zh-CN') %></span>
                </div>
            </div>
        </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div class="summary-card bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative overflow-hidden group">
                <div class="absolute right-0 top-0 h-full w-1 bg-blue-500"></div>
                <div class="relative z-10">
                    <p class="text-sm font-medium text-gray-500 mb-1">总用例数 (Total)</p>
                    <p class="text-4xl font-bold text-gray-800 group-hover:scale-105 transition-transform origin-left"><%= summary.total || 0 %></p>
                </div>
                <div class="absolute -right-6 -bottom-6 w-24 h-24 bg-blue-50 rounded-full opacity-50 group-hover:scale-125 transition-transform duration-500"></div>
            </div>
            
            <div class="summary-card bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative overflow-hidden group">
                <div class="absolute right-0 top-0 h-full w-1 bg-green-500"></div>
                <div class="relative z-10">
                    <p class="text-sm font-medium text-gray-500 mb-1">通过 (Passed)</p>
                    <div class="flex items-baseline gap-2">
                        <p class="text-4xl font-bold text-green-600 group-hover:scale-105 transition-transform origin-left"><%= summary.passed || 0 %></p>
                    </div>
                </div>
                 <div class="absolute -right-6 -bottom-6 w-24 h-24 bg-green-50 rounded-full opacity-50 group-hover:scale-125 transition-transform duration-500"></div>
            </div>

            <div class="summary-card bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative overflow-hidden group">
                <div class="absolute right-0 top-0 h-full w-1 bg-red-500"></div>
                <div class="relative z-10">
                    <p class="text-sm font-medium text-gray-500 mb-1">失败 (Failed)</p>
                    <p class="text-4xl font-bold text-red-600 group-hover:scale-105 transition-transform origin-left"><%= summary.failed || 0 %></p>
                </div>
                 <div class="absolute -right-6 -bottom-6 w-24 h-24 bg-red-50 rounded-full opacity-50 group-hover:scale-125 transition-transform duration-500"></div>
            </div>

            <div class="summary-card bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative overflow-hidden group">
                <div class="absolute right-0 top-0 h-full w-1 bg-cyan-500"></div>
                <div class="relative z-10">
                    <p class="text-sm font-medium text-gray-500 mb-1">通过率 (Pass Rate)</p>
                    <p class="text-4xl font-bold text-cyan-600 group-hover:scale-105 transition-transform origin-left"><%= summary.passRate || '0%' %></p>
                </div>
                 <div class="absolute -right-6 -bottom-6 w-24 h-24 bg-cyan-50 rounded-full opacity-50 group-hover:scale-125 transition-transform duration-500"></div>
            </div>
        </div>

        <!-- Filters & Toolbar (Placeholder for future interactivity) -->
        <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-gray-800">详细执行结果</h2>
            <div class="flex gap-2">
                <button onclick="expandAll()" class="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500">展开所有</button>
                <button onclick="collapseAll()" class="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500">收起所有</button>
            </div>
        </div>

        <!-- Execution List -->
        <div class="space-y-4">
            <% executions.forEach(function(exec, idx) { %>
            <div class="exec-card bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-md <%= exec.status === 'passed' ? 'collapsed' : '' %>" id="exec-<%= idx %>">
                <!-- Card Header -->
                <div class="exec-header px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors" onclick="toggleCard(this)">
                    <div class="flex items-center gap-4 flex-1">
                        <div class="chevron-icon text-gray-400 p-1 rounded hover:bg-gray-200 transition-colors">
                            <%- icons.chevron %>
                        </div>
                        <div class="flex flex-col">
                            <div class="flex items-center gap-3">
                                <span class="text-sm font-bold text-gray-400">#<%= idx + 1 %></span>
                                <h3 class="text-base font-semibold text-gray-800"><%= exec.testCase ? exec.testCase.name : '用例#' + exec.test_case_id %></h3>
                                <span class="px-2 py-0.5 text-xs font-medium uppercase tracking-wider rounded bg-gray-100 text-gray-600 border border-gray-200">
                                    <%= exec.testCase ? exec.testCase.type : 'UNKNOWN' %>
                                </span>
                            </div>
                            <div class="text-xs text-gray-400 mt-1 flex items-center gap-2">
                                <span>ID: <%= exec.id %></span>
                                <span>•</span>
                                <span>Duration: <%= exec.duration %>ms</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex items-center gap-4">
                        <% if (exec.status === 'passed') { %>
                            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-100">
                                <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                PASS
                            </span>
                        <% } else { %>
                            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-red-50 text-red-700 border border-red-100">
                                <div class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                FAIL
                            </span>
                        <% } %>
                    </div>
                </div>

                <!-- Card Body -->
                <div class="exec-body border-t border-gray-100">
                    <div class="p-6">
                        <% if (exec.error_message) { %>
                        <div class="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3 text-red-800 items-start">
                            <div class="mt-0.5 shrink-0"><%- icons.fail %></div>
                            <div class="text-sm font-mono break-all whitespace-pre-wrap"><%= exec.error_message %></div>
                        </div>
                        <% } %>

                        <% var result = exec.result || {}; %>

                        <!-- Steps -->
                        <% if (result.steps && result.steps.length > 0) { %>
                        <div class="space-y-1 rounded-lg border border-gray-200 overflow-hidden">
                            <div class="bg-gray-50 px-4 py-2 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center">
                                <span class="w-8">Stat</span>
                                <span class="w-24">Action</span>
                                <span class="flex-1">Details</span>
                                <span class="w-20 text-right">Time</span>
                            </div>
                            
                            <% result.steps.forEach(function(s, si) { %>
                            <div class="step-row px-4 py-3 border-b border-gray-100 last:border-0 flex items-start text-sm group">
                                <div class="w-8 pt-0.5 shrink-0">
                                    <% if (s.success) { %>
                                        <div class="text-green-500"><%- icons.pass %></div>
                                    <% } else { %>
                                        <div class="text-red-500"><%- icons.fail %></div>
                                    <% } %>
                                </div>
                                <div class="w-24 pt-0.5 font-medium text-gray-700 shrink-0"><%= s.action %></div>
                                <div class="flex-1 min-w-0 pr-4">
                                    <div class="text-gray-600 leading-relaxed step-content truncate-text relative">
                                        <%= (s.message || '').replace(/^\[(PASS|FAIL)\] /, '') %>
                                    </div>
                                    <% if ((s.message || '').length > 150) { %>
                                        <button class="text-xs text-blue-500 hover:text-blue-700 mt-1 font-medium focus:outline-none" onclick="toggleText(this)">显示更多</button>
                                    <% } %>
                                    
                                    <% if (s.detail && s.detail.screenshot) { %>
                                    <div class="mt-3 inline-block relative group/img cursor-zoom-in" onclick="showImage('data:image/png;base64,<%= s.detail.screenshot %>')">
                                        <div class="absolute inset-0 bg-black bg-opacity-0 group-hover/img:bg-opacity-10 transition-all rounded"></div>
                                        <img src="data:image/png;base64,<%= s.detail.screenshot %>" class="h-24 rounded border border-gray-200 object-cover bg-gray-50 shadow-sm" loading="lazy" />
                                        <div class="absolute bottom-1 right-1 bg-black bg-opacity-60 text-white text-[10px] px-1 rounded opacity-0 group-hover/img:opacity-100 transition-opacity">Preview</div>
                                    </div>
                                    <% } %>
                                </div>
                                <div class="w-20 text-right pt-0.5 text-xs text-gray-400 font-mono shrink-0"><%= s.duration ? s.duration + 'ms' : '-' %></div>
                            </div>
                            <% }); %>
                        </div>
                        <% } %>

                        <!-- Assertions (HTTP Mode) -->
                        <% if (result.assertions && result.assertions.length > 0) { %>
                        <div class="mt-6 space-y-1 rounded-lg border border-gray-200 overflow-hidden">
                            <div class="bg-gray-50 px-4 py-2 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                断言结果 (Assertions)
                            </div>
                            <% result.assertions.forEach(function(a) { %>
                            <div class="step-row px-4 py-3 border-b border-gray-100 last:border-0 flex items-start text-sm">
                                <div class="w-8 pt-0.5 shrink-0">
                                    <% if (a.passed) { %>
                                        <div class="text-green-500"><%- icons.pass %></div>
                                    <% } else { %>
                                        <div class="text-red-500"><%- icons.fail %></div>
                                    <% } %>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="text-gray-700"><%= (a.message || '').replace(/^\[(PASS|FAIL)\] /, '') %></div>
                                </div>
                            </div>
                            <% }); %>
                        </div>
                        <% } %>

                        <!-- Final Screenshot -->
                        <% if (result.screenshot) { %>
                        <div class="mt-6">
                            <h4 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                <%- icons.camera %>
                                最终状态截图
                            </h4>
                            <div class="relative inline-block group cursor-zoom-in overflow-hidden rounded-lg border border-gray-200 bg-gray-50 shadow-sm" onclick="showImage('data:image/png;base64,<%= result.screenshot %>')">
                                <img src="data:image/png;base64,<%= result.screenshot %>" class="max-w-md max-h-96 object-contain block transition-transform duration-500 group-hover:scale-105" />
                                <div class="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity"></div>
                                <div class="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">Click to Expand</div>
                            </div>
                        </div>
                        <% } %>

                        <!-- Load Test Metrics -->
                        <% if (result.metrics) { %>
                        <div class="mt-6">
                            <h4 class="text-sm font-semibold text-gray-700 mb-3">性能指标</h4>
                            <div class="bg-gray-900 text-gray-200 p-4 rounded-lg font-mono text-sm overflow-x-auto shadow-inner">
                                <pre><%= result.summary || '' %></pre>
                            </div>
                        </div>
                        <% } %>
                    </div>
                </div>
            </div>
            <% }); %>
        </div>
    </main>

    <script>
        function toggleCard(header) {
            const card = header.closest('.exec-card');
            card.classList.toggle('collapsed');
        }

        function expandAll() {
            document.querySelectorAll('.exec-card').forEach(card => card.classList.remove('collapsed'));
        }

        function collapseAll() {
            document.querySelectorAll('.exec-card').forEach(card => card.classList.add('collapsed'));
        }

        function toggleText(btn) {
            const content = btn.previousElementSibling;
            if (content.classList.contains('truncate-text')) {
                content.classList.remove('truncate-text');
                btn.innerText = '收起内容';
            } else {
                content.classList.add('truncate-text');
                btn.innerText = '显示更多';
            }
        }

        function showImage(src) {
            const modal = document.getElementById('image-modal');
            const img = document.getElementById('modal-img');
            img.src = src;
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            
            // Re-apply scale animation correctly by ensuring it is fresh
            img.style.transform = 'scale(0.95)';
            img.style.opacity = '0';
            setTimeout(() => {
                img.style.transform = 'scale(1)';
                img.style.opacity = '1';
                img.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            }, 10);
        }

        function closeImage() {
            const modal = document.getElementById('image-modal');
            modal.classList.add('hidden');
            document.body.style.overflow = 'auto';
        }
        
        // Handle ESC key for modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeImage();
        });
    </script>
</body>
</html>
    `;

    return ejs.render(template, { summary, executionIds, executions, icons, projectName });
}

module.exports = {
    createReport,
    getReports,
    getReportById,
    deleteReport,
    REPORTS_DIR
};
