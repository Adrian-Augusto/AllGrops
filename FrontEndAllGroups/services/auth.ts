import { apiClient } from './api';
import { ILoginRequest, IRegisterRequest, IAuthResponse } from '@types/index';
import { STORAGE_KEYS } from '@constants/index';

/**
 * Serviço de autenticação
 * - Realiza login e registro
 * - Gerencia estado de autenticação
 * - Não expõe informações sensíveis
 */
export const authService = {
  /**
   * Realiza login do usuário
   * @param credentials - Email e senha
   * @returns Token e dados do usuário
   */
  async login(credentials: ILoginRequest) {
    try {
      const response = await apiClient.post<IAuthResponse>('/auth/login', credentials);

      if (response.data?.accessToken) {
        apiClient.setAccessToken(response.data.accessToken);

        // Armazena dados públicos do usuário apenas (sem token)
        if (typeof window !== 'undefined') {
          localStorage.setItem(
            STORAGE_KEYS.USER,
            JSON.stringify({
              id: response.data.user.id,
              email: response.data.user.email,
              name: response.data.user.name,
              avatar: response.data.user.avatar,
            })
          );
        }
      }

      return response.data;
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  },

  /**
   * Realiza registro de novo usuário
   * @param data - Dados de registro
   * @returns Token e dados do usuário
   */
  async register(data: IRegisterRequest) {
    try {
      const { confirmPassword, ...registerData } = data;
      const response = await apiClient.post<IAuthResponse>('/auth/register', registerData);

      if (response.data?.accessToken) {
        apiClient.setAccessToken(response.data.accessToken);

        if (typeof window !== 'undefined') {
          localStorage.setItem(
            STORAGE_KEYS.USER,
            JSON.stringify({
              id: response.data.user.id,
              email: response.data.user.email,
              name: response.data.user.name,
              avatar: response.data.user.avatar,
            })
          );
        }
      }

      return response.data;
    } catch (error) {
      console.error('Erro no registro:', error);
      throw error;
    }
  },

  /**
   * Faz logout do usuário
   */
  logout() {
    apiClient.clearAuth();
  },

  /**
   * Verifica se usuário está autenticado
   */
  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  },

  /**
   * Recupera dados do usuário logado
   */
  getCurrentUser() {
    if (typeof window === 'undefined') return null;

    const userJson = localStorage.getItem(STORAGE_KEYS.USER);
    if (!userJson) return null;

    try {
      return JSON.parse(userJson);
    } catch {
      return null;
    }
  },
};
