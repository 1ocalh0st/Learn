const axios = require("axios");
const { pool } = require("../db");

// 微信配置 - 需要在.env中配置
const WECHAT_APP_ID = process.env.WECHAT_APP_ID || "";
const WECHAT_APP_SECRET = process.env.WECHAT_APP_SECRET || "";
const WECHAT_REDIRECT_URI = process.env.WECHAT_REDIRECT_URI || "http://localhost:5173/auth/wechat/callback";

/**
 * 生成微信授权 URL
 */
function getWechatAuthUrl(state = "") {
    const baseUrl = "https://open.weixin.qq.com/connect/qrconnect";
    const params = new URLSearchParams({
        appid: WECHAT_APP_ID,
        redirect_uri: WECHAT_REDIRECT_URI,
        response_type: "code",
        scope: "snsapi_login",
        state: state || Math.random().toString(36).substring(7),
    });
    return `${baseUrl}?${params.toString()}#wechat_redirect`;
}

/**
 * 通过 code 获取微信 access_token 和 openid
 */
async function getWechatAccessToken(code) {
    const url = "https://api.weixin.qq.com/sns/oauth2/access_token";
    const params = {
        appid: WECHAT_APP_ID,
        secret: WECHAT_APP_SECRET,
        code,
        grant_type: "authorization_code",
    };

    const response = await axios.get(url, { params });
    const data = response.data;

    if (data.errcode) {
        throw new Error(data.errmsg || "获取微信 access_token 失败");
    }

    return {
        accessToken: data.access_token,
        openid: data.openid,
        unionid: data.unionid,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
    };
}

/**
 * 获取微信用户信息
 */
async function getWechatUserInfo(accessToken, openid) {
    const url = "https://api.weixin.qq.com/sns/userinfo";
    const params = {
        access_token: accessToken,
        openid,
        lang: "zh_CN",
    };

    const response = await axios.get(url, { params });
    const data = response.data;

    if (data.errcode) {
        throw new Error(data.errmsg || "获取微信用户信息失败");
    }

    return {
        openid: data.openid,
        unionid: data.unionid,
        nickname: data.nickname,
        sex: data.sex,
        province: data.province,
        city: data.city,
        country: data.country,
        headimgurl: data.headimgurl,
    };
}

/**
 * 通过 OpenID 查找用户
 */
async function getUserByWechatOpenid(openid) {
    const [rows] = await pool.execute(
        "SELECT id, username, name, status, wechat_openid, wechat_unionid, wechat_avatar FROM users WHERE wechat_openid = ? LIMIT 1",
        [openid]
    );
    return rows[0] || null;
}

/**
 * 创建微信用户
 */
async function createWechatUser({ openid, unionid, nickname, avatar }) {
    // 生成唯一用户名
    const username = `wx_${openid.substring(0, 16)}`;

    const [result] = await pool.execute(
        `INSERT INTO users (username, name, wechat_openid, wechat_unionid, wechat_avatar, password_hash) 
     VALUES (?, ?, ?, ?, ?, '')`,
        [username, nickname, openid, unionid || null, avatar]
    );
    return result.insertId;
}

/**
 * 绑定微信到已有账户
 */
async function bindWechatToUser(userId, { openid, unionid, avatar }) {
    await pool.execute(
        "UPDATE users SET wechat_openid = ?, wechat_unionid = ?, wechat_avatar = ? WHERE id = ?",
        [openid, unionid || null, avatar, userId]
    );
}

/**
 * 更新微信用户信息
 */
async function updateWechatUserInfo(openid, { nickname, avatar }) {
    await pool.execute(
        "UPDATE users SET name = ?, wechat_avatar = ? WHERE wechat_openid = ?",
        [nickname, avatar, openid]
    );
}

module.exports = {
    getWechatAuthUrl,
    getWechatAccessToken,
    getWechatUserInfo,
    getUserByWechatOpenid,
    createWechatUser,
    bindWechatToUser,
    updateWechatUserInfo,
    WECHAT_APP_ID,
};
