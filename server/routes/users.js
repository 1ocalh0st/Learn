const express = require("express");
const users = require("../controllers/users.controller");
const auth = require("../middleware/auth");

const router = express.Router();

router.use(auth);

// New endpoints
router.get("/users/list", users.listUsers);
router.get("/users/detail", users.getUserDetail);
router.post("/users/add", users.addUser);
router.post("/users/update", users.updateUser);
router.post("/users/delete", users.deleteUser);

// Legacy endpoints (kept for compatibility)
router.get("/users", users.listUsers);
router.post("/users", users.addUser);
router.delete("/users/:id", users.deleteUserByParam);

module.exports = router;
