const express = require("express");
const auth = require("../middleware/auth");
const {
    getQQAuthUrl,
    qqCallback,
    bindQQ,
    mockQQLogin,
} = require("../controllers/qq.controller");

const router = express.Router();

console.log("QQ routes loading...");

// 获取 QQ 授权 URL
router.get("/auth/qq/url", getQQAuthUrl);

// QQ 授权回调（登录/注册）
router.post("/auth/qq/callback", qqCallback);

// 绑定 QQ 到已登录账户（需要认证）
router.post("/auth/qq/bind", auth, bindQQ);

// 模拟 QQ 登录（仅开发环境）
router.post("/auth/qq/mock", mockQQLogin);

console.log("QQ routes loaded!");

module.exports = router;
