// Ícones em linha (SVG). Tamanho = font-size do elemento pai (width/height em "1em").
const base = {
  width: '18px',
  height: '18px',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  style: { display: 'inline-block', verticalAlign: 'middle' }
};

export const IcoPainel = (props) => (
  <svg {...base} {...props}><path d="M3.5 14a8.5 8.5 0 1 1 17 0" /><path d="M12 14l3.5-3.5" /><circle cx="12" cy="14" r="1.4" fill="currentColor" stroke="none" /></svg>
);
export const IcoCondominio = (props) => (
  <svg {...base} {...props}><rect x="4" y="3" width="10" height="18" rx="1.5" /><path d="M14 8h5a1 1 0 0 1 1 1v12" /><path d="M7.5 7h3M7.5 11h3M7.5 15h3" /><path d="M3 21h18" /></svg>
);
export const IcoServicos = (props) => (
  <svg {...base} {...props}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
);
export const IcoDedetizacao = (props) => (
  <svg {...base} {...props}><rect x="7" y="9" width="9" height="12" rx="2" /><path d="M10 9V6h4v3" /><path d="M10 6V4.2h2.6" /><path d="M16 6h2l2-1.2" /></svg>
);
export const IcoExtintor = (props) => (
  <svg {...base} {...props}><rect x="8" y="9" width="8" height="12" rx="3" /><path d="M11 9V6.5h4V9" /><path d="M12.5 6.5V4.5h3" /><path d="M15 5.4c1.8 0 2.6.9 2.6 2.2v1" /></svg>
);
export const IcoReservatorio = (props) => (
  <svg {...base} {...props}><path d="M12 3s6.5 5.8 6.5 10.2a6.5 6.5 0 0 1-13 0C5.5 8.8 12 3 12 3Z" /></svg>
);
export const IcoSeguro = (props) => (
  <svg {...base} {...props}><path d="M12 3l7 3v6c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3Z" /><path d="M9 12l2 2 4-4" /></svg>
);
export const IcoAvcb = (props) => (
  <svg {...base} {...props}><circle cx="12" cy="9" r="5" /><path d="M8.5 13.2L7.5 21l4.5-2.3L16.5 21l-1-7.8" /></svg>
);
export const IcoSpda = (props) => (
  <svg {...base} {...props}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
);
export const IcoUsuarios = (props) => (
  <svg {...base} {...props}><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" /><path d="M16 5.6a3 3 0 0 1 0 5.4" /><path d="M21.5 20c0-2.6-1.6-4-4-4.6" /></svg>
);
export const IcoConfig = (props) => (
  <svg {...base} {...props}><circle cx="12" cy="12" r="3" /><path d="M19.4 13c.04-.33.06-.66.06-1s-.02-.67-.06-1l2-1.6-2-3.4-2.4 1a7 7 0 0 0-1.7-1L15 2.5h-4l-.3 2.5a7 7 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6c-.04.33-.06.66-.06 1s.02.67.06 1l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.3 2.5h4l.3-2.5a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.6Z" /></svg>
);
export const IcoSair = (props) => (
  <svg {...base} {...props}><path d="M14 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2" /><path d="M10 12h10M17 9l3 3-3 3" /></svg>
);
export const IcoRelogio = (props) => (
  <svg {...base} {...props}><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" /></svg>
);
export const IcoDoc = (props) => (
  <svg {...base} {...props}><path d="M6 2.5h7l5 5V21a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 21z" /><path d="M13 2.5V7.5h5" /><path d="M9 13h6M9 16.5h6" /></svg>
);
export const IcoCheck = (props) => (
  <svg {...base} {...props}><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-5" /></svg>
);
export const IcoVencido = (props) => (
  <svg {...base} {...props}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9.5h18M8 3v4M16 3v4" /><path d="M12 13v2.5M12 18.5h.01" /></svg>
);
export const IcoCalendario = (props) => (
  <svg {...base} {...props}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9.5h18M8 3v4M16 3v4" /></svg>
);
export const IcoSeta = (props) => (
  <svg {...base} {...props}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const IcoSino = (props) => (
  <svg {...base} {...props}><path d="M6 9a6 6 0 1 1 12 0c0 4.5 2 5.5 2 5.5H4S6 13.5 6 9Z" /><path d="M10 19.5a2 2 0 0 0 4 0" /></svg>
);
export const IcoEye = (props) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }} {...props}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

export const IcoEdit = (props) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }} {...props}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

export const IcoDots = (props) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }} {...props}>
    <circle cx="12" cy="12" r="1.5" fill="currentColor"></circle>
    <circle cx="12" cy="5" r="1.5" fill="currentColor"></circle>
    <circle cx="12" cy="19" r="1.5" fill="currentColor"></circle>
  </svg>
);

export const IcoMore = IcoDots;

export const IcoAlertTriangle = (props) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }} {...props}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
export const IcoAlert = IcoAlertTriangle;
export const IcoCheckCircle = IcoCheck;

export const IcoDownload = (props) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }} {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

export const IcoUpload = (props) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }} {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="17 8 12 3 7 8"></polyline>
    <line x1="12" y1="3" x2="12" y2="15"></line>
  </svg>
);

export const IcoTrash = (props) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }} {...props}>
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

export const IcoCloud = (props) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }} {...props}>
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
  </svg>
);

export const IcoSort = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: '5px', opacity: 0.35 }}>
    <polyline points="7 15 12 20 17 15" />
    <polyline points="7 9 12 4 17 9" />
  </svg>
);

export const IcoSortAsc = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: '5px', color: '#2563eb' }}>
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

export const IcoSortDesc = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: '5px', color: '#2563eb' }}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export const IcoMoon = (props) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }} {...props}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
  </svg>
);

export const IcoSun = (props) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }} {...props}>
    <circle cx="12" cy="12" r="5"></circle>
    <line x1="12" y1="1" x2="12" y2="3"></line>
    <line x1="12" y1="21" x2="12" y2="23"></line>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
    <line x1="1" y1="12" x2="3" y2="12"></line>
    <line x1="21" y1="12" x2="23" y2="12"></line>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
  </svg>
);


