const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const express = require("express");
const cors = require("cors");
const { pool } = require("./db");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const wechatRoutes = require("./routes/wechat");
const qqRoutes = require("./routes/qq");
const githubRoutes = require("./routes/github");
const fileRoutes = require("./routes/files");

// 测试平台相关路由
const testRoutes = require("./routes/test");
const reportRoutes = require("./routes/report");
const monitorRoutes = require("./routes/monitor");
const aiRoutes = require("./routes/ai");

const app = express();

app.use(cors());
app.use(express.json());
// 静态资源：截图
app.use("/api/screenshots", express.static(path.join(__dirname, "public/screenshots")));

// 调试中间件
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

async function testDB() {
  try {
    const [rows] = await pool.query("SELECT DATABASE() as db");
    console.log("Connected DB =", rows[0].db);
  } catch (e) {
    console.error("DB connect test failed:", e);
  }
}
testDB();

// 测试平台API路由
app.use("/api/test", testRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/monitor", monitorRoutes);
app.use("/api/ai", aiRoutes);

// 先注册第三方登录路由（不需要认证的放前面）
app.use("/api", wechatRoutes);
app.use("/api", qqRoutes);
app.use("/api", githubRoutes);
app.use("/api", authRoutes);
app.use("/api", userRoutes);
app.use("/api", fileRoutes);

app.listen(3000, () => {
  console.log("API server running at http://localhost:3000");
});

