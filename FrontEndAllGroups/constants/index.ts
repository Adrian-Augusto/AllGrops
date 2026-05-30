// Categorias de comunidades disponíveis
export const COMMUNITY_CATEGORIES = [
  { id: 'tech', label: 'Tecnologia', emoji: '💻' },
  { id: 'gaming', label: 'Gaming', emoji: '🎮' },
  { id: 'creative', label: 'Criatividade', emoji: '🎨' },
  { id: 'music', label: 'Música', emoji: '🎵' },
  { id: 'sports', label: 'Esportes', emoji: '⚽' },
  { id: 'education', label: 'Educação', emoji: '📚' },
  { id: 'business', label: 'Negócios', emoji: '💼' },
  { id: 'lifestyle', label: 'Estilo de Vida', emoji: '🌟' },
  { id: 'travel', label: 'Viagens', emoji: '✈️' },
  { id: 'health', label: 'Saúde', emoji: '🏥' },
];

// Chaves para localStorage
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  USER: 'user',
} as const;

// URL da API
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
