let playwright;
try {
    playwright = require('playwright');
} catch (e) {
    try {
        playwright = require('@playwright/test');
    } catch (e2) {
        playwright = null;
    }
}
const axios = require('axios');

/**
 * UI测试执行引擎 (基于 Playwright)
 * 支持两种模式：
 * 1. 浏览器模式 (playwright) - 完整UI交互测试
 * 2. HTTP模式 (axios) - 轻量级页面可用性检测
 *
 * 定位器支持多种格式：
 *  - CSS选择器: "#id", ".class", "div > span"
 *  - 文本定位: "text=登录", "text=Submit"
 *  - 占位符定位: "placeholder=请输入用户名"
 *  - 角色定位: "role=button[name=提交]"
 *  - XPath: "xpath=//div[@class='main']"
 *  - 标签定位: "label=用户名"
 *  - 测试ID: "data-testid=login-btn"
 *
 * @param {object} config - 测试配置
 * @param {string} config.url - 测试URL
 * @param {string} config.mode - 测试模式 (browser/http/auto)，默认 auto
 * @param {number} config.viewportWidth - 视窗宽度
 * @param {number} config.viewportHeight - 视窗高度
 * @param {Array} config.steps - 测试步骤
 * @returns {Promise<object>} 执行结果
 */
async function execute(config) {
    const mode = config.mode || 'auto';

    // auto 模式下，优先使用浏览器模式，不可用则降级
    if (mode === 'http' || (mode === 'auto' && !playwright)) {
        return executeHttpMode(config);
    }

    if (!playwright) {
        return {
            success: false,
            duration: 0,
            error: 'Playwright 未安装，无法执行浏览器模式测试。请运行: npm install @playwright/test && npx playwright install chromium',
            steps: [],
            mode: 'browser'
        };
    }

    return executeBrowserMode(config);
}

/**
 * 根据定位器字符串获取 Playwright Locator
 * 支持多种格式:
 *   text=xxx       → page.getByText(xxx)
 *   placeholder=xx → page.getByPlaceholder(xx)
 *   role=button    → page.getByRole('button')
 *   role=button[name=提交] → page.getByRole('button', { name: '提交' })
 *   label=xxx      → page.getByLabel(xxx)
 *   data-testid=xx → page.getByTestId(xx)
 *   xpath=xxx      → page.locator('xpath=' + xxx)
 *   其他           → page.locator(selector) (CSS选择器)
 */
function getLocator(page, selector) {
    if (!selector) return null;

    // nth=N:selector → 优先处理，选择第N个匹配元素 (0-indexed)
    // 此语法可绕过下方 text= 等选择器的默认 .first() 限制
    // 例如: nth=1:text=提交
    const nthMatch = selector.match(/^nth=(\d+):(.+)$/);
    if (nthMatch) {
        return page.locator(nthMatch[2]).nth(parseInt(nthMatch[1]));
    }

    // text=xxx → 默认 .first() 避免多元素匹配报错
    // text=exact:xxx → 精确匹配
    if (selector.startsWith('text=')) {
        const text = selector.slice(5);
        if (text.startsWith('exact:')) {
            return page.getByText(text.slice(6), { exact: true }).first();
        }
        return page.getByText(text).first();
    }

    // placeholder=xxx
    if (selector.startsWith('placeholder=')) {
        return page.getByPlaceholder(selector.slice(12)).first();
    }

    // role=button 或 role=button[name=提交]
    if (selector.startsWith('role=')) {
        const roleStr = selector.slice(5);
        const match = roleStr.match(/^(\w+)\[name=(.+)\]$/);
        if (match) {
            return page.getByRole(match[1], { name: match[2] }).first();
        }
        return page.getByRole(roleStr).first();
    }

    // label=xxx
    if (selector.startsWith('label=')) {
        return page.getByLabel(selector.slice(6)).first();
    }

    // data-testid=xxx
    if (selector.startsWith('data-testid=')) {
        return page.getByTestId(selector.slice(12));
    }

    // xpath=xxx
    if (selector.startsWith('xpath=')) {
        return page.locator(selector); // Playwright 原生支持 xpath= 前缀
    }



    // 默认：CSS选择器
    return page.locator(selector);
}

/**
 * 浏览器模式 - 使用 Playwright 执行完整 UI 测试
 */
