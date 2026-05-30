'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';
import { OctopusLogo } from './OctopusLogo';
import { useAuth } from '@hooks/useAuth';

/**
 * Componente Navbar
 * - Navegação principal
 * - Links autenticados e públicos
 * - Logout
 */
export const Navbar: React.FC = () => {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    router.push('/');
    setMenuOpen(false);
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <OctopusLogo size="sm" animated={false} />
            <span className="text-xl font-bold text-purple-main">Communities</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            {!isAuthenticated ? (
              <>
                <Link href="/auth/login" className="text-gray-700 hover:text-purple-main transition">
                  Login
                </Link>
                <Link
                  href="/auth/register"
                  className="bg-purple-main text-white px-4 py-2 rounded-lg hover:bg-purple-dark transition"
                >
                  Cadastro
                </Link>
              </>
            ) : (
              <>
                <Link href="/communities" className="text-gray-700 hover:text-purple-main transition">
                  Comunidades
                </Link>
                <Link
                  href="/communities/create"
                  className="text-gray-700 hover:text-purple-main transition"
                >
                  Criar
                </Link>
                <div className="flex items-center gap-3">
                  <span className="text-gray-700">{user?.name}</span>
                  <button
                    onClick={handleLogout}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
                  >
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-purple-main"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 space-y-2 animate-fade-in">
            {!isAuthenticated ? (
              <>
                <Link
                  href="/auth/login"
                  className="block text-gray-700 hover:text-purple-main py-2"
                  onClick={() => setMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href="/auth/register"
                  className="block text-gray-700 hover:text-purple-main py-2"
                  onClick={() => setMenuOpen(false)}
                >
                  Cadastro
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/communities"
                  className="block text-gray-700 hover:text-purple-main py-2"
                  onClick={() => setMenuOpen(false)}
                >
                  Comunidades
                </Link>
                <Link
                  href="/communities/create"
                  className="block text-gray-700 hover:text-purple-main py-2"
                  onClick={() => setMenuOpen(false)}
                >
                  Criar Comunidade
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left text-red-500 hover:text-red-600 py-2"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};
