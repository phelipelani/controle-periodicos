import { useEffect, useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import Modal from '../components/Modal';
import '../condominios.css';

import CondominiosKpis from '../components/condominios/CondominiosKpis';
import CondominiosFilters from '../components/condominios/CondominiosFilters';
import CondominioCard from '../components/condominios/CondominioCard';

export default function Condominios() {
  const { usuario, isAdmin } = useAuth();

  // Empresa não acessa a aba Condomínios
  if (usuario?.papel === 'empresa') {
    const permitidos = Array.isArray(usuario.servicos_permitidos) 
      ? usuario.servicos_permitidos 
      : (typeof usuario.servicos_permitidos === 'string' ? JSON.parse(usuario.servicos_permitidos || '[]') : []);
    const primeiroServico = permitidos[0] || 'dedetizacao';
    return <Navigate to={`/servicos/${primeiroServico}`} replace />;
  }

  const [condominios, setCondominios] = useState([]);
  const [gerentes, setGerentes] = useState([]);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState(null); // objeto condomínio ou {} para novo

  const initialFilters = {
    busca: '',
    status: 'Todos',
    gerente: 'Todos'
  };
  const [filtros, setFiltros] = useState(initialFilters);

  function carregar() {
    setCarregando(true);
    api.get('/condominios')
      .then(res => {
        setCondominios(res);
        setErro('');
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }
  
  useEffect(carregar, []);
  useEffect(() => {
    api.get('/usuarios/gerentes')
      .catch(() => api.get('/usuarios'))
      .then((us) => setGerentes((us || []).filter((u) => u.papel === 'gerente' && (u.ativo === undefined || u.ativo === 1 || u.ativo === true))))
      .catch(() => {});
  }, []);

  const [confirmandoExclusao, setConfirmandoExclusao] = useState(null);
  const [toast, setToast] = useState('');

  const mostrarToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  async function salvar(form) {
    try {
      if (form.id) {
        await api.put(`/condominios/${form.id}`, form);
        mostrarToast('Condomínio atualizado com sucesso!');
      } else {
        await api.post('/condominios', form);
        mostrarToast('Condomínio cadastrado com sucesso!');
      }
      setEditando(null);
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function executarExclusao(id) {
    try {
      await api.delete(`/condominios/${id}`);
      setConfirmandoExclusao(null);
      setEditando(null);
      mostrarToast('Condomínio excluído com sucesso!');
      carregar();
    } catch (e) {
      setErro(e.message);
      setConfirmandoExclusao(null);
    }
  }

  const dadosFiltrados = useMemo(() => {
    return condominios
      .filter(c => {
        if (filtros.busca) {
          const term = filtros.busca.toLowerCase();
          const cod = String(c.id).padStart(3, '0');
          if (!c.nome.toLowerCase().includes(term) && !cod.includes(term) && !(c.endereco || '').toLowerCase().includes(term) && !(c.gerente_nome || '').toLowerCase().includes(term)) return false;
        }
        if (filtros.status !== 'Todos' && c.statusGeral !== filtros.status) return false;
        if (filtros.gerente !== 'Todos') {
          if (c.gerente_nome !== filtros.gerente) return false;
        }
        return true;
      })
      .sort((a, b) => a.id - b.id);
  }, [condominios, filtros]);

  const stats = useMemo(() => {
    const condsNoEscopo = condominios.filter(c => {
      if (filtros.busca) {
        const term = filtros.busca.toLowerCase();
        const cod = String(c.id).padStart(3, '0');
        if (!c.nome.toLowerCase().includes(term) && !cod.includes(term) && !(c.endereco || '').toLowerCase().includes(term) && !(c.gerente_nome || '').toLowerCase().includes(term)) return false;
      }
      if (filtros.gerente !== 'Todos') {
        if (c.gerente_nome !== filtros.gerente) return false;
      }
      return true;
    });

    const total = condsNoEscopo.length;
    const emDia = condsNoEscopo.filter(c => c.statusGeral === 'em_dia').length;
    const emAtencao = condsNoEscopo.filter(c => c.statusGeral === 'a_vencer').length;
    const comPendencias = condsNoEscopo.filter(c => ['vencido', 'sem_registro'].includes(c.statusGeral)).length;

    const pctEmDia = total > 0 ? Math.round((emDia / total) * 100) : 0;
    const pctAtencao = total > 0 ? Math.round((emAtencao / total) * 100) : 0;
    const pctPendencias = total > 0 ? Math.round((comPendencias / total) * 100) : 0;

    return {
      total,
      emDia,
      pctEmDia,
      emAtencao,
      pctAtencao,
      comPendencias,
      pctPendencias,
      gerenteAtivo: filtros.gerente !== 'Todos' ? filtros.gerente : null
    };
  }, [condominios, filtros.busca, filtros.gerente]);

  return (
    <div className="cond-layout">
      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', background: '#16a34a', color: 'white', padding: '12px 20px', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.2)', zIndex: 9999, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          ✓ {toast}
        </div>
      )}

      <div className="barra-topo" style={{ marginBottom: 0 }}>
        <div>
          <h1>Condomínios</h1>
          <p className="sub" style={{ margin: 0 }}>Gerencie todos os condomínios e acompanhe a situação dos serviços.</p>
        </div>
        {isAdmin && <button onClick={() => setEditando({})}>+ Novo condomínio</button>}
      </div>

      {erro && <div className="erro">{erro}</div>}

      {carregando ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Carregando painel de condomínios...</div>
      ) : (
        <>
          <CondominiosKpis stats={stats} filtroStatus={filtros.status} onFilterStatus={(s) => setFiltros(f => ({ ...f, status: f.status === s ? 'Todos' : s }))} />
          
          {condominios.length > 0 && (
            <CondominiosFilters filtros={filtros} setFiltros={setFiltros} gerentes={gerentes} />
          )}

          {dadosFiltrados.length === 0 ? (
            <div className="card vazio" style={{ textAlign: 'center', padding: '60px 20px', background: '#ffffff', border: '1px dashed #cbd5e1', borderRadius: '12px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏢</div>
              <h3 style={{ color: '#0f172a', margin: '0 0 8px 0' }}>Nenhum condomínio encontrado.</h3>
              <p style={{ color: '#64748b', margin: 0 }}>Cadastre seu primeiro condomínio para começar a acompanhar os serviços.</p>
              {isAdmin && <button style={{ marginTop: '24px' }} onClick={() => setEditando({})}>+ Novo condomínio</button>}
            </div>
          ) : (
            <div className="cond-grid">
              {dadosFiltrados.map(c => (
                <CondominioCard key={c.id} condominio={c} onEdit={setEditando} />
              ))}
            </div>
          )}
        </>
      )}

      {editando && isAdmin && (
        <FormCondominio
          condominio={editando}
          gerentes={gerentes}
          onSalvar={salvar}
          onExcluir={(id) => setConfirmandoExclusao(id)}
          onFechar={() => setEditando(null)}
        />
      )}

      {confirmandoExclusao && (
        <Modal titulo="Excluir Condomínio" onFechar={() => setConfirmandoExclusao(null)}>
          <div style={{ padding: '8px 0 20px' }}>
            <div style={{ fontSize: '15px', marginBottom: '8px', fontWeight: 600, color: '#0f172a' }}>
              Deseja realmente excluir este condomínio?
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
              Esta ação é permanente e removerá todos os agendamentos, serviços e históricos vinculados a ele.
            </p>
          </div>
          <div className="modal-acoes" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="secundario" onClick={() => setConfirmandoExclusao(null)}>
              Cancelar
            </button>
            <button 
              type="button" 
              style={{ background: '#dc2626', borderColor: '#dc2626', color: 'white', fontWeight: 600 }} 
              onClick={() => executarExclusao(confirmandoExclusao)}
            >
              Sim, excluir condomínio
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function FormCondominio({ condominio, gerentes, onSalvar, onExcluir, onFechar }) {
  const [form, setForm] = useState({
    id: condominio.id,
    nome: condominio.nome || '',
    endereco: condominio.endereco || '',
    gerente_id: condominio.gerente_id || '',
    observacoes: condominio.observacoes || '',
    imagem: condominio.imagem || ''
  });
  const [uploading, setUploading] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleUploadImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('imagem', file);

    try {
      const token = localStorage.getItem('cp_token');
      const res = await fetch('/api/upload/condominio/imagem', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setForm(prev => ({ ...prev, imagem: data.url || `/api/upload/preview?path=${encodeURIComponent(data.caminho)}` }));
      } else {
        alert(data.erro || 'Falha ao enviar imagem');
      }
    } catch (err) {
      alert('Erro ao enviar imagem');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal titulo={form.id ? 'Editar condomínio' : 'Novo condomínio'} onFechar={onFechar}>
      
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', alignItems: 'center' }}>
        {form.imagem ? (
          <img src={form.imagem} alt="Capa" style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '80px', height: '80px', borderRadius: '8px', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🏢</div>
        )}
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>Imagem do condomínio</label>
          <input type="file" accept="image/*" onChange={handleUploadImage} disabled={uploading} style={{ fontSize: '13px' }} />
          {uploading && <div style={{ fontSize: '12px', color: '#3b82f6', marginTop: '4px' }}>Enviando imagem...</div>}
        </div>
      </div>

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
      <div className="modal-acoes" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {form.id ? (
          <button type="button" className="secundario" style={{ color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => onExcluir(form.id)}>
            Excluir condomínio
          </button>
        ) : <div />}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="secundario" onClick={onFechar}>Cancelar</button>
          <button type="button" onClick={() => onSalvar(form)} disabled={!form.nome.trim() || uploading}>Salvar</button>
        </div>
      </div>
    </Modal>
  );
}
