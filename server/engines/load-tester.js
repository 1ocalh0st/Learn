const axios = require('axios');

/**
 * 压力测试执行引擎（纯Node.js实现，无需Artillery）
 * 使用自建并发控制器，兼容所有平台，无第三方CLI依赖
 *
 * @param {object} config - 测试配置
 * @param {string} config.target - 目标URL
 * @param {number} config.duration - 持续时间(秒)，默认10
 * @param {number} config.arrivalRate - 每秒并发请求数，默认5
 * @param {number} config.rampUpDuration - 预热时间(秒)，默认0
 * @param {string} config.method - HTTP方法，默认GET
 * @param {object} config.headers - 请求头
 * @param {object} config.body - 请求体 (POST/PUT时使用)
 * @param {number} config.timeout - 单次请求超时(ms)，默认10000
 * @param {number} config.maxConcurrent - 最大并发连接数，默认100
 * @returns {Promise<object>} 执行结果
 */
async function execute(config) {
    const startTime = Date.now();

    const target = config.target;
    const duration = Math.min(config.duration || 10, 300); // 最长5分钟
    const arrivalRate = Math.min(config.arrivalRate || 5, 200); // 最高200 rps
    const method = (config.method || 'GET').toUpperCase();
    const headers = config.headers || {};
    const body = config.body || null;
    const timeout = config.timeout || 10000;
    const maxConcurrent = config.maxConcurrent || 100;
    const rampUpDuration = config.rampUpDuration || 0;

    // 用于收集指标
    const latencies = [];
    const statusCodes = {};
    let totalRequests = 0;
    let completedRequests = 0;
    let failedRequests = 0;
    let activeConcurrent = 0;
    let peakConcurrent = 0;
    let totalBytes = 0;

    // 每秒数据记录
    const secondlyData = [];

    try {
        // 验证URL
        new URL(target);
    } catch (e) {
        return {
            success: false,
            duration: 0,
            error: `无效的目标URL: ${target}`,
            metrics: null
        };
    }

    try {
        const endTime = startTime + (duration * 1000);

        // 主循环 - 每秒发送 arrivalRate 个请求
        const promises = [];

        for (let second = 0; second < duration; second++) {
            // 计算本秒的到达率（支持线性递增）
            let currentRate;
            if (rampUpDuration > 0 && second < rampUpDuration) {
                currentRate = Math.ceil(arrivalRate * (second + 1) / rampUpDuration);
            } else {
                currentRate = arrivalRate;
            }

            const secondStart = Date.now();
            const secondData = { second, requests: 0, completed: 0, failed: 0, latencies: [] };

            // 在这一秒内均匀发送请求
            const intervalMs = 1000 / currentRate;

            for (let i = 0; i < currentRate; i++) {
                // 如果超过最大并发数，等一下
                if (activeConcurrent >= maxConcurrent) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                }

                totalRequests++;
                secondData.requests++;

                const requestPromise = sendRequest(target, method, headers, body, timeout)
                    .then(result => {
                        completedRequests++;
                        secondData.completed++;
                        latencies.push(result.latency);
                        secondData.latencies.push(result.latency);

                        // 统计状态码
                        const code = result.status || 'error';
                        statusCodes[code] = (statusCodes[code] || 0) + 1;

                        // 统计字节数
                        totalBytes += result.bytes || 0;

                        activeConcurrent--;
                    })
                    .catch(error => {
                        failedRequests++;
                        secondData.failed++;
                        const code = error.status || 'error';
                        statusCodes[code] = (statusCodes[code] || 0) + 1;
                        activeConcurrent--;
                    });

                activeConcurrent++;
                peakConcurrent = Math.max(peakConcurrent, activeConcurrent);
                promises.push(requestPromise);

                // 等待间隔（在这一秒内均匀分布请求）
                if (i < currentRate - 1) {
                    await new Promise(resolve => setTimeout(resolve, Math.max(intervalMs - 5, 1)));
                }
            }

            secondlyData.push(secondData);

            // 等到下一秒
            const elapsed = Date.now() - secondStart;
            if (elapsed < 1000) {
                await new Promise(resolve => setTimeout(resolve, 1000 - elapsed));
            }
        }

        // 等待所有请求完成
        await Promise.allSettled(promises);

        const totalDuration = Date.now() - startTime;

        // 计算统计指标
        const metrics = calculateMetrics(latencies, statusCodes, totalRequests, completedRequests, failedRequests, totalDuration, peakConcurrent, totalBytes);

        return {
            success: failedRequests / totalRequests < 0.5, // 失败率低于50%视为成功
            duration: totalDuration,
            metrics,
            secondlyData,
            summary: generateSummary(metrics)
        };

    } catch (error) {
        const totalDuration = Date.now() - startTime;
        return {
            success: false,
            duration: totalDuration,
            error: error.message,
            metrics: null
        };
    }
}

