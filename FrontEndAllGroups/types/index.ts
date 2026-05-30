// Tipos para Autenticação
export interface ILoginRequest {
  email: string;
  password: string;
}

export interface IRegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
}

export interface IAuthResponse {
  accessToken: string;
  user: IUser;
}

export interface IUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
}

// Tipos para Comunidades
export interface ICommunity {
  id: string;
  name: string;
  description: string;
  category: string;
  image?: string;
  members: number;
  isPremium: boolean;
  createdAt: string;
}

export interface ICommunityDetailed extends ICommunity {
  membersList: IUser[];
  isMember: boolean;
}

export interface ICreateCommunityRequest {
  name: string;
  description: string;
  category: string;
  image?: string;
}

// Tipos para API
export interface IApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface IApiError {
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}

// Tipos para Estados de Carregamento
export interface ILoadingState {
  isLoading: boolean;
  error: string | null;
  success: boolean;
}
