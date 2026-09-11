import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  IcoPainel, IcoCondominio, IcoServicos, IcoDedetizacao, IcoExtintor,
  IcoReservatorio, IcoSeguro, IcoAvcb, IcoSpda, IcoUsuarios, IcoConfig, IcoSair,
  IcoMoon, IcoSun
} from './icons';
import { useTheme } from '../theme/ThemeContext';

const ITENS = [
  { to: '/', fim: true, rotulo: 'Painel', Icone: IcoPainel },
  { to: '/condominios', rotulo: 'Condomínios', Icone: IcoCondominio },
  { to: '/servicos/dedetizacao', chave: 'dedetizacao', rotulo: 'Dedetização', Icone: IcoDedetizacao },
  { to: '/servicos/extintor', chave: 'extintor', rotulo: 'Extintores', Icone: IcoExtintor },
  { to: '/servicos/reservatorio', chave: 'reservatorio', rotulo: 'Reservatórios', Icone: IcoReservatorio },
  { to: '/servicos/seguro', chave: 'seguro', rotulo: 'Seguros', Icone: IcoSeguro },
  { to: '/servicos/avcb', chave: 'avcb', rotulo: 'AVCB', Icone: IcoAvcb },
  { to: '/servicos/spda', chave: 'spda', rotulo: 'SPDA', Icone: IcoSpda },
];

const ITENS_ADMIN = [
  { to: '/usuarios', rotulo: 'Usuários', Icone: IcoUsuarios },
  { to: '/config-servicos', rotulo: 'Config. serviços', Icone: IcoConfig },
];

export default function Layout() {
  const { usuario, sair, isAdmin } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const linkClass = ({ isActive }) => (isActive ? 'sb-link ativo' : 'sb-link');
  
  // Filtrar menus por permissões:
  let itens = ITENS;
  if (usuario?.papel === 'corretora') {
    itens = ITENS.filter(item => item.chave === 'seguro');
  } else if (usuario?.papel === 'empresa') {
    const permitidos = Array.isArray(usuario.servicos_permitidos)
      ? usuario.servicos_permitidos
      : (typeof usuario.servicos_permitidos === 'string' ? JSON.parse(usuario.servicos_permitidos || '[]') : []);

    // Para empresa: NÃO mostrar aba Condomínios nem Painel Geral. Mostrar EXCLUSIVAMENTE os serviços permitidos.
    itens = ITENS.filter(item => {
      if (!item.chave) return false; // Remove / e /condominios
      if (permitidos.length === 0) return true;
      return permitidos.includes(item.chave);
    });
  } else if (isAdmin) {
    itens = [...ITENS, ...ITENS_ADMIN];
  }

  const inicial = (usuario?.nome || '?').trim().charAt(0).toUpperCase();

  return (
    <div className="app">
      <nav className="sidebar">
        <img className="sb-logo" src="/Logo%20Preto.png" alt="IMCOSTA" />

        <div className="sb-menu">
          {itens.map(({ to, rotulo, Icone, fim }) => (
            <NavLink key={to} to={to} end={fim} className={linkClass}>
              <span className="sb-ico"><Icone /></span>
              {rotulo}
            </NavLink>
          ))}
        </div>

        <div className="sb-rodape">
          <button 
            className="sb-theme-toggle" 
            onClick={toggleTheme}
            title={isDark ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
            type="button"
          >
            <span className="sb-ico">{isDark ? <IcoSun /> : <IcoMoon />}</span>
            <span>{isDark ? 'Modo Claro' : 'Modo Escuro'}</span>
          </button>

          <div className="sb-user">
            <div className="sb-avatar">{inicial}</div>
            <div className="sb-user-info">
              <strong>{usuario?.nome}</strong>
              <span>{usuario?.email}</span>
            </div>
          </div>
          <button className="sb-sair" onClick={sair}>
            <span className="sb-ico"><IcoSair /></span> Sair
          </button>
        </div>
      </nav>

      <main className="conteudo">
        <Outlet />
      </main>
    </div>
  );
}
