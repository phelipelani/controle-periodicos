import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Layout() {
  const { usuario, sair, isAdmin } = useAuth();
  const linkClass = ({ isActive }) => (isActive ? 'ativo' : undefined);

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="marca">
          Controle de Periódicos
          <small>Administradora</small>
        </div>
        <NavLink to="/" end className={linkClass}>Painel</NavLink>
        <NavLink to="/condominios" className={linkClass}>Condomínios</NavLink>
        <NavLink to="/agendamentos" className={linkClass}>Dedetização</NavLink>
        {isAdmin && <NavLink to="/usuarios" className={linkClass}>Usuários</NavLink>}
        {isAdmin && <NavLink to="/servicos" className={linkClass}>Config. serviços</NavLink>}
        <div className="rodape">
          {usuario?.nome}
          <br />
          <button className="secundario" onClick={sair}>Sair</button>
        </div>
      </nav>
      <main className="conteudo">
        <Outlet />
      </main>
    </div>
  );
}
