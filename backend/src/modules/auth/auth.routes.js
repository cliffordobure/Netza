const { Router } = require("express");
const ctrl = require("./auth.controller");
const { auth } = require("../../middleware/auth");

const router = Router();

router.post("/register", ctrl.register);
router.post("/login", ctrl.login);
router.post("/refresh", ctrl.refresh);
router.post("/logout", ctrl.logout);
router.get("/me", auth(), ctrl.me);
router.patch("/profile", auth(), ctrl.completeProfile);
router.post("/daily-login", auth(), ctrl.dailyLogin);

module.exports = router;
