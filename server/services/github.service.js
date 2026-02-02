const axios = require("axios");
const { pool } = require("../db");

// GitHub OAuth 配置 - 需要在 .env 中配置
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || "";
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || "";
const GITHUB_REDIRECT_URI = process.env.GITHUB_REDIRECT_URI || "http://localhost:5173/auth/github/callback";

/**
 * 生成 GitHub 授权 URL
 */
function getGithubAuthUrl(state = "") {
    const baseUrl = "https://github.com/login/oauth/authorize";
    const params = new URLSearchParams({
        client_id: GITHUB_CLIENT_ID,
        redirect_uri: GITHUB_REDIRECT_URI,
        scope: "read:user user:email",
        state: state || Math.random().toString(36).substring(7),
    });
    return `${baseUrl}?${params.toString()}`;
}

/**
 * 通过 code 获取 GitHub access_token
 */
async function getGithubAccessToken(code) {
    const url = "https://github.com/login/oauth/access_token";
    const data = {
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: GITHUB_REDIRECT_URI,
    };

    const response = await axios.post(url, data, {
        headers: {
            Accept: "application/json",
        },
    });

    const result = response.data;

    if (result.error) {
        throw new Error(result.error_description || "获取 GitHub access_token 失败");
    }

    return {
        accessToken: result.access_token,
        tokenType: result.token_type,
        scope: result.scope,
    };
}

/**
 * 获取 GitHub 用户信息
 */
async function getGithubUserInfo(accessToken) {
    const url = "https://api.github.com/user";

    const response = await axios.get(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github.v3+json",
        },
    });

    const data = response.data;

    return {
        id: data.id,
        login: data.login,
        name: data.name,
        email: data.email,
        avatarUrl: data.avatar_url,
        bio: data.bio,
        blog: data.blog,
        location: data.location,
        company: data.company,
        htmlUrl: data.html_url,
    };
}

/**
 * 获取 GitHub 用户邮箱（如果主信息中没有）
 */
async function getGithubUserEmail(accessToken) {
    const url = "https://api.github.com/user/emails";

    const response = await axios.get(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github.v3+json",
        },
    });

    const emails = response.data;
    // 优先返回主邮箱，其次返回已验证的邮箱
    const primaryEmail = emails.find(e => e.primary);
    const verifiedEmail = emails.find(e => e.verified);

    return primaryEmail?.email || verifiedEmail?.email || null;
}

/**
 * 通过 GitHub ID 查找用户
 */
async function getUserByGithubId(githubId) {
    const [rows] = await pool.execute(
        "SELECT id, username, name, status, github_id, github_login, github_avatar FROM users WHERE github_id = ? LIMIT 1",
        [String(githubId)]
    );
    return rows[0] || null;
}

/**
 * 创建 GitHub 用户
 */
async function createGithubUser({ githubId, login, name, email, avatar }) {
    // 生成唯一用户名
    const username = `gh_${login}`;

    const [result] = await pool.execute(
        `INSERT INTO users (username, name, email, github_id, github_login, github_avatar, password_hash) 
         VALUES (?, ?, ?, ?, ?, ?, '')`,
        [username, name || login, email, String(githubId), login, avatar]
    );
    return result.insertId;
}

/**
 * 绑定 GitHub 到已有账户
 */
async function bindGithubToUser(userId, { githubId, login, avatar }) {
    await pool.execute(
        "UPDATE users SET github_id = ?, github_login = ?, github_avatar = ? WHERE id = ?",
        [String(githubId), login, avatar, userId]
    );
}

/**
 * 更新 GitHub 用户信息
 */
async function updateGithubUserInfo(githubId, { name, login, avatar }) {
    await pool.execute(
        "UPDATE users SET name = ?, github_login = ?, github_avatar = ? WHERE github_id = ?",
        [name, login, avatar, String(githubId)]
    );
}

module.exports = {
    getGithubAuthUrl,
    getGithubAccessToken,
    getGithubUserInfo,
    getGithubUserEmail,
    getUserByGithubId,
    createGithubUser,
    bindGithubToUser,
    updateGithubUserInfo,
    GITHUB_CLIENT_ID,
};