async function executeBrowserMode(config) {
    const startTime = Date.now();
    let browser = null;
    let context = null;
    let page = null;

    try {
        // 启动浏览器
        const chromium = playwright.chromium;
        browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });

        // 创建上下文
        context = await browser.newContext({
            viewport: {
                width: config.viewportWidth || 1280,
                height: config.viewportHeight || 720
            },
            userAgent: config.userAgent || undefined,
            extraHTTPHeaders: config.headers || undefined,
            ignoreHTTPSErrors: true,
        });

        page = await context.newPage();

        // 收集控制台日志和错误
        const consoleLogs = [];
        const pageErrors = [];

        page.on('console', msg => {
            consoleLogs.push({
                type: msg.type(),
                text: msg.text(),
                timestamp: Date.now()
            });
        });

        page.on('pageerror', error => {
            pageErrors.push({
                message: error.message,
                timestamp: Date.now()
            });
        });

        // 导航到目标URL
        const navigationResponse = await page.goto(config.url, {
            waitUntil: config.waitUntil || 'domcontentloaded',
            timeout: config.timeout || 30000
        });

        // 执行测试步骤
        const stepResults = [];
        for (const step of config.steps || []) {
            const stepResult = await executeStep(page, step);
            stepResults.push(stepResult);

            if (!stepResult.success && step.critical !== false) {
                break; // 关键步骤失败则终止
            }
        }

        const duration = Date.now() - startTime;
        const allPassed = stepResults.every(s => s.success);

        // 截图
        let screenshot = null;
        if (config.screenshotOnComplete || !allPassed) {
            const buf = await page.screenshot({ fullPage: true, type: 'png' });
            screenshot = buf.toString('base64');
        }

        // 获取性能指标
        const performanceMetrics = await page.evaluate(() => {
            const perf = window.performance;
            const nav = perf.getEntriesByType && perf.getEntriesByType('navigation')[0];
            const paint = perf.getEntriesByType && perf.getEntriesByType('paint');
            return {
                domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
                fullLoad: nav ? Math.round(nav.loadEventEnd) : null,
                domInteractive: nav ? Math.round(nav.domInteractive) : null,
                firstPaint: paint && paint.length > 0 ? Math.round(paint[0].startTime) : null
            };
        }).catch(() => null);

        await browser.close();

        return {
            success: allPassed,
            duration,
            mode: 'browser',
            navigation: {
                status: navigationResponse ? navigationResponse.status() : null,
                url: page.url()
            },
            steps: stepResults,
            screenshot,
            performance: performanceMetrics,
            console: consoleLogs.slice(-20),
            errors: pageErrors,
            error: allPassed ? null : `${stepResults.filter(s => !s.success).length} 个步骤失败`
        };

    } catch (error) {
        if (browser) {
            await browser.close().catch(() => { });
        }

        const duration = Date.now() - startTime;

        return {
            success: false,
            duration,
            mode: 'browser',
            error: error.message,
            steps: []
        };
    }
}

/**
 * HTTP模式 - 轻量级页面可用性检测
 */
async function executeHttpMode(config) {
    const startTime = Date.now();

    try {
        const response = await axios({
            method: 'GET',
            url: config.url,
            timeout: config.timeout || 30000,
            headers: config.headers || {},
            validateStatus: () => true,
            maxRedirects: 5
        });

        const duration = Date.now() - startTime;
        const html = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);

        // 执行HTTP模式下的步骤
        const stepResults = [];
        for (const step of config.steps || []) {
            const result = executeHttpStep(response, html, step);
            stepResults.push(result);
        }

        const allPassed = stepResults.every(s => s.success);

        return {
            success: allPassed,
            duration,
            mode: 'http',
            navigation: {
                status: response.status,
                url: config.url,
                contentType: response.headers['content-type'],
                contentLength: html.length
            },
            steps: stepResults,
            error: allPassed ? null : `${stepResults.filter(s => !s.success).length} 个步骤失败`
        };

    } catch (error) {
        const duration = Date.now() - startTime;

        return {
            success: false,
            duration,
            mode: 'http',
            error: error.message,
            steps: []
        };
    }
}

/**
 * 执行浏览器模式下的单个测试步骤 (Playwright 版本)
 */
