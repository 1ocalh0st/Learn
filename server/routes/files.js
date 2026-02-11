const express = require("express");
const multer = require("multer");
const router = express.Router();
const fileController = require("../controllers/file.controller");
const auth = require("../middleware/auth");

// 配置multer内存存储
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: 1024 * 1024 * 1024 // 50MB限制
    }
});

// 所有路由需要认证
router.use(auth);

// 文件列表
router.get("/files/list", fileController.list);

// 存储统计
router.get("/files/stats", fileController.stats);

// 创建文件夹
router.post("/files/folder", fileController.createFolder);

// 上传文件
router.post("/files/upload", upload.single("file"), fileController.upload);

// 删除文件
router.post("/files/delete", fileController.deleteFile);

// 删除文件夹
router.post("/files/folder/delete", fileController.deleteFolder);

// 重命名
router.post("/files/rename", fileController.rename);

// 移动文件/文件夹
router.post("/files/move", fileController.move);

// 下载文件
router.get("/files/download/:id", fileController.download);

module.exports = router;
