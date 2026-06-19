import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Login() {
  const { entrar } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      await entrar(email, senha);
      navigate('/');
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={enviar}>
        <h1>Controle de Periódicos</h1>
        <p className="sub">Entre com seu usuário</p>
        {erro && <div className="erro">{erro}</div>}
        <div className="campo">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        </div>
        <div className="campo">
          <label>Senha</label>
          <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
        </div>
        <button type="submit" disabled={carregando} style={{ width: '100%' }}>
          {carregando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
