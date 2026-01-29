const usersService = require("../services/users.service");

function toId(value) {
  const id = Number(value);
  return Number.isFinite(id) ? id : null;
}

async function listUsers(req, res) {
  try {
    const rows = await usersService.listUsers();
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "DB query failed" });
  }
}

async function getUserDetail(req, res) {
  try {
    const id = toId(req.query.id);
    if (id === null) {
      return res.status(400).json({ message: "invalid id" });
    }

    const row = await usersService.getUserById(id);
    if (!row) {
      return res.status(404).json({ message: "not found" });
    }

    res.json(row);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "DB query failed" });
  }
}

async function addUser(req, res) {
  try {
    const { username, password, name, status } = req.body || {};

    if (!username) {
      return res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "用户名不能为空"
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "密码至少6位"
      });
    }

    // 检查用户名是否已存在
    const exists = await usersService.checkUsernameExists(username);
    if (exists) {
      return res.status(409).json({
        code: "USERNAME_EXISTS",
        message: "用户名已存在"
      });
    }

    const row = await usersService.addUser({ username, password, name, status });
    res.json({
      code: "OK",
      message: "用户添加成功",
      data: row
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "DB insert failed" });
  }
}

async function updateUser(req, res) {
  try {
    const { id: rawId, username, password, name, status } = req.body || {};
    const id = toId(rawId);

    if (id === null) {
      return res.status(400).json({ message: "invalid id" });
    }

    // 如果更新用户名，检查是否冲突
    if (username) {
      const exists = await usersService.checkUsernameExists(username, id);
      if (exists) {
        return res.status(409).json({
          code: "USERNAME_EXISTS",
          message: "用户名已存在"
        });
      }
    }

    const row = await usersService.updateUser(id, { username, password, name, status });
    if (!row) {
      return res.status(404).json({ message: "not found" });
    }

    res.json({
      code: "OK",
      message: "用户更新成功",
      data: row
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "DB update failed" });
  }
}

async function deleteUser(req, res) {
  try {
    const { id: rawId } = req.body || {};
    const id = toId(rawId);
    if (id === null) {
      return res.status(400).json({ message: "invalid id" });
    }

    const ok = await usersService.deleteUser(id);
    if (!ok) {
      return res.status(404).json({ message: "not found" });
    }

    res.json({
      code: "OK",
      message: "用户删除成功",
      ok: true
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "DB delete failed" });
  }
}

async function deleteUserByParam(req, res) {
  try {
    const id = toId(req.params.id);
    if (id === null) {
      return res.status(400).json({ message: "invalid id" });
    }

    const ok = await usersService.deleteUser(id);
    if (!ok) {
      return res.status(404).json({ message: "not found" });
    }

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "DB delete failed" });
  }
}

module.exports = {
  listUsers,
  getUserDetail,
  addUser,
  updateUser,
  deleteUser,
  deleteUserByParam,
};
