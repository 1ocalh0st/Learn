const jwt = require("jsonwebtoken");
const githubService = require("../services/github.service");

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
 * 获取 GitHub 授权 URL
 * GET /api/auth/github/url
 */
function getGithubAuthUrl(req, res) {
    console.log("getGithubAuthUrl called");
    try {
        const state = req.query.state || "";
        const url = githubService.getGithubAuthUrl(state);

        // 检查是否配置了 GitHub Client ID
        if (!githubService.GITHUB_CLIENT_ID) {
            return res.status(503).json({
                code: "GITHUB_NOT_CONFIGURED",
                message: "GitHub 登录暂未配置，请联系管理员",
            });
        }

        return res.json({
            code: "OK",
            data: { url },
        });
    } catch (e) {
        console.error("getGithubAuthUrl error:", e);
        return res.status(500).json({
            code: "SERVER_ERROR",
            message: "服务器错误",
        });
    }
}

/**
 * GitHub 授权回调 - 处理登录/注册
 * POST /api/auth/github/callback
 * body: { code: string }
 */
async function githubCallback(req, res) {
    console.log("githubCallback called");
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({
            code: "MISSING_CODE",
            message: "缺少授权码",
        });
    }

    try {
        // 1. 获取 access_token
        const tokenData = await githubService.getGithubAccessToken(code);

        // 2. 获取 GitHub 用户信息
        const ghUser = await githubService.getGithubUserInfo(tokenData.accessToken);

        // 3. 如果没有邮箱，尝试获取邮箱
        let email = ghUser.email;
        if (!email) {
            try {
                email = await githubService.getGithubUserEmail(tokenData.accessToken);
            } catch (e) {
                console.log("Failed to get GitHub email:", e.message);
            }
        }

        // 4. 查找是否已绑定用户
        let user = await githubService.getUserByGithubId(ghUser.id);

        let isNewUser = false;

        if (!user) {
            // 5. 新用户 - 自动注册
            isNewUser = true;
            const userId = await githubService.createGithubUser({
                githubId: ghUser.id,
                login: ghUser.login,
                name: ghUser.name,
                email,
                avatar: ghUser.avatarUrl,
            });

            user = {
                id: userId,
                username: `gh_${ghUser.login}`,
                name: ghUser.name || ghUser.login,
            };
        } else {
            // 6. 已有用户 - 更新信息
            await githubService.updateGithubUserInfo(ghUser.id, {
                name: ghUser.name,
                login: ghUser.login,
                avatar: ghUser.avatarUrl,
            });
            user.name = ghUser.name || ghUser.login;
        }

        // 7. 生成 JWT
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
                    avatar: ghUser.avatarUrl,
                    githubLogin: ghUser.login,
                },
            },
        });
    } catch (e) {
        console.error("githubCallback error:", e);
        return res.status(500).json({
            code: "GITHUB_AUTH_FAILED",
            message: e.message || "GitHub 授权失败",
        });
    }
}

/**
 * 绑定 GitHub 到已登录账户
 * POST /api/auth/github/bind
 * body: { code: string }
 * 需要认证
 */
async function bindGithub(req, res) {
    console.log("bindGithub called");
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
        // 1. 获取 access_token
        const tokenData = await githubService.getGithubAccessToken(code);

        // 2. 获取 GitHub 用户信息
        const ghUser = await githubService.getGithubUserInfo(tokenData.accessToken);

        // 3. 检查该 GitHub 是否已绑定其他账户
        const existingUser = await githubService.getUserByGithubId(ghUser.id);
        if (existingUser && existingUser.id !== userId) {
            return res.status(409).json({
                code: "GITHUB_ALREADY_BOUND",
                message: "该 GitHub 账号已绑定其他账户",
            });
        }

        // 4. 绑定 GitHub
        await githubService.bindGithubToUser(userId, {
            githubId: ghUser.id,
            login: ghUser.login,
            avatar: ghUser.avatarUrl,
        });

        return res.json({
            code: "OK",
            message: "GitHub 绑定成功",
            data: {
                githubLogin: ghUser.login,
                githubAvatar: ghUser.avatarUrl,
            },
        });
    } catch (e) {
        console.error("bindGithub error:", e);
        return res.status(500).json({
            code: "GITHUB_BIND_FAILED",
            message: e.message || "GitHub 绑定失败",
        });
    }
}

/**
 * 模拟 GitHub 登录（开发环境使用）
 * POST /api/auth/github/mock
 * body: { username?: string }
 */
async function mockGithubLogin(req, res) {
    console.log("mockGithubLogin called!");

    // 仅在开发环境启用
    if (process.env.NODE_ENV === "production") {
        return res.status(404).json({
            code: "NOT_FOUND",
            message: "接口不存在",
        });
    }

    const { username = "github_user" } = req.body || {};
    const mockGithubId = Math.floor(Math.random() * 100000000);
    const mockLogin = `${username}_${Date.now().toString(36)}`;

    try {
        // 创建模拟用户
        const userId = await githubService.createGithubUser({
            githubId: mockGithubId,
            login: mockLogin,
            name: username,
            email: null,
            avatar: `https://avatars.githubusercontent.com/u/${mockGithubId}?v=4`,
        });

        const user = {
            id: userId,
            username: `gh_${mockLogin}`,
            name: username,
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
                    avatar: `https://avatars.githubusercontent.com/u/${mockGithubId}?v=4`,
                    githubLogin: mockLogin,
                },
            },
        });
    } catch (e) {
        console.error("mockGithubLogin error:", e);
        return res.status(500).json({
            code: "SERVER_ERROR",
            message: e.message || "模拟登录失败",
        });
    }
}

module.exports = {
    getGithubAuthUrl,
    githubCallback,
    bindGithub,
    mockGithubLogin,
};
