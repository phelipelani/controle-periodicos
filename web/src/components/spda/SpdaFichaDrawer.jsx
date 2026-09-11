import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import {
  IcoEye,
  IcoEdit,
  IcoTrash,
  IcoDoc,
  IcoCheck,
  IcoRelogio,
  IcoAlertTriangle,
  IcoUpload
} from '../icons';

function formatarData(dataStr) {
  if (!dataStr) return '—';
  const parts = dataStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dataStr;
}

function formatarDataHora(dataHoraStr) {
  if (!dataHoraStr) return '—';
  try {
    const d = new Date(dataHoraStr);
    return d.toLocaleString('pt-BR');
  } catch (e) {
    return dataHoraStr;
  }
}

function formatarTamanho(bytes) {
  if (!bytes) return '—';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function renderBadge(status, diasRestantes) {
  switch (status) {
    case 'em_dia':
      return (
        <span className="spda-badge em_dia">
          <IcoCheck /> Em dia
        </span>
      );
    case 'a_vencer':
      return (
        <span className="spda-badge a_vencer">
          <IcoRelogio /> A vencer {diasRestantes != null ? `(${diasRestantes}d)` : ''}
        </span>
      );
    case 'vencido':
      return (
        <span className="spda-badge vencido">
          <IcoAlertTriangle /> Vencido {diasRestantes != null ? `(${Math.abs(diasRestantes)}d)` : ''}
        </span>
      );
    default:
      return <span className="spda-badge sem_registro">Sem registro</span>;
  }
}

export default function SpdaFichaDrawer({
  aberto,
  condominioId,
  onFechar,
  onEditar,
  isAdmin
}) {
  const [abaAtiva, setAbaAtiva] = useState('geral'); // 'geral' | 'tecnica' | 'documentos' | 'auditoria'
  const [ficha, setFicha] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  // Upload inline
  const [mostrarUpload, setMostrarUpload] = useState(false);
  const [arquivoUpload, setArquivoUpload] = useState(null);
  const [tipoUpload, setTipoUpload] = useState('Laudo SPDA');
  const [enviandoUpload, setEnviandoUpload] = useState(false);

  const carregarFicha = () => {
    if (!condominioId) return;
    setCarregando(true);
    setErro('');
    api.get(`/spda/${condominioId}`)
      .then((res) => {
        setFicha(res);
      })
      .catch((err) => {
        setErro(err.message || 'Erro ao carregar detalhes do SPDA.');
      })
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    if (aberto && condominioId) {
      setAbaAtiva('geral');
      setMostrarUpload(false);
      setArquivoUpload(null);
      carregarFicha();
    }
  }, [aberto, condominioId]);

  const handleUploadDoc = async (e) => {
    e.preventDefault();
    if (!arquivoUpload) return;
    setEnviandoUpload(true);

    const ano = ficha?.spda?.dataValidade ? ficha.spda.dataValidade.split('-')[0] : new Date().getFullYear();
    const formData = new FormData();
    formData.append('documento', arquivoUpload);
    formData.append('tipo', tipoUpload);
    formData.append('ano', String(ano));
    formData.append('codigo_condominio', String(condominioId).padStart(3, '0'));

    try {
      await fetch(`/api/spda/${condominioId}/documentos`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: formData
      });
      setMostrarUpload(false);
      setArquivoUpload(null);
      carregarFicha();
    } catch (err) {
      alert(err.message || 'Erro no envio do documento.');
    } finally {
      setEnviandoUpload(false);
    }
  };

  const handleExcluirDoc = async (docId, nome) => {
    if (!window.confirm(`Deseja remover o documento "${nome}"?`)) return;
    try {
      await api.del(`/spda/documentos/${docId}`);
      carregarFicha();
    } catch (err) {
      alert(err.message || 'Erro ao excluir documento.');
    }
  };

  if (!aberto) return null;

  const cond = ficha?.condominio || {};
  const spda = ficha?.spda || {};
  const documentos = ficha?.documentos || [];
  const auditoria = ficha?.auditoria || [];

  return (
    <>
      <div className={`spda-drawer-backdrop ${aberto ? 'open' : ''}`} onClick={onFechar} />

      <div className={`spda-drawer large ${aberto ? 'open' : ''}`}>
        <div className="spda-drawer-header">
          <div>
            <h2>Detalhes do SPDA — [{cond.codigo || '—'}] {cond.nome}</h2>
            <p>Ficha operacional completa, laudos e histórico de alterações</p>
          </div>
          <button type="button" className="spda-drawer-close" onClick={onFechar}>
            &times;
          </button>
        </div>

        {/* Abas */}
        <div className="spda-drawer-tabs">
          <button
            type="button"
            className={`spda-drawer-tab ${abaAtiva === 'geral' ? 'active' : ''}`}
            onClick={() => setAbaAtiva('geral')}
          >
            1. Dados Gerais
          </button>
          <button
            type="button"
            className={`spda-drawer-tab ${abaAtiva === 'tecnica' ? 'active' : ''}`}
            onClick={() => setAbaAtiva('tecnica')}
          >
            2. Informações Técnicas
          </button>
          <button
            type="button"
            className={`spda-drawer-tab ${abaAtiva === 'documentos' ? 'active' : ''}`}
            onClick={() => setAbaAtiva('documentos')}
          >
            3. Documentos & Laudos {documentos.length > 0 ? `(${documentos.length})` : ''}
          </button>
          <button
            type="button"
            className={`spda-drawer-tab ${abaAtiva === 'auditoria' ? 'active' : ''}`}
            onClick={() => setAbaAtiva('auditoria')}
          >
            4. Histórico & Auditoria
          </button>
        </div>

        <div className="spda-drawer-body">
          {carregando ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              Carregando ficha do SPDA...
            </div>
          ) : erro ? (
            <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '12px', borderRadius: '8px' }}>
              {erro}
            </div>
          ) : (
            <>
              {/* ABA 1: DADOS GERAIS */}
              {abaAtiva === 'geral' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '14px 18px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div>
                      <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Situação Atual</div>
                      <div style={{ marginTop: '4px' }}>{renderBadge(spda.status || 'sem_registro', spda.diasRestantes)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Data de Validade</div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                        {formatarData(spda.dataValidade)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Última Inspeção</div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                        {formatarData(spda.dataAtualizacao)}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div className="spda-card" style={{ padding: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Condomínio</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                        [{cond.codigo}] {cond.nome}
                      </div>
                      <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                        {cond.endereco || 'Endereço não informado'}
                      </div>
                    </div>

                    <div className="spda-card" style={{ padding: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Gerente Responsável</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                        {cond.gerente || 'Sem gerente'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        CNPJ: {cond.cnpj || '—'}
                      </div>
                    </div>
                  </div>

                  <div className="spda-card" style={{ padding: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Periodicidade</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginTop: '4px' }}>
                      A cada {spda.periodicidadeMeses || 12} meses (Controle por data de validade)
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 2: INFORMAÇÕES TÉCNICAS */}
              {abaAtiva === 'tecnica' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="spda-card" style={{ padding: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Descrição do Serviço</div>
                    <div style={{ fontSize: '14px', color: '#0f172a', marginTop: '4px' }}>
                      {spda.descricao || 'Nenhuma descrição informada.'}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div className="spda-card" style={{ padding: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Empresa Executora</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginTop: '4px' }}>
                        {spda.empresaExecutora || '—'}
                      </div>
                    </div>

                    <div className="spda-card" style={{ padding: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Responsável Técnico / CREA</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginTop: '4px' }}>
                        {spda.responsavelTecnico || '—'}
                      </div>
                    </div>
                  </div>

                  <div className="spda-card" style={{ padding: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>ART / RRT</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginTop: '4px' }}>
                      {spda.artRrt || '—'}
                    </div>
                  </div>

                  <div className="spda-card" style={{ padding: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Observações Técnicas</div>
                    <div style={{ fontSize: '13.5px', color: '#334155', marginTop: '4px', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                      {spda.observacoes || 'Nenhuma observação técnica registrada.'}
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 3: DOCUMENTOS */}
              {abaAtiva === 'documentos' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase' }}>
                      Documentos & Laudos Técnicos ({documentos.length})
                    </div>
                    <button
                      type="button"
                      className="spda-btn-primary"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => setMostrarUpload(!mostrarUpload)}
                    >
                      <IcoUpload /> {mostrarUpload ? 'Fechar anexo' : '+ Anexar documento'}
                    </button>
                  </div>

                  {/* Form de Upload inline */}
                  {mostrarUpload && (
                    <form
                      onSubmit={handleUploadDoc}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                        <div className="spda-filter-group">
                          <label className="spda-filter-label">Tipo</label>
                          <select
                            className="spda-select"
                            value={tipoUpload}
                            onChange={(e) => setTipoUpload(e.target.value)}
                          >
                            <option value="Laudo SPDA">Laudo SPDA</option>
                            <option value="ART / RRT">ART / RRT</option>
                            <option value="Relatório Técnico">Relatório Técnico</option>
                            <option value="Certificado">Certificado</option>
                            <option value="Outro">Outro Documento</option>
                          </select>
                        </div>
                        <div className="spda-filter-group">
                          <label className="spda-filter-label">Arquivo</label>
                          <input
                            type="file"
                            className="spda-input"
                            style={{ padding: '4px 8px', background: '#ffffff' }}
                            required
                            onChange={(e) => setArquivoUpload(e.target.files[0] || null)}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                          type="button"
                          className="spda-btn-cancel"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          onClick={() => setMostrarUpload(false)}
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="spda-btn-primary"
                          style={{ padding: '6px 14px', fontSize: '12px' }}
                          disabled={enviandoUpload}
                        >
                          {enviandoUpload ? 'Enviando...' : 'Fazer upload'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Lista de Documentos */}
                  {documentos.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px', background: '#f8fafc', borderRadius: '10px', color: '#64748b' }}>
                      Nenhum laudo ou documento anexado a este SPDA.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {documentos.map((doc) => (
                        <div
                          key={doc.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '10px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <IcoDoc />
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '13.5px' }}>
                                {doc.nome_arquivo}
                              </div>
                              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                {doc.tipo_arquivo} · {formatarTamanho(doc.tamanho)} · Enviado em {formatarDataHora(doc.criado_em)}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <a
                              href={`/api/upload/preview?path=${encodeURIComponent(doc.caminho)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="spda-btn-action"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <IcoEye /> Visualizar
                            </a>
                            <a
                              href={`/api/upload/preview?path=${encodeURIComponent(doc.caminho)}`}
                              download={doc.nome_arquivo}
                              className="spda-btn-action"
                              style={{ color: '#2563eb' }}
                            >
                              Baixar
                            </a>
                            {isAdmin && (
                              <button
                                type="button"
                                className="spda-btn-icon"
                                style={{ color: '#dc2626' }}
                                onClick={() => handleExcluirDoc(doc.id, doc.nome_arquivo)}
                                title="Excluir documento"
                              >
                                <IcoTrash />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ABA 4: HISTÓRICO & AUDITORIA */}
              {abaAtiva === 'auditoria' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Histórico de Alterações & Rastreabilidade ({auditoria.length})
                  </div>

                  {auditoria.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px', background: '#f8fafc', borderRadius: '10px', color: '#64748b' }}>
                      Nenhum histórico de auditoria registrado para este SPDA.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {auditoria.map((log) => (
                        <div
                          key={log.id}
                          style={{
                            padding: '12px 14px',
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '12.5px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 700, color: '#0f172a' }}>
                              {log.usuario_nome || 'Usuário'} <span style={{ fontWeight: 400, color: '#64748b' }}>({log.papel})</span>
                            </span>
                            <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                              {formatarDataHora(log.criado_em)}
                            </span>
                          </div>

                          <div style={{ color: '#334155' }}>
                            {log.detalhes || log.acao}
                          </div>

                          {log.campo && (
                            <div style={{ marginTop: '4px', fontSize: '12px', background: '#f8fafc', padding: '4px 8px', borderRadius: '4px' }}>
                              <span style={{ fontWeight: 600 }}>Campo:</span> {log.campo} |{' '}
                              <span style={{ color: '#dc2626' }}>De: {log.valor_anterior || '—'}</span> →{' '}
                              <span style={{ color: '#059669' }}>Para: {log.valor_novo || '—'}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="spda-drawer-footer">
          <button type="button" className="spda-btn-cancel" onClick={onFechar}>
            Fechar
          </button>
          <button
            type="button"
            className="spda-btn-primary"
            onClick={() => {
              onFechar();
              onEditar({
                id: cond.id,
                condominioId: cond.id,
                condominio: cond.nome,
                gerenteId: cond.gerenteId,
                dataAtualizacao: spda.dataAtualizacao,
                dataValidade: spda.dataValidade,
                periodicidadeMeses: spda.periodicidadeMeses,
                descricao: spda.descricao,
                empresaExecutora: spda.empresaExecutora,
                responsavelTecnico: spda.responsavelTecnico,
                artRrt: spda.artRrt,
                observacoes: spda.observacoes
              });
            }}
          >
            <IcoEdit /> Editar SPDA
          </button>
        </div>
      </div>
    </>
  );
}
