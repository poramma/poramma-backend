"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const users_controller_1 = require("./users.controller");
const router = (0, express_1.Router)();
router.get("/me/:id", users_controller_1.getUser);
router.get("/me/:id/profile", users_controller_1.getUserProfile);
router.patch("/me/:id/personal-info", users_controller_1.updatePersonalInfo);
router.patch("/me/:id/address", users_controller_1.updateAddress);
router.patch("/me/:id/student", users_controller_1.updateStudentProfile);
router.patch("/me/:id/worker", users_controller_1.updateWorkerProfile);
router.patch("/:id/status", users_controller_1.updateUserStatus);
exports.default = router;
//# sourceMappingURL=users.routes.js.map