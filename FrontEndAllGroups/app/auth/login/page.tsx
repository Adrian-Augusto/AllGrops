'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@components/Navbar';
import { Button } from '@components/Button';
import { Input } from '@components/Input';
import { Toast } from '@components/Toast';
import { useAuth } from '@hooks/useAuth';

/**
 * Página de Login
 * - Formulário com validação
 * - Feedback de erro
 * - Redirecionamento após sucesso
 */
export default function LoginPage() {
  const router = useRouter();
  const { login, loading } = useAuth();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validação básica no cliente
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) newErrors.email = 'Email é obrigatório';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = 'Email inválido';

    if (!formData.password) newErrors.password = 'Senha é obrigatória';
    else if (formData.password.length < 6)
      newErrors.password = 'Senha deve ter no mínimo 6 caracteres';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const success = await login(formData.email, formData.password);

    if (success) {
      setToast({ message: 'Login realizado com sucesso!', type: 'success' });
      setTimeout(() => {
        router.push('/communities');
      }, 1500);
    } else if (loading.error) {
      setToast({ message: loading.error, type: 'error' });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Limpa erro ao digitar
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <>
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-lg p-8 animate-fade-in">
            <h1 className="text-3xl font-bold text-center mb-2 text-gray-900">Login</h1>
            <p className="text-center text-gray-600 mb-8">Bem-vindo de volta!</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Email"
                type="email"
                name="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
                required
              />

              <Input
                label="Senha"
                type="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={loading.isLoading}
              >
                Entrar
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Não tem conta?{' '}
                <Link href="/auth/register" className="text-purple-main font-semibold hover:underline">
                  Cadastre-se
                </Link>
              </p>
            </div>
          </div>

          {/* Links úteis */}
          <div className="mt-6 text-center">
            <Link href="/" className="text-purple-main hover:underline">
              ← Voltar ao início
            </Link>
          </div>
        </div>
      </main>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
