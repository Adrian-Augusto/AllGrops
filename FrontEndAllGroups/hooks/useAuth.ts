'use client';

import { useState, useEffect, useCallback } from 'react';
import { authService } from '@services/auth';
import { IUser, ILoadingState, IApiError } from '@types/index';

/**
 * Hook para gerenciar estado de autenticação
 * - Gerencia login, logout e registro
 * - Valida inputs no cliente (confiando no backend)
 * - Oferece feedback visual consistente
 */
export const useAuth = () => {
  const [user, setUser] = useState<IUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState({
    isLoading: false,
    error: null as string | null,
    success: false,
  });

  // Inicializa estado de autenticação no cliente
  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    const isAuth = authService.isAuthenticated();

    setUser(currentUser);
    setIsAuthenticated(isAuth);
  }, []);

  /**
   * Realiza login
   */
  const login = useCallback(
    async (email: string, password: string) => {
      try {
        // Validação básica no cliente
        if (!email || !password) {
          setLoading({ isLoading: false, error: 'Email e senha são obrigatórios', success: false });
          return false;
        }

        setLoading({ isLoading: true, error: null, success: false });

        const response = await authService.login({ email, password });
        setUser(response.user);
        setIsAuthenticated(true);
        setLoading({ isLoading: false, error: null, success: true });

        return true;
      } catch (error: any) {
        const message = error.message || 'Erro ao fazer login';
        setLoading({ isLoading: false, error: message, success: false });
        return false;
      }
    },
    []
  );

  /**
   * Realiza registro
   */
  const register = useCallback(
    async (email: string, password: string, confirmPassword: string, name: string) => {
      try {
        // Validação básica no cliente
        if (!email || !password || !name) {
          setLoading({
            isLoading: false,
            error: 'Todos os campos são obrigatórios',
            success: false,
          });
          return false;
        }

        if (password !== confirmPassword) {
          setLoading({
            isLoading: false,
            error: 'As senhas não coincidem',
            success: false,
          });
          return false;
        }

        if (password.length < 6) {
          setLoading({
            isLoading: false,
            error: 'A senha deve ter no mínimo 6 caracteres',
            success: false,
          });
          return false;
        }

        setLoading({ isLoading: true, error: null, success: false });

        const response = await authService.register({
          email,
          password,
          confirmPassword,
          name,
        });

        setUser(response.user);
        setIsAuthenticated(true);
        setLoading({ isLoading: false, error: null, success: true });

        return true;
      } catch (error: any) {
        const message = error.message || 'Erro ao fazer registro';
        setLoading({ isLoading: false, error: message, success: false });
        return false;
      }
    },
    []
  );

  /**
   * Realiza logout
   */
  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
    setLoading({ isLoading: false, error: null, success: false });
  }, []);

  /**
   * Limpa mensagens de erro
   */
  const clearError = useCallback(() => {
    setLoading((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * Limpa mensagem de sucesso
   */
  const clearSuccess = useCallback(() => {
    setLoading((prev) => ({ ...prev, success: false }));
  }, []);

  return {
    user,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
    clearError,
    clearSuccess,
  };
};
