import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { formatarData, textoDias } from '../components/format';

export default function CondominioDetalhe() {
  const { id } = useParams();
  const [condominio, setCondominio] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [erro, setErro] = useState('');
  const [registrando, setRegistrando] = useState(null); // serviço selecionado

  function carregar() {
    api.get(`/condominios/${id}`).then(setCondominio).catch((e) => setErro(e.message));
    api.get(`/historico?condominio=${id}`).then(setHistorico).catch(() => {});
  }
  useEffect(carregar, [id]);

  async function registrar(servico, dados) {
    try {
      await api.put(`/condominios/${id}/servicos/${servico.servico_id}`, dados);
      setRegistrando(null);
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  if (erro) return <div className="erro">{erro}</div>;
  if (!condominio) return <div className="centro">Carregando…</div>;

  return (
    <div>
      <p className="sub" style={{ marginBottom: 4 }}><Link to="/condominios">← Condomínios</Link></p>
      <h1>{condominio.nome}</h1>
      <p className="sub">
        {condominio.endereco || 'Sem endereço cadastrado'}
        {condominio.cidade && <> — {condominio.cidade}/{condominio.uf || 'SP'}</>}
        {condominio.gerente_nome && <> · Gerente: <strong>{condominio.gerente_nome}</strong></>}
        {condominio.quantidade_apartamentos ? <> · Unidades: <strong>{condominio.quantidade_apartamentos}</strong></> : null}
        {condominio.cnpj && <> · CNPJ: <strong>{condominio.cnpj}</strong></>}
      </p>

      {/* Resumo visível: última realização / validade de cada serviço */}
      <div className="grid-cards">
        {condominio.servicos.map((s) => (
          <div key={s.servico_id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <strong>{s.nome}</strong>
              <StatusBadge status={s.status} />
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              {s.tipo_controle === 'validade' ? 'Validade' : 'Última realização'}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {s.tipo_controle === 'validade' ? formatarData(s.data_vencimento) : formatarData(s.ultima_realizacao)}
            </div>
            {s.tipo_controle !== 'validade' && (
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                Vence em {formatarData(s.data_vencimento)}
                {s.data_vencimento && ` · ${textoDias(s.status, s.diasRestantes)}`}
              </div>
            )}
            <button className="secundario" style={{ marginTop: 12, width: '100%' }} onClick={() => setRegistrando(s)}>
              Atualizar
            </button>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 17, margin: '8px 0 10px' }}>Histórico</h2>
      {historico.length === 0 ? (
        <div className="card vazio">Nenhum registro ainda.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Serviço</th>
              <th>Empresa</th>
              <th>Próx. vencimento</th>
              <th>Origem</th>
              <th>Observação</th>
              <th>Registrado por</th>
            </tr>
          </thead>
          <tbody>
            {historico.map((h) => (
              <tr key={h.id}>
                <td>{formatarData(h.data_realizacao)}</td>
                <td>{h.servico_nome}</td>
                <td>{h.empresa || '—'}</td>
                <td>{formatarData(h.data_vencimento)}</td>
                <td>{h.origem === 'agendamento' ? 'Agendamento' : 'Manual'}</td>
                <td style={{ color: 'var(--muted)', maxWidth: 220 }}>{h.observacao || '—'}</td>
                <td style={{ color: 'var(--muted)' }}>{h.registrado_por_nome || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {registrando && (
        <FormRegistro servico={registrando} onSalvar={registrar} onFechar={() => setRegistrando(null)} />
      )}
    </div>
  );
}

function FormRegistro({ servico, onSalvar, onFechar }) {
  const ehValidade = servico.tipo_controle === 'validade';
  const hoje = new Date().toISOString().slice(0, 10);
  const [data, setData] = useState(ehValidade ? servico.data_vencimento || '' : hoje);
  const [empresa, setEmpresa] = useState('');
  const [observacao, setObservacao] = useState('');

  return (
    <Modal titulo={servico.nome} onFechar={onFechar}>
      <p className="sub" style={{ marginTop: -8 }}>
        {ehValidade
          ? 'Informe a data de validade (ex.: vencimento do AVCB / vigência do seguro).'
          : 'Informe a data em que o serviço foi realizado. O próximo vencimento é calculado automaticamente.'}
      </p>
      <div className="campo">
        <label>{ehValidade ? 'Data de validade' : 'Data da realização'}</label>
        <input type="date" value={data || ''} onChange={(e) => setData(e.target.value)} autoFocus />
      </div>
      <div className="campo">
        <label>Empresa responsável</label>
        <input value={empresa} onChange={(e) => setEmpresa(e.target.value)} placeholder="Empresa que realizou o serviço" />
      </div>
      <div className="campo">
        <label>Observação</label>
        <input value={observacao} onChange={(e) => setObservacao(e.target.value)} />
      </div>
      <div className="modal-acoes">
        <button className="secundario" onClick={onFechar}>Cancelar</button>
        <button onClick={() => onSalvar(servico, { data, empresa, observacao })} disabled={!data}>Salvar</button>
      </div>
    </Modal>
  );
}
