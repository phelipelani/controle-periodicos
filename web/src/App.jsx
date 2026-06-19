import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Condominios from './pages/Condominios';
import CondominioDetalhe from './pages/CondominioDetalhe';
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
          path="/servicos"
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
