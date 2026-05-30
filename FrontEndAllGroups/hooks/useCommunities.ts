'use client';

import { useState, useEffect, useCallback } from 'react';
import { ICommunity, ILoadingState } from '@types/index';
import { communityService } from '@services/index';

/**
 * Hook para gerenciar lista de comunidades
 * - Busca, filtra e pagina comunidades
 * - Gerencia estado de carregamento
 */
export const useCommunities = (initialFilters?: {
  category?: string;
  search?: string;
}) => {
  const [communities, setCommunities] = useState<ICommunity[]>([]);
  const [loading, setLoading] = useState({
    isLoading: false,
    error: null as string | null,
    success: false,
  });
  const [filters, setFilters] = useState({
    category: initialFilters?.category || '',
    search: initialFilters?.search || '',
    page: 1,
    limit: 12,
  });

  /**
   * Carrega comunidades com filtros atuais
   */
  const fetchCommunities = useCallback(async () => {
    try {
      setLoading({ isLoading: true, error: null, success: false });

      const data = await communityService.getCommunities(filters);
      setCommunities(data);
      setLoading({ isLoading: false, error: null, success: true });
    } catch (error: any) {
      const message = error.message || 'Erro ao carregar comunidades';
      setLoading({ isLoading: false, error: message, success: false });
    }
  }, [filters]);

  /**
   * Carrega comunidades ao montar componente ou quando filtros mudam
   */
  useEffect(() => {
    fetchCommunities();
  }, [fetchCommunities]);

  /**
   * Atualiza filtro de categoria
   */
  const setCategory = useCallback((category: string) => {
    setFilters((prev) => ({
      ...prev,
      category,
      page: 1, // Reset para primeira página
    }));
  }, []);

  /**
   * Atualiza filtro de busca
   */
  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({
      ...prev,
      search,
      page: 1, // Reset para primeira página
    }));
  }, []);

  /**
   * Atualiza página
   */
  const setPage = useCallback((page: number) => {
    setFilters((prev) => ({
      ...prev,
      page,
    }));
  }, []);

  /**
   * Recarrega comunidades
   */
  const refetch = useCallback(() => {
    fetchCommunities();
  }, [fetchCommunities]);

  return {
    communities,
    loading,
    filters,
    setCategory,
    setSearch,
    setPage,
    refetch,
  };
};
