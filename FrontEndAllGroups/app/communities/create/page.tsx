'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@components/Navbar';
import { Button } from '@components/Button';
import { Input } from '@components/Input';
import { Textarea } from '@components/Textarea';
import { Select } from '@components/Select';
import { Toast } from '@components/Toast';
import { useAuth } from '@hooks/useAuth';
import { communityService } from '@services/index';
import { COMMUNITY_CATEGORIES } from '@constants/index';

/**
 * Página de Criar Comunidade
 * - Formulário para criar nova comunidade
 * - Validação no cliente
 * - Confiança no backend para validação final
 */
export default function CreateCommunityPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Valida autenticação
  React.useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  // Validação básica no cliente
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name || formData.name.trim().length === 0) {
      newErrors.name = 'Nome é obrigatório';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Nome deve ter no mínimo 3 caracteres';
    } else if (formData.name.length > 50) {
      newErrors.name = 'Nome não pode ter mais de 50 caracteres';
    }

    if (!formData.description || formData.description.trim().length === 0) {
      newErrors.description = 'Descrição é obrigatória';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Descrição deve ter no mínimo 10 caracteres';
    } else if (formData.description.length > 500) {
      newErrors.description = 'Descrição não pode ter mais de 500 caracteres';
    }

    if (!formData.category || formData.category.length === 0) {
      newErrors.category = 'Categoria é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Limpa erro ao digitar
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setIsLoading(true);

      const newCommunity = await communityService.createCommunity({
        name: formData.name,
        description: formData.description,
        category: formData.category,
      });

      setToast({ message: 'Comunidade criada com sucesso!', type: 'success' });

      // Redireciona para a comunidade criada
      setTimeout(() => {
        router.push(`/communities/${newCommunity.id}`);
      }, 1500);
    } catch (error: any) {
      const message = error.message || 'Erro ao criar comunidade';
      setToast({ message, type: 'error' });
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <>
      <Navbar />

      <main className="flex-1 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link href="/communities" className="text-purple-main hover:underline mb-4 inline-block">
              ← Voltar
            </Link>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Criar Comunidade</h1>
            <p className="text-gray-600">Crie uma nova comunidade para conectar pessoas</p>
          </div>

          {/* Formulário */}
          <div className="bg-white rounded-lg shadow-lg p-8 animate-fade-in">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nome */}
              <Input
                label="Nome da Comunidade"
                type="text"
                name="name"
                placeholder="ex: Desenvolvedores Python"
                value={formData.name}
                onChange={handleChange}
                error={errors.name}
                maxLength={50}
                helpText={`${formData.name.length}/50 caracteres`}
                required
              />

              {/* Categoria */}
              <Select
                label="Categoria"
                name="category"
                options={COMMUNITY_CATEGORIES}
                value={formData.category}
                onChange={handleChange}
                error={errors.category}
                required
              />

              {/* Descrição */}
              <Textarea
                label="Descrição"
                name="description"
                placeholder="Descreva o propósito e os objetivos da comunidade..."
                value={formData.description}
                onChange={handleChange}
                error={errors.description}
                maxLength={500}
                helpText={`${formData.description.length}/500 caracteres`}
                required
                rows={5}
              />

              {/* Info */}
              <div className="bg-purple-lighter rounded-lg p-4 text-sm text-gray-700">
                <p className="font-semibold mb-2">💡 Dicas para uma boa comunidade:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Escolha um nome claro e descritivo</li>
                  <li>Deixe a descrição informativa e atrativa</li>
                  <li>Selecione a categoria mais apropriada</li>
                  <li>Seja bem-vindo ao seu primeiro membro!</li>
                </ul>
              </div>

              {/* Buttons */}
              <div className="flex gap-4">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="flex-1"
                  isLoading={isLoading}
                >
                  Criar Comunidade
                </Button>
                <Link href="/communities" className="flex-1">
                  <Button type="button" variant="outline" size="lg" className="w-full">
                    Cancelar
                  </Button>
                </Link>
              </div>
            </form>
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
