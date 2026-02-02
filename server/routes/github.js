const express = require("express");
const auth = require("../middleware/auth");
const {
    getGithubAuthUrl,
    githubCallback,
    bindGithub,
    mockGithubLogin,
} = require("../controllers/github.controller");

const router = express.Router();

console.log("GitHub routes loading...");

// 获取 GitHub 授权 URL
router.get("/auth/github/url", getGithubAuthUrl);

// GitHub 授权回调（登录/注册）
router.post("/auth/github/callback", githubCallback);

// 绑定 GitHub 到已登录账户（需要认证）
router.post("/auth/github/bind", auth, bindGithub);

// 模拟 GitHub 登录（仅开发环境）
router.post("/auth/github/mock", mockGithubLogin);

console.log("GitHub routes loaded!");

module.exports = router;
