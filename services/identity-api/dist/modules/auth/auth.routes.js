"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("./auth.controller");
const router = (0, express_1.Router)();
router.post("/register", auth_controller_1.register);
router.post("/verify-otp", auth_controller_1.verifyOtp);
router.post("/login", auth_controller_1.login);
router.post("/refresh", auth_controller_1.refresh);
router.post("/logout", auth_controller_1.logout);
router.get("/me", auth_controller_1.me);
router.patch("/profile", auth_controller_1.updateProfile);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map