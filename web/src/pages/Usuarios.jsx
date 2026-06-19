import { useEffect, useState } from 'react';
import { api } from '../api';
import Modal from '../components/Modal';

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [erro, setErro] = useState('');
  const [editando, setEditando] = useState(null);

  function carregar() {
    api.get('/usuarios').then(setUsuarios).catch((e) => setErro(e.message));
  }
  useEffect(carregar, []);

  async function salvar(form) {
    try {
      if (form.id) await api.put(`/usuarios/${form.id}`, form);
      else await api.post('/usuarios', form);
      setEditando(null);
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function desativar(u) {
    if (!confirm(`Desativar o acesso de ${u.nome}?`)) return;
    await api.del(`/usuarios/${u.id}`);
    carregar();
  }

  return (
    <div>
      <div className="barra-topo">
        <div>
          <h1>Usuários</h1>
          <p className="sub" style={{ margin: 0 }}>Gerentes com acesso ao sistema</p>
        </div>
        <button onClick={() => setEditando({})}>+ Novo usuário</button>
      </div>

      {erro && <div className="erro">{erro}</div>}

      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Email</th>
            <th>Papel</th>
            <th>Situação</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u) => (
            <tr key={u.id}>
              <td><strong>{u.nome}</strong></td>
              <td>{u.email}</td>
              <td>{u.papel === 'admin' ? 'Administrador' : 'Gerente'}</td>
              <td>
                <span className={`badge ${u.ativo ? 'em_dia' : 'sem_registro'}`}>
                  {u.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </td>
              <td style={{ display: 'flex', gap: 8 }}>
                <button className="secundario" onClick={() => setEditando(u)}>Editar</button>
                {u.ativo && <button className="perigo" onClick={() => desativar(u)}>Desativar</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editando && <FormUsuario usuario={editando} onSalvar={salvar} onFechar={() => setEditando(null)} />}
    </div>
  );
}

function FormUsuario({ usuario, onSalvar, onFechar }) {
  const novo = !usuario.id;
  const [form, setForm] = useState({
    id: usuario.id,
    nome: usuario.nome || '',
    email: usuario.email || '',
    senha: '',
    papel: usuario.papel || 'gerente',
  });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const valido = form.nome.trim() && (novo ? form.email.trim() && form.senha : true);

  return (
    <Modal titulo={novo ? 'Novo usuário' : 'Editar usuário'} onFechar={onFechar}>
      <div className="campo">
        <label>Nome *</label>
        <input value={form.nome} onChange={set('nome')} autoFocus />
      </div>
      <div className="campo">
        <label>Email *</label>
        <input type="email" value={form.email} onChange={set('email')} disabled={!novo} />
      </div>
      <div className="campo">
        <label>{novo ? 'Senha *' : 'Nova senha (deixe em branco para manter)'}</label>
        <input type="password" value={form.senha} onChange={set('senha')} />
      </div>
      <div className="campo">
        <label>Papel</label>
        <select value={form.papel} onChange={set('papel')}>
          <option value="gerente">Gerente</option>
          <option value="admin">Administrador</option>
        </select>
      </div>
      <div className="modal-acoes">
        <button className="secundario" onClick={onFechar}>Cancelar</button>
        <button onClick={() => onSalvar(form)} disabled={!valido}>Salvar</button>
      </div>
    </Modal>
  );
}
