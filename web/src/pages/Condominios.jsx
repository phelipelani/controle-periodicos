import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

export default function Condominios() {
  const { isAdmin } = useAuth();
  const [condominios, setCondominios] = useState([]);
  const [gerentes, setGerentes] = useState([]);
  const [erro, setErro] = useState('');
  const [editando, setEditando] = useState(null); // objeto condomínio ou {} para novo

  function carregar() {
    api.get('/condominios').then(setCondominios).catch((e) => setErro(e.message));
  }
  useEffect(carregar, []);
  useEffect(() => {
    if (isAdmin) api.get('/usuarios').then((us) => setGerentes(us.filter((u) => u.ativo))).catch(() => {});
  }, [isAdmin]);

  async function salvar(form) {
    try {
      if (form.id) await api.put(`/condominios/${form.id}`, form);
      else await api.post('/condominios', form);
      setEditando(null);
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <div>
      <div className="barra-topo">
        <div>
          <h1>Condomínios</h1>
          <p className="sub" style={{ margin: 0 }}>Condomínios administrados</p>
        </div>
        {isAdmin && <button onClick={() => setEditando({})}>+ Novo condomínio</button>}
      </div>

      {erro && <div className="erro">{erro}</div>}

      {condominios.length === 0 ? (
        <div className="card vazio">Nenhum condomínio cadastrado ainda.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Condomínio</th>
              <th>Gerente</th>
              <th>Situação</th>
              <th>Pendências</th>
              {isAdmin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {condominios.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link to={`/condominios/${c.id}`}><strong>{c.nome}</strong></Link>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{c.endereco || '—'}</div>
                </td>
                <td style={{ color: 'var(--muted)' }}>{c.gerente_nome || '—'}</td>
                <td><StatusBadge status={c.statusGeral} /></td>
                <td>
                  {c.vencidos > 0 && <span style={{ color: 'var(--vencido)' }}>{c.vencidos} vencido(s) </span>}
                  {c.aVencer > 0 && <span style={{ color: 'var(--avencer)' }}>{c.aVencer} a vencer</span>}
                  {c.vencidos === 0 && c.aVencer === 0 && '—'}
                </td>
                {isAdmin && (
                  <td><button className="secundario" onClick={() => setEditando(c)}>Editar</button></td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editando && (
        <FormCondominio
          condominio={editando}
          gerentes={gerentes}
          onSalvar={salvar}
          onFechar={() => setEditando(null)}
        />
      )}
    </div>
  );
}

function FormCondominio({ condominio, gerentes, onSalvar, onFechar }) {
  const [form, setForm] = useState({
    id: condominio.id,
    nome: condominio.nome || '',
    endereco: condominio.endereco || '',
    gerente_id: condominio.gerente_id || '',
    observacoes: condominio.observacoes || '',
  });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <Modal titulo={form.id ? 'Editar condomínio' : 'Novo condomínio'} onFechar={onFechar}>
      <div className="campo">
        <label>Nome *</label>
        <input value={form.nome} onChange={set('nome')} autoFocus />
      </div>
      <div className="campo">
        <label>Endereço</label>
        <input value={form.endereco} onChange={set('endereco')} />
      </div>
      <div className="campo">
        <label>Gerente responsável</label>
        <select value={form.gerente_id} onChange={set('gerente_id')}>
          <option value="">Sem gerente</option>
          {gerentes.map((g) => (
            <option key={g.id} value={g.id}>{g.nome}{g.papel === 'admin' ? ' (admin)' : ''}</option>
          ))}
        </select>
      </div>
      <div className="campo">
        <label>Observações</label>
        <textarea rows={3} value={form.observacoes} onChange={set('observacoes')} />
      </div>
      <div className="modal-acoes">
        <button className="secundario" onClick={onFechar}>Cancelar</button>
        <button onClick={() => onSalvar(form)} disabled={!form.nome.trim()}>Salvar</button>
      </div>
    </Modal>
  );
}
