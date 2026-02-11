const axios = require("axios");

/**
 * API测试执行引擎
 * @param {object} config - 测试配置
 * @param {string} config.url - 请求URL
 * @param {string} config.method - HTTP方法 (GET/POST/PUT/DELETE/PATCH)
 * @param {object} config.headers - 请求头
 * @param {object} config.body - 请求体
 * @param {object} config.queryParams - 查询参数
 * @param {number} config.timeout - 超时时间(ms)
 * @param {Array} config.assertions - 断言配置
 * @returns {Promise<object>} 执行结果
 */
async function execute(config) {
    const startTime = Date.now();

    try {
        // 构建请求配置
        const requestConfig = {
            method: (config.method || 'GET').toUpperCase(),
            url: config.url,
            headers: config.headers || {},
            timeout: config.timeout || 30000,
            // 不要自动抛出错误，我们需要检查所有状态码
            validateStatus: () => true
        };

        // 添加请求体（如果有）
        if (config.body && ['POST', 'PUT', 'PATCH'].includes(requestConfig.method)) {
            requestConfig.data = typeof config.body === 'string' ? JSON.parse(config.body) : config.body;
        }

        // 添加查询参数
        if (config.queryParams) {
            requestConfig.params = config.queryParams;
        }

        // 发送请求
        const response = await axios(requestConfig);

        const duration = Date.now() - startTime;

        // 执行断言
        const assertionResults = runAssertions(response, config.assertions || [], duration);

        // 如果用户没有配置任何断言，或没有配置 status 类型的断言，
        // 则自动添加一个"状态码 < 400"的默认检查
        const hasStatusAssertion = (config.assertions || []).some(a => a.type === 'status');
        if (!hasStatusAssertion) {
            const statusOk = response.status < 400;
            assertionResults.unshift({
                type: 'status',
                passed: statusOk,
                expected: '< 400',
                actual: response.status,
                operator: 'auto',
                message: statusOk
                    ? `[Auto] HTTP ${response.status} OK`
                    : `[Auto] HTTP ${response.status} >= 400, 视为失败`
            });
        }

        const allPassed = assertionResults.every(a => a.passed);

        return {
            success: allPassed,
            duration,
            response: {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                data: response.data,
                size: JSON.stringify(response.data).length
            },
            assertions: assertionResults,
            error: allPassed ? null : `${assertionResults.filter(a => !a.passed).length} 个断言失败`
        };

    } catch (error) {
        const duration = Date.now() - startTime;

        return {
            success: false,
            duration,
            error: error.message,
            response: error.response ? {
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data
            } : null,
            assertions: []
        };
    }
}

/**
 * 执行断言
 * @param {object} response - HTTP响应
 * @param {Array} assertions - 断言配置数组
 * @param {number} duration - 请求耗时(ms)
 * @returns {Array} 断言结果
 */
function runAssertions(response, assertions, duration) {
    return assertions.map(assertion => {
        try {
            let passed = false;
            let actual = null;

            switch (assertion.type) {
                case 'status':
                    actual = response.status;
                    passed = actual === Number(assertion.expected);
                    break;

                case 'json':
                    // JSONPath断言 (简化版)
                    actual = getJsonPath(response.data, assertion.path);
                    if (assertion.operator === 'equals') {
                        passed = String(actual) === String(assertion.expected);
                    } else if (assertion.operator === 'notEquals') {
                        passed = String(actual) !== String(assertion.expected);
                    } else if (assertion.operator === 'contains') {
                        passed = String(actual).includes(String(assertion.expected));
                    } else if (assertion.operator === 'exists') {
                        passed = actual !== undefined && actual !== null;
                    } else {
                        // 默认为严格相等
                        passed = actual === assertion.expected;
                    }
                    break;

                case 'contains':
                    actual = JSON.stringify(response.data);
                    passed = actual.includes(assertion.expected);
                    break;

                case 'notContains':
                    actual = JSON.stringify(response.data);
                    passed = !actual.includes(assertion.expected);
                    break;

                case 'header':
                    actual = response.headers[assertion.header.toLowerCase()];
                    if (assertion.operator === 'contains') {
                        passed = actual && actual.includes(assertion.expected);
                    } else if (assertion.operator === 'exists') {
                        passed = actual !== undefined;
                    } else {
                        passed = actual === assertion.expected;
                    }
                    break;

                case 'responseTime':
                    actual = duration;
                    passed = actual <= Number(assertion.expected);
                    break;

                case 'regex':
                    actual = JSON.stringify(response.data);
                    passed = new RegExp(assertion.expected).test(actual);
                    break;

                case 'notEmpty':
                    actual = getJsonPath(response.data, assertion.path);
                    if (Array.isArray(actual)) {
                        passed = actual.length > 0;
                    } else if (typeof actual === 'string') {
                        passed = actual.trim().length > 0;
                    } else {
                        passed = actual !== undefined && actual !== null;
                    }
                    break;

                case 'length':
                    actual = getJsonPath(response.data, assertion.path);
                    if (Array.isArray(actual) || typeof actual === 'string') {
                        const len = actual.length;
                        passed = len === Number(assertion.expected);
                        actual = len;
                    } else {
                        passed = false;
                        actual = 'not array or string';
                    }
                    break;

                case 'greaterThan':
                    actual = getJsonPath(response.data, assertion.path);
                    passed = Number(actual) > Number(assertion.expected);
                    break;

                case 'lessThan':
                    actual = getJsonPath(response.data, assertion.path);
                    passed = Number(actual) < Number(assertion.expected);
                    break;

                case 'type':
                    actual = typeof getJsonPath(response.data, assertion.path);
                    passed = actual === assertion.expected;
                    break;

                default:
                    passed = false;
                    actual = `未知断言类型: ${assertion.type}`;
            }

            return {
                type: assertion.type,
                passed,
                expected: assertion.expected,
                actual,
                path: assertion.path || null,
                operator: assertion.operator || 'equals',
                message: passed ? '[PASS] 断言通过' : `[FAIL] 断言失败: 期望 ${assertion.expected}, 实际 ${actual}`
            };

        } catch (error) {
            return {
                type: assertion.type,
                passed: false,
                error: error.message,
                message: `[FAIL] 断言执行异常: ${error.message}`
            };
        }
    });
}

/**
 * 获取JSON路径值（增强版）
 * 支持如: "user.name", "items[0].id", "data.list[2].name"
 * @param {object} data - JSON数据
 * @param {string} path - JSONPath
 * @returns {any} 值
 */
function getJsonPath(data, path) {
    if (!path) return data;

    const parts = path.split('.');
    let current = data;

    for (const part of parts) {
        if (current === null || current === undefined) {
            return undefined;
        }

        // 处理数组访问 items[0] 或 [0]
        const arrayMatch = part.match(/^(\w*)\[(\d+)\]$/);
        if (arrayMatch) {
            if (arrayMatch[1]) {
                current = current[arrayMatch[1]];
            }
            if (Array.isArray(current)) {
                current = current[parseInt(arrayMatch[2])];
            } else {
                return undefined;
            }
        } else {
            current = current[part];
        }
    }

    return current;
}

module.exports = { execute };
