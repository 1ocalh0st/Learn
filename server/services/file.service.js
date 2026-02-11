const { pool } = require("../db");
const path = require("path");
const fs = require("fs").promises;
const { v4: uuidv4 } = require("uuid");

// 文件存储根目录
const UPLOAD_DIR = path.join(__dirname, "../uploads");

// 确保上传目录存在
async function ensureUploadDir() {
    try {
        await fs.access(UPLOAD_DIR);
    } catch {
        await fs.mkdir(UPLOAD_DIR, { recursive: true });
    }
}

// 获取用户上传目录
async function getUserUploadDir(userId) {
    const userDir = path.join(UPLOAD_DIR, String(userId));
    try {
        await fs.access(userDir);
    } catch {
        await fs.mkdir(userDir, { recursive: true });
    }
    return userDir;
}

// 获取文件列表
async function getFileList(userId, folderId = null) {
    const [folders] = await pool.query(
        `SELECT id, name, parent_id, created_at, 'folder' as type 
     FROM folders 
     WHERE user_id = ? AND parent_id ${folderId ? '= ?' : 'IS NULL'}
     ORDER BY name ASC`,
        folderId ? [userId, folderId] : [userId]
    );

    const [files] = await pool.query(
        `SELECT id, filename as name, file_size, mime_type, folder_id, created_at, 'file' as type
     FROM files 
     WHERE user_id = ? AND folder_id ${folderId ? '= ?' : 'IS NULL'} AND is_deleted = 0
     ORDER BY created_at DESC`,
        folderId ? [userId, folderId] : [userId]
    );

    return { folders, files };
}

// 创建文件夹
async function createFolder(userId, name, parentId = null) {
    const [result] = await pool.query(
        "INSERT INTO folders (user_id, name, parent_id) VALUES (?, ?, ?)",
        [userId, name, parentId]
    );
    return result.insertId;
}

// 上传文件
async function uploadFile(userId, file, folderId = null) {
    await ensureUploadDir();
    const userDir = await getUserUploadDir(userId);

    // 解码文件名：multer 默认使用 latin1 编码，需要转换为 UTF-8
    const originalFilename = Buffer.from(file.originalname, 'latin1').toString('utf8');

    const ext = path.extname(originalFilename);
    const storedName = `${uuidv4()}${ext}`;
    const filePath = path.join(userDir, storedName);

    // 保存文件
    await fs.writeFile(filePath, file.buffer);

    // 保存到数据库
    const [result] = await pool.query(
        `INSERT INTO files (user_id, filename, stored_name, file_path, file_size, mime_type, folder_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, originalFilename, storedName, filePath, file.size, file.mimetype, folderId]
    );

    return {
        id: result.insertId,
        filename: originalFilename,
        file_size: file.size,
        mime_type: file.mimetype
    };
}

// 删除文件（移到回收站）
async function deleteFile(userId, fileId) {
    const [result] = await pool.query(
        "UPDATE files SET is_deleted = 1 WHERE id = ? AND user_id = ?",
        [fileId, userId]
    );
    return result.affectedRows > 0;
}

// 永久删除文件
async function permanentDeleteFile(userId, fileId) {
    const [files] = await pool.query(
        "SELECT file_path FROM files WHERE id = ? AND user_id = ?",
        [fileId, userId]
    );

    if (files.length > 0) {
        try {
            await fs.unlink(files[0].file_path);
        } catch (e) {
            console.error("删除物理文件失败:", e);
        }
        await pool.query("DELETE FROM files WHERE id = ?", [fileId]);
        return true;
    }
    return false;
}

// 删除文件夹
async function deleteFolder(userId, folderId) {
    // 递归删除子文件和子文件夹
    const [subFolders] = await pool.query(
        "SELECT id FROM folders WHERE parent_id = ? AND user_id = ?",
        [folderId, userId]
    );

    for (const folder of subFolders) {
        await deleteFolder(userId, folder.id);
    }

    // 删除文件夹内的文件
    await pool.query(
        "UPDATE files SET is_deleted = 1 WHERE folder_id = ? AND user_id = ?",
        [folderId, userId]
    );

    // 删除文件夹
    await pool.query("DELETE FROM folders WHERE id = ? AND user_id = ?", [folderId, userId]);
    return true;
}

// 重命名文件
async function renameFile(userId, fileId, newName) {
    const [result] = await pool.query(
        "UPDATE files SET filename = ? WHERE id = ? AND user_id = ?",
        [newName, fileId, userId]
    );
    return result.affectedRows > 0;
}

// 移动文件或文件夹
async function moveItem(userId, itemId, itemType, targetFolderId) {
    if (itemType === 'folder') {
        // 防止将文件夹移入自身或其子文件夹
        if (targetFolderId !== null) {
            let currentTargetId = targetFolderId;
            while (currentTargetId !== null) {
                if (currentTargetId === parseInt(itemId)) {
                    throw new Error("不能将文件夹移动到自身或其子文件夹中");
                }
                const [parent] = await pool.query(
                    "SELECT parent_id FROM folders WHERE id = ? AND user_id = ?",
                    [currentTargetId, userId]
                );
                currentTargetId = parent.length > 0 ? parent[0].parent_id : null;
            }
        }

        const [result] = await pool.query(
            "UPDATE folders SET parent_id = ? WHERE id = ? AND user_id = ?",
            [targetFolderId, itemId, userId]
        );
        return result.affectedRows > 0;
    } else {
        const [result] = await pool.query(
            "UPDATE files SET folder_id = ? WHERE id = ? AND user_id = ?",
            [targetFolderId, itemId, userId]
        );
        return result.affectedRows > 0;
    }
}

// 重命名文件夹
async function renameFolder(userId, folderId, newName) {
    const [result] = await pool.query(
        "UPDATE folders SET name = ? WHERE id = ? AND user_id = ?",
        [newName, folderId, userId]
    );
    return result.affectedRows > 0;
}

// 获取文件详情（用于下载）
async function getFileById(userId, fileId) {
    const [files] = await pool.query(
        "SELECT * FROM files WHERE id = ? AND user_id = ? AND is_deleted = 0",
        [fileId, userId]
    );
    return files[0] || null;
}

// 获取存储统计
async function getStorageStats(userId) {
    const [result] = await pool.query(
        "SELECT COUNT(*) as file_count, COALESCE(SUM(file_size), 0) as total_size FROM files WHERE user_id = ? AND is_deleted = 0",
        [userId]
    );
    const [folderResult] = await pool.query(
        "SELECT COUNT(*) as folder_count FROM folders WHERE user_id = ?",
        [userId]
    );
    return {
        fileCount: result[0].file_count,
        folderCount: folderResult[0].folder_count,
        totalSize: result[0].total_size
    };
}

module.exports = {
    getFileList,
    createFolder,
    uploadFile,
    deleteFile,
    permanentDeleteFile,
    deleteFolder,
    renameFile,
    renameFolder,
    moveItem,
    getFileById,
    getStorageStats,
    UPLOAD_DIR
};
