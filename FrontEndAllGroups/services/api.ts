import axios, { AxiosInstance, AxiosError } from 'axios';
import { IApiResponse, IApiError } from '@types/index';
import { API_URL, STORAGE_KEYS } from '@constants/index';

/**
 * Cliente HTTP centralizado para requisições à API
 * - Gerencia interceptores
 * - Adiciona token de autenticação automaticamente
 * - Trata erros de forma consistente
 * - Nunca expõe dados sensíveis
 */
class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Interceptor para adicionar token de autorização
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Interceptor para tratamento de erros
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        // Se receber 401, token expirou - limpar storage
        if (error.response?.status === 401) {
          this.clearAuth();
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * GET request
   */
  async get<T>(url: string) {
    try {
      const { data } = await this.client.get<IApiResponse<T>>(url);
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * POST request
   */
  async post<T>(url: string, payload: any) {
    try {
      const { data } = await this.client.post<IApiResponse<T>>(url, payload);
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * PUT request
   */
  async put<T>(url: string, payload: any) {
    try {
      const { data } = await this.client.put<IApiResponse<T>>(url, payload);
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * DELETE request
   */
  async delete<T>(url: string) {
    try {
      const { data } = await this.client.delete<IApiResponse<T>>(url);
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Armazena o token de acesso
   * SEGURANÇA: Apenas accessToken é armazenado em localStorage
   */
  setAccessToken(token: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
    }
  }

  /**
   * Recupera o token de acesso
   */
  getAccessToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    }
    return null;
  }

  /**
   * Remove dados de autenticação
   */
  clearAuth() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
  }

  /**
   * Tratamento centralizado de erros
   */
  private handleError(error: any): IApiError {
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status || 500;
      const message = (error.response?.data as any)?.message || error.message || 'Erro na requisição';
      const errors = (error.response?.data as any)?.errors || undefined;

      console.error(`[API Error] ${statusCode}: ${message}`);

      return {
        message,
        statusCode,
        errors,
      };
    }

    console.error('[API Error]', error);
    return {
      message: 'Erro desconhecido',
      statusCode: 500,
    };
  }
}

export const apiClient = new APIClient();
