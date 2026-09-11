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
        <span className="avcb-badge em_dia">
          <IcoCheck /> Em dia
        </span>
      );
    case 'a_vencer':
      return (
        <span className="avcb-badge a_vencer">
          <IcoRelogio /> A vencer {diasRestantes != null ? `(${diasRestantes}d)` : ''}
        </span>
      );
    case 'vencido':
      return (
        <span className="avcb-badge vencido">
          <IcoAlertTriangle /> Vencido {diasRestantes != null ? `(${Math.abs(diasRestantes)}d)` : ''}
        </span>
      );
    default:
      return <span className="avcb-badge sem_registro">Sem registro</span>;
  }
}

export default function AvcbFichaDrawer({
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
  const [tipoUpload, setTipoUpload] = useState('AVCB');
  const [enviandoUpload, setEnviandoUpload] = useState(false);

  const carregarFicha = () => {
    if (!condominioId) return;
    setCarregando(true);
    setErro('');
    api.get(`/avcb/${condominioId}`)
      .then((res) => {
        setFicha(res);
      })
      .catch((err) => {
        setErro(err.message || 'Erro ao carregar detalhes do AVCB.');
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

    const ano = ficha?.avcb?.dataValidade ? ficha.avcb.dataValidade.split('-')[0] : new Date().getFullYear();
    const formData = new FormData();
    formData.append('documento', arquivoUpload);
    formData.append('tipo', tipoUpload);
    formData.append('ano', String(ano));
    formData.append('codigo_condominio', String(condominioId).padStart(3, '0'));

    try {
      await fetch(`/api/avcb/${condominioId}/documentos`, {
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
      await api.del(`/avcb/documentos/${docId}`);
      carregarFicha();
    } catch (err) {
      alert(err.message || 'Erro ao excluir documento.');
    }
  };

  if (!aberto) return null;

  const cond = ficha?.condominio || {};
  const avcb = ficha?.avcb || {};
  const documentos = ficha?.documentos || [];
  const auditoria = ficha?.auditoria || [];

  return (
    <>
      <div className={`avcb-drawer-backdrop ${aberto ? 'open' : ''}`} onClick={onFechar} />

      <div className={`avcb-drawer large ${aberto ? 'open' : ''}`}>
        <div className="avcb-drawer-header">
          <div>
            <h2>Detalhes do AVCB — [{cond.codigo || '—'}] {cond.nome}</h2>
            <p>Ficha operacional completa, laudos e histórico de alterações</p>
          </div>
          <button type="button" className="avcb-drawer-close" onClick={onFechar}>
            &times;
          </button>
        </div>

        {/* Abas */}
        <div className="avcb-drawer-tabs">
          <button
            type="button"
            className={`avcb-drawer-tab ${abaAtiva === 'geral' ? 'active' : ''}`}
            onClick={() => setAbaAtiva('geral')}
          >
            1. Dados Gerais
          </button>
          <button
            type="button"
            className={`avcb-drawer-tab ${abaAtiva === 'tecnica' ? 'active' : ''}`}
            onClick={() => setAbaAtiva('tecnica')}
          >
            2. Informações do AVCB
          </button>
          <button
            type="button"
            className={`avcb-drawer-tab ${abaAtiva === 'documentos' ? 'active' : ''}`}
            onClick={() => setAbaAtiva('documentos')}
          >
            3. Documentos & Anexos {documentos.length > 0 ? `(${documentos.length})` : ''}
          </button>
          <button
            type="button"
            className={`avcb-drawer-tab ${abaAtiva === 'auditoria' ? 'active' : ''}`}
            onClick={() => setAbaAtiva('auditoria')}
          >
            4. Histórico & Auditoria
          </button>
        </div>

        <div className="avcb-drawer-body">
          {carregando ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
              Carregando ficha do AVCB...
            </div>
          ) : erro ? (
            <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px' }}>
              {erro}
            </div>
          ) : (
            <>
              {/* ABA 1: DADOS GERAIS */}
              {abaAtiva === 'geral' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                        [{cond.codigo}] {cond.nome}
                      </div>
                      <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                        CNPJ: {cond.cnpj || 'Não informado'} • Gerente: {cond.gerente}
                      </div>
                    </div>
                    <div>{renderBadge(avcb?.status || 'sem_registro', avcb?.diasRestantes)}</div>
                  </div>

                  <div className="avcb-drawer-section">
                    <div className="avcb-drawer-section-title">Informações de Contato e Localização</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Endereço</div>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b' }}>{cond.endereco || '—'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>E-mail</div>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b' }}>{cond.email || '—'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Telefone</div>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b' }}>{cond.telefone || '—'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="avcb-drawer-section">
                    <div className="avcb-drawer-section-title">Validade e Controle</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Data de Emissão</div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{formatarData(avcb?.dataEmissao)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Última Atualização</div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{formatarData(avcb?.dataAtualizacao)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#d4202a', textTransform: 'uppercase' }}>Data de Validade</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#d4202a' }}>{formatarData(avcb?.dataValidade)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Periodicidade</div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{avcb?.periodicidadeMeses ? `${avcb.periodicidadeMeses} meses` : '12 meses'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 2: INFORMAÇÕES TÉCNICAS */}
              {abaAtiva === 'tecnica' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="avcb-drawer-section">
                    <div className="avcb-drawer-section-title">Dados Técnicos do Auto de Vistoria</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Número do AVCB / Protocolo</div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{avcb?.numeroAvcb || 'Não informado'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Órgão Emissor</div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{avcb?.orgaoEmissor || 'Corpo de Bombeiros da PMESP'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Empresa Responsável / Assessoria</div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{avcb?.empresaResponsavel || 'Não informada'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Responsável Técnico / CREA</div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{avcb?.responsavelTecnico || 'Não informado'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="avcb-drawer-section">
                    <div className="avcb-drawer-section-title">Observações Técnicas / Pendências</div>
                    <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', color: '#334155', whiteSpace: 'pre-line', lineHeight: '1.5' }}>
                      {avcb?.observacoesTecnicas || 'Nenhuma observação ou pendência registrada.'}
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 3: DOCUMENTOS & ANEXOS */}
              {abaAtiva === 'documentos' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '15px', color: '#0f172a', fontWeight: 700 }}>
                        Documentos e Laudos do AVCB
                      </h4>
                      <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                        Armazenamento organizado: adm/avcb/[ano]/[codigo_condominio]/
                      </p>
                    </div>
                    <button
                      type="button"
                      className="avcb-btn-secondary"
                      onClick={() => setMostrarUpload(!mostrarUpload)}
                    >
                      <IcoUpload /> {mostrarUpload ? 'Fechar formulário' : 'Novo documento'}
                    </button>
                  </div>

                  {mostrarUpload && (
                    <form onSubmit={handleUploadDoc} className="avcb-drawer-section" style={{ background: '#f8fafc' }}>
                      <div className="avcb-drawer-section-title">Fazer Upload de Novo Documento</div>
                      <div className="avcb-drawer-row">
                        <div className="avcb-filter-group" style={{ flex: 1 }}>
                          <label className="avcb-filter-label">Tipo do Documento</label>
                          <select
                            className="avcb-select"
                            value={tipoUpload}
                            onChange={(e) => setTipoUpload(e.target.value)}
                          >
                            <option value="AVCB">Certificado AVCB</option>
                            <option value="CLCB">Certificado CLCB</option>
                            <option value="Protocolo de Vistoria">Protocolo de Vistoria</option>
                            <option value="Laudo Técnico">Laudo Técnico de Exigências</option>
                            <option value="ART/RRT">ART / RRT</option>
                            <option value="Projeto de Incêndio">Projeto de Incêndio</option>
                            <option value="Outro">Outro</option>
                          </select>
                        </div>
                        <div className="avcb-filter-group" style={{ flex: 2 }}>
                          <label className="avcb-filter-label">Arquivo</label>
                          <input
                            type="file"
                            className="avcb-input"
                            required
                            onChange={(e) => setArquivoUpload(e.target.files?.[0] || null)}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', gap: '8px' }}>
                        <button
                          type="button"
                          className="avcb-btn-secondary"
                          onClick={() => setMostrarUpload(false)}
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="avcb-btn-primary"
                          disabled={enviandoUpload || !arquivoUpload}
                        >
                          {enviandoUpload ? 'Enviando...' : 'Enviar Arquivo'}
                        </button>
                      </div>
                    </form>
                  )}

                  {documentos.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                      Nenhum documento anexado para este condomínio.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {documentos.map((doc) => (
                        <div
                          key={doc.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            background: '#ffffff',
                            borderRadius: '10px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#fee2e2', color: '#d4202a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <IcoDoc />
                            </div>
                            <div>
                              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                                {doc.nome_arquivo}
                              </div>
                              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                <span style={{ fontWeight: 600, color: '#475569' }}>{doc.tipo_arquivo || 'AVCB'}</span> • {formatarTamanho(doc.tamanho)} • Ano: {doc.ano || '—'} • Por: {doc.uploaded_by_nome || 'Sistema'} em {formatarDataHora(doc.criado_em)}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <a
                              href={`/api/upload/preview?path=${encodeURIComponent(doc.caminho)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="avcb-btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '12px' }}
                              title="Visualizar documento"
                            >
                              <IcoEye /> Visualizar
                            </a>
                            <button
                              type="button"
                              className="avcb-btn-icon"
                              style={{ color: '#ef4444' }}
                              title="Excluir documento"
                              onClick={() => handleExcluirDoc(doc.id, doc.nome_arquivo)}
                            >
                              <IcoTrash />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ABA 4: HISTÓRICO & AUDITORIA */}
              {abaAtiva === 'auditoria' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="avcb-drawer-section-title">Trilha de Auditoria & Alterações</div>
                  {auditoria.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                      Nenhuma alteração registrada até o momento.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {auditoria.map((log) => (
                        <div
                          key={log.id}
                          style={{
                            padding: '12px 14px',
                            background: '#f8fafc',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            fontSize: '13px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 700, color: '#0f172a' }}>
                              {log.usuario_nome} ({log.papel})
                            </span>
                            <span style={{ color: '#64748b', fontSize: '11px' }}>
                              {formatarDataHora(log.criado_em)}
                            </span>
                          </div>
                          <div style={{ color: '#334155' }}>
                            <strong style={{ color: '#d4202a' }}>{log.acao}</strong> — {log.detalhes || `Campo: ${log.campo || '—'}`}
                          </div>
                          {log.valor_anterior && (
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                              Anterior: <code style={{ background: '#f1f5f9', padding: '2px 4px', borderRadius: '4px' }}>{log.valor_anterior}</code> ➔ Novo: <code style={{ background: '#f1f5f9', padding: '2px 4px', borderRadius: '4px' }}>{log.valor_novo}</code>
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

        <div className="avcb-drawer-footer">
          <button type="button" className="avcb-btn-secondary" onClick={onFechar}>
            Fechar
          </button>
          <button
            type="button"
            className="avcb-btn-primary"
            onClick={() => {
              onFechar();
              if (ficha) {
                onEditar({
                  ...ficha.condominio,
                  ...ficha.avcb,
                  id: ficha.condominio.id,
                  condominioId: ficha.condominio.id,
                  condominio: ficha.condominio.nome
                });
              }
            }}
          >
            <IcoEdit /> Editar AVCB
          </button>
        </div>
      </div>
    </>
  );
}
