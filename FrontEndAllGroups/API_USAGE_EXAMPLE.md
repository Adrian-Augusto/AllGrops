/**
 * ===================================
 * EXEMPLO: Como usar os Serviços de API
 * ===================================
 *
 * Este arquivo é apenas para documentação.
 * Você pode deletá-lo.
 */

// ===================================
// SERVIÇO DE AUTENTICAÇÃO
// ===================================

import { authService } from '@services/auth';

// Login
async function handleLogin() {
  try {
    const response = await authService.login({
      email: 'user@example.com',
      password: 'password123',
    });

    console.log('Usuário logado:', response.user);
    // Token é armazenado automaticamente
  } catch (error) {
    console.error('Erro de login:', error);
  }
}

// Registro
async function handleRegister() {
  try {
    const response = await authService.register({
      email: 'newuser@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      name: 'João Silva',
    });

    console.log('Usuário registrado:', response.user);
  } catch (error) {
    console.error('Erro de registro:', error);
  }
}

// Verificar se autenticado
const isAuth = authService.isAuthenticated();
console.log('Autenticado?', isAuth);

// Obter usuário atual
const user = authService.getCurrentUser();
console.log('Usuário atual:', user);

// Logout
authService.logout();

// ===================================
// SERVIÇO DE COMUNIDADES
// ===================================

import { communityService } from '@services/index';

// Listar comunidades com filtros
async function handleGetCommunities() {
  try {
    const communities = await communityService.getCommunities({
      category: 'tech',
      search: 'Python',
      page: 1,
      limit: 12,
    });

    console.log('Comunidades:', communities);
  } catch (error) {
    console.error('Erro ao carregar comunidades:', error);
  }
}

// Obter detalhes de uma comunidade
async function handleGetCommunity() {
  try {
    const community = await communityService.getCommunityById('community-id');
    console.log('Comunidade:', community);
  } catch (error) {
    console.error('Erro ao carregar comunidade:', error);
  }
}

// Criar comunidade
async function handleCreateCommunity() {
  try {
    const newCommunity = await communityService.createCommunity({
      name: 'Desenvolvedores Python',
      description: 'Comunidade para compartilhar conhecimento sobre Python',
      category: 'tech',
    });

    console.log('Comunidade criada:', newCommunity);
  } catch (error) {
    console.error('Erro ao criar comunidade:', error);
  }
}

// Entrar em uma comunidade
async function handleJoinCommunity() {
  try {
    await communityService.joinCommunity('community-id');
    console.log('Entrou na comunidade!');
  } catch (error) {
    console.error('Erro ao entrar na comunidade:', error);
  }
}

// Sair de uma comunidade
async function handleLeaveCommunity() {
  try {
    await communityService.leaveCommunity('community-id');
    console.log('Saiu da comunidade');
  } catch (error) {
    console.error('Erro ao sair da comunidade:', error);
  }
}

// ===================================
// USANDO HOOKS (Em componentes React)
// ===================================

import { useAuth } from '@hooks/useAuth';
import { useCommunities } from '@hooks/useCommunities';
import { useCommunity } from '@hooks/index';

// useAuth - Gerenciar autenticação
export function LoginComponent() {
  const { login, logout, user, isAuthenticated, loading } = useAuth();

  const handleLogin = async () => {
    const success = await login('user@example.com', 'password123');
    if (success) {
      console.log('Logado!');
    }
  };

  return (
    <div>
      {isAuthenticated ? (
        <>
          <p>Bem-vindo, {user?.name}</p>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <button onClick={handleLogin} disabled={loading.isLoading}>
          Login
        </button>
      )}
      {loading.error && <p style={{ color: 'red' }}>{loading.error}</p>}
    </div>
  );
}

// useCommunities - Gerenciar lista de comunidades
export function CommunitiesListComponent() {
  const { communities, loading, filters, setCategory, setSearch, refetch } =
    useCommunities();

  return (
    <div>
      <input
        placeholder="Buscar..."
        onChange={(e) => setSearch(e.target.value)}
      />
      <select onChange={(e) => setCategory(e.target.value)}>
        <option value="">Todas as categorias</option>
        <option value="tech">Tecnologia</option>
      </select>

      {loading.isLoading && <p>Carregando...</p>}
      {loading.error && <p style={{ color: 'red' }}>{loading.error}</p>}

      <div>
        {communities.map((community) => (
          <div key={community.id}>
            <h3>{community.name}</h3>
            <p>{community.description}</p>
          </div>
        ))}
      </div>

      <button onClick={refetch}>Recarregar</button>
    </div>
  );
}

// useCommunity - Gerenciar uma comunidade específica
export function CommunityDetailComponent({ communityId }: { communityId: string }) {
  const { community, loading, isMember, joinCommunity, leaveCommunity } =
    useCommunity(communityId);

  const handleJoin = async () => {
    await joinCommunity(communityId);
  };

  const handleLeave = async () => {
    await leaveCommunity(communityId);
  };

  if (loading.isLoading) return <p>Carregando...</p>;
  if (loading.error) return <p style={{ color: 'red' }}>{loading.error}</p>;
  if (!community) return <p>Comunidade não encontrada</p>;

  return (
    <div>
      <h1>{community.name}</h1>
      <p>{community.description}</p>

      {isMember ? (
        <button onClick={handleLeave}>Sair</button>
      ) : (
        <button onClick={handleJoin}>Entrar</button>
      )}

      <h2>Membros ({community.members})</h2>
      <ul>
        {community.membersList?.map((member) => (
          <li key={member.id}>{member.name}</li>
        ))}
      </ul>
    </div>
  );
}

// ===================================
// TIPOS DISPONÍVEIS
// ===================================

import {
  IUser,
  ICommunity,
  ICommunityDetailed,
  ILoginRequest,
  IRegisterRequest,
  ICreateCommunityRequest,
  IApiResponse,
  IApiError,
  ILoadingState,
} from '@types/index';

// Use estes tipos para tipagem forte em seu código:

interface MyComponentProps {
  user: IUser;
  communities: ICommunity[];
  community: ICommunityDetailed;
}

// ===================================
// CONSTANTES
// ===================================

import {
  COMMUNITY_CATEGORIES,
  STORAGE_KEYS,
  API_URL,
} from '@constants/index';

// Categorias disponíveis
console.log(COMMUNITY_CATEGORIES);

// Chaves de localStorage
console.log(STORAGE_KEYS.ACCESS_TOKEN); // 'accessToken'
console.log(STORAGE_KEYS.USER); // 'user'

// URL da API (de environment variable)
console.log(API_URL); // ex: 'http://localhost:3001/api'
