import React, { useState, useEffect } from 'react';
import { IcoDoc } from '../icons';

const TIPOS_PADRAO = [
  { tipo: 'Água Pressurizada (AP)', quantidade: '' },
  { tipo: 'Pó Químico Seco (PQS)', quantidade: '' },
  { tipo: 'CO₂', quantidade: '' },
  { tipo: 'Espuma Mecânica', quantidade: '' }
];

export default function ExtintoresDrawer({
  aberto,
  onFechar,
  condominioEditando,
  todosCondominios,
  onSalvar
}) {
  const [abaAtiva, setAbaAtiva] = useState('dados'); // 'dados' | 'obs'
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  // Form states
  const [condominioId, setCondominioId] = useState('');
  const [gerenteNome, setGerenteNome] = useState('');
  const [dataUltimaRecarga, setDataUltimaRecarga] = useState('');
  const [dataProximoVencimento, setDataProximoVencimento] = useState('');
  const [dataUltimoTesteHidrostatico, setDataUltimoTesteHidrostatico] = useState('');
  const [tipos, setTipos] = useState(TIPOS_PADRAO);
  const [observacoes, setObservacoes] = useState('');
  const [anexoPath, setAnexoPath] = useState(null);
  const [anexoNome, setAnexoNome] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (aberto) {
      setAbaAtiva('dados');
      setErro('');
      if (condominioEditando) {
        setCondominioId(String(condominioEditando.id));
        setGerenteNome(condominioEditando.gerente || '');
        setDataUltimaRecarga(condominioEditando.dataUltimaRecarga || '');
        setDataProximoVencimento(condominioEditando.dataProximoVencimento || '');
        setDataUltimoTesteHidrostatico(condominioEditando.dataUltimoTesteHidrostatico || '');
        setObservacoes(condominioEditando.observacoes || '');
        setAnexoPath(condominioEditando.anexo || null);
        setAnexoNome(condominioEditando.anexo ? condominioEditando.anexo.split(/[\\/]/).pop() : null);

        if (condominioEditando.tipos && condominioEditando.tipos.length > 0) {
          setTipos(condominioEditando.tipos.map(t => ({ tipo: t.tipo, quantidade: t.quantidade })));
        } else {
          setTipos(TIPOS_PADRAO);
        }
      } else {
        // Novo registro
        setCondominioId('');
        setGerenteNome('');
        setDataUltimaRecarga('');
        setDataProximoVencimento('');
        setDataUltimoTesteHidrostatico('');
        setObservacoes('');
        setAnexoPath(null);
        setAnexoNome(null);
        setTipos(TIPOS_PADRAO);
      }
    }
  }, [aberto, condominioEditando]);

  // Atualizar gerente quando seleciona condomínio
  const handleSelecionarCondominio = (id) => {
    setCondominioId(id);
    const cond = todosCondominios.find(c => String(c.id) === String(id));
    if (cond) {
      setGerenteNome(cond.gerente || cond.gerente_nome || 'Sem gerente');
    } else {
      setGerenteNome('');
    }
  };

  // Cálculo automático do vencimento (+12 meses) a partir da última recarga
  const handleDataRecargaChange = (novaData) => {
    setDataUltimaRecarga(novaData);
    if (novaData) {
      const [y, m, d] = novaData.split('-').map(Number);
      const dataVenc = new Date(y + 1, m - 1, d);
      const yyyy = dataVenc.getFullYear();
      const mm = String(dataVenc.getMonth() + 1).padStart(2, '0');
      const dd = String(dataVenc.getDate()).padStart(2, '0');
      setDataProximoVencimento(`${yyyy}-${mm}-${dd}`);
    }
  };

  // Gerenciamento dos tipos
  const handleQuantidadeChange = (idx, valor) => {
    const novosTipos = [...tipos];
    novosTipos[idx].quantidade = valor === '' ? '' : Math.max(0, parseInt(valor, 10) || 0);
    setTipos(novosTipos);
  };

  const handleTipoNomeChange = (idx, nome) => {
    const novosTipos = [...tipos];
    novosTipos[idx].tipo = nome;
    setTipos(novosTipos);
  };

  const handleAdicionarTipo = () => {
    setTipos([...tipos, { tipo: '', quantidade: '' }]);
  };

  const handleRemoverTipo = (idx) => {
    setTipos(tipos.filter((_, i) => i !== idx));
  };

  const totalExtintores = tipos.reduce((acc, curr) => acc + (Number(curr.quantidade) || 0), 0);

  // Upload
  const handleUploadDocumento = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('documento', file);

    try {
      const token = localStorage.getItem('cp_token');
      const res = await fetch('/api/upload/dedetizacao/recibo', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setAnexoPath(data.caminho);
        setAnexoNome(file.name);
      } else {
        alert(data.erro || 'Falha ao enviar arquivo');
      }
    } catch (err) {
      alert('Erro de conexão ao enviar arquivo');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoverArquivo = async () => {
    if (!anexoPath) {
      setAnexoPath(null);
      setAnexoNome(null);
      return;
    }
    if (!window.confirm('Deseja excluir este arquivo da pasta?')) return;
    try {
      const token = localStorage.getItem('cp_token');
      await fetch(`/api/upload/arquivo?path=${encodeURIComponent(anexoPath)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {}
    setAnexoPath(null);
    setAnexoNome(null);
  };

  const handleSubmit = async () => {
    if (!condominioId) {
      setErro('Selecione um condomínio.');
      return;
    }

    setSalvando(true);
    setErro('');

    const payload = {
      condominio_id: Number(condominioId),
      data_ultima_recarga: dataUltimaRecarga || null,
      data_proximo_vencimento: dataProximoVencimento || null,
      data_ultimo_teste_hidrostatico: dataUltimoTesteHidrostatico || null,
      observacoes,
      anexo: anexoPath,
      tipos: tipos.filter(t => t.tipo.trim() !== '')
    };

    try {
      await onSalvar(payload);
      onFechar();
    } catch (e) {
      setErro(e.message || 'Erro ao salvar extintores');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className={`ext-drawer ${aberto ? 'open' : ''}`}>
      <div className="ext-drawer-header">
        <h2>{condominioEditando ? 'Editar registro de extintores' : 'Novo registro de extintores'}</h2>
        <button type="button" className="ext-drawer-close" onClick={onFechar}>&times;</button>
      </div>

      <div className="ext-drawer-tabs">
        <button
          type="button"
          className={`ext-drawer-tab ${abaAtiva === 'dados' ? 'active' : ''}`}
          onClick={() => setAbaAtiva('dados')}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', background: abaAtiva === 'dados' ? '#D71920' : '#e2e8f0', color: abaAtiva === 'dados' ? '#fff' : '#64748b', fontSize: '11px', marginRight: '6px' }}>1</span>
          Dados gerais
        </button>
        <button
          type="button"
          className={`ext-drawer-tab ${abaAtiva === 'obs' ? 'active' : ''}`}
          onClick={() => setAbaAtiva('obs')}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', background: abaAtiva === 'obs' ? '#D71920' : '#e2e8f0', color: abaAtiva === 'obs' ? '#fff' : '#64748b', fontSize: '11px', marginRight: '6px' }}>2</span>
          Observações & Documentos
        </button>
      </div>

      <div className="ext-drawer-body">
        {erro && (
          <div style={{ background: '#fee2e2', color: '#dc2626', padding: '12px', borderRadius: '8px', fontSize: '13px' }}>
            {erro}
          </div>
        )}

        {abaAtiva === 'dados' ? (
          <>
            {/* SEÇÃO 1: Dados Gerais */}
            <div className="ext-form-section">
              <div className="ext-form-group">
                <label>Condomínio *</label>
                <select
                  className="ext-input"
                  value={condominioId}
                  onChange={(e) => handleSelecionarCondominio(e.target.value)}
                  disabled={Boolean(condominioEditando)}
                >
                  <option value="">Selecione o condomínio...</option>
                  {todosCondominios.map((c) => (
                    <option key={c.id} value={c.id}>
                      {String(c.id).padStart(3, '0')} - {c.condominio || c.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ext-form-group">
                <label>Gerente responsável</label>
                <input
                  type="text"
                  className="ext-input"
                  value={gerenteNome}
                  readOnly
                  placeholder="Gerente preenchido automaticamente"
                  style={{ background: '#f8fafc', color: '#64748b' }}
                />
              </div>

              <div className="ext-form-row">
                <div className="ext-form-group">
                  <label>Data da última recarga</label>
                  <input
                    type="date"
                    className="ext-input"
                    value={dataUltimaRecarga}
                    onChange={(e) => handleDataRecargaChange(e.target.value)}
                  />
                </div>
                <div className="ext-form-group">
                  <label>Próximo vencimento *</label>
                  <input
                    type="date"
                    className="ext-input"
                    value={dataProximoVencimento}
                    onChange={(e) => setDataProximoVencimento(e.target.value)}
                  />
                </div>
              </div>

              <div className="ext-form-group">
                <label>Data do último teste hidrostático</label>
                <input
                  type="date"
                  className="ext-input"
                  value={dataUltimoTesteHidrostatico}
                  onChange={(e) => setDataUltimoTesteHidrostatico(e.target.value)}
                />
              </div>
            </div>

            {/* SEÇÃO 2: Extintores do condomínio */}
            <div className="ext-form-section">
              <div className="ext-section-title">
                <span>Extintores do condomínio</span>
              </div>

              <div className="ext-tipos-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: '#64748b', paddingBottom: '4px' }}>
                  <span>Tipo de extintor</span>
                  <span style={{ width: '80px', textAlign: 'center' }}>Quantidade</span>
                </div>

                {tipos.map((item, idx) => (
                  <div key={idx} className="ext-tipo-row">
                    <input
                      type="text"
                      className="ext-input"
                      placeholder="Ex: Água Pressurizada (AP)"
                      value={item.tipo}
                      onChange={(e) => handleTipoNomeChange(idx, e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <input
                      type="number"
                      min="0"
                      className="ext-input"
                      placeholder="0"
                      value={item.quantidade}
                      onChange={(e) => handleQuantidadeChange(idx, e.target.value)}
                      style={{ width: '80px', textAlign: 'center' }}
                    />
                    {tipos.length > 1 && (
                      <button
                        type="button"
                        className="ext-btn-icon"
                        onClick={() => handleRemoverTipo(idx)}
                        title="Remover tipo"
                        style={{ color: '#dc2626' }}
                      >
                        &times;
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  className="ext-btn-add"
                  onClick={handleAdicionarTipo}
                >
                  + Adicionar tipo
                </button>
              </div>

              <div className="ext-total-banner">
                <span>TOTAL DE EXTINTORES</span>
                <span style={{ fontSize: '16px' }}>{totalExtintores} EXTINTORES</span>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* SEÇÃO 3: Observações & Documentos */}
            <div className="ext-form-section">
              <div className="ext-form-group">
                <label>Observações</label>
                <textarea
                  className="ext-textarea"
                  placeholder="Informe quantidade, tipos de extintores, condições, localização e demais observações relevantes..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                />
              </div>

              <div className="ext-form-group">
                <label>Documentação / Nota Fiscal / Laudo</label>
                {anexoNome ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
                      <IcoDoc />
                      <span>{anexoNome}</span>
                    </div>
                    <button
                      type="button"
                      className="ext-btn-icon"
                      onClick={handleRemoverArquivo}
                      style={{ color: '#dc2626' }}
                      title="Excluir arquivo da pasta"
                    >
                      Remover
                    </button>
                  </div>
                ) : (
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', border: '1px dashed #cbd5e1', borderRadius: '8px', background: '#f8fafc', cursor: uploading ? 'wait' : 'pointer' }}>
                    <input
                      type="file"
                      style={{ display: 'none' }}
                      onChange={handleUploadDocumento}
                      disabled={uploading}
                      accept=".pdf,.png,.jpg,.jpeg"
                    />
                    <div style={{ color: '#64748b', marginBottom: '6px' }}><IcoDoc /></div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                      {uploading ? 'Enviando documento...' : 'Anexar certificado / laudo'}
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      PDF, JPG ou PNG
                    </span>
                  </label>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="ext-drawer-footer">
        <button type="button" className="secundario" onClick={onFechar} disabled={salvando}>
          Cancelar
        </button>
        <button
          type="button"
          style={{ background: '#D71920', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: 600, cursor: 'pointer' }}
          onClick={handleSubmit}
          disabled={salvando}
        >
          {salvando ? 'Salvando...' : 'Salvar registro'}
        </button>
      </div>
    </div>
  );
}
