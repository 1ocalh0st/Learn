const { pool } = require("../db");
const bcrypt = require("bcrypt");

async function listUsers() {
  const [rows] = await pool.query(
    "SELECT id, username, name, status, created_at, updated_at FROM users ORDER BY id"
  );
  return rows;
}

async function getUserById(id) {
  const [rows] = await pool.query(
    "SELECT id, username, name, status, created_at, updated_at FROM users WHERE id = ?",
    [id]
  );
  return rows[0] || null;
}

async function addUser({ username, password, name, status = 1 }) {
  // 密码加密
  const password_hash = password ? await bcrypt.hash(password, 12) : "";

  const [result] = await pool.query(
    "INSERT INTO users (username, password_hash, name, status) VALUES (?, ?, ?, ?)",
    [username, password_hash, name || null, status]
  );
  return getUserById(result.insertId);
}

async function updateUser(id, { username, password, name, status }) {
  // 构建动态更新语句
  const updates = [];
  const values = [];

  if (username !== undefined) {
    updates.push("username = ?");
    values.push(username);
  }

  if (password !== undefined && password !== "") {
    const password_hash = await bcrypt.hash(password, 12);
    updates.push("password_hash = ?");
    values.push(password_hash);
  }

  if (name !== undefined) {
    updates.push("name = ?");
    values.push(name);
  }

  if (status !== undefined) {
    updates.push("status = ?");
    values.push(status);
  }

  if (updates.length === 0) {
    return getUserById(id);
  }

  values.push(id);

  const [result] = await pool.query(
    `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
    values
  );

  if (result.affectedRows === 0) return null;
  return getUserById(id);
}

async function deleteUser(id) {
  const [result] = await pool.query("DELETE FROM users WHERE id = ?", [id]);
  return result.affectedRows > 0;
}

async function checkUsernameExists(username, excludeId = null) {
  let query = "SELECT id FROM users WHERE username = ?";
  const params = [username];

  if (excludeId !== null) {
    query += " AND id != ?";
    params.push(excludeId);
  }

  const [rows] = await pool.query(query, params);
  return rows.length > 0;
}

module.exports = {
  listUsers,
  getUserById,
  addUser,
  updateUser,
  deleteUser,
  checkUsernameExists,
};
