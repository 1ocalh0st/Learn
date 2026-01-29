const jwt = require("jsonwebtoken");
const wechatService = require("../services/wechat.service");

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
 * 获取微信授权 URL
 * GET /api/auth/wechat/url
 */
function getWechatAuthUrl(req, res) {
    console.log("getWechatAuthUrl called");
    try {
        const state = req.query.state || "";
        const url = wechatService.getWechatAuthUrl(state);

        // 检查是否配置了微信 AppID
        if (!wechatService.WECHAT_APP_ID) {
            return res.status(503).json({
                code: "WECHAT_NOT_CONFIGURED",
                message: "微信登录暂未配置，请联系管理员",
            });
        }

        return res.json({
            code: "OK",
            data: { url },
        });
    } catch (e) {
        console.error("getWechatAuthUrl error:", e);
        return res.status(500).json({
            code: "SERVER_ERROR",
            message: "服务器错误",
        });
    }
}

/**
 * 微信授权回调 - 处理登录/注册
 * POST /api/auth/wechat/callback
 * body: { code: string }
 */
async function wechatCallback(req, res) {
    console.log("wechatCallback called");
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({
            code: "MISSING_CODE",
            message: "缺少授权码",
        });
    }

    try {
        // 1. 获取 access_token 和 openid
        const tokenData = await wechatService.getWechatAccessToken(code);

        // 2. 获取微信用户信息
        const wxUser = await wechatService.getWechatUserInfo(
            tokenData.accessToken,
            tokenData.openid
        );

        // 3. 查找是否已绑定用户
        let user = await wechatService.getUserByWechatOpenid(wxUser.openid);

        let isNewUser = false;

        if (!user) {
            // 4. 新用户 - 自动注册
            isNewUser = true;
            const userId = await wechatService.createWechatUser({
                openid: wxUser.openid,
                unionid: wxUser.unionid,
                nickname: wxUser.nickname,
                avatar: wxUser.headimgurl,
            });

            user = {
                id: userId,
                username: `wx_${wxUser.openid.substring(0, 16)}`,
                name: wxUser.nickname,
            };
        } else {
            // 5. 已有用户 - 更新信息
            await wechatService.updateWechatUserInfo(wxUser.openid, {
                nickname: wxUser.nickname,
                avatar: wxUser.headimgurl,
            });
            user.name = wxUser.nickname;
        }

        // 6. 生成 JWT
        const accessToken = signAccessToken(user);
        if (!accessToken) {
            return res.status(500).json({
                code: "SERVER_ERROR",
                message: "JWT 配置错误",
            });
        }

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
                    avatar: wxUser.headimgurl,
                },
            },
        });
    } catch (e) {
        console.error("wechatCallback error:", e);
        return res.status(500).json({
            code: "WECHAT_AUTH_FAILED",
            message: e.message || "微信授权失败",
        });
    }
}

/**
 * 绑定微信到已登录账户
 * POST /api/auth/wechat/bind
 * body: { code: string }
 * 需要认证
 */
async function bindWechat(req, res) {
    console.log("bindWechat called");
    const { code } = req.body;
    const userId = req.user?.id; // 从认证中间件获取

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
        const tokenData = await wechatService.getWechatAccessToken(code);

        // 2. 检查该微信是否已绑定其他账户
        const existingUser = await wechatService.getUserByWechatOpenid(tokenData.openid);
        if (existingUser && existingUser.id !== userId) {
            return res.status(409).json({
                code: "WECHAT_ALREADY_BOUND",
                message: "该微信已绑定其他账户",
            });
        }

        // 3. 获取微信用户信息
        const wxUser = await wechatService.getWechatUserInfo(
            tokenData.accessToken,
            tokenData.openid
        );

        // 4. 绑定微信
        await wechatService.bindWechatToUser(userId, {
            openid: wxUser.openid,
            unionid: wxUser.unionid,
            avatar: wxUser.headimgurl,
        });

        return res.json({
            code: "OK",
            message: "微信绑定成功",
            data: {
                wechatNickname: wxUser.nickname,
                wechatAvatar: wxUser.headimgurl,
            },
        });
    } catch (e) {
        console.error("bindWechat error:", e);
        return res.status(500).json({
            code: "WECHAT_BIND_FAILED",
            message: e.message || "微信绑定失败",
        });
    }
}

/**
 * 模拟微信登录（开发环境使用）
 * POST /api/auth/wechat/mock
 * body: { nickname?: string }
 */
async function mockWechatLogin(req, res) {
    console.log("mockWechatLogin called!");

    // 仅在开发环境启用
    if (process.env.NODE_ENV === "production") {
        return res.status(404).json({
            code: "NOT_FOUND",
            message: "接口不存在",
        });
    }

    const { nickname = "微信用户" } = req.body || {};
    const mockOpenid = `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
        // 创建模拟用户
        const userId = await wechatService.createWechatUser({
            openid: mockOpenid,
            unionid: null,
            nickname,
            avatar: "https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTKq2CRmib1mpu4hOFYtiacTibkIdEYvjpibibS7vSYPvo3F5dYpJPUGz3dH1GVXPgGqHpD3SZUxqKKaVibw/132",
        });

        const user = {
            id: userId,
            username: `wx_${mockOpenid.substring(0, 16)}`,
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
                    avatar: "https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTKq2CRmib1mpu4hOFYtiacTibkIdEYvjpibibS7vSYPvo3F5dYpJPUGz3dH1GVXPgGqHpD3SZUxqKKaVibw/132",
                },
            },
        });
    } catch (e) {
        console.error("mockWechatLogin error:", e);
        return res.status(500).json({
            code: "SERVER_ERROR",
            message: e.message || "模拟登录失败",
        });
    }
}

module.exports = {
    getWechatAuthUrl,
    wechatCallback,
    bindWechat,
    mockWechatLogin,
};
