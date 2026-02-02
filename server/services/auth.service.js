const { pool } = require("../db");

async function createUser({ username, password_hash, name }) {
  const [result] = await pool.execute(
    "INSERT INTO users (username, password_hash, name) VALUES (?, ?, ?)",
    [username, password_hash, name]
  );
  return result.insertId;
}

async function getUserByUsername(username) {
  const [rows] = await pool.execute(
    "SELECT id, username, name, password_hash, status FROM users WHERE username = ? LIMIT 1",
    [username]
  );
  return rows[0] || null;
}

async function getUserById(id) {
  const [rows] = await pool.execute(
    "SELECT id, username, name, password_hash, status FROM users WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] || null;
}

async function updateUserPassword(id, password_hash) {
  await pool.execute("UPDATE users SET password_hash = ? WHERE id = ?", [
    password_hash,
    id,
  ]);
}

module.exports = {
  createUser,
  getUserByUsername,
  getUserById,
  updateUserPassword,
};
