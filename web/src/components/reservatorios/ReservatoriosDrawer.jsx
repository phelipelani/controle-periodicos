import React, { useState, useEffect } from 'react';
import { IcoDoc } from '../icons';

export default function ReservatoriosDrawer({
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
  const [dataUltimaLimpeza, setDataUltimaLimpeza] = useState('');
  const [dataProximoVencimento, setDataProximoVencimento] = useState('');
  const [capacidadeLitros, setCapacidadeLitros] = useState('');
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
        setDataUltimaLimpeza(condominioEditando.dataUltimaLimpeza || '');
        setDataProximoVencimento(condominioEditando.dataProximoVencimento || '');
        setCapacidadeLitros(condominioEditando.capacidadeLitros != null ? String(condominioEditando.capacidadeLitros) : '');
        setObservacoes(condominioEditando.observacoes || '');
        setAnexoPath(condominioEditando.anexo || null);
        setAnexoNome(condominioEditando.anexo ? condominioEditando.anexo.split(/[\\/]/).pop() : null);
      } else {
        // Novo registro
        setCondominioId('');
        setGerenteNome('');
        setDataUltimaLimpeza('');
        setDataProximoVencimento('');
        setCapacidadeLitros('');
        setObservacoes('');
        setAnexoPath(null);
        setAnexoNome(null);
      }
    }
  }, [aberto, condominioEditando]);

  // Atualizar gerente quando seleciona condomínio
  const handleSelecionarCondominio = (id) => {
    setCondominioId(id);
    const cond = todosCondominios.find((c) => String(c.id) === String(id));
    if (cond) {
      setGerenteNome(cond.gerente || cond.gerente_nome || 'Sem gerente');
    } else {
      setGerenteNome('');
    }
  };

  // Cálculo automático do vencimento (+6 meses) a partir da data de limpeza
  const handleDataLimpezaChange = (novaData) => {
    setDataUltimaLimpeza(novaData);
    if (novaData) {
      const [y, m, d] = novaData.split('-').map(Number);
      const dataVenc = new Date(y, m - 1 + 6, d);
      const yyyy = dataVenc.getFullYear();
      const mm = String(dataVenc.getMonth() + 1).padStart(2, '0');
      const dd = String(dataVenc.getDate()).padStart(2, '0');
      setDataProximoVencimento(`${yyyy}-${mm}-${dd}`);
    }
  };

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
        headers: { Authorization: `Bearer ${token}` },
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
      data_ultima_limpeza: dataUltimaLimpeza || null,
      data_proximo_vencimento: dataProximoVencimento || null,
      capacidade_litros: capacidadeLitros ? Number(capacidadeLitros) : null,
      observacoes,
      anexo: anexoPath
    };

    try {
      await onSalvar(payload);
      onFechar();
    } catch (e) {
      setErro(e.message || 'Erro ao salvar reservatório');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className={`res-drawer ${aberto ? 'open' : ''}`}>
      <div className="res-drawer-header">
        <h2>{condominioEditando ? 'Editar registro de reservatório' : 'Novo registro de reservatório'}</h2>
        <button type="button" className="res-drawer-close" onClick={onFechar}>
          &times;
        </button>
      </div>

      <div className="res-drawer-tabs">
        <button
          type="button"
          className={`res-drawer-tab ${abaAtiva === 'dados' ? 'active' : ''}`}
          onClick={() => setAbaAtiva('dados')}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: abaAtiva === 'dados' ? '#0284c7' : '#e2e8f0',
              color: abaAtiva === 'dados' ? '#fff' : '#64748b',
              fontSize: '11px',
              marginRight: '6px'
            }}
          >
            1
          </span>
          Dados gerais
        </button>
        <button
          type="button"
          className={`res-drawer-tab ${abaAtiva === 'obs' ? 'active' : ''}`}
          onClick={() => setAbaAtiva('obs')}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: abaAtiva === 'obs' ? '#0284c7' : '#e2e8f0',
              color: abaAtiva === 'obs' ? '#fff' : '#64748b',
              fontSize: '11px',
              marginRight: '6px'
            }}
          >
            2
          </span>
          Observações & Documentos
        </button>
      </div>

      <div className="res-drawer-body">
        {erro && (
          <div
            style={{
              background: '#fee2e2',
              color: '#b91c1c',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '13px'
            }}
          >
            {erro}
          </div>
        )}

        {abaAtiva === 'dados' && (
          <div className="res-section">
            <div className="res-section-title">Informações do Condomínio & Prazos</div>

            <div className="res-form-grid">
              <div className="res-form-group full-width">
                <label>Condomínio *</label>
                <select
                  className="res-input"
                  value={condominioId}
                  onChange={(e) => handleSelecionarCondominio(e.target.value)}
                  disabled={!!condominioEditando}
                >
                  <option value="">Selecione o condomínio...</option>
                  {todosCondominios.map((c) => (
                    <option key={c.id} value={c.id}>
                      {String(c.id).padStart(3, '0')} - {c.condominio || c.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="res-form-group full-width">
                <label>Gerente responsável</label>
                <input
                  type="text"
                  className="res-input"
                  value={gerenteNome || 'Sem gerente'}
                  disabled
                  style={{ background: '#f8fafc', color: '#64748b' }}
                />
              </div>

              <div className="res-form-group">
                <label>Data da última limpeza</label>
                <input
                  type="date"
                  className="res-input"
                  value={dataUltimaLimpeza}
                  onChange={(e) => handleDataLimpezaChange(e.target.value)}
                />
              </div>

              <div className="res-form-group">
                <label>Próximo vencimento (Semestral)</label>
                <input
                  type="date"
                  className="res-input"
                  value={dataProximoVencimento}
                  onChange={(e) => setDataProximoVencimento(e.target.value)}
                />
              </div>

              <div className="res-form-group full-width">
                <label>Capacidade total do reservatório</label>
                <div className="res-input-suffix-wrap">
                  <input
                    type="number"
                    className="res-input"
                    placeholder="Ex: 50000"
                    value={capacidadeLitros}
                    onChange={(e) => setCapacidadeLitros(e.target.value)}
                    min="0"
                    step="100"
                  />
                  <span className="res-input-suffix">Litros (L)</span>
                </div>
                {capacidadeLitros && !isNaN(Number(capacidadeLitros)) && (
                  <span style={{ fontSize: '12px', color: '#0284c7', marginTop: '4px' }}>
                    Capacidade formatada: {Number(capacidadeLitros).toLocaleString('pt-BR')} L
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {abaAtiva === 'obs' && (
          <div className="res-section">
            <div className="res-section-title">Observações e Comprovantes</div>

            <div className="res-form-group full-width">
              <label>Observações gerais</label>
              <textarea
                className="res-input"
                rows="4"
                placeholder="Detalhes adicionais sobre o reservatório, laudo de potabilidade, etc..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="res-form-group full-width">
              <label>Comprovante / Laudo de potabilidade (PDF ou imagem)</label>
              <label className="res-upload-area">
                <input
                  type="file"
                  accept=".pdf,image/png,image/jpeg"
                  onChange={handleUploadDocumento}
                  disabled={uploading}
                />
                <div className="res-upload-icon">
                  <IcoDoc />
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                  {uploading ? 'Enviando arquivo...' : 'Clique para selecionar o laudo / recibo'}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                  Formatos suportados: PDF, PNG, JPG (máx. 10MB)
                </div>
              </label>

              {anexoPath && (
                <div className="res-file-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    <IcoDoc />
                    <span
                      style={{
                        fontSize: '13px',
                        color: '#0f172a',
                        fontWeight: 500,
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {anexoNome || 'Documento anexado'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="res-btn-icon"
                    title="Remover arquivo da pasta"
                    onClick={handleRemoverArquivo}
                  >
                    &times;
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="res-drawer-footer">
        <button type="button" className="res-btn-cancel" onClick={onFechar} disabled={salvando}>
          Cancelar
        </button>
        <button type="button" className="res-btn-primary" onClick={handleSubmit} disabled={salvando}>
          {salvando ? 'Salvando...' : 'Salvar registro'}
        </button>
      </div>
    </div>
  );
}
