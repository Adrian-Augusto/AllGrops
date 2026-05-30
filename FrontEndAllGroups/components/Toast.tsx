'use client';

import React from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

/**
 * Componente Toast
 * - Feedback visual de sucesso/erro/info
 * - Auto-dismiss
 */
export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const typeStyles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
  };

  return (
    <div
      className={`
        fixed bottom-4 right-4 max-w-sm px-4 py-3 border rounded-lg shadow-lg
        animate-fade-in ${typeStyles[type]}
        flex items-center gap-3
      `}
    >
      <span className="text-lg font-bold">{icons[type]}</span>
      <p className="text-sm font-medium">{message}</p>
      <button
        onClick={onClose}
        className="ml-auto text-lg opacity-70 hover:opacity-100 transition-opacity"
      >
        ×
      </button>
    </div>
  );
};
