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
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function createAdmin() {
    try {
        const email = 'adriansilva7272@gmail.com';
        const password = 'adrian12';
        console.log('🔑 Criando admin...');
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            console.log('❌ Usuário já existe:', email);
            return;
        }
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        // Create admin user
        const admin = await prisma.user.create({
            data: {
                name: 'Admin',
                email,
                password: hashedPassword,
                role: 'ADMIN',
            },
        });
        console.log('✅ Admin criado com sucesso!');
        console.log('📧 Email:', admin.email);
        console.log('👤 Nome:', admin.name);
        console.log('🔐 Role:', admin.role);
        console.log('🆔 ID:', admin.id);
    }
    catch (error) {
        console.error('❌ Erro ao criar admin:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
createAdmin();
