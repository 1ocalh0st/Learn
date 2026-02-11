const { pool } = require("../db");

// 记录前端/后端错误
async function logError(errorType, message, stackTrace, userAgent, url, userId = null) {
    const [result] = await pool.query(
        `INSERT INTO production_errors (error_type, message, stack_trace, user_agent, url, user_id) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [errorType, message, stackTrace, userAgent, url, userId]
    );

    // 检查是否需要告警
    await checkAndAlert(errorType, message);

    return result.insertId;
}

// 获取错误列表
async function getErrors(limit = 100, errorType = null) {
    const validLimit = isNaN(Number(limit)) ? 100 : Number(limit);
    let query = "SELECT * FROM production_errors";
    const params = [];

    if (errorType) {
        query += " WHERE error_type = ?";
        params.push(errorType);
    }

    query += ` ORDER BY created_at DESC LIMIT ${validLimit}`;

    const [rows] = await pool.query(query, params);
    return rows;
}

// 获取错误统计
async function getErrorStats(hours = 24) {
    const [stats] = await pool.query(
        `SELECT 
            error_type,
            COUNT(*) as count,
            MAX(created_at) as last_occurrence
         FROM production_errors 
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
         GROUP BY error_type`,
        [hours]
    );

    return stats;
}

// 检查并触发告警 (未来接入钉钉)
async function checkAndAlert(errorType, message) {
    // 检查最近5分钟内相同类型错误的数量
    const [count] = await pool.query(
        `SELECT COUNT(*) as error_count 
         FROM production_errors 
         WHERE error_type = ? 
         AND created_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)`,
        [errorType]
    );

    const threshold = 5; // 5分钟内超过5次相同类型错误则告警

    if (count[0].error_count >= threshold) {
        // 调用通知服务 (预留接口)
        const notificationService = require('./notification.service');
        await notificationService.sendAlert(
            `⚠️ ${errorType} 错误频繁发生！\n最近5分钟内已发生 ${count[0].error_count} 次\n最新错误: ${message}`,
            'error'
        );

        // 标记已告警
        await pool.query(
            `UPDATE production_errors 
             SET alerted = 1 
             WHERE error_type = ? 
             AND created_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE) 
             AND alerted = 0`,
            [errorType]
        );
    }
}

// 标记错误已处理
async function markErrorAsHandled(id) {
    const [result] = await pool.query(
        "UPDATE production_errors SET alerted = 1 WHERE id = ?",
        [id]
    );
    return result.affectedRows > 0;
}

module.exports = {
    logError,
    getErrors,
    getErrorStats,
    markErrorAsHandled
};
