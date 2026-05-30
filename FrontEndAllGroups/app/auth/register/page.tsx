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
 * Página de Registro
 * - Formulário com validação
 * - Validação de senha fraca
 * - Feedback de erro
 */
export default function RegisterPage() {
  const router = useRouter();
  const { register, loading } = useAuth();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validação básica no cliente
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name) newErrors.name = 'Nome é obrigatório';
    if (!formData.email) newErrors.email = 'Email é obrigatório';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = 'Email inválido';

    if (!formData.password) newErrors.password = 'Senha é obrigatória';
    else if (formData.password.length < 6)
      newErrors.password = 'Senha deve ter no mínimo 6 caracteres';

    if (!formData.confirmPassword) newErrors.confirmPassword = 'Confirmação de senha é obrigatória';
    else if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = 'As senhas não coincidem';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const success = await register(
      formData.email,
      formData.password,
      formData.confirmPassword,
      formData.name
    );

    if (success) {
      setToast({ message: 'Registro realizado com sucesso!', type: 'success' });
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
            <h1 className="text-3xl font-bold text-center mb-2 text-gray-900">Cadastro</h1>
            <p className="text-center text-gray-600 mb-8">Crie sua conta e comece agora</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Nome"
                type="text"
                name="name"
                placeholder="Seu Nome"
                value={formData.name}
                onChange={handleChange}
                error={errors.name}
                required
              />

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
                helpText="Mínimo 6 caracteres"
                required
              />

              <Input
                label="Confirmar Senha"
                type="password"
                name="confirmPassword"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                error={errors.confirmPassword}
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={loading.isLoading}
              >
                Cadastrar
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Já tem conta?{' '}
                <Link href="/auth/login" className="text-purple-main font-semibold hover:underline">
                  Faça login
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
