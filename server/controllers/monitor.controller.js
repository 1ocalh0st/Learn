const monitorService = require("../services/monitor.service");

// 记录错误
async function logError(req, res) {
    try {
        const {
            errorType,
            message,
            stackTrace,
            url
        } = req.body;

        if (!errorType || !message) {
            return res.status(400).json({
                code: "VALIDATION_ERROR",
                message: "errorType and message are required"
            });
        }

        const userAgent = req.headers['user-agent'] || '';
        const userId = req.user?.id || null;

        const errorId = await monitorService.logError(
            errorType,
            message,
            stackTrace || null,
            userAgent,
            url || null,
            userId
        );

        return res.json({
            code: "OK",
            message: "错误记录成功",
            data: { errorId }
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({
            code: "SERVER_ERROR",
            message: "服务器错误"
        });
    }
}

// 获取错误列表
async function getErrors(req, res) {
    try {
        const { errorType, limit } = req.query;
        const errors = await monitorService.getErrors(
            errorType || null,
            limit ? parseInt(limit) : 100
        );

        return res.json({
            code: "OK",
            data: errors
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({
            code: "SERVER_ERROR",
            message: "服务器错误"
        });
    }
}

// 获取错误统计
async function getErrorStats(req, res) {
    try {
        const { hours } = req.query;
        const stats = await monitorService.getErrorStats(
            hours ? parseInt(hours) : 24
        );

        return res.json({
            code: "OK",
            data: stats
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
    logError,
    getErrors,
    getErrorStats
};