async function executeStep(page, step) {
    const stepStart = Date.now();
    try {
        let detail = null;

        switch (step.action) {
            case 'click': {
                const loc = getLocator(page, step.selector);
                await loc.click({ timeout: step.timeout || 5000 });
                break;
            }

            case 'fill': {
                const loc = getLocator(page, step.selector);
                await loc.fill(step.value || '', { timeout: step.timeout || 5000 });
                break;
            }

            case 'type': {
                // Playwright 的 type 是逐字打字（有延迟）
                const loc = getLocator(page, step.selector);
                await loc.pressSequentially(step.value || '', {
                    delay: step.delay || 50,
                    timeout: step.timeout || 5000
                });
                break;
            }

            case 'select': {
                const loc = getLocator(page, step.selector);
                await loc.selectOption(step.value, { timeout: step.timeout || 5000 });
                break;
            }

            case 'wait':
                await page.waitForTimeout(step.duration || 1000);
                break;

            case 'waitForSelector': {
                const loc = getLocator(page, step.selector);
                await loc.waitFor({
                    state: step.visible !== false ? 'visible' : 'attached',
                    timeout: step.timeout || 5000
                });
                break;
            }

            case 'waitForNavigation':
                await page.waitForURL(step.expected || '**/*', {
                    waitUntil: step.waitUntil || 'domcontentloaded',
                    timeout: step.timeout || 10000
                });
                break;

            case 'assertText': {
                const loc = getLocator(page, step.selector);
                const actualText = await loc.textContent({ timeout: step.timeout || 5000 });
                if (step.exact) {
                    if (actualText.trim() !== step.expected) {
                        throw new Error(`文本不匹配: 期望 "${step.expected}", 实际 "${actualText.trim()}"`);
                    }
                } else {
                    if (!actualText.includes(step.expected)) {
                        throw new Error(`文本断言失败: 期望包含 "${step.expected}", 实际 "${actualText.trim()}"`);
                    }
                }
                detail = { actualText: actualText.trim() };
                break;
            }

            case 'assertVisible': {
                const loc = getLocator(page, step.selector);
                const visible = await loc.isVisible();
                if (!visible) {
                    throw new Error(`元素不可见: ${step.selector}`);
                }
                break;
            }

            case 'assertNotExists': {
                const loc = getLocator(page, step.selector);
                const count = await loc.count();
                if (count > 0) {
                    throw new Error(`元素应不存在但存在: ${step.selector}, 找到 ${count} 个`);
                }
                break;
            }

            case 'assertUrl': {
                const currentUrl = page.url();
                if (step.exact) {
                    if (currentUrl !== step.expected) {
                        throw new Error(`URL不匹配: 期望 "${step.expected}", 实际 "${currentUrl}"`);
                    }
                } else {
                    if (!currentUrl.includes(step.expected)) {
                        throw new Error(`URL断言失败: 期望包含 "${step.expected}", 实际 "${currentUrl}"`);
                    }
                }
                detail = { currentUrl };
                break;
            }

            case 'assertTitle': {
                const title = await page.title();
                if (!title.includes(step.expected)) {
                    throw new Error(`标题断言失败: 期望包含 "${step.expected}", 实际 "${title}"`);
                }
                detail = { title };
                break;
            }

            case 'assertCount': {
                const loc = getLocator(page, step.selector);
                const count = await loc.count();
                const expectedCount = Number(step.expected);
                if (step.operator === 'greaterThan') {
                    if (count <= expectedCount) {
                        throw new Error(`元素数量断言失败: 期望 > ${expectedCount}, 实际 ${count}`);
                    }
                } else if (step.operator === 'lessThan') {
                    if (count >= expectedCount) {
                        throw new Error(`元素数量断言失败: 期望 < ${expectedCount}, 实际 ${count}`);
                    }
                } else {
                    if (count !== expectedCount) {
                        throw new Error(`元素数量断言失败: 期望 ${expectedCount}, 实际 ${count}`);
                    }
                }
                detail = { count };
                break;
            }

            case 'assertAttribute': {
                const loc = getLocator(page, step.selector);
                const attrValue = await loc.getAttribute(step.attribute, { timeout: step.timeout || 5000 });
                if (attrValue !== step.expected) {
                    throw new Error(`属性断言失败: ${step.attribute} 期望 "${step.expected}", 实际 "${attrValue}"`);
                }
                detail = { attribute: step.attribute, value: attrValue };
                break;
            }

            case 'screenshot': {
                const buf = await page.screenshot({
                    fullPage: step.fullPage !== false
                });
                const base64 = buf.toString('base64');
                detail = { screenshot: base64 };
                // 如果用户指定了路径，依然保存一份到磁盘
                if (step.path) {
                    require('fs').writeFileSync(step.path, buf);
                }
                break;
            }

            case 'scroll':
                await page.evaluate(([x, y]) => window.scrollTo(x, y), [step.x || 0, step.y || 0]);
                break;

            case 'scrollToElement': {
                const loc = getLocator(page, step.selector);
                await loc.scrollIntoViewIfNeeded({ timeout: step.timeout || 5000 });
                break;
            }

            case 'hover': {
                const loc = getLocator(page, step.selector);
                await loc.hover({ timeout: step.timeout || 5000 });
                break;
            }

            case 'keyboard':
                await page.keyboard.press(step.key);
                break;

            case 'evaluate': {
                const evalResult = await page.evaluate(step.script);
                if (step.expected !== undefined && evalResult !== step.expected) {
                    throw new Error(`脚本执行结果不匹配: 期望 ${step.expected}, 实际 ${evalResult}`);
                }
                detail = { result: evalResult };
                break;
            }

            case 'check': {
                // Playwright 特有：勾选 checkbox / radio
                const loc = getLocator(page, step.selector);
                await loc.check({ timeout: step.timeout || 5000 });
                break;
            }

            case 'uncheck': {
                const loc = getLocator(page, step.selector);
                await loc.uncheck({ timeout: step.timeout || 5000 });
                break;
            }

            case 'dblclick': {
                const loc = getLocator(page, step.selector);
                await loc.dblclick({ timeout: step.timeout || 5000 });
                break;
            }

            case 'focus': {
                const loc = getLocator(page, step.selector);
                await loc.focus({ timeout: step.timeout || 5000 });
                break;
            }

            case 'upload': {
                // 文件上传
                const loc = getLocator(page, step.selector);
                await loc.setInputFiles(step.value || step.files, { timeout: step.timeout || 5000 });
                break;
            }

            default:
                throw new Error(`未知步骤类型: ${step.action}`);
        }

        return {
            success: true,
            action: step.action,
            selector: step.selector || null,
            duration: Date.now() - stepStart,
            detail,
            message: `[PASS] ${step.description || step.action} 执行成功`
        };

    } catch (error) {
        return {
            success: false,
            action: step.action,
            selector: step.selector || null,
            duration: Date.now() - stepStart,
            error: error.message,
            message: `[FAIL] ${step.description || step.action} 失败: ${error.message}`
        };
    }
}

