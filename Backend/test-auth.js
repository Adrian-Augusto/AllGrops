#!/usr/bin/env node
"use strict";
/**
 * Script de teste para autenticação e autorização
 *
 * Uso:
 *   node test-auth.js
 *   ou com ts-node:
 *   npx ts-node test-auth.ts
 */
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
const jwt = __importStar(require("jsonwebtoken"));
const API_BASE = process.env.API_BASE || 'https://allgrops.onrender.com';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const results = [];
async function test(name, fn) {
    try {
        await fn();
        results.push({ name, passed: true, message: '✅ PASSOU' });
    }
    catch (error) {
        results.push({
            name,
            passed: false,
            message: '❌ FALHOU',
            details: error instanceof Error ? error.message : String(error),
        });
    }
}
// ============================================================
// Testes
// ============================================================
async function runTests() {
    console.log('🧪 Iniciando testes de autenticação...\n');
    // Teste 1: Login com usuário admin
    await test('Login com credenciais admin', async () => {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: process.env.TEST_ADMIN_EMAIL || 'admin@example.com',
                password: 'senha-admin',
            }),
        });
        if (response.status !== 200) {
            throw new Error(`Status ${response.status} - Login falhou`);
        }
        const data = await response.json();
        if (!data.accessToken) {
            throw new Error('Token não retornado');
        }
        // Armazenar token para próximos testes
        global.adminToken = data.accessToken;
    });
    // Teste 2: Decodificar JWT e verificar role
    await test('JWT contém role = ADMIN', async () => {
        const token = global.adminToken;
        if (!token)
            throw new Error('Token não disponível');
        const decoded = jwt.decode(token);
        if (!decoded)
            throw new Error('Falha ao decodificar JWT');
        if (!decoded.role)
            throw new Error('Campo "role" não encontrado no JWT');
        if (decoded.role !== 'ADMIN')
            throw new Error(`Role é "${decoded.role}", esperado "ADMIN"`);
    });
    // Teste 3: Acessar rota protegida /admin/stats
    await test('Acessar /admin/stats com token admin', async () => {
        const token = global.adminToken;
        if (!token)
            throw new Error('Token não disponível');
        const response = await fetch(`${API_BASE}/admin/stats`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (response.status === 403) {
            throw new Error('Acesso negado (403) - Role não está sendo verificado corretamente');
        }
        if (response.status !== 200) {
            throw new Error(`Status ${response.status} - Erro ao acessar rota`);
        }
    });
    // Teste 4: Login com usuário comum
    await test('Login com credenciais comum (não-admin)', async () => {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: process.env.TEST_USER_EMAIL || 'user@example.com',
                password: 'senha-user',
            }),
        });
        if (response.status !== 200) {
            throw new Error(`Status ${response.status} - Login falhou`);
        }
        const data = await response.json();
        if (!data.accessToken) {
            throw new Error('Token não retornado');
        }
        global.userToken = data.accessToken;
    });
    // Teste 5: Verificar que JWT comum tem role = COMMON
    await test('JWT comum contém role = COMMON', async () => {
        const token = global.userToken;
        if (!token)
            throw new Error('Token não disponível');
        const decoded = jwt.decode(token);
        if (!decoded)
            throw new Error('Falha ao decodificar JWT');
        if (!decoded.role)
            throw new Error('Campo "role" não encontrado no JWT');
        if (decoded.role !== 'COMMON')
            throw new Error(`Role é "${decoded.role}", esperado "COMMON"`);
    });
    // Teste 6: Tentar acessar /admin/stats com usuário comum (deve falhar)
    await test('Rejeitar /admin/stats para usuário COMMON', async () => {
        const token = global.userToken;
        if (!token)
            throw new Error('Token não disponível');
        const response = await fetch(`${API_BASE}/admin/stats`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (response.status !== 403) {
            throw new Error(`Status ${response.status} - Esperado 403 Forbidden`);
        }
    });
    // Teste 7: Acessar com token inválido
    await test('Rejeitar com token inválido', async () => {
        const response = await fetch(`${API_BASE}/admin/stats`, {
            method: 'GET',
            headers: {
                Authorization: 'Bearer invalid-token-here',
            },
        });
        if (response.status !== 401) {
            throw new Error(`Status ${response.status} - Esperado 401 Unauthorized`);
        }
    });
    // Teste 8: Acessar sem token
    await test('Rejeitar sem token', async () => {
        const response = await fetch(`${API_BASE}/admin/stats`, {
            method: 'GET',
        });
        if (response.status !== 401) {
            throw new Error(`Status ${response.status} - Esperado 401 Unauthorized`);
        }
    });
    // ============================================================
    // Relatório de Resultados
    // ============================================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 RELATÓRIO DE TESTES');
    console.log('='.repeat(60) + '\n');
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;
    const total = results.length;
    results.forEach((result, index) => {
        console.log(`${index + 1}. ${result.name}`);
        console.log(`   ${result.message}`);
        if (result.details) {
            console.log(`   📝 ${result.details}`);
        }
        console.log();
    });
    console.log('='.repeat(60));
    console.log(`✅ Passou: ${passed}/${total}`);
    console.log(`❌ Falhou: ${failed}/${total}`);
    console.log('='.repeat(60));
    if (failed === 0) {
        console.log('\n🎉 Todos os testes passaram!');
        process.exit(0);
    }
    else {
        console.log('\n⚠️ Alguns testes falharam. Verifique os detalhes acima.');
        process.exit(1);
    }
}
// ============================================================
// Executar
// ============================================================
runTests().catch((error) => {
    console.error('❌ Erro ao executar testes:', error);
    process.exit(1);
});
