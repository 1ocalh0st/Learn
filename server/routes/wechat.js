const express = require("express");
const auth = require("../middleware/auth");
const {
    getWechatAuthUrl,
    wechatCallback,
    bindWechat,
    mockWechatLogin,
} = require("../controllers/wechat.controller");

const router = express.Router();

console.log("WeChat routes loading...");

// 获取微信授权 URL
router.get("/auth/wechat/url", getWechatAuthUrl);

// 微信授权回调（登录/注册）
router.post("/auth/wechat/callback", wechatCallback);

// 绑定微信到已登录账户（需要认证）
router.post("/auth/wechat/bind", auth, bindWechat);

// 模拟微信登录（仅开发环境）
router.post("/auth/wechat/mock", mockWechatLogin);

console.log("WeChat routes loaded!");

module.exports = router;
