'use client';

import Link from 'next/link';
import { OctopusLogo } from '@components/OctopusLogo';

/**
 * Layout Root da aplicação
 * - Estrutura base com Navbar
 * - Estilos globais
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Communities Platform - Encontre sua comunidade</title>
        <meta
          name="description"
          content="Plataforma moderna de comunidades online. Encontre, crie e participe de comunidades."
        />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-gray-50 font-sans">
        <div className="min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