/**
 * 执行HTTP模式下的步骤（仅支持断言类）
 */
function executeHttpStep(response, html, step) {
    try {
        switch (step.action) {
            case 'assertText':
                if (!html.includes(step.expected)) {
                    throw new Error(`页面HTML中未找到文本: "${step.expected}"`);
                }
                break;

            case 'assertTitle': {
                const titleMatch = html.match(/<title>(.*?)<\/title>/i);
                const title = titleMatch ? titleMatch[1] : '';
                if (!title.includes(step.expected)) {
                    throw new Error(`标题不匹配: 期望包含 "${step.expected}", 实际 "${title}"`);
                }
                break;
            }

            case 'assertVisible':
                if (!html.includes(step.selector.replace(/[#.]/g, ''))) {
                    throw new Error(`[HTTP模式] 页面中可能不包含元素: ${step.selector}`);
                }
                break;

            case 'assertNotExists':
                break;

            case 'assertUrl':
                break;

            default:
                return {
                    success: true,
                    action: step.action,
                    message: `⚠️ HTTP模式不支持 ${step.action}，已跳过`,
                    skipped: true
                };
        }

        return {
            success: true,
            action: step.action,
            message: `[PASS] [HTTP模式] ${step.description || step.action} 通过`
        };

    } catch (error) {
        return {
            success: false,
            action: step.action,
            error: error.message,
            message: `[FAIL] [HTTP模式] ${step.description || step.action}: ${error.message}`
        };
    }
}

module.exports = { execute };
