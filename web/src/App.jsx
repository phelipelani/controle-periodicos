import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Condominios from './pages/Condominios';
import CondominioDetalhe from './pages/CondominioDetalhe';
import ServicoPagina from './pages/ServicoPagina';
import Seguros from './pages/Seguros';
import Dedetizacao from './pages/Dedetizacao';
import Extintores from './pages/Extintores';
import Reservatorios from './pages/Reservatorios';
import Spda from './pages/Spda';
import Avcb from './pages/Avcb';
import Agendamentos from './pages/Agendamentos';
import Usuarios from './pages/Usuarios';
import ConfigServicos from './pages/ConfigServicos';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/condominios" element={<Condominios />} />
        <Route path="/condominios/:id" element={<CondominioDetalhe />} />
        <Route path="/servicos/seguro" element={<Seguros />} />
        <Route path="/servicos/dedetizacao" element={<Dedetizacao />} />
        <Route path="/servicos/extintor" element={<Extintores />} />
        <Route path="/servicos/reservatorio" element={<Reservatorios />} />
        <Route path="/servicos/spda" element={<Spda />} />
        <Route path="/spda" element={<Spda />} />
        <Route path="/servicos/avcb" element={<Avcb />} />
        <Route path="/avcb" element={<Avcb />} />
        <Route path="/servicos/:chave" element={<ServicoPagina />} />
        <Route path="/agendamentos" element={<Agendamentos />} />
        <Route
          path="/usuarios"
          element={
            <ProtectedRoute somenteAdmin>
              <Usuarios />
            </ProtectedRoute>
          }
        />
        <Route
          path="/config-servicos"
          element={
            <ProtectedRoute somenteAdmin>
              <ConfigServicos />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}
