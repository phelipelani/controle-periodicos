import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { IcoUpload, IcoEye, IcoTrash, IcoDoc } from '../icons';

export default function SpdaDrawer({
  aberto,
  onFechar,
  itemEditando,
  todosCondominios = [],
  gerentes = [],
  onSalvar
}) {
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  // Form states
  const [condominioId, setCondominioId] = useState('');
  const [gerenteId, setGerenteId] = useState('');
  const [dataAtualizacao, setDataAtualizacao] = useState('');
  const [dataValidade, setDataValidade] = useState('');
  const [periodicidadeMeses, setPeriodicidadeMeses] = useState(12);
  const [descricao, setDescricao] = useState('');
  const [empresaExecutora, setEmpresaExecutora] = useState('');
  const [responsavelTecnico, setResponsavelTecnico] = useState('');
  const [artRrt, setArtRrt] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Upload states
  const [arquivoUpload, setArquivoUpload] = useState(null);
  const [tipoDocumento, setTipoDocumento] = useState('Laudo SPDA');
  const [documentosExistentes, setDocumentosExistentes] = useState([]);

  useEffect(() => {
    if (aberto) {
      setErro('');
      setArquivoUpload(null);
      setTipoDocumento('Laudo SPDA');

      if (itemEditando) {
        const cid = String(itemEditando.condominioId || itemEditando.id || '');
        setCondominioId(cid);
        setGerenteId(String(itemEditando.gerenteId || itemEditando.gerente_id || ''));
        setDataAtualizacao(itemEditando.dataAtualizacao || itemEditando.data_atualizacao || '');
        setDataValidade(itemEditando.dataValidade || itemEditando.data_validade || '');
        setPeriodicidadeMeses(itemEditando.periodicidadeMeses || 12);
        setDescricao(itemEditando.descricao || '');
        setEmpresaExecutora(itemEditando.empresaExecutora || '');
        setResponsavelTecnico(itemEditando.responsavelTecnico || '');
        setArtRrt(itemEditando.artRrt || '');
        setObservacoes(itemEditando.observacoes || '');

        // Buscar dados completos e documentos do backend
        if (cid) {
          api.get(`/spda/${cid}`)
            .then((res) => {
              if (res) {
                if (res.spda) {
                  const s = res.spda;
                  setDataAtualizacao(s.dataAtualizacao || '');
                  setDataValidade(s.dataValidade || '');
                  setPeriodicidadeMeses(s.periodicidadeMeses || 12);
                  setDescricao(s.descricao || '');
                  setEmpresaExecutora(s.empresaExecutora || '');
                  setResponsavelTecnico(s.responsavelTecnico || '');
                  setArtRrt(s.artRrt || '');
                  setObservacoes(s.observacoes || '');
                }
                if (res.documentos) {
                  setDocumentosExistentes(res.documentos);
                }
              }
            })
            .catch(() => {});
        }
      } else {
        // Novo registro
        setCondominioId('');
        setGerenteId('');
        const hoje = new Date().toISOString().split('T')[0];
        setDataAtualizacao(hoje);
        
        // Sugerir validade de +1 ano
        const [y, m, d] = hoje.split('-').map(Number);
        const dataVenc = new Date(y + 1, m - 1, d);
        const proxAno = `${dataVenc.getFullYear()}-${String(dataVenc.getMonth() + 1).padStart(2, '0')}-${String(dataVenc.getDate()).padStart(2, '0')}`;
        setDataValidade(proxAno);

        setPeriodicidadeMeses(12);
        setDescricao('Inspeção e Medição Ôhmica do SPDA');
        setEmpresaExecutora('');
        setResponsavelTecnico('');
        setArtRrt('');
        setObservacoes('');
        setDocumentosExistentes([]);
      }
    }
  }, [aberto, itemEditando]);

  // Ao alterar a data de atualização, sugere automaticamente validade + periodicidade se validade não foi customizada
  const handleDataAtualizacaoChange = (novaData) => {
    setDataAtualizacao(novaData);
    if (novaData && (!dataValidade || !itemEditando)) {
      const parts = novaData.split('-').map(Number);
      if (parts.length === 3) {
        const [ano, mes, dia] = parts;
        const d = new Date(ano, mes - 1, dia);
        d.setMonth(d.getMonth() + Number(periodicidadeMeses || 12));
        const vencStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        setDataValidade(vencStr);
      }
    }
  };

  const handleSelectCondominio = (id) => {
    setCondominioId(id);
    const cond = todosCondominios.find((c) => String(c.id || c.condominioId) === String(id));
    if (cond && cond.gerenteId) {
      setGerenteId(String(cond.gerenteId));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!condominioId) {
      setErro('Por favor, selecione o condomínio.');
      return;
    }
    if (!dataValidade) {
      setErro('A data de validade é obrigatória.');
      return;
    }

    setSalvando(true);
    setErro('');

    const payload = {
      condominio_id: Number(condominioId),
      gerente_id: gerenteId ? Number(gerenteId) : null,
      data_atualizacao: dataAtualizacao || null,
      data_validade: dataValidade,
      periodicidade_meses: Number(periodicidadeMeses) || 12,
      descricao: descricao || null,
      observacoes: observacoes || null,
      empresa_executora: empresaExecutora || null,
      responsavel_tecnico: responsavelTecnico || null,
      art_rrt: artRrt || null
    };

    try {
      await onSalvar(payload);

      // Se houver arquivo selecionado, fazer upload para a estrutura adm/spda/[ano]/[codigo]/
      if (arquivoUpload) {
        const anoUpload = dataValidade ? dataValidade.split('-')[0] : new Date().getFullYear();
        const formData = new FormData();
        formData.append('documento', arquivoUpload);
        formData.append('tipo', tipoDocumento);
        formData.append('ano', String(anoUpload));
        formData.append('codigo_condominio', String(condominioId).padStart(3, '0'));

        await fetch(`/api/spda/${condominioId}/documentos`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token') || ''}`
          },
          body: formData
        });
      }

      onFechar();
    } catch (err) {
      setErro(err.message || 'Erro ao salvar registro de SPDA.');
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluirDoc = async (docId, nome) => {
    if (!window.confirm(`Deseja remover o documento "${nome}"?`)) return;
    try {
      await api.del(`/spda/documentos/${docId}`);
      setDocumentosExistentes((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      alert(err.message || 'Erro ao excluir documento');
    }
  };

  const condInfo = todosCondominios.find((c) => String(c.id || c.condominioId) === String(condominioId));
  const nomeCond = condInfo?.condominio || condInfo?.nome || itemEditando?.condominio || '';
  const codCond = condInfo?.codigo || (condominioId ? String(condominioId).padStart(3, '0') : '');

  return (
    <>
      <div className={`spda-drawer-backdrop ${aberto ? 'open' : ''}`} onClick={onFechar} />

      <div className={`spda-drawer ${aberto ? 'open' : ''}`}>
        <div className="spda-drawer-header">
          <div>
            <h2>{itemEditando ? `Editar SPDA — [${codCond}] ${nomeCond}` : 'Novo registro de SPDA'}</h2>
            <p>
              {itemEditando
                ? 'Atualize os dados técnicos, validade e documentação do para-raios'
                : 'Preencha as informações para registrar o SPDA do condomínio'}
            </p>
          </div>
          <button type="button" className="spda-drawer-close" onClick={onFechar}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="spda-drawer-body">
            {erro && (
              <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>
                {erro}
              </div>
            )}

            {/* SEÇÃO 1: DADOS GERAIS */}
            <div className="spda-drawer-section">
              <div className="spda-drawer-section-title">1. Dados Gerais</div>

              <div className="spda-filter-group">
                <label className="spda-filter-label">Condomínio *</label>
                {itemEditando ? (
                  <div
                    style={{
                      padding: '10px 12px',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontWeight: 700,
                      color: '#0f172a',
                      fontSize: '14px'
                    }}
                  >
                    [{codCond}] {nomeCond}
                  </div>
                ) : (
                  <select
                    className="spda-select"
                    value={condominioId}
                    onChange={(e) => handleSelectCondominio(e.target.value)}
                    required
                  >
                    <option value="">Selecione o condomínio...</option>
                    {todosCondominios.map((c) => (
                      <option key={c.id || c.condominioId} value={c.id || c.condominioId}>
                        {String(c.codigo || c.id || c.condominioId).padStart(3, '0')} - {c.condominio || c.nome}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="spda-filter-group">
                <label className="spda-filter-label">Gerente Responsável</label>
                <select
                  className="spda-select"
                  value={gerenteId}
                  onChange={(e) => setGerenteId(e.target.value)}
                >
                  <option value="">Selecione o gerente...</option>
                  {gerentes.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="spda-filter-group">
                  <label className="spda-filter-label">Data da inspeção / atualização *</label>
                  <input
                    type="date"
                    className="spda-input"
                    value={dataAtualizacao}
                    onChange={(e) => handleDataAtualizacaoChange(e.target.value)}
                    required
                  />
                </div>

                <div className="spda-filter-group">
                  <label className="spda-filter-label">Data de validade *</label>
                  <input
                    type="date"
                    className="spda-input"
                    value={dataValidade}
                    onChange={(e) => setDataValidade(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: INFORMAÇÕES TÉCNICAS */}
            <div className="spda-drawer-section">
              <div className="spda-drawer-section-title">2. Informações Técnicas & Responsabilidade</div>

              <div className="spda-filter-group">
                <label className="spda-filter-label">Descrição do serviço</label>
                <input
                  type="text"
                  className="spda-input"
                  placeholder="Ex: Medição ôhmica de continuidade e inspeção visual"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="spda-filter-group">
                  <label className="spda-filter-label">Empresa executora</label>
                  <input
                    type="text"
                    className="spda-input"
                    placeholder="Ex: EletroSPDA Engenharia"
                    value={empresaExecutora}
                    onChange={(e) => setEmpresaExecutora(e.target.value)}
                  />
                </div>

                <div className="spda-filter-group">
                  <label className="spda-filter-label">Responsável Técnico / CREA</label>
                  <input
                    type="text"
                    className="spda-input"
                    placeholder="Ex: Eng. João Silva - CREA 506..."
                    value={responsavelTecnico}
                    onChange={(e) => setResponsavelTecnico(e.target.value)}
                  />
                </div>
              </div>

              <div className="spda-filter-group">
                <label className="spda-filter-label">ART / RRT</label>
                <input
                  type="text"
                  className="spda-input"
                  placeholder="Ex: ART nº 2026001928472"
                  value={artRrt}
                  onChange={(e) => setArtRrt(e.target.value)}
                />
              </div>

              <div className="spda-filter-group">
                <label className="spda-filter-label">Observações técnicas</label>
                <textarea
                  className="spda-input"
                  style={{ height: '80px', padding: '8px 12px', resize: 'vertical' }}
                  placeholder="Informe observações relevantes sobre o sistema, inspeção, condições encontradas, empresa responsável, recomendações, etc."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                />
              </div>
            </div>

            {/* SEÇÃO 3: DOCUMENTAÇÃO */}
            <div className="spda-drawer-section">
              <div className="spda-drawer-section-title">3. Documentação & Laudo</div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                  <div className="spda-filter-group">
                    <label className="spda-filter-label">Tipo do documento</label>
                    <select
                      className="spda-select"
                      value={tipoDocumento}
                      onChange={(e) => setTipoDocumento(e.target.value)}
                    >
                      <option value="Laudo SPDA">Laudo SPDA</option>
                      <option value="ART / RRT">ART / RRT</option>
                      <option value="Relatório Técnico">Relatório Técnico</option>
                      <option value="Certificado">Certificado</option>
                      <option value="Outro">Outro Documento</option>
                    </select>
                  </div>

                  <div className="spda-filter-group">
                    <label className="spda-filter-label">Selecionar arquivo (PDF, PNG, JPG)</label>
                    <input
                      type="file"
                      className="spda-input"
                      style={{ padding: '4px 8px', background: '#ffffff' }}
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => setArquivoUpload(e.target.files[0] || null)}
                    />
                  </div>
                </div>

                {arquivoUpload && (
                  <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>
                    ✓ Arquivo selecionado: {arquivoUpload.name} ({(arquivoUpload.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>

              {/* Lista de documentos existentes */}
              {documentosExistentes.length > 0 && (
                <div style={{ marginTop: '4px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                    Documentos já anexados ({documentosExistentes.length}):
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {documentosExistentes.map((doc) => (
                      <div
                        key={doc.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '13px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <IcoDoc />
                          <span style={{ fontWeight: 600, color: '#0f172a' }}>{doc.nome_arquivo}</span>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>({doc.tipo_arquivo})</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <a
                            href={`/api/upload/preview?path=${encodeURIComponent(doc.caminho)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="spda-btn-action"
                            style={{ fontSize: '11.5px', padding: '3px 8px' }}
                          >
                            <IcoEye /> Ver
                          </a>
                          <button
                            type="button"
                            className="spda-btn-icon"
                            style={{ color: '#dc2626', width: '28px', height: '28px' }}
                            onClick={() => handleExcluirDoc(doc.id, doc.nome_arquivo)}
                            title="Excluir documento"
                          >
                            <IcoTrash />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="spda-drawer-footer">
            <button type="button" className="spda-btn-cancel" onClick={onFechar} disabled={salvando}>
              Cancelar
            </button>
            <button type="submit" className="spda-btn-primary" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar registro'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
