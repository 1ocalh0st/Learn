const reportService = require("../services/report.service");
const testService = require("../services/test.service");
const path = require("path");

// 生成测试报告
async function generateReport(req, res) {
    try {
        const { projectId, executionIds } = req.body;

        if (!executionIds || !Array.isArray(executionIds) || executionIds.length === 0) {
            return res.status(400).json({
                code: "VALIDATION_ERROR",
                message: "executionIds is required and must be a non-empty array"
            });
        }

        // 获取执行结果
        const executions = await Promise.all(
            executionIds.map(id => testService.getExecutionById(id))
        );

        // 计算汇总数据
        const total = executions.length;
        const passed = executions.filter(e => e.status === 'passed').length;
        const failed = executions.filter(e => e.status === 'failed').length;
        const passRate = total > 0 ? ((passed / total) * 100).toFixed(2) + '%' : '0%';

        const summary = {
            total,
            passed,
            failed,
            passRate
        };

        // 创建报告
        const report = await reportService.createReport(projectId, executionIds, summary);

        return res.json({
            code: "OK",
            message: "报告生成成功",
            data: report
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({
            code: "SERVER_ERROR",
            message: "服务器错误"
        });
    }
}

// 获取报告列表
async function getReports(req, res) {
    try {
        const { projectId, page, pageSize } = req.query;
        const result = await reportService.getReports(
            projectId ? parseInt(projectId) : null,
            page ? parseInt(page) : 1,
            pageSize ? parseInt(pageSize) : 10
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

// 获取报告详情
async function getReportById(req, res) {
    try {
        const { id } = req.params;
        const report = await reportService.getReportById(parseInt(id));

        if (!report) {
            return res.status(404).json({
                code: "NOT_FOUND",
                message: "报告不存在"
            });
        }

        return res.json({
            code: "OK",
            data: report
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({
            code: "SERVER_ERROR",
            message: "服务器错误"
        });
    }
}

// 下载报告文件
async function downloadReport(req, res) {
    try {
        const { id } = req.params;
        const report = await reportService.getReportById(parseInt(id));

        if (!report || !report.file_path) {
            return res.status(404).json({
                code: "NOT_FOUND",
                message: "报告文件不存在"
            });
        }

        const fileName = path.basename(report.file_path);
        return res.download(report.file_path, fileName);
    } catch (e) {
        console.error(e);
        return res.status(500).json({
            code: "SERVER_ERROR",
            message: "服务器错误"
        });
    }
}

// 删除报告
async function deleteReport(req, res) {
    try {
        const { id } = req.params;
        const success = await reportService.deleteReport(parseInt(id));

        if (!success) {
            return res.status(404).json({
                code: "NOT_FOUND",
                message: "报告不存在"
            });
        }

        return res.json({
            code: "OK",
            message: "报告删除成功"
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
    generateReport,
    getReports,
    getReportById,
    downloadReport,
    deleteReport
};
