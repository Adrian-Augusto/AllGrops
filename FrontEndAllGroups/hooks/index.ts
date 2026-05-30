'use client';

import { useState, useCallback } from 'react';
import { ICommunityDetailed } from '@types/index';
import { communityService } from '@services/index';

/**
 * Hook para gerenciar uma comunidade específica
 * - Carrega detalhes da comunidade
 * - Gerencia entrada e saída de membros
 */
export const useCommunity = (communityId?: string) => {
  const [community, setCommunity] = useState<ICommunityDetailed | null>(null);
  const [loading, setLoading] = useState({
    isLoading: false,
    error: null as string | null,
    success: false,
  });
  const [isMember, setIsMember] = useState(false);

  /**
   * Carrega detalhes da comunidade
   */
  const fetchCommunity = useCallback(async (id: string) => {
    try {
      setLoading({ isLoading: true, error: null, success: false });

      const data = await communityService.getCommunityById(id);
      setCommunity(data);
      setIsMember(data.isMember);
      setLoading({ isLoading: false, error: null, success: true });
    } catch (error: any) {
      const message = error.message || 'Erro ao carregar comunidade';
      setLoading({ isLoading: false, error: message, success: false });
    }
  }, []);

  /**
   * Usuário entra na comunidade
   */
  const joinCommunity = useCallback(async (id: string) => {
    try {
      setLoading({ isLoading: true, error: null, success: false });

      await communityService.joinCommunity(id);
      setIsMember(true);
      setLoading({ isLoading: false, error: null, success: true });

      // Recarrega comunidade para atualizar lista de membros
      await fetchCommunity(id);
    } catch (error: any) {
      const message = error.message || 'Erro ao entrar na comunidade';
      setLoading({ isLoading: false, error: message, success: false });
    }
  }, [fetchCommunity]);

  /**
   * Usuário sai da comunidade
   */
  const leaveCommunity = useCallback(async (id: string) => {
    try {
      setLoading({ isLoading: true, error: null, success: false });

      await communityService.leaveCommunity(id);
      setIsMember(false);
      setLoading({ isLoading: false, error: null, success: true });

      // Recarrega comunidade para atualizar lista de membros
      await fetchCommunity(id);
    } catch (error: any) {
      const message = error.message || 'Erro ao sair da comunidade';
      setLoading({ isLoading: false, error: message, success: false });
    }
  }, [fetchCommunity]);

  /**
   * Recarrega comunidade
   */
  const refetch = useCallback(async () => {
    if (communityId) {
      await fetchCommunity(communityId);
    }
  }, [communityId, fetchCommunity]);

  return {
    community,
    loading,
    isMember,
    fetchCommunity,
    joinCommunity,
    leaveCommunity,
    refetch,
  };
};
