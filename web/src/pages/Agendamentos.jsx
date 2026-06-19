import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import Modal from '../components/Modal';
import { formatarData } from '../components/format';

const ROTULO_AG = { agendado: 'Agendado', realizado: 'Realizado', cancelado: 'Cancelado' };
const CLASSE_AG = { agendado: 'a_vencer', realizado: 'em_dia', cancelado: 'sem_registro' };
const ROTULO_PERIODO = { manha: 'Manhã', tarde: 'Tarde' };
const hojeISO = () => new Date().toISOString().slice(0, 10);

export default function Agendamentos() {
  const [lista, setLista] = useState([]);
  const [condominios, setCondominios] = useState([]);
  const [filtro, setFiltro] = useState('agendado');
  const [erro, setErro] = useState('');
  const [form, setForm] = useState(null); // {} novo | objeto agendamento (editar)

  function carregar() {
    const q = filtro ? `?status=${filtro}` : '';
    api.get(`/agendamentos${q}`).then(setLista).catch((e) => setErro(e.message));
  }
  useEffect(carregar, [filtro]);
  useEffect(() => { api.get('/condominios').then(setCondominios).catch(() => {}); }, []);

  async function salvar(dados) {
    try {
      if (dados.id) await api.put(`/agendamentos/${dados.id}`, dados);
      else await api.post('/agendamentos', dados);
      setForm(null);
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function cancelar(ag) {
    if (!confirm('Cancelar este agendamento?')) return;
    await api.put(`/agendamentos/${ag.id}`, { status: 'cancelado' });
    carregar();
  }

  const hoje = hojeISO();
  const deHoje = lista.filter((a) => a.status === 'agendado' && a.data_agendada === hoje);

  return (
    <div>
      <div className="barra-topo">
        <div>
          <h1>Dedetização — Agendamentos</h1>
          <p className="sub" style={{ margin: 0 }}>
            Quando a data agendada chega, a realização é registrada automaticamente.
          </p>
        </div>
        <button onClick={() => setForm({})}>+ Novo agendamento</button>
      </div>

      {erro && <div className="erro">{erro}</div>}

      {deHoje.length > 0 && (
        <div className="aviso">
          <strong>{deHoje.length}</strong> dedetização(ões) agendada(s) para <strong>hoje</strong>.
          Confirme os apartamentos com a empresa — só sobem ao histórico amanhã.
        </div>
      )}

      <div className="campo" style={{ maxWidth: 220 }}>
        <label>Filtrar por situação</label>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="agendado">Agendados</option>
          <option value="realizado">Realizados</option>
          <option value="cancelado">Cancelados</option>
          <option value="">Todos</option>
        </select>
      </div>

      {lista.length === 0 ? (
        <div className="card vazio">Nenhum agendamento nesta situação.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Condomínio</th>
              <th>Data agendada</th>
              <th>Período</th>
              <th>Empresa</th>
              <th>Situação</th>
              <th>Apartamentos / observação</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lista.map((a) => {
              const ehHoje = a.status === 'agendado' && a.data_agendada === hoje;
              return (
              <tr key={a.id} className={ehHoje ? 'hoje' : undefined}>
                <td><Link to={`/condominios/${a.condominio_id}`}>{a.condominio_nome}</Link></td>
                <td>
                  {formatarData(a.data_agendada)}
                  {ehHoje && <span className="tag-hoje">HOJE</span>}
                </td>
                <td>{ROTULO_PERIODO[a.periodo] || '—'}</td>
                <td>{a.empresa || '—'}</td>
                <td><span className={`badge ${CLASSE_AG[a.status]}`}>{ROTULO_AG[a.status]}</span></td>
                <td style={{ color: 'var(--muted)', maxWidth: 260 }}>{a.observacao || '—'}</td>
                <td style={{ display: 'flex', gap: 8 }}>
                  {a.status === 'agendado' && (
                    <>
                      <button className="secundario" onClick={() => setForm(a)}>Editar</button>
                      <button className="perigo" onClick={() => cancelar(a)}>Cancelar</button>
                    </>
                  )}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {form && (
        <FormAgendamento agendamento={form} condominios={condominios} onSalvar={salvar} onFechar={() => setForm(null)} />
      )}
    </div>
  );
}

function FormAgendamento({ agendamento, condominios, onSalvar, onFechar }) {
  const editando = !!agendamento.id;
  const [form, setForm] = useState({
    id: agendamento.id,
    condominio_id: agendamento.condominio_id || '',
    data_agendada: agendamento.data_agendada || '',
    periodo: agendamento.periodo || '',
    empresa: agendamento.empresa || '',
    observacao: agendamento.observacao || '',
  });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const valido = form.condominio_id && form.data_agendada;

  return (
    <Modal titulo={editando ? 'Editar agendamento' : 'Novo agendamento de dedetização'} onFechar={onFechar}>
      <div className="campo">
        <label>Condomínio *</label>
        {editando ? (
          <input value={agendamento.condominio_nome} disabled />
        ) : (
          <select value={form.condominio_id} onChange={set('condominio_id')} autoFocus>
            <option value="">Selecione…</option>
            {condominios.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        )}
      </div>
      <div className="linha">
        <div className="campo">
          <label>Data agendada *</label>
          <input type="date" value={form.data_agendada} onChange={set('data_agendada')} />
        </div>
        <div className="campo">
          <label>Período</label>
          <select value={form.periodo} onChange={set('periodo')}>
            <option value="">Não definido</option>
            <option value="manha">Manhã</option>
            <option value="tarde">Tarde</option>
          </select>
        </div>
      </div>
      <div className="campo">
        <label>Empresa responsável</label>
        <input value={form.empresa} onChange={set('empresa')} placeholder="Empresa que fará a dedetização" />
      </div>
      <div className="campo">
        <label>Apartamentos que aderiram / observação</label>
        <textarea rows={3} value={form.observacao} onChange={set('observacao')} placeholder="Ex.: aptos 11, 22, 33…" />
      </div>
      <div className="modal-acoes">
        <button className="secundario" onClick={onFechar}>Cancelar</button>
        <button onClick={() => onSalvar(form)} disabled={!valido}>Salvar</button>
      </div>
    </Modal>
  );
}
