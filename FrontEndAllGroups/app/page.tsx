'use client';

import React from 'react';
import Link from 'next/link';
import { Navbar } from '@components/Navbar';
import { OctopusLogo } from '@components/OctopusLogo';
import { Button } from '@components/Button';
import { useAuth } from '@hooks/useAuth';

/**
 * Página Home - Landing page
 * - Boas-vindas
 * - Call-to-action para login/registro
 * - Link para listar comunidades
 */
export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-purple-main to-purple-dark text-white py-20 px-4">
          <div className="max-w-4xl mx-auto text-center animate-fade-in">
            <OctopusLogo size="lg" animated={true} />

            <h1 className="text-5xl md:text-6xl font-bold mt-8 mb-4">Communities</h1>

            <p className="text-xl md:text-2xl text-purple-lighter mb-8">
              Encontre, crie e participe de comunidades incríveis
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!isAuthenticated ? (
                <>
                  <Link href="/auth/login">
                    <Button variant="secondary" size="lg">
                      Fazer Login
                    </Button>
                  </Link>
                  <Link href="/auth/register">
                    <Button variant="outline" size="lg">
                      Se Cadastrar
                    </Button>
                  </Link>
                </>
              ) : (
                <Link href="/communities">
                  <Button variant="secondary" size="lg">
                    Explorar Comunidades
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">Por que se juntar?</h2>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: '🌍', title: 'Comunidades Globais', desc: 'Conecte-se com pessoas de todo o mundo' },
                { icon: '💬', title: 'Compartilhe Ideias', desc: 'Tenha conversas significativas' },
                { icon: '🚀', title: 'Cresça Junto', desc: 'Aprenda e desenvolva novas habilidades' },
              ].map((feature, idx) => (
                <div
                  key={idx}
                  className="text-center p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
                >
                  <div className="text-4xl mb-3">{feature.icon}</div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-900">{feature.title}</h3>
                  <p className="text-gray-600">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-purple-lighter py-12 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4 text-gray-900">Pronto para começar?</h2>
            <p className="text-gray-700 mb-6">Junte-se a milhares de membros da comunidade</p>
            {!isAuthenticated && (
              <Link href="/auth/register">
                <Button variant="primary" size="lg">
                  Criar Conta Agora
                </Button>
              </Link>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-8 px-4 text-center">
        <div className="max-w-6xl mx-auto">
          <p>&copy; 2024 Communities Platform. Todos os direitos reservados.</p>
        </div>
      </footer>
    </>
  );
}
