'use client';

/**
 * Componente OctopusLogo
 * Polvo roxo fofo e amigável - ícone da plataforma
 */
interface OctopusLogoProps {
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

export const OctopusLogo: React.FC<OctopusLogoProps> = ({
  size = 'md',
  animated = true,
}) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  return (
    <svg
      viewBox="0 0 200 200"
      className={`${sizes[size]} ${animated ? 'animate-pulse' : ''}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Cabeça */}
      <circle cx="100" cy="80" r="45" fill="#8B5CF6" />

      {/* Olhos brancos */}
      <circle cx="85" cy="70" r="12" fill="white" />
      <circle cx="115" cy="70" r="12" fill="white" />

      {/* Pupilas */}
      <circle cx="85" cy="70" r="6" fill="#6D28D9" />
      <circle cx="115" cy="70" r="6" fill="#6D28D9" />

      {/* Boca feliz */}
      <path d="M 85 85 Q 100 95 115 85" stroke="#6D28D9" strokeWidth="2" fill="none" />

      {/* Tentáculos */}
      {[0, 60, 120, 180, 240, 300].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const x1 = 100 + Math.cos(rad) * 40;
        const y1 = 80 + Math.sin(rad) * 40;
        const x2 = 100 + Math.cos(rad) * 85;
        const y2 = 80 + Math.sin(rad) * 85;

        return (
          <path
            key={angle}
            d={`M ${x1} ${y1} Q ${x2 - 10} ${y2 + 10} ${x2} ${y2}`}
            stroke="#8B5CF6"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
          />
        );
      })}

      {/* Bolinhas nos tentáculos */}
      {[0, 60, 120, 180, 240, 300].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        return (
          <circle
            key={`dot-${angle}`}
            cx={100 + Math.cos(rad) * 70}
            cy={80 + Math.sin(rad) * 70}
            r="4"
            fill="#C4B5FD"
          />
        );
      })}
    </svg>
  );
};
