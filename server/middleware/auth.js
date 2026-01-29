const jwt = require("jsonwebtoken");
const authService = require("../services/auth.service");

function isUserDisabled(status) {
  if (status === undefined || status === null) return false;
  return Number(status) !== 1;
}

module.exports = async function auth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Not logged in" });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ message: "missing jwt secret" });
  }

  let payload;
  try {
    payload = jwt.verify(token, secret);
  } catch (e) {
    return res.status(401).json({ message: "未登录" });
  }

  const userId = Number(payload.sub);
  if (!Number.isFinite(userId)) {
    return res.status(401).json({ message: "未登录" });
  }

  try {
    const user = await authService.getUserById(userId);
    if (!user) {
      return res.status(401).json({ message: "未登录" });
    }
    if (isUserDisabled(user.status)) {
      return res.status(403).json({ message: "用户已被禁用" });
    }

    req.user = user;
    return next();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "server error" });
  }
};
