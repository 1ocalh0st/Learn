const express = require("express");
const cors = require("cors");
const { pool } = require("./db");

const app = express();

app.use(cors());            // 允许跨域
app.use(express.json());    // 解析 JSON body

// 测试数据库连接（放在启动时执行一次）
async function testDB() {
  try {
    const [rows] = await pool.query("SELECT DATABASE() as db");
    console.log("Connected DB =", rows[0].db);
  } catch (e) {
    console.error("DB connect test failed:", e);
  }
}
testDB();

// 1) 测试接口
app.get("/api/hello", (req, res) => {
  res.json({ msg: "Hello from server!", time: Date.now() });
});

// 2) 登录接口：演示用（账号 admin 密码 123456）
app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};
  if (username === "admin" && password === "123456") {
    return res.json({ token: "fake-token-abc", name: "柯锦鸿" });
  }
  return res.status(401).json({ message: "账号或密码错误" });
});

// 3) 需要 token 的接口
app.get("/api/me", (req, res) => {
  const auth = req.headers.authorization || ""; // "Bearer xxx"
  if (auth === "Bearer fake-token-abc") {
    return res.json({ name: "柯锦鸿", role: "admin" });
  }
  return res.status(401).json({ message: "未登录" });
});

// ====== DB CRUD 示例 ======

app.get("/api/users", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, created_at FROM users ORDER BY id DESC"
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "DB query failed" });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ message: "name required" });

    const [result] = await pool.query(
      "INSERT INTO users (name) VALUES (?)",
      [name]
    );

    const insertId = result.insertId;
    const [rows] = await pool.query(
      "SELECT id, name, created_at FROM users WHERE id = ?",
      [insertId]
    );

    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "DB insert failed" });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "invalid id" });
    }

    const [result] = await pool.query("DELETE FROM users WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "not found" });
    }

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "DB delete failed" });
  }
});

function toId(value) {
  const id = Number(value);
  return Number.isFinite(id) ? id : null;
}

app.get("/api/users/list", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, created_at FROM users ORDER BY id DESC"
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "DB query failed" });
  }
});

app.get("/api/users/detail", async (req, res) => {
  try {
    const id = toId(req.query.id);
    if (id === null) {
      return res.status(400).json({ message: "invalid id" });
    }

    const [rows] = await pool.query(
      "SELECT id, name, created_at FROM users WHERE id = ?",
      [id]
    );

    if (!rows[0]) {
      return res.status(404).json({ message: "not found" });
    }

    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "DB query failed" });
  }
});

app.post("/api/users/add", async (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ message: "name required" });

    const [result] = await pool.query(
      "INSERT INTO users (name) VALUES (?)",
      [name]
    );

    const insertId = result.insertId;
    const [rows] = await pool.query(
      "SELECT id, name, created_at FROM users WHERE id = ?",
      [insertId]
    );

    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "DB insert failed" });
  }
});

app.post("/api/users/update", async (req, res) => {
  try {
    const { id: rawId, name } = req.body || {};
    const id = toId(rawId);
    if (id === null) {
      return res.status(400).json({ message: "invalid id" });
    }
    if (!name) {
      return res.status(400).json({ message: "name required" });
    }

    const [result] = await pool.query(
      "UPDATE users SET name = ? WHERE id = ?",
      [name, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "not found" });
    }

    const [rows] = await pool.query(
      "SELECT id, name, created_at FROM users WHERE id = ?",
      [id]
    );

    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "DB update failed" });
  }
});

app.post("/api/users/delete", async (req, res) => {
  try {
    const { id: rawId } = req.body || {};
    const id = toId(rawId);
    if (id === null) {
      return res.status(400).json({ message: "invalid id" });
    }

    const [result] = await pool.query("DELETE FROM users WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "not found" });
    }

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "DB delete failed" });
  }
});

app.listen(3000, () => {
  console.log("API server running at http://localhost:3000");
});
