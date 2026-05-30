'use client';

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

/**
 * Componente Input reutilizável
 * - Suporte a label, error e helperText
 * - Validação visual de erro
 * - Responsivo
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helpText, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
        )}

        <input
          ref={ref}
          className={`w-full px-4 py-2.5 border rounded-lg transition-all duration-200 
            focus:outline-none focus:ring-2 focus:ring-purple-main focus:border-transparent
            disabled:bg-gray-100 disabled:cursor-not-allowed
            ${error ? 'border-red-500' : 'border-gray-300'}
            ${className}`}
          {...props}
        />

        {error && <span className="text-sm text-red-500 mt-1 block">{error}</span>}

        {helpText && !error && <span className="text-sm text-gray-500 mt-1 block">{helpText}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
