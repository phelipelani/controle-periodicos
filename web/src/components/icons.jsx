// Ícones em linha (SVG). Tamanho = font-size do elemento pai (width/height em "1em").
const base = {
  width: '1em',
  height: '1em',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export const IcoPainel = () => (
  <svg {...base}><path d="M3.5 14a8.5 8.5 0 1 1 17 0" /><path d="M12 14l3.5-3.5" /><circle cx="12" cy="14" r="1.4" fill="currentColor" stroke="none" /></svg>
);
export const IcoCondominio = () => (
  <svg {...base}><rect x="4" y="3" width="10" height="18" rx="1.5" /><path d="M14 8h5a1 1 0 0 1 1 1v12" /><path d="M7.5 7h3M7.5 11h3M7.5 15h3" /><path d="M3 21h18" /></svg>
);
export const IcoServicos = () => (
  <svg {...base}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
);
export const IcoDedetizacao = () => (
  <svg {...base}><rect x="7" y="9" width="9" height="12" rx="2" /><path d="M10 9V6h4v3" /><path d="M10 6V4.2h2.6" /><path d="M16 6h2l2-1.2" /></svg>
);
export const IcoExtintor = () => (
  <svg {...base}><rect x="8" y="9" width="8" height="12" rx="3" /><path d="M11 9V6.5h4V9" /><path d="M12.5 6.5V4.5h3" /><path d="M15 5.4c1.8 0 2.6.9 2.6 2.2v1" /></svg>
);
export const IcoReservatorio = () => (
  <svg {...base}><path d="M12 3s6.5 5.8 6.5 10.2a6.5 6.5 0 0 1-13 0C5.5 8.8 12 3 12 3Z" /></svg>
);
export const IcoSeguro = () => (
  <svg {...base}><path d="M12 3l7 3v6c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3Z" /><path d="M9 12l2 2 4-4" /></svg>
);
export const IcoAvcb = () => (
  <svg {...base}><circle cx="12" cy="9" r="5" /><path d="M8.5 13.2L7.5 21l4.5-2.3L16.5 21l-1-7.8" /></svg>
);
export const IcoUsuarios = () => (
  <svg {...base}><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" /><path d="M16 5.6a3 3 0 0 1 0 5.4" /><path d="M21.5 20c0-2.6-1.6-4-4-4.6" /></svg>
);
export const IcoConfig = () => (
  <svg {...base}><circle cx="12" cy="12" r="3" /><path d="M19.4 13c.04-.33.06-.66.06-1s-.02-.67-.06-1l2-1.6-2-3.4-2.4 1a7 7 0 0 0-1.7-1L15 2.5h-4l-.3 2.5a7 7 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6c-.04.33-.06.66-.06 1s.02.67.06 1l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.3 2.5h4l.3-2.5a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.6Z" /></svg>
);
export const IcoSair = () => (
  <svg {...base}><path d="M14 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2" /><path d="M10 12h10M17 9l3 3-3 3" /></svg>
);
export const IcoRelogio = () => (
  <svg {...base}><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" /></svg>
);
export const IcoDoc = () => (
  <svg {...base}><path d="M6 2.5h7l5 5V21a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 21z" /><path d="M13 2.5V7.5h5" /><path d="M9 13h6M9 16.5h6" /></svg>
);
export const IcoCheck = () => (
  <svg {...base}><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-5" /></svg>
);
export const IcoVencido = () => (
  <svg {...base}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9.5h18M8 3v4M16 3v4" /><path d="M12 13v2.5M12 18.5h.01" /></svg>
);
export const IcoCalendario = () => (
  <svg {...base}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9.5h18M8 3v4M16 3v4" /></svg>
);
export const IcoSeta = () => (
  <svg {...base}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const IcoSino = () => (
  <svg {...base}><path d="M6 9a6 6 0 1 1 12 0c0 4.5 2 5.5 2 5.5H4S6 13.5 6 9Z" /><path d="M10 19.5a2 2 0 0 0 4 0" /></svg>
);