/**
 * 发送单个HTTP请求
 */
async function sendRequest(url, method, headers, body, timeout) {
    const start = Date.now();

    const config = {
        method,
        url,
        headers,
        timeout,
        validateStatus: () => true, // 不自动抛出错误
        maxRedirects: 3
    };

    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
        config.data = body;
    }

    const response = await axios(config);
    const latency = Date.now() - start;
    const bytes = response.headers['content-length']
        ? parseInt(response.headers['content-length'])
        : (typeof response.data === 'string' ? response.data.length : JSON.stringify(response.data).length);

    return {
        status: response.status,
        latency,
        bytes
    };
}

/**
 * 计算统计指标
 */
function calculateMetrics(latencies, statusCodes, totalRequests, completedRequests, failedRequests, totalDuration, peakConcurrent, totalBytes) {
    // 排序用于计算百分位
    const sorted = [...latencies].sort((a, b) => a - b);

    const percentile = (arr, p) => {
        if (arr.length === 0) return 0;
        const idx = Math.ceil(arr.length * p / 100) - 1;
        return arr[Math.max(0, idx)];
    };

    const sum = sorted.reduce((a, b) => a + b, 0);

    return {
        requests: {
            total: totalRequests,
            completed: completedRequests,
            failed: failedRequests,
            successRate: totalRequests > 0 ? ((completedRequests / totalRequests) * 100).toFixed(2) + '%' : '0%'
        },
        latency: {
            min: sorted.length > 0 ? sorted[0] : 0,
            max: sorted.length > 0 ? sorted[sorted.length - 1] : 0,
            mean: sorted.length > 0 ? Math.round(sum / sorted.length) : 0,
            median: percentile(sorted, 50),
            p90: percentile(sorted, 90),
            p95: percentile(sorted, 95),
            p99: percentile(sorted, 99)
        },
        throughput: {
            rps: totalDuration > 0 ? (completedRequests / (totalDuration / 1000)).toFixed(2) : 0,
            bytesPerSecond: totalDuration > 0 ? Math.round(totalBytes / (totalDuration / 1000)) : 0,
            totalBytes
        },
        statusCodes,
        concurrency: {
            peak: peakConcurrent
        },
        duration: {
            total: totalDuration,
            totalSeconds: (totalDuration / 1000).toFixed(1)
        }
    };
}

/**
 * 生成人类可读的摘要
 */
function generateSummary(metrics) {
    const lines = [
        `[Load Test Complete]`,
        `Duration: ${metrics.duration.totalSeconds}s`,
        `Requests: Total ${metrics.requests.total} | Success ${metrics.requests.completed} | Failed ${metrics.requests.failed}`,
        `Success Rate: ${metrics.requests.successRate}`,
        `RPS: ${metrics.throughput.rps}`,
        `Latency: Min ${metrics.latency.min}ms | Avg ${metrics.latency.mean}ms | Max ${metrics.latency.max}ms`,
        `Percentiles: P50 ${metrics.latency.median}ms | P90 ${metrics.latency.p90}ms | P95 ${metrics.latency.p95}ms | P99 ${metrics.latency.p99}ms`,
        `Peak Concurrency: ${metrics.concurrency.peak}`
    ];

    return lines.join('\n');
}

module.exports = { execute };
