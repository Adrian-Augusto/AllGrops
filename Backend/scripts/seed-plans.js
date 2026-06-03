"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Iniciando seed de planos...');
    // Remover planos existentes
    await prisma.plan.deleteMany({});
    console.log('✅ Planos antigos removidos');
    // Criar planos - Com slugs simples para facilitar requisições
    const monthlyPlan = await prisma.plan.create({
        data: {
            name: 'monthly',
            price: 9.9,
            duration: 30,
            type: 'BASIC',
            description: 'Destaque do grupo na categoria por 30 dias',
            isActive: true,
        },
    });
    const quarterlyPlan = await prisma.plan.create({
        data: {
            name: 'quarterly',
            price: 24.9,
            duration: 90,
            type: 'BASIC',
            description: 'Destaque do grupo na categoria por 90 dias',
            isActive: true,
        },
    });
    const annualPlan = await prisma.plan.create({
        data: {
            name: 'annual',
            price: 79.9,
            duration: 365,
            type: 'PREMIUM',
            description: 'Destaque premium + featured do grupo por 1 ano',
            isActive: true,
        },
    });
    console.log('✅ Planos criados com sucesso:');
    console.log(`   - ${monthlyPlan.name} (${monthlyPlan.id}): R$ ${monthlyPlan.price}/mês (${monthlyPlan.duration} dias)`);
    console.log(`   - ${quarterlyPlan.name} (${quarterlyPlan.id}): R$ ${quarterlyPlan.price}/trimestre (${quarterlyPlan.duration} dias)`);
    console.log(`   - ${annualPlan.name} (${annualPlan.id}): R$ ${annualPlan.price}/ano (${annualPlan.duration} dias)`);
    console.log('\n📝 Use these plan names in API requests:');
    console.log(`   POST /api/v1/payments/create -d '{ "planId": "monthly", "groupId": "your-group-id" }'`);
}
main()
    .catch((e) => {
    console.error('❌ Erro ao fazer seed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
