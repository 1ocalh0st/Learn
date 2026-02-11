// 通知服务 - 预留接口供未来扩展 (钉钉、邮件、Slack等)

/**
 * 发送告警通知
 * @param {string} message - 告警消息
 * @param {string} type - 告警类型 (info/warning/error)
 * @returns {Promise<boolean>}
 */
async function sendAlert(message, type = 'info') {
    // 当前仅记录日志，未来可接入钉钉Webhook、邮件等
    console.log(`[${type.toUpperCase()}] ${new Date().toISOString()}: ${message}`);

    // TODO: 未来接入钉钉
    // if (process.env.DINGTALK_WEBHOOK) {
    //     await sendDingTalkMessage(process.env.DINGTALK_WEBHOOK, message, type);
    // }

    // TODO: 未来接入邮件
    // if (process.env.EMAIL_ALERT_TO) {
    //     await sendEmail(process.env.EMAIL_ALERT_TO, message);
    // }

    return true;
}

/**
 * 发送测试失败报告
 * @param {object} testCase - 测试用例信息
 * @param {object} execution - 执行结果
 * @returns {Promise<boolean>}
 */
async function sendTestFailureReport(testCase, execution) {
    const message = `
[测试失败通知]
用例名称: ${testCase.name}
测试类型: ${testCase.type}
执行时间: ${execution.executed_at}
失败原因: ${execution.error_message || '未知'}
    `.trim();

    return await sendAlert(message, 'error');
}

/**
 * 发送钉钉消息 (预留实现)
 */
async function sendDingTalkMessage(webhook, message, type) {
    // const axios = require('axios');
    // const payload = {
    //     msgtype: 'text',
    //     text: {
    //         content: message
    //     }
    // };
    // await axios.post(webhook, payload);
    console.log('[DingTalk] 钉钉集成暂未实现');
}

module.exports = {
    sendAlert,
    sendTestFailureReport
};
