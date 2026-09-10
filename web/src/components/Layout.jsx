import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  IcoPainel, IcoCondominio, IcoServicos, IcoDedetizacao, IcoExtintor,
  IcoReservatorio, IcoSeguro, IcoAvcb, IcoUsuarios, IcoConfig, IcoSair,
} from './icons';

const ITENS = [
  { to: '/', fim: true, rotulo: 'Painel', Icone: IcoPainel },
  { to: '/condominios', rotulo: 'Condomínios', Icone: IcoCondominio },
  { to: '/servicos', fim: true, rotulo: 'Serviços', Icone: IcoServicos },
  { to: '/servicos/dedetizacao', rotulo: 'Dedetização', Icone: IcoDedetizacao },
  { to: '/servicos/extintor', rotulo: 'Extintores', Icone: IcoExtintor },
  { to: '/servicos/reservatorio', rotulo: 'Reservatórios', Icone: IcoReservatorio },
  { to: '/servicos/seguro', rotulo: 'Seguros', Icone: IcoSeguro },
  { to: '/servicos/avcb', rotulo: 'AVCB', Icone: IcoAvcb },
];

const ITENS_ADMIN = [
  { to: '/usuarios', rotulo: 'Usuários', Icone: IcoUsuarios },
  { to: '/config-servicos', rotulo: 'Config. serviços', Icone: IcoConfig },
];

export default function Layout() {
  const { usuario, sair, isAdmin } = useAuth();
  const linkClass = ({ isActive }) => (isActive ? 'sb-link ativo' : 'sb-link');
  const itens = isAdmin ? [...ITENS, ...ITENS_ADMIN] : ITENS;
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
