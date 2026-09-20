"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.cultureLogic = exports.cultureSchema = exports.supportLogic = exports.supportSchema = exports.notificationsLogic = exports.notificationsSchema = exports.campagnesLogic = exports.campagnesSchema = exports.rendezvousLogic = exports.rendezvousSchema = exports.documentsLogic = exports.documentsSchema = exports.registrationLogic = exports.demandesLogic = exports.demandesSchema = exports.identityLogic = exports.identitySchema = exports.etudiantsLogic = exports.etudiantsSchema = exports.auditLogic = exports.auditSchema = exports.servicesLogic = exports.servicesSchema = void 0;
exports.servicesSchema = __importStar(require("./schema/services"));
exports.servicesLogic = __importStar(require("./services/services"));
exports.auditSchema = __importStar(require("./schema/audit"));
exports.auditLogic = __importStar(require("./services/audit"));
exports.etudiantsSchema = __importStar(require("./schema/etudiants"));
exports.etudiantsLogic = __importStar(require("./services/etudiants"));
exports.identitySchema = __importStar(require("./schema/identity"));
exports.identityLogic = __importStar(require("./services/identity"));
exports.demandesSchema = __importStar(require("./schema/demandes"));
exports.demandesLogic = __importStar(require("./services/demandes"));
exports.registrationLogic = __importStar(require("./services/registration"));
exports.documentsSchema = __importStar(require("./schema/documents"));
exports.documentsLogic = __importStar(require("./services/documents"));
exports.rendezvousSchema = __importStar(require("./schema/rendezvous"));
exports.rendezvousLogic = __importStar(require("./services/rendezvous"));
exports.campagnesSchema = __importStar(require("./schema/campagnes"));
exports.campagnesLogic = __importStar(require("./services/campagnes"));
exports.notificationsSchema = __importStar(require("./schema/notifications"));
exports.notificationsLogic = __importStar(require("./services/notifications"));
exports.supportSchema = __importStar(require("./schema/support"));
exports.supportLogic = __importStar(require("./services/support"));
exports.cultureSchema = __importStar(require("./schema/culture"));
exports.cultureLogic = __importStar(require("./services/culture"));
//# sourceMappingURL=index.js.map