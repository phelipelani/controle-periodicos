import { createContext, useContext, useEffect, useState } from 'react';
import { api, setToken, getToken } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setCarregando(false);
      return;
    }
    api
      .get('/auth/me')
      .then(setUsuario)
      .catch(() => setToken(null))
      .finally(() => setCarregando(false));
  }, []);

  async function entrar(email, senha) {
    const { token, usuario } = await api.post('/auth/login', { email, senha });
    setToken(token);
    setUsuario(usuario);
  }

  function sair() {
    setToken(null);
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, carregando, entrar, sair, isAdmin: usuario?.papel === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
