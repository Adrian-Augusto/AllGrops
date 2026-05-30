'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@components/Navbar';
import { Card } from '@components/Card';
import { Button } from '@components/Button';
import { LoadingSpinner, EmptyState } from '@components/Loading';
import { Toast } from '@components/Toast';
import { useCommunity } from '@hooks/index';
import { useAuth } from '@hooks/useAuth';

/**
 * Página de Detalhes da Comunidade
 * - Informações completas da comunidade
 * - Lista de membros
 * - Botão para entrar/sair
 */
export default function CommunityDetailPage() {
  const router = useRouter();
  const params = useParams();
  const communityId = params?.id as string;
  const { isAuthenticated } = useAuth();
  const { community, loading, isMember, fetchCommunity, joinCommunity, leaveCommunity } =
    useCommunity(communityId);
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' } | null>(
    null
  );

  // Carrega comunidade ao montar
  React.useEffect(() => {
    if (communityId) {
      fetchCommunity(communityId);
    }
  }, [communityId, fetchCommunity]);

  // Valida autenticação
  React.useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  const handleJoin = async () => {
    if (!communityId) return;
    const wasSuccess = !loading.isLoading;

    try {
      await joinCommunity(communityId);
      setToast({ message: 'Você entrou na comunidade!', type: 'success' });
    } catch (error) {
      setToast({ message: 'Erro ao entrar na comunidade', type: 'error' });
    }
  };

  const handleLeave = async () => {
    if (!communityId) return;

    try {
      await leaveCommunity(communityId);
      setToast({ message: 'Você saiu da comunidade', type: 'success' });
    } catch (error) {
      setToast({ message: 'Erro ao sair da comunidade', type: 'error' });
    }
  };

  if (!isAuthenticated) return null;

  return (
    <>
      <Navbar />

      <main className="flex-1 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Voltar */}
          <Link href="/communities" className="text-purple-main hover:underline mb-4 inline-block">
            ← Voltar às comunidades
          </Link>

          {/* Loading State */}
          {loading.isLoading && !community ? (
            <LoadingSpinner text="Carregando comunidade..." />
          ) : loading.error ? (
            <EmptyState title="Erro" description={loading.error} />
          ) : !community ? (
            <EmptyState title="Comunidade não encontrada" description="Esta comunidade não existe" />
          ) : (
            <>
              {/* Header */}
              <div className="bg-white rounded-lg shadow-lg p-8 mb-8 animate-fade-in">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">{community.name}</h1>
                    {community.isPremium && (
                      <span className="inline-block bg-yellow-100 text-yellow-800 font-semibold px-3 py-1 rounded">
                        ⭐ Comunidade Premium
                      </span>
                    )}
                  </div>

                  {/* Action Button */}
                  {isMember ? (
                    <Button
                      variant="danger"
                      onClick={handleLeave}
                      isLoading={loading.isLoading}
                    >
                      Sair da Comunidade
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      onClick={handleJoin}
                      isLoading={loading.isLoading}
                    >
                      Entrar na Comunidade
                    </Button>
                  )}
                </div>

                {/* Descrição */}
                <p className="text-gray-700 text-lg mb-6">{community.description}</p>

                {/* Info */}
                <div className="grid md:grid-cols-3 gap-4 pt-6 border-t">
                  <div>
                    <p className="text-gray-500 text-sm">Categoria</p>
                    <p className="text-lg font-semibold text-gray-900">{community.category}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Total de Membros</p>
                    <p className="text-lg font-semibold text-gray-900">👥 {community.members}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Data de Criação</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {new Date(community.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Membros */}
              <div className="bg-white rounded-lg shadow-lg p-8 animate-fade-in">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Membros</h2>

                {community.membersList && community.membersList.length > 0 ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {community.membersList.map((member) => (
                      <Card key={member.id}>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-purple-main flex items-center justify-center text-white font-bold text-lg">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">{member.name}</h3>
                            <p className="text-sm text-gray-500">{member.email}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="Sem membros"
                    description="Seja o primeiro membro desta comunidade"
                  />
                )}
              </div>
            </>
          )}
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
