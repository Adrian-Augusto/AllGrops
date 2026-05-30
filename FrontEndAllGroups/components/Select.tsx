'use client';

import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string; emoji?: string }[];
}

/**
 * Componente Select reutilizável
 * - Suporte a label e error
 * - Styling consistente
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
        )}

        <select
          ref={ref}
          className={`w-full px-4 py-2.5 border rounded-lg transition-all duration-200 
            focus:outline-none focus:ring-2 focus:ring-purple-main focus:border-transparent
            disabled:bg-gray-100 disabled:cursor-not-allowed
            ${error ? 'border-red-500' : 'border-gray-300'}
            ${className}`}
          {...props}
        >
          <option value="">Selecione uma opção</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.emoji ? `${option.emoji} ` : ''}
              {option.label}
            </option>
          ))}
        </select>

        {error && <span className="text-sm text-red-500 mt-1 block">{error}</span>}
      </div>
    );
  }
);

Select.displayName = 'Select';
