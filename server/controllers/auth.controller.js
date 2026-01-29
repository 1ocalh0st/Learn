const { z } = require("zod");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const authService = require("../services/auth.service");

const RegisterDTO = z.object({
  username: z
    .string()
    .min(2)
    .max(50),
  password: z.string().min(6).max(72),
  name: z.string().max(50).optional(),
});

const LoginDTO = z.object({
  username: z.string(),
  password: z.string().min(6).max(72),
});

const INVALID_CREDENTIALS = {
  code: "INVALID_CREDENTIALS",
  message: "invalid credentials",
};
const USER_DISABLED = { code: "USER_DISABLED", message: "用户不存在" };

function isUserDisabled(status) {
  if (status === undefined || status === null) return false;
  return Number(status) !== 1;
}

function getJwtSecret() {
  return process.env.JWT_SECRET || "";
}

function signAccessToken(user) {
  const secret = getJwtSecret();
  if (!secret) return null;
  return jwt.sign(
    { sub: String(user.id), username: user.username },
    secret,
    { expiresIn: "0.5h" }
  );
}

async function verifyLogin(username, password) {
  const user = await authService.getUserByUsername(username);
  if (!user) {
    return { ok: false, status: 401, error: INVALID_CREDENTIALS };
  }
  if (isUserDisabled(user.status)) {
    return { ok: false, status: 403, error: USER_DISABLED };
  }
  if (!user.password_hash) {
    return { ok: false, status: 401, error: INVALID_CREDENTIALS };
  }
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return { ok: false, status: 401, error: INVALID_CREDENTIALS };
  }
  return { ok: true, user };
}

function hello(req, res) {
  res.json({ msg: "服务器发来hello!", time: Date.now() });
}

async function register(req, res) {
  const parsed = RegisterDTO.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message || "invalid params",
    });
  }

  const { username, password, name } = parsed.data;
  const password_hash = await bcrypt.hash(password, 12);

  try {
    const id = await authService.createUser({
      username,
      password_hash,
      name: name,
    });

    return res.json({
      code: "OK",
      message: "ok",
      data: { id, username, name: name },
    });
  } catch (e) {
    if (e?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        code: "USERNAME_EXISTS",
        message: "username already exists",
      });
    }
    console.error(e);
    return res.status(500).json({
      code: "SERVER_ERROR",
      message: "server error",
    });
  }
}

async function loginJwt(req, res) {
  const parsed = LoginDTO.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "invalid params",
    });
  }

  const { username, password } = parsed.data;
  let result;
  try {
    result = await verifyLogin(username, password);
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({ code: "SERVER_ERROR", message: "server error" });
  }
  if (!result.ok) {
    return res.status(result.status).json(result.error);
  }

  const accessToken = signAccessToken(result.user);
  if (!accessToken) {
    return res
      .status(500)
      .json({ code: "SERVER_ERROR", message: "missing jwt secret" });
  }

  return res.json({
    code: "OK",
    message: "ok",
    data: {
      accessToken,
      user: {
        id: result.user.id,
        username: result.user.username,
        name: result.user.name,
      },
    },
  });
}

async function loginLegacy(req, res) {
  const parsed = LoginDTO.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "invalid params" });
  }

  const { username, password } = parsed.data;
  let result;
  try {
    result = await verifyLogin(username, password);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "server error" });
  }
  if (!result.ok) {
    const message =
      result.status === 403 ? "user disabled" : "invalid username or password";
    return res.status(result.status).json({ message });
  }

  const token = signAccessToken(result.user);
  if (!token) {
    return res.status(500).json({ message: "missing jwt secret" });
  }

  return res.json({
    token,
    name: result.user.name || result.user.username,
  });
}

async function me(req, res) {
  const auth = req.headers.authorization || ""; // "Bearer xxx"
  const [, token] = auth.split(" ");
  const secret = getJwtSecret();
  if (!token || !secret) {
    return res.status(401).json({ message: "Not logged in" });
  }

  let payload;
  try {
    payload = jwt.verify(token, secret);
  } catch (e) {
    return res.status(401).json({ message: "Not logged in" });
  }

  const userId = Number(payload.sub);
  if (!Number.isFinite(userId)) {
    return res.status(401).json({ message: "Not logged in" });
  }

  let user;
  try {
    user = await authService.getUserById(userId);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "server error" });
  }

  if (!user) {
    return res.status(401).json({ message: "Not logged in" });
  }
  if (isUserDisabled(user.status)) {
    return res.status(403).json({ message: "user disabled" });
  }

  return res.json({
    name: user.name || user.username || "",
    role: "user",
  });
}

module.exports = { hello, register, loginJwt, loginLegacy, me };
