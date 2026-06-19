import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import StatusBadge from '../components/StatusBadge';
import { formatarData, textoDias } from '../components/format';

export default function Dashboard() {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.get('/dashboard').then(setDados).catch((e) => setErro(e.message));
  }, []);

  if (erro) return <div className="erro">{erro}</div>;
  if (!dados) return <div className="centro">Carregando…</div>;

  const { contadores, vencidos, aVencer } = dados;

  return (
    <div>
      <h1>Painel</h1>
      <p className="sub">Visão geral dos serviços de todos os condomínios</p>

      <div className="grid-cards">
        <div className="card card-num">
          <div className="n">{contadores.condominios}</div>
          <div className="rotulo">Condomínios</div>
        </div>
        <div className="card card-num">
          <div className="n" style={{ color: 'var(--vencido)' }}>{contadores.vencidos}</div>
          <div className="rotulo">Vencidos</div>
        </div>
        <div className="card card-num">
          <div className="n" style={{ color: 'var(--avencer)' }}>{contadores.aVencer}</div>
          <div className="rotulo">A vencer</div>
        </div>
        <div className="card card-num">
          <div className="n" style={{ color: 'var(--sem)' }}>{contadores.semRegistro}</div>
          <div className="rotulo">Sem registro</div>
        </div>
        <div className="card card-num">
          <div className="n" style={{ color: 'var(--emdia)' }}>{contadores.emDia}</div>
          <div className="rotulo">Em dia</div>
        </div>
      </div>

      <Secao titulo="Vencidos" itens={vencidos} />
      <div style={{ height: 24 }} />
      <Secao titulo="A vencer" itens={aVencer} />
    </div>
  );
}

function Secao({ titulo, itens }) {
  return (
    <div>
      <h2 style={{ fontSize: 17, marginBottom: 10 }}>{titulo} ({itens.length})</h2>
      {itens.length === 0 ? (
        <div className="card vazio">Nada por aqui.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Condomínio</th>
              <th>Serviço</th>
              <th>Vencimento</th>
              <th>Situação</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {itens.map((i) => (
              <tr key={`${i.condominio_id}-${i.servico_id}`}>
                <td>{i.condominio_nome}</td>
                <td>{i.servico_nome}</td>
                <td>{formatarData(i.data_vencimento)} <span style={{ color: 'var(--muted)' }}>· {textoDias(i.status, i.diasRestantes)}</span></td>
                <td><StatusBadge status={i.status} /></td>
                <td><Link to={`/condominios/${i.condominio_id}`}>abrir</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
