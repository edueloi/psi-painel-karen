import React from 'react';

/**
 * Ilustração vetorial (sem foto real) de uma sessão de terapia — psicólogo(a)
 * e paciente sentados em poltronas conversando, usada no hero da landing page
 * no lugar de mockups de UI genéricos. Estilo flat, paleta da marca.
 */
export const TherapySessionIllustration: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 600 460" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} role="img" aria-label="Ilustração de uma sessão de terapia entre psicólogo e paciente">
    {/* Fundo — círculo suave */}
    <circle cx="300" cy="220" r="215" fill="#EFE9FF" />
    <circle cx="470" cy="110" r="40" fill="#E4F8EE" />
    <circle cx="80" cy="350" r="30" fill="#FCE7F3" />

    {/* Tapete */}
    <ellipse cx="300" cy="404" rx="220" ry="16" fill="#E7E2F7" />

    {/* Planta decorativa */}
    <g>
      <rect x="500" y="300" width="14" height="70" rx="4" fill="#8A7FBE" />
      <path d="M507 300c-4-30-32-40-48-42 6 20 18 36 48 42Z" fill="#12B76A" />
      <path d="M507 300c4-34 34-46 50-48-6 22-18 40-50 48Z" fill="#1FCB80" />
      <path d="M507 300c-2-24 10-38 20-46 6 18 4 34-20 46Z" fill="#7ED9A8" />
      <ellipse cx="507" cy="374" rx="26" ry="8" fill="#DDD1FE" />
    </g>

    {/* Poltrona esquerda (psicólogo/a) */}
    <g>
      <rect x="30" y="280" width="20" height="90" rx="10" fill="#5C2FE0" />
      <rect x="200" y="280" width="20" height="90" rx="10" fill="#5C2FE0" />
      <rect x="42" y="240" width="166" height="130" rx="28" fill="#6D42F5" />
      <rect x="50" y="210" width="150" height="70" rx="26" fill="#7C52F7" />
    </g>

    {/* Figura — psicólogo(a), sentado(a), com prancheta no colo */}
    <g>
      <path d="M75 340c0-30 20-52 50-52s50 22 50 52v20H75v-20Z" fill="#3D1D97" />
      <circle cx="125" cy="248" r="30" fill="#2F1670" />
      <path d="M96 244a29 29 0 0 1 58 0c0 5-1 9-3 12-6-13-17-17-26-17s-20 4-26 17c-2-3-3-7-3-12Z" fill="#150F2E" />
      <rect x="95" y="325" width="60" height="18" rx="8" fill="#F4F0FF" transform="rotate(-4 125 334)" />
      <rect x="102" y="316" width="34" height="26" rx="3" fill="#fff" stroke="#BCA3FC" strokeWidth="2" transform="rotate(-4 119 329)" />
    </g>

    {/* Poltrona direita (paciente) */}
    <g>
      <rect x="380" y="290" width="20" height="90" rx="10" fill="#0D9155" />
      <rect x="550" y="290" width="20" height="90" rx="10" fill="#0D9155" />
      <rect x="392" y="250" width="166" height="130" rx="28" fill="#12B76A" />
      <rect x="400" y="220" width="150" height="70" rx="26" fill="#1FCB80" />
    </g>

    {/* Figura — paciente, sentado(a), postura relaxada com um braço na poltrona */}
    <g>
      <path d="M425 350c0-28 20-50 48-50s48 22 48 50v18h-96v-18Z" fill="#2F1670" />
      <circle cx="473" cy="260" r="30" fill="#3D1D97" />
      <path d="M444 256a29 29 0 0 1 58 0c0 5-1 9-3 12-6-13-17-17-26-17s-20 4-26 17c-2-3-3-7-3-12Z" fill="#150F2E" />
      <rect x="500" y="285" width="46" height="18" rx="9" fill="#2F1670" transform="rotate(-18 523 294)" />
    </g>

    {/* Balão de fala com coração — símbolo de escuta/cuidado, entre as duas figuras */}
    <g>
      <rect x="248" y="150" width="100" height="60" rx="18" fill="#fff" stroke="#DDD1FE" strokeWidth="2" />
      <path d="M275 208l-10 20 24-16" fill="#fff" stroke="#DDD1FE" strokeWidth="2" />
      <path d="M298 168c6-8 22-6 22 5 0 9-13 17-22 24-9-7-22-15-22-24 0-11 16-13 22-5Z" fill="#F43F8C" />
    </g>

    {/* Mesinha central com xícara, entre as poltronas */}
    <g>
      <ellipse cx="300" cy="378" rx="36" ry="8" fill="#DDD1FE" />
      <rect x="282" y="352" width="36" height="26" rx="4" fill="#F4F0FF" stroke="#DDD1FE" strokeWidth="2" />
      <ellipse cx="300" cy="352" rx="18" ry="5" fill="#fff" stroke="#BCA3FC" strokeWidth="1.5" />
      <path d="M318 358c7 0 7 12 0 12" stroke="#BCA3FC" strokeWidth="2" fill="none" />
    </g>
  </svg>
);
