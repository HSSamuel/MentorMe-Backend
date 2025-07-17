"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
exports.prisma = global.prisma ||
    new client_1.PrismaClient({
        log: ["query", "info", "warn", "error"], // Optional: Provides more detailed logging for debugging.
    });
// In a non-production environment, we assign the prisma instance to the global object.
if (process.env.NODE_ENV !== "production") {
    global.prisma = exports.prisma;
}
exports.default = exports.prisma;
