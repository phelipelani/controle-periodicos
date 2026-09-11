import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { IcoUpload, IcoEye, IcoTrash, IcoDoc } from '../icons';

export default function AvcbDrawer({
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
  const [numeroAvcb, setNumeroAvcb] = useState('');
  const [orgaoEmissor, setOrgaoEmissor] = useState('Corpo de Bombeiros da PMESP');
  const [empresaResponsavel, setEmpresaResponsavel] = useState('');
  const [responsavelTecnico, setResponsavelTecnico] = useState('');
  const [dataEmissao, setDataEmissao] = useState('');
  const [dataAtualizacao, setDataAtualizacao] = useState('');
  const [dataValidade, setDataValidade] = useState('');
  const [periodicidadeMeses, setPeriodicidadeMeses] = useState(12);
  const [observacoesTecnicas, setObservacoesTecnicas] = useState('');

  // Upload states
  const [arquivoUpload, setArquivoUpload] = useState(null);
  const [tipoDocumento, setTipoDocumento] = useState('AVCB');
  const [documentosExistentes, setDocumentosExistentes] = useState([]);

  useEffect(() => {
    if (aberto) {
      setErro('');
      setArquivoUpload(null);
      setTipoDocumento('AVCB');

      if (itemEditando) {
        const cid = String(itemEditando.condominioId || itemEditando.id || '');
        setCondominioId(cid);
        setGerenteId(String(itemEditando.gerenteId || itemEditando.gerente_id || ''));
        setNumeroAvcb(itemEditando.numeroAvcb || '');
        setOrgaoEmissor(itemEditando.orgaoEmissor || 'Corpo de Bombeiros da PMESP');
        setEmpresaResponsavel(itemEditando.empresaResponsavel || '');
        setResponsavelTecnico(itemEditando.responsavelTecnico || '');
        setDataEmissao(itemEditando.dataEmissao || '');
        setDataAtualizacao(itemEditando.dataAtualizacao || itemEditando.data_atualizacao || '');
        setDataValidade(itemEditando.dataValidade || itemEditando.data_validade || '');
        setPeriodicidadeMeses(itemEditando.periodicidadeMeses || 12);
        setObservacoesTecnicas(itemEditando.observacoesTecnicas || '');

        // Buscar dados completos e documentos do backend
        if (cid) {
          api.get(`/avcb/${cid}`)
            .then((res) => {
              if (res) {
                if (res.avcb) {
                  const a = res.avcb;
                  setNumeroAvcb(a.numeroAvcb || '');
                  setOrgaoEmissor(a.orgaoEmissor || 'Corpo de Bombeiros da PMESP');
                  setEmpresaResponsavel(a.empresaResponsavel || '');
                  setResponsavelTecnico(a.responsavelTecnico || '');
                  setDataEmissao(a.dataEmissao || '');
                  setDataAtualizacao(a.dataAtualizacao || '');
                  setDataValidade(a.dataValidade || '');
                  setPeriodicidadeMeses(a.periodicidadeMeses || 12);
                  setObservacoesTecnicas(a.observacoesTecnicas || '');
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
        setNumeroAvcb('');
        setOrgaoEmissor('Corpo de Bombeiros da PMESP');
        setEmpresaResponsavel('');
        setResponsavelTecnico('');
        const hoje = new Date().toISOString().split('T')[0];
        setDataEmissao(hoje);
        setDataAtualizacao(hoje);
        
        // Sugerir validade de +1 ano (ou +3/+5 anos se aplicável)
        const [y, m, d] = hoje.split('-').map(Number);
        const dataVenc = new Date(y + 1, m - 1, d);
        const proxAno = `${dataVenc.getFullYear()}-${String(dataVenc.getMonth() + 1).padStart(2, '0')}-${String(dataVenc.getDate()).padStart(2, '0')}`;
        setDataValidade(proxAno);

        setPeriodicidadeMeses(12);
        setObservacoesTecnicas('');
        setDocumentosExistentes([]);
      }
    }
  }, [aberto, itemEditando]);

  // Ao alterar a data de emissão/atualização, sugere validade automaticamente de acordo com periodicidade
  const handleDataEmissaoChange = (novaData) => {
    setDataEmissao(novaData);
    if (!dataAtualizacao) setDataAtualizacao(novaData);
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

  const handlePeriodicidadeChange = (meses) => {
    const val = Number(meses);
    setPeriodicidadeMeses(val);
    const refData = dataEmissao || dataAtualizacao;
    if (refData) {
      const parts = refData.split('-').map(Number);
      if (parts.length === 3) {
        const [ano, mes, dia] = parts;
        const d = new Date(ano, mes - 1, dia);
        d.setMonth(d.getMonth() + val);
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
      numero_avcb: numeroAvcb || null,
      orgao_emissor: orgaoEmissor || 'Corpo de Bombeiros da PMESP',
      empresa_responsavel: empresaResponsavel || null,
      responsavel_tecnico: responsavelTecnico || null,
      data_emissao: dataEmissao || null,
      data_atualizacao: dataAtualizacao || dataEmissao || null,
      data_validade: dataValidade,
      periodicidade_meses: Number(periodicidadeMeses) || 12,
      observacoes_tecnicas: observacoesTecnicas || null
    };

    try {
      await onSalvar(payload);

      // Se houver arquivo selecionado, fazer upload para a estrutura adm/avcb/[ano]/[codigo]/
      if (arquivoUpload) {
        const anoUpload = dataValidade ? dataValidade.split('-')[0] : new Date().getFullYear();
        const formData = new FormData();
        formData.append('documento', arquivoUpload);
        formData.append('tipo', tipoDocumento);
        formData.append('ano', String(anoUpload));
        formData.append('codigo_condominio', String(condominioId).padStart(3, '0'));

        await fetch(`/api/avcb/${condominioId}/documentos`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token') || ''}`
          },
          body: formData
        });
      }

      onFechar();
    } catch (err) {
      setErro(err.message || 'Erro ao salvar registro de AVCB.');
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluirDoc = async (docId, nome) => {
    if (!window.confirm(`Deseja remover o documento "${nome}"?`)) return;
    try {
      await api.del(`/avcb/documentos/${docId}`);
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
      <div className={`avcb-drawer-backdrop ${aberto ? 'open' : ''}`} onClick={onFechar} />

      <div className={`avcb-drawer ${aberto ? 'open' : ''}`}>
        <div className="avcb-drawer-header">
          <div>
            <h2>{itemEditando ? `Editar AVCB — [${codCond}] ${nomeCond}` : 'Novo registro de AVCB'}</h2>
            <p>
              {itemEditando
                ? 'Atualize os dados técnicos, validade e documentação do Auto de Vistoria do Corpo de Bombeiros'
                : 'Preencha as informações para registrar o AVCB do condomínio'}
            </p>
          </div>
          <button type="button" className="avcb-drawer-close" onClick={onFechar}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="avcb-drawer-body">
            {erro && (
              <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>
                {erro}
              </div>
            )}

            {/* SEÇÃO 1: DADOS GERAIS */}
            <div className="avcb-drawer-section">
              <div className="avcb-drawer-section-title">1. Dados Gerais</div>

              <div className="avcb-filter-group">
                <label className="avcb-filter-label">Condomínio *</label>
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
                    className="avcb-select"
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

              <div className="avcb-drawer-row">
                <div className="avcb-filter-group" style={{ flex: 1 }}>
                  <label className="avcb-filter-label">Gerente Responsável</label>
                  <select
                    className="avcb-select"
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
                <div className="avcb-filter-group" style={{ flex: 1 }}>
                  <label className="avcb-filter-label">Periodicidade</label>
                  <select
                    className="avcb-select"
                    value={periodicidadeMeses}
                    onChange={(e) => handlePeriodicidadeChange(e.target.value)}
                  >
                    <option value={12}>12 meses (1 ano)</option>
                    <option value={24}>24 meses (2 anos)</option>
                    <option value={36}>36 meses (3 anos)</option>
                    <option value={60}>60 meses (5 anos)</option>
                  </select>
                </div>
              </div>

              <div className="avcb-drawer-row">
                <div className="avcb-filter-group" style={{ flex: 1 }}>
                  <label className="avcb-filter-label">Data de Emissão</label>
                  <input
                    type="date"
                    className="avcb-input"
                    value={dataEmissao}
                    onChange={(e) => handleDataEmissaoChange(e.target.value)}
                  />
                </div>
                <div className="avcb-filter-group" style={{ flex: 1 }}>
                  <label className="avcb-filter-label">Última Atualização</label>
                  <input
                    type="date"
                    className="avcb-input"
                    value={dataAtualizacao}
                    onChange={(e) => setDataAtualizacao(e.target.value)}
                  />
                </div>
                <div className="avcb-filter-group" style={{ flex: 1 }}>
                  <label className="avcb-filter-label" style={{ color: '#d4202a', fontWeight: 700 }}>
                    Data de Validade *
                  </label>
                  <input
                    type="date"
                    className="avcb-input"
                    value={dataValidade}
                    onChange={(e) => setDataValidade(e.target.value)}
                    required
                    style={{ borderColor: '#d4202a', backgroundColor: '#fff5f5' }}
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: DADOS DO AVCB */}
            <div className="avcb-drawer-section">
              <div className="avcb-drawer-section-title">2. Dados do AVCB / Projeto de Incêndio</div>

              <div className="avcb-drawer-row">
                <div className="avcb-filter-group" style={{ flex: 1 }}>
                  <label className="avcb-filter-label">Número do AVCB / Protocolo</label>
                  <input
                    type="text"
                    className="avcb-input"
                    placeholder="Ex: AVCB nº 492819 / 2026"
                    value={numeroAvcb}
                    onChange={(e) => setNumeroAvcb(e.target.value)}
                  />
                </div>
                <div className="avcb-filter-group" style={{ flex: 1 }}>
                  <label className="avcb-filter-label">Órgão Emissor</label>
                  <input
                    type="text"
                    className="avcb-input"
                    placeholder="Ex: Corpo de Bombeiros da PMESP"
                    value={orgaoEmissor}
                    onChange={(e) => setOrgaoEmissor(e.target.value)}
                  />
                </div>
              </div>

              <div className="avcb-drawer-row">
                <div className="avcb-filter-group" style={{ flex: 1 }}>
                  <label className="avcb-filter-label">Empresa Responsável / Assessoria</label>
                  <input
                    type="text"
                    className="avcb-input"
                    placeholder="Ex: Firetech Engenharia de Incêndio"
                    value={empresaResponsavel}
                    onChange={(e) => setEmpresaResponsavel(e.target.value)}
                  />
                </div>
                <div className="avcb-filter-group" style={{ flex: 1 }}>
                  <label className="avcb-filter-label">Responsável Técnico / CREA</label>
                  <input
                    type="text"
                    className="avcb-input"
                    placeholder="Ex: Eng. Carlos Alberto - CREA 506198"
                    value={responsavelTecnico}
                    onChange={(e) => setResponsavelTecnico(e.target.value)}
                  />
                </div>
              </div>

              <div className="avcb-filter-group">
                <label className="avcb-filter-label">Observações Técnicas / Pendências</label>
                <textarea
                  className="avcb-textarea"
                  placeholder="Descreva observações, pendências apontadas pela vistoria, notas do projeto, etc."
                  value={observacoesTecnicas}
                  onChange={(e) => setObservacoesTecnicas(e.target.value)}
                />
              </div>
            </div>

            {/* SEÇÃO 3: DOCUMENTAÇÃO */}
            <div className="avcb-drawer-section">
              <div className="avcb-drawer-section-title">3. Documentação & Anexos</div>

              {documentosExistentes.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <label className="avcb-filter-label">Documentos anexados anteriormente:</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                    {documentosExistentes.map((doc) => (
                      <div
                        key={doc.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: '#f8fafc',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <IcoDoc />
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                              {doc.nome_arquivo}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                              {doc.tipo_arquivo || 'Documento'} • {doc.ano || '—'}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <a
                            href={`/api/upload/preview?path=${encodeURIComponent(doc.caminho)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="avcb-btn-icon"
                            title="Visualizar documento"
                          >
                            <IcoEye />
                          </a>
                          <button
                            type="button"
                            className="avcb-btn-icon"
                            title="Excluir documento"
                            onClick={() => handleExcluirDoc(doc.id, doc.nome_arquivo)}
                          >
                            <IcoTrash />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="avcb-filter-group">
                <label className="avcb-filter-label">Tipo do Novo Documento</label>
                <select
                  className="avcb-select"
                  value={tipoDocumento}
                  onChange={(e) => setTipoDocumento(e.target.value)}
                >
                  <option value="AVCB">Certificado AVCB</option>
                  <option value="CLCB">Certificado CLCB</option>
                  <option value="Protocolo de Vistoria">Protocolo de Vistoria</option>
                  <option value="Laudo Técnico">Laudo Técnico de Exigências</option>
                  <option value="ART/RRT">ART / RRT</option>
                  <option value="Projeto de Incêndio">Projeto de Incêndio</option>
                  <option value="Outro">Outro Documento</option>
                </select>
              </div>

              <div className="avcb-filter-group">
                <label className="avcb-filter-label">Anexar Arquivo (PDF, Imagem, etc.)</label>
                <div
                  className="avcb-upload-box"
                  onClick={() => document.getElementById('avcb-file-input').click()}
                >
                  <IcoUpload />
                  {arquivoUpload ? (
                    <div>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>{arquivoUpload.name}</span>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        {(arquivoUpload.size / 1024).toFixed(1)} KB — Pronto para envio
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span style={{ fontWeight: 600, color: '#d4202a' }}>Clique para selecionar o arquivo</span>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        Estrutura: adm/avcb/[ano]/[codigo_condominio]/
                      </div>
                    </div>
                  )}
                  <input
                    id="avcb-file-input"
                    type="file"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setArquivoUpload(e.target.files[0]);
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="avcb-drawer-footer">
            <button type="button" className="avcb-btn-secondary" onClick={onFechar}>
              Cancelar
            </button>
            <button type="submit" className="avcb-btn-primary" disabled={salvando}>
              {salvando ? 'Salvando...' : itemEditando ? 'Salvar Alterações' : 'Cadastrar AVCB'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
