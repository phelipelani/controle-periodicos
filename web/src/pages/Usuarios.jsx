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

  async function ativar(u) {
    try {
      await api.put(`/usuarios/${u.id}`, { ativo: 1 });
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  const [abaAtiva, setAbaAtiva] = useState('usuarios'); // 'usuarios' | 'auditoria'
  const [logsAuditoria, setLogsAuditoria] = useState([]);
  const [carregandoAuditoria, setCarregandoAuditoria] = useState(false);

  function carregarAuditoria() {
    setCarregandoAuditoria(true);
    api.get('/historico/auditoria')
      .then(res => setLogsAuditoria(res || []))
      .catch(e => setErro(e.message))
      .finally(() => setCarregandoAuditoria(false));
  }

  return (
    <div>
      <div className="barra-topo">
        <div>
          <h1>Usuários & Acessos</h1>
          <p className="sub" style={{ margin: 0 }}>Gerencie o acesso de administradores, gerentes, empresas parceiras e acompanhe o histórico de alterações.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            type="button" 
            className="secundario"
            style={{ fontWeight: 600, background: abaAtiva === 'auditoria' ? '#e2e8f0' : '#ffffff', border: '1px solid #cbd5e1' }}
            onClick={() => {
              const novaAba = abaAtiva === 'usuarios' ? 'auditoria' : 'usuarios';
              setAbaAtiva(novaAba);
              if (novaAba === 'auditoria') carregarAuditoria();
            }}
          >
            {abaAtiva === 'usuarios' ? '📋 Ver Histórico de Alterações' : '👥 Ver Usuários'}
          </button>
          {abaAtiva === 'usuarios' && (
            <button onClick={() => setEditando({})}>+ Novo usuário</button>
          )}
        </div>
      </div>

      {erro && <div className="erro">{erro}</div>}

      {abaAtiva === 'usuarios' ? (
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Tipo de Perfil</th>
              <th>Empresa Vinculada</th>
              <th>Serviços Atendidos</th>
              <th>Situação</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => {
              const rotuloPapel = {
                admin: 'Administrador',
                gerente: 'Gerente',
                empresa: 'Empresa Prestadora'
              }[u.papel] || u.papel;

              const servicosNomes = {
                dedetizacao: 'Dedetização',
                reservatorio: 'Reservatórios',
                extintor: 'Extintores',
                seguro: 'Seguros',
                avcb: 'AVCB',
                spda: 'SPDA (Para-raios)'
              };

              let servicosArr = [];
              if (u.papel === 'empresa' && u.servicos_permitidos) {
                try {
                  servicosArr = typeof u.servicos_permitidos === 'string' ? JSON.parse(u.servicos_permitidos) : u.servicos_permitidos;
                } catch (e) {
                  servicosArr = [];
                }
              }

              return (
                <tr key={u.id}>
                  <td><strong>{u.nome}</strong></td>
                  <td>{u.email}</td>
                  <td>
                    <span style={{
                      display: 'inline-block',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      background: u.papel === 'admin' ? '#eff6ff' : u.papel === 'empresa' ? '#fef3c7' : '#f1f5f9',
                      color: u.papel === 'admin' ? '#1d4ed8' : u.papel === 'empresa' ? '#b45309' : '#334155'
                    }}>
                      {rotuloPapel}
                    </span>
                  </td>
                  <td>{u.papel === 'empresa' ? (u.empresa_nome || u.nome) : '—'}</td>
                  <td>
                    {u.papel === 'empresa' ? (
                      servicosArr && servicosArr.length > 0 ? (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {servicosArr.map(s => (
                            <span key={s} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', color: '#475569' }}>
                              {servicosNomes[s] || s}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Todos os serviços</span>
                      )
                    ) : (
                      <span style={{ color: '#94a3b8' }}>—</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${u.ativo ? 'em_dia' : 'sem_registro'}`}>
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    <button className="secundario" onClick={() => setEditando(u)}>Editar</button>
                    {u.ativo ? (
                      <button className="perigo" onClick={() => desativar(u)}>Desativar</button>
                    ) : (
                      <button 
                        type="button" 
                        style={{ background: '#16a34a', color: 'white', fontWeight: 600 }} 
                        onClick={() => ativar(u)}
                      >
                        Ativar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, color: '#0f172a' }}>Registro Completo de Auditoria & Alterações</h3>
            <button className="secundario" onClick={carregarAuditoria}>🔄 Atualizar Histórico</button>
          </div>

          {carregandoAuditoria ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Carregando logs de auditoria...</div>
          ) : logsAuditoria.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              Nenhum registro de alteração recente encontrado.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Data & Hora</th>
                  <th>Usuário</th>
                  <th>Perfil</th>
                  <th>Ação Realizada</th>
                  <th>Entidade</th>
                  <th>Detalhes da Modificação</th>
                </tr>
              </thead>
              <tbody>
                {logsAuditoria.map(log => {
                  const dataFormatada = new Date(log.criado_em).toLocaleString('pt-BR');
                  return (
                    <tr key={log.id}>
                      <td style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>{dataFormatada}</td>
                      <td><strong>{log.usuario_nome}</strong></td>
                      <td>
                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: '#f1f5f9', color: '#475569' }}>
                          {log.papel}
                        </span>
                      </td>
                      <td><strong style={{ color: '#2563eb' }}>{log.acao}</strong></td>
                      <td>{log.entidade} #{log.entidade_id || '—'}</td>
                      <td style={{ fontSize: '12px', color: '#334155', maxWidth: '300px', wordBreak: 'break-word' }}>
                        {log.detalhes ? log.detalhes : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

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
    empresa_nome: usuario.empresa_nome || '',
    ativo: usuario.ativo !== undefined ? !!usuario.ativo : true,
    servicos_permitidos: Array.isArray(usuario.servicos_permitidos) 
      ? usuario.servicos_permitidos 
      : (typeof usuario.servicos_permitidos === 'string' ? JSON.parse(usuario.servicos_permitidos || '[]') : ['dedetizacao'])
  });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const valido = form.nome.trim() && (novo ? form.email.trim() && form.senha : true) && (form.papel === 'empresa' ? (form.empresa_nome.trim() || form.nome.trim()) : true);

  return (
    <Modal titulo={novo ? 'Novo usuário' : 'Editar usuário'} onFechar={onFechar}>
      <div className="campo">
        <label>Nome do Usuário / Responsável *</label>
        <input value={form.nome} onChange={set('nome')} placeholder="Ex: Wagner ou DDDRIN Acesso" autoFocus />
      </div>
      <div className="campo">
        <label>Email de login *</label>
        <input type="email" value={form.email} onChange={set('email')} disabled={!novo} placeholder="exemplo@imcosta.com.br" />
      </div>
      <div className="campo">
        <label>{novo ? 'Senha de acesso *' : 'Nova senha (deixe em branco para manter a atual)'}</label>
        <input type="password" value={form.senha} onChange={set('senha')} placeholder="••••••••" />
      </div>
      <div className="campo">
        <label>Tipo de Perfil *</label>
        <select value={form.papel} onChange={set('papel')}>
          <option value="gerente">Gerente (vê apenas condomínios que gerencia)</option>
          <option value="empresa">Empresa Prestadora (vê apenas condomínios onde prestou serviço)</option>
          <option value="admin">Administrador (acesso completo ao sistema)</option>
        </select>
      </div>

      {!novo && (
        <div className="campo">
          <label>Situação da Conta *</label>
          <select value={form.ativo ? '1' : '0'} onChange={(e) => setForm({ ...form, ativo: e.target.value === '1' })}>
            <option value="1">Ativo (acesso liberado)</option>
            <option value="0">Inativo (acesso desativado)</option>
          </select>
        </div>
      )}

      {form.papel === 'empresa' && (
        <>
          <div className="campo" style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <label>Nome da Empresa (exatamente como cadastrado nos serviços) *</label>
            <input 
              value={form.empresa_nome} 
              onChange={set('empresa_nome')} 
              placeholder="Ex: DDDrin, Columbia, Rasec, Fuji Tec..." 
            />
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', lineHeight: 1.4 }}>
              💡 A empresa terá acesso automático aos condomínios onde prestou serviço com este nome.
            </div>
          </div>

          <div className="campo" style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <label style={{ marginBottom: '8px' }}>Serviços que esta Empresa atende: *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { chave: 'dedetizacao', nome: '🪲 Dedetização' },
                { chave: 'reservatorio', nome: '💧 Limpeza de Reservatório' },
                { chave: 'extintor', nome: '🧯 Extintores' },
                { chave: 'seguro', nome: '🛡️ Seguros' },
                { chave: 'avcb', nome: '📋 AVCB' },
                { chave: 'spda', nome: '⚡ SPDA (Para-raios)' }
              ].map((s) => {
                const checked = (form.servicos_permitidos || []).includes(s.chave);
                return (
                  <label 
                    key={s.chave} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      padding: '8px 10px', 
                      background: checked ? '#eff6ff' : '#ffffff', 
                      border: checked ? '1px solid #93c5fd' : '1px solid #cbd5e1', 
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: checked ? '#1d4ed8' : '#334155'
                    }}
                  >
                    <input 
                      type="checkbox" 
                      style={{ width: 'auto', margin: 0 }}
                      checked={checked} 
                      onChange={(e) => {
                        const atuais = form.servicos_permitidos || [];
                        const novos = e.target.checked
                          ? [...atuais, s.chave]
                          : atuais.filter(c => c !== s.chave);
                        setForm({ ...form, servicos_permitidos: novos });
                      }} 
                    />
                    {s.nome}
                  </label>
                );
              })}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>
              A empresa só conseguirá visualizar e interagir com as abas e condomínios dos serviços marcados acima.
            </div>
          </div>
        </>
      )}

      <div className="modal-acoes">
        <button type="button" className="secundario" onClick={onFechar}>Cancelar</button>
        <button type="button" onClick={() => onSalvar(form)} disabled={!valido}>Salvar usuário</button>
      </div>
    </Modal>
  );
}
