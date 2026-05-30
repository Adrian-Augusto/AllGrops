'use client';

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
}

/**
 * Componente Card reutilizável
 * - Container versátil para conteúdo
 * - Suporte a hover effect
 * - Sombra e bordas modernas
 */
export const Card: React.FC<CardProps> = ({
  children,
  className,
  hoverable = false,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-lg shadow-md p-6 transition-all duration-200
        ${hoverable ? 'hover:shadow-lg hover:scale-105 cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default Card;
