const jwt = require("jsonwebtoken");
const qqService = require("../services/qq.service");

function getJwtSecret() {
    return process.env.JWT_SECRET || "";
}

function signAccessToken(user) {
    const secret = getJwtSecret();
    if (!secret) return null;
    return jwt.sign(
        { sub: String(user.id), username: user.username },
        secret,
        { expiresIn: "7d" }
    );
}

/**
 * 获取 QQ 授权 URL
 * GET /api/auth/qq/url
 */
function getQQAuthUrl(req, res) {
    console.log("getQQAuthUrl called");
    try {
        const state = req.query.state || "";
        const url = qqService.getQQAuthUrl(state);

        // 检查是否配置了 QQ App ID
        if (!qqService.QQ_APP_ID) {
            return res.status(503).json({
                code: "QQ_NOT_CONFIGURED",
                message: "QQ 登录暂未配置，请联系管理员",
            });
        }

        return res.json({
            code: "OK",
            data: { url },
        });
    } catch (e) {
        console.error("getQQAuthUrl error:", e);
        return res.status(500).json({
            code: "SERVER_ERROR",
            message: "服务器错误",
        });
    }
}

/**
 * QQ 授权回调 - 处理登录/注册
 * POST /api/auth/qq/callback
 * body: { code: string }
 */
async function qqCallback(req, res) {
    console.log("qqCallback called");
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({
            code: "MISSING_CODE",
            message: "缺少授权码",
        });
    }

    try {
        // 1. 获取 access_token
        const tokenData = await qqService.getQQAccessToken(code);

        // 2. 获取 openid
        const { openid } = await qqService.getQQOpenId(tokenData.accessToken);

        // 3. 获取 QQ 用户信息
        const qqUser = await qqService.getQQUserInfo(tokenData.accessToken, openid);

        // 4. 查找是否已绑定用户
        let user = await qqService.getUserByQQOpenid(qqUser.openid);

        let isNewUser = false;

        if (!user) {
            // 5. 新用户 - 自动注册
            isNewUser = true;
            const avatar = qqUser.figureurl_qq_2 || qqUser.figureurl_qq_1 || qqUser.figureurl_2;
            const userId = await qqService.createQQUser({
                openid: qqUser.openid,
                nickname: qqUser.nickname,
                avatar,
            });

            user = {
                id: userId,
                username: `qq_${qqUser.openid.substring(0, 16)}`,
                name: qqUser.nickname,
            };
        } else {
            // 6. 已有用户 - 更新信息
            const avatar = qqUser.figureurl_qq_2 || qqUser.figureurl_qq_1 || qqUser.figureurl_2;
            await qqService.updateQQUserInfo(qqUser.openid, {
                nickname: qqUser.nickname,
                avatar,
            });
            user.name = qqUser.nickname;
        }

        // 7. 生成 JWT
        const accessToken = signAccessToken(user);
        if (!accessToken) {
            return res.status(500).json({
                code: "SERVER_ERROR",
                message: "JWT 配置错误",
            });
        }

        const avatar = qqUser.figureurl_qq_2 || qqUser.figureurl_qq_1 || qqUser.figureurl_2;

        return res.json({
            code: "OK",
            message: isNewUser ? "注册成功" : "登录成功",
            data: {
                accessToken,
                isNewUser,
                user: {
                    id: user.id,
                    username: user.username,
                    name: user.name,
                    avatar,
                },
            },
        });
    } catch (e) {
        console.error("qqCallback error:", e);
        return res.status(500).json({
            code: "QQ_AUTH_FAILED",
            message: e.message || "QQ 授权失败",
        });
    }
}

/**
 * 绑定 QQ 到已登录账户
 * POST /api/auth/qq/bind
 * body: { code: string }
 * 需要认证
 */
async function bindQQ(req, res) {
    console.log("bindQQ called");
    const { code } = req.body;
    const userId = req.user?.id;

    if (!code) {
        return res.status(400).json({
            code: "MISSING_CODE",
            message: "缺少授权码",
        });
    }

    if (!userId) {
        return res.status(401).json({
            code: "UNAUTHORIZED",
            message: "请先登录",
        });
    }

    try {
        // 1. 获取 access_token 和 openid
        const tokenData = await qqService.getQQAccessToken(code);
        const { openid } = await qqService.getQQOpenId(tokenData.accessToken);

        // 2. 检查该 QQ 是否已绑定其他账户
        const existingUser = await qqService.getUserByQQOpenid(openid);
        if (existingUser && existingUser.id !== userId) {
            return res.status(409).json({
                code: "QQ_ALREADY_BOUND",
                message: "该 QQ 已绑定其他账户",
            });
        }

        // 3. 获取 QQ 用户信息
        const qqUser = await qqService.getQQUserInfo(tokenData.accessToken, openid);

        // 4. 绑定 QQ
        const avatar = qqUser.figureurl_qq_2 || qqUser.figureurl_qq_1 || qqUser.figureurl_2;
        await qqService.bindQQToUser(userId, {
            openid: qqUser.openid,
            avatar,
        });

        return res.json({
            code: "OK",
            message: "QQ 绑定成功",
            data: {
                qqNickname: qqUser.nickname,
                qqAvatar: avatar,
            },
        });
    } catch (e) {
        console.error("bindQQ error:", e);
        return res.status(500).json({
            code: "QQ_BIND_FAILED",
            message: e.message || "QQ 绑定失败",
        });
    }
}

/**
 * 模拟 QQ 登录（开发环境使用）
 * POST /api/auth/qq/mock
 * body: { nickname?: string }
 */
async function mockQQLogin(req, res) {
    console.log("mockQQLogin called!");

    // 仅在开发环境启用
    if (process.env.NODE_ENV === "production") {
        return res.status(404).json({
            code: "NOT_FOUND",
            message: "接口不存在",
        });
    }

    const { nickname = "QQ用户" } = req.body || {};
    const mockOpenid = `mock_qq_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
        // 创建模拟用户
        const userId = await qqService.createQQUser({
            openid: mockOpenid,
            nickname,
            avatar: "https://q.qlogo.cn/g?b=qq&nk=10000&s=640",
        });

        const user = {
            id: userId,
            username: `qq_${mockOpenid.substring(0, 16)}`,
            name: nickname,
        };

        const accessToken = signAccessToken(user);
        if (!accessToken) {
            return res.status(500).json({
                code: "SERVER_ERROR",
                message: "JWT 配置错误",
            });
        }

        return res.json({
            code: "OK",
            message: "模拟登录成功",
            data: {
                accessToken,
                isNewUser: true,
                user: {
                    id: user.id,
                    username: user.username,
                    name: user.name,
                    avatar: "https://q.qlogo.cn/g?b=qq&nk=10000&s=640",
                },
            },
        });
    } catch (e) {
        console.error("mockQQLogin error:", e);
        return res.status(500).json({
            code: "SERVER_ERROR",
            message: e.message || "模拟登录失败",
        });
    }
}

module.exports = {
    getQQAuthUrl,
    qqCallback,
    bindQQ,
    mockQQLogin,
};
