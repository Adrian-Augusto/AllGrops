// Exemplo de Implementação no Frontend (React)

// ============ Components/GoogleLoginButton.jsx ============
export const GoogleLoginButton = () => {
  const handleGoogleLogin = () => {
    // Redireciona para o backend que inicia o fluxo OAuth
    window.location.href = 'http://localhost:8080/api/v1/auth/google';
  };

  return (
    <button onClick={handleGoogleLogin}>
      Entrar com Google
    </button>
  );
};

// ============ Pages/LoginSuccess.jsx ============
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const LoginSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Extrair token da URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const error = params.get('error');

    if (error) {
      // Erro no OAuth
      console.error('Auth error:', error);
      navigate('/login?error=' + error);
      return;
    }

    if (token) {
      // Armazenar token
      localStorage.setItem('accessToken', token);
      
      // Decodificar JWT para obter informações do usuário (opcional)
      const decoded = decodeJWT(token);
      console.log('User ID:', decoded.sub);
      console.log('Email:', decoded.email);
      
      // Redirecionar para dashboard
      navigate('/dashboard');
    } else {
      navigate('/login?error=no_token');
    }
  }, [navigate]);

  return <div>Processando login...</div>;
};

// ============ Utils/api.js ============
// Cliente HTTP com token automático

export const createApiClient = () => {
  const apiBaseUrl = 'http://localhost:8080/api/v1';

  return {
    // Adicionar token em todos os requests
    async request(endpoint, options = {}) {
      const token = localStorage.getItem('accessToken');
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${apiBaseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        // Token expirou, redirecionar para login
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
      }

      return response;
    },

    async get(endpoint) {
      return this.request(endpoint, { method: 'GET' });
    },

    async post(endpoint, body) {
      return this.request(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },

    async patch(endpoint, body) {
      return this.request(endpoint, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
    },
  };
};

const api = createApiClient();

// ============ Exemplos de Uso ============

// Obter dados do usuário (usa token automaticamente)
async function getProfile() {
  const response = await api.get('/users/me');
  const data = await response.json();
  return data;
}

// Obter lista de comunidades
async function getCommunities() {
  const response = await api.get('/communities');
  const data = await response.json();
  return data;
}

// Criar comunidade
async function createCommunity(name, description, categoryId) {
  const response = await api.post('/communities', {
    name,
    description,
    categoryId,
  });
  const data = await response.json();
  return data;
}

// ============ Utils/jwtUtils.js ============

export function decodeJWT(token) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token');
  }

  const decoded = JSON.parse(atob(parts[1]));
  return decoded;
}

export function isTokenExpired(token) {
  const decoded = decodeJWT(token);
  const currentTime = Date.now() / 1000;
  return decoded.exp < currentTime;
}

export function getTokenFromStorage() {
  return localStorage.getItem('accessToken');
}

export function isAuthenticated() {
  const token = getTokenFromStorage();
  if (!token) return false;
  
  try {
    return !isTokenExpired(token);
  } catch {
    return false;
  }
}

// ============ App.jsx (Configurar Rotas) ============

import { Routes, Route, Navigate } from 'react-router-dom';
import { GoogleLoginButton } from './components/GoogleLoginButton';
import { LoginSuccess } from './pages/LoginSuccess';
import { Dashboard } from './pages/Dashboard';
import { isAuthenticated } from './utils/jwtUtils';

function ProtectedRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<GoogleLoginButton />} />
      <Route path="/login-success" element={<LoginSuccess />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
