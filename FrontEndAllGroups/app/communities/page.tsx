'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@components/Navbar';
import { Card } from '@components/Card';
import { Input } from '@components/Input';
import { Select } from '@components/Select';
import { Button } from '@components/Button';
import { LoadingSpinner, EmptyState, SkeletonCommunityCard } from '@components/Loading';
import { useCommunities } from '@hooks/useCommunities';
import { useAuth } from '@hooks/useAuth';
import { COMMUNITY_CATEGORIES } from '@constants/index';

/**
 * Página de Comunidades
 * - Lista de todas as comunidades
 * - Busca e filtro por categoria
 * - Card com informações da comunidade
 * - Link para entrar na comunidade
 */
export default function CommunitiesPage() {
  const { isAuthenticated } = useAuth();
  const { communities, loading, filters, setCategory, setSearch } = useCommunities();
  const [searchInput, setSearchInput] = useState('');

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    setSearch(value);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategory(e.target.value);
  };

  // Se não autenticado, redireciona para login
  React.useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = '/auth/login';
    }
  }, [isAuthenticated]);

  return (
    <>
      <Navbar />

      <main className="flex-1 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 animate-fade-in">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Comunidades</h1>
            <p className="text-gray-600">Descubra e junte-se a comunidades incríveis</p>
          </div>

          {/* Filtros */}
          <div className="mb-8 grid md:grid-cols-3 gap-4">
            <Input
              placeholder="Buscar comunidades..."
              value={searchInput}
              onChange={handleSearch}
            />

            <Select
              options={COMMUNITY_CATEGORIES}
              value={filters.category}
              onChange={handleCategoryChange}
            />

            {isAuthenticated && (
              <Link href="/communities/create">
                <Button variant="primary" className="w-full">
                  ➕ Criar Comunidade
                </Button>
              </Link>
            )}
          </div>

          {/* Loading State */}
          {loading.isLoading && communities.length === 0 ? (
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <SkeletonCommunityCard key={i} />
              ))}
            </div>
          ) : loading.error ? (
            <EmptyState
              title="Erro ao carregar"
              description={loading.error || 'Não foi possível carregar as comunidades'}
            />
          ) : communities.length === 0 ? (
            <EmptyState
              title="Nenhuma comunidade encontrada"
              description="Tente ajustar seus filtros ou crie uma nova comunidade"
            />
          ) : (
            /* Grid de Comunidades */
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6 animate-fade-in">
              {communities.map((community) => (
                <Link
                  key={community.id}
                  href={`/communities/${community.id}`}
                >
                  <Card hoverable className="h-full cursor-pointer">
                    {/* Header da Card */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-lg text-gray-900 line-clamp-2">
                          {community.name}
                        </h3>
                        {community.isPremium && (
                          <span className="inline-block bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-1 rounded mt-1">
                            ⭐ Premium
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Descrição */}
                    <p className="text-gray-600 text-sm line-clamp-3 mb-4">
                      {community.description}
                    </p>

                    {/* Categoria e Membros */}
                    <div className="flex justify-between items-center text-xs text-gray-500 mb-4 pt-4 border-t">
                      <span>👥 {community.members} membros</span>
                      <span>{community.category}</span>
                    </div>

                    {/* Button */}
                    <Button variant="primary" size="sm" className="w-full">
                      Visitar →
                    </Button>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
