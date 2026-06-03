"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function fixAdmin() {
    try {
        const email = 'adriansilva7272@gmail.com';
        console.log('🔧 Atualizando admin role...');
        // Update user role to ADMIN
        const admin = await prisma.user.update({
            where: { email },
            data: {
                role: 'ADMIN',
            },
        });
        console.log('✅ Admin atualizado com sucesso!');
        console.log('📧 Email:', admin.email);
        console.log('🔐 Role:', admin.role);
        console.log('🆔 ID:', admin.id);
    }
    catch (error) {
        console.error('❌ Erro ao atualizar admin:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
fixAdmin();
