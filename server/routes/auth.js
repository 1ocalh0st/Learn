const express = require("express");
const auth = require("../middleware/auth");
const {
  hello,
  register,
  loginJwt,
  loginLegacy,
  me,
} = require("../controllers/auth.controller");

const router = express.Router();

router.get("/hello", hello);
router.post("/auth/register", register);
router.post("/auth/login", loginJwt);
router.post("/login", loginLegacy);
router.get("/me", auth, me);

module.exports = router;
