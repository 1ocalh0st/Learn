const axios = require("axios");
const { pool } = require("../db");

// QQ 互联配置 - 需要在 .env 中配置
const QQ_APP_ID = process.env.QQ_APP_ID || "";
const QQ_APP_KEY = process.env.QQ_APP_KEY || "";
const QQ_REDIRECT_URI = process.env.QQ_REDIRECT_URI || "http://localhost:5173/auth/qq/callback";

/**
 * 生成 QQ 授权 URL
 */
function getQQAuthUrl(state = "") {
    const baseUrl = "https://graph.qq.com/oauth2.0/authorize";
    const params = new URLSearchParams({
        response_type: "code",
        client_id: QQ_APP_ID,
        redirect_uri: QQ_REDIRECT_URI,
        state: state || Math.random().toString(36).substring(7),
        scope: "get_user_info",
    });
    return `${baseUrl}?${params.toString()}`;
}

/**
 * 通过 code 获取 QQ access_token
 */
async function getQQAccessToken(code) {
    const url = "https://graph.qq.com/oauth2.0/token";
    const params = {
        grant_type: "authorization_code",
        client_id: QQ_APP_ID,
        client_secret: QQ_APP_KEY,
        code,
        redirect_uri: QQ_REDIRECT_URI,
        fmt: "json",
    };

    const response = await axios.get(url, { params });
    const data = response.data;

    if (data.error) {
        throw new Error(data.error_description || "获取 QQ access_token 失败");
    }

    return {
        accessToken: data.access_token,
        expiresIn: data.expires_in,
        refreshToken: data.refresh_token,
    };
}

/**
 * 获取 QQ OpenID
 */
async function getQQOpenId(accessToken) {
    const url = "https://graph.qq.com/oauth2.0/me";
    const params = {
        access_token: accessToken,
        fmt: "json",
    };

    const response = await axios.get(url, { params });
    const data = response.data;

    if (data.error) {
        throw new Error(data.error_description || "获取 QQ OpenID 失败");
    }

    return {
        clientId: data.client_id,
        openid: data.openid,
    };
}

/**
 * 获取 QQ 用户信息
 */
async function getQQUserInfo(accessToken, openid) {
    const url = "https://graph.qq.com/user/get_user_info";
    const params = {
        access_token: accessToken,
        oauth_consumer_key: QQ_APP_ID,
        openid,
    };

    const response = await axios.get(url, { params });
    const data = response.data;

    if (data.ret !== 0) {
        throw new Error(data.msg || "获取 QQ 用户信息失败");
    }

    return {
        openid,
        nickname: data.nickname,
        figureurl: data.figureurl,
        figureurl_1: data.figureurl_1,
        figureurl_2: data.figureurl_2,
        figureurl_qq: data.figureurl_qq,
        figureurl_qq_1: data.figureurl_qq_1,
        figureurl_qq_2: data.figureurl_qq_2,
        gender: data.gender,
        gender_type: data.gender_type,
        province: data.province,
        city: data.city,
        year: data.year,
    };
}

/**
 * 通过 QQ OpenID 查找用户
 */
async function getUserByQQOpenid(openid) {
    const [rows] = await pool.execute(
        "SELECT id, username, name, status, qq_openid, qq_avatar FROM users WHERE qq_openid = ? LIMIT 1",
        [openid]
    );
    return rows[0] || null;
}

/**
 * 创建 QQ 用户
 */
async function createQQUser({ openid, nickname, avatar }) {
    // 生成唯一用户名
    const username = `qq_${openid.substring(0, 16)}`;

    const [result] = await pool.execute(
        `INSERT INTO users (username, name, qq_openid, qq_avatar, password_hash) 
         VALUES (?, ?, ?, ?, '')`,
        [username, nickname, openid, avatar]
    );
    return result.insertId;
}

/**
 * 绑定 QQ 到已有账户
 */
async function bindQQToUser(userId, { openid, avatar }) {
    await pool.execute(
        "UPDATE users SET qq_openid = ?, qq_avatar = ? WHERE id = ?",
        [openid, avatar, userId]
    );
}

/**
 * 更新 QQ 用户信息
 */
async function updateQQUserInfo(openid, { nickname, avatar }) {
    await pool.execute(
        "UPDATE users SET name = ?, qq_avatar = ? WHERE qq_openid = ?",
        [nickname, avatar, openid]
    );
}

module.exports = {
    getQQAuthUrl,
    getQQAccessToken,
    getQQOpenId,
    getQQUserInfo,
    getUserByQQOpenid,
    createQQUser,
    bindQQToUser,
    updateQQUserInfo,
    QQ_APP_ID,
};
