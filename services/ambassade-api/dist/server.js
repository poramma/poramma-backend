"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const storage_1 = require("@poramma/storage");
const communication_service_1 = require("./modules/communication/communication.service");
const PORT = process.env.PORT || 4002;
(0, storage_1.ensureBucket)()
    .catch((err) => console.error("Could not ensure MinIO bucket exists (will retry on first upload):", err))
    .finally(() => {
    app_1.default.listen(PORT, () => {
        console.log(`Ambassade API running on port ${PORT}`);
        (0, communication_service_1.startCampagneScheduler)();
    });
});
//# sourceMappingURL=server.js.map