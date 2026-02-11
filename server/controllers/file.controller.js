const fileService = require("../services/file.service");
const path = require("path");
const fs = require("fs").promises;

// 获取文件列表
async function list(req, res) {
    try {
        const userId = req.user.id;
        const folderId = req.query.folderId || null;
        const result = await fileService.getFileList(userId, folderId);
        res.json({ code: "SUCCESS", data: result });
    } catch (e) {
        console.error("获取文件列表失败:", e);
        res.status(500).json({ code: "ERROR", message: "获取文件列表失败" });
    }
}

// 创建文件夹
async function createFolder(req, res) {
    try {
        const userId = req.user.id;
        const { name } = req.body;

        // 处理parentId：可能是 undefined, null, "null", 或实际数字
        let parentId = req.body.parentId;
        if (!parentId || parentId === "null" || parentId === "undefined") {
            parentId = null;
        } else if (typeof parentId === "string") {
            parentId = parseInt(parentId, 10);
            if (isNaN(parentId)) parentId = null;
        }

        if (!name || name.trim() === "") {
            return res.status(400).json({ code: "INVALID_NAME", message: "文件夹名称不能为空" });
        }

        const folderId = await fileService.createFolder(userId, name.trim(), parentId);
        res.json({ code: "SUCCESS", data: { id: folderId, name: name.trim() } });
    } catch (e) {
        console.error("创建文件夹失败:", e);
        res.status(500).json({ code: "ERROR", message: "创建文件夹失败" });
    }
}

// 上传文件
async function upload(req, res) {
    try {
        const userId = req.user.id;
        // 处理folderId：可能是 undefined, null, "null", 或实际数字
        let folderId = req.body.folderId;
        if (!folderId || folderId === "null" || folderId === "undefined") {
            folderId = null;
        } else {
            folderId = parseInt(folderId, 10);
            if (isNaN(folderId)) folderId = null;
        }

        if (!req.file) {
            return res.status(400).json({ code: "NO_FILE", message: "请选择要上传的文件" });
        }

        const result = await fileService.uploadFile(userId, req.file, folderId);
        res.json({ code: "SUCCESS", data: result });
    } catch (e) {
        console.error("上传文件失败:", e);
        res.status(500).json({ code: "ERROR", message: "上传文件失败" });
    }
}

// 删除文件
async function deleteFile(req, res) {
    try {
        const userId = req.user.id;
        const { id } = req.body;

        const success = await fileService.deleteFile(userId, id);
        if (success) {
            res.json({ code: "SUCCESS", message: "文件已移至回收站" });
        } else {
            res.status(404).json({ code: "NOT_FOUND", message: "文件不存在" });
        }
    } catch (e) {
        console.error("删除文件失败:", e);
        res.status(500).json({ code: "ERROR", message: "删除文件失败" });
    }
}

// 删除文件夹
async function deleteFolder(req, res) {
    try {
        const userId = req.user.id;
        const { id } = req.body;

        await fileService.deleteFolder(userId, id);
        res.json({ code: "SUCCESS", message: "文件夹已删除" });
    } catch (e) {
        console.error("删除文件夹失败:", e);
        res.status(500).json({ code: "ERROR", message: "删除文件夹失败" });
    }
}

// 重命名
async function rename(req, res) {
    try {
        const userId = req.user.id;
        const { id, name, type } = req.body;

        if (!name || name.trim() === "") {
            return res.status(400).json({ code: "INVALID_NAME", message: "名称不能为空" });
        }

        let success;
        if (type === "folder") {
            success = await fileService.renameFolder(userId, id, name.trim());
        } else {
            success = await fileService.renameFile(userId, id, name.trim());
        }

        if (success) {
            res.json({ code: "SUCCESS", message: "重命名成功" });
        } else {
            res.status(404).json({ code: "NOT_FOUND", message: "文件或文件夹不存在" });
        }
    } catch (e) {
        console.error("重命名失败:", e);
        res.status(500).json({ code: "ERROR", message: "重命名失败" });
    }
}

// 下载文件
async function download(req, res) {
    try {
        const userId = req.user.id;
        const fileId = req.params.id;

        const file = await fileService.getFileById(userId, fileId);
        if (!file) {
            return res.status(404).json({ code: "NOT_FOUND", message: "文件不存在" });
        }

        // 检查文件是否存在
        try {
            await fs.access(file.file_path);
        } catch {
            return res.status(404).json({ code: "FILE_MISSING", message: "文件已丢失" });
        }

        res.download(file.file_path, file.filename);
    } catch (e) {
        console.error("下载文件失败:", e);
        res.status(500).json({ code: "ERROR", message: "下载文件失败" });
    }
}

// 移动文件/文件夹
async function move(req, res) {
    try {
        const userId = req.user.id;
        const { itemId, itemType, targetFolderId } = req.body;

        if (!itemId || !itemType) {
            return res.status(400).json({ code: "INVALID_PARAMS", message: "参数缺失" });
        }

        const success = await fileService.moveItem(userId, itemId, itemType, targetFolderId);
        if (success) {
            res.json({ code: "SUCCESS", message: "移动成功" });
        } else {
            res.status(404).json({ code: "NOT_FOUND", message: "文件或文件夹不存在" });
        }
    } catch (e) {
        console.error("移动操作失败:", e);
        res.status(500).json({ code: "ERROR", message: e.message || "移动失败" });
    }
}

// 获取存储统计
async function stats(req, res) {
    try {
        const userId = req.user.id;
        const result = await fileService.getStorageStats(userId);
        res.json({ code: "SUCCESS", data: result });
    } catch (e) {
        console.error("获取存储统计失败:", e);
        res.status(500).json({ code: "ERROR", message: "获取存储统计失败" });
    }
}

module.exports = {
    list,
    createFolder,
    upload,
    deleteFile,
    deleteFolder,
    rename,
    download,
    move,
    stats
};
