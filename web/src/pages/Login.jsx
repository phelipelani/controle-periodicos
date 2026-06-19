import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Login() {
  const { entrar } = useAuth();
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      await entrar(usuario.trim(), senha);
      navigate('/');
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="lg-page">
      <div className="lg-red" />
      <div className="lg-build" />

      <form className="lg-card" onSubmit={enviar}>
        <img className="lg-logo" src="/Logo%20Branco.png" alt="IMCOSTA — Controle de Serviços Periódicos" />

        <ProcessoIcones />

        <h1 className="lg-titulo">Bem-vindo de volta!</h1>
        <p className="lg-sub">Acesse sua conta para continuar.</p>

        {erro && <div className="erro" style={{ textAlign: 'left' }}>{erro}</div>}

        <label className="lg-label">Usuário</label>
        <div className="lg-input">
          <IconUser />
          <input
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            placeholder="Digite seu usuário"
            autoFocus
          />
        </div>

        <label className="lg-label">Senha</label>
        <div className="lg-input">
          <IconLock />
          <input
            type={mostrar ? 'text' : 'password'}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Digite sua senha"
          />
          <button
            type="button"
            className="lg-eye"
            onClick={() => setMostrar((m) => !m)}
            aria-label={mostrar ? 'Ocultar senha' : 'Mostrar senha'}
          >
            <IconEye off={mostrar} />
          </button>
        </div>

        <button type="submit" className="lg-btn" disabled={carregando}>
          {carregando ? 'Entrando…' : 'Entrar'}
        </button>

        <div className="lg-divisor">
          <span><IconShield /></span>
        </div>

        <p className="lg-rodape">
          Sistema seguro de controle de serviços periódicos para condomínios.
        </p>
      </form>
    </div>
  );
}

/* ---------- Ícones ---------- */

function IconUser() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function IconEye({ off }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M3 3l18 18" />}
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3Z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

/* Fileira de 4 serviços com seta tracejada e selo de confirmação */
function ProcessoIcones() {
  const ESC = '#1f2937';
  const VERM = '#d4202a';
  return (
    <svg className="lg-processo" viewBox="0 0 280 96" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Dedetização (spray com X) */}
      <g transform="translate(26,10)" stroke={ESC} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="8" y="12" width="14" height="26" rx="3" />
        <path d="M11 12V8h8v4" />
        <path d="M11 8V5h5" />
        <path d="M16 5h3l2-2" stroke={VERM} />
        <path d="M11.5 22l7 7M18.5 22l-7 7" stroke={VERM} strokeWidth="2.2" />
      </g>
      {/* Extintor */}
      <g transform="translate(96,10)" stroke={ESC} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="13" width="13" height="25" rx="4" />
        <path d="M12 13v-2h7v2" />
        <path d="M13 11V8h5" />
        <path d="M18 8c3 0 4 1 4 3" />
        <path d="M22 11l3 1" />
      </g>
      {/* AVCB / Seguro (escudo) */}
      <g transform="translate(166,10)" stroke={ESC} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 8l9 4v6c0 5.5-3.8 9-9 11-5.2-2-9-5.5-9-11v-6l9-4Z" />
        <path d="M12 19l3 3 6-6" />
      </g>
      {/* Reservatório / lixeira */}
      <g transform="translate(236,10)" stroke={ESC} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 13h18" />
        <path d="M12 13v-3h8v3" />
        <path d="M9 13l1.5 24h11L23 13" />
        <path d="M13 19v12M19 19v12" strokeWidth="1.7" />
      </g>

      {/* Seta tracejada (ciclo) */}
      <path d="M40 62 Q 140 92 240 62" stroke={VERM} strokeWidth="2" strokeLinecap="round" strokeDasharray="4 5" />
      <path d="M40 62l8 1M40 62l3 7" stroke={VERM} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M240 62l-8 1M240 62l-3 7" stroke={VERM} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Selo de confirmação central */}
      <circle cx="140" cy="78" r="13" fill={VERM} />
      <path d="M134 78l4 4 8-8" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
