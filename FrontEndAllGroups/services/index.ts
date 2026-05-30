import { apiClient } from './api';
import {
  ICommunity,
  ICommunityDetailed,
  ICreateCommunityRequest,
} from '@types/index';

/**
 * Serviço de comunidades
 * - Realiza operações CRUD de comunidades
 * - Gerencia busca e filtros
 */
export const communityService = {
  /**
   * Lista todas as comunidades com paginação e filtros
   */
  async getCommunities(filters?: {
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    try {
      const params = new URLSearchParams();
      if (filters?.category) params.append('category', filters.category);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const queryString = params.toString();
      const url = `/communities${queryString ? `?${queryString}` : ''}`;

      const response = await apiClient.get<ICommunity[]>(url);
      return response.data || [];
    } catch (error) {
      console.error('Erro ao buscar comunidades:', error);
      throw error;
    }
  },

  /**
   * Obtém detalhes de uma comunidade específica
   */
  async getCommunityById(id: string) {
    try {
      const response = await apiClient.get<ICommunityDetailed>(`/communities/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar comunidade ${id}:`, error);
      throw error;
    }
  },

  /**
   * Cria uma nova comunidade
   */
  async createCommunity(data: ICreateCommunityRequest) {
    try {
      const response = await apiClient.post<ICommunity>('/communities', data);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar comunidade:', error);
      throw error;
    }
  },

  /**
   * Usuário entra em uma comunidade
   */
  async joinCommunity(communityId: string) {
    try {
      const response = await apiClient.post<void>(`/communities/${communityId}/join`, {});
      return response.data;
    } catch (error) {
      console.error(`Erro ao entrar na comunidade ${communityId}:`, error);
      throw error;
    }
  },

  /**
   * Usuário sai de uma comunidade
   */
  async leaveCommunity(communityId: string) {
    try {
      const response = await apiClient.post<void>(`/communities/${communityId}/leave`, {});
      return response.data;
    } catch (error) {
      console.error(`Erro ao sair da comunidade ${communityId}:`, error);
      throw error;
    }
  },
};
