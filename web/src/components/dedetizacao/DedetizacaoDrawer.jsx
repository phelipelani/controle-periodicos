import React, { useState, useEffect } from 'react';
import { IcoDoc, IcoCalendario, IcoCheck, IcoTrash } from '../icons';
import { api } from '../../api';
import { useAuth } from '../../auth/AuthContext';

const UploadDocumento = ({ onFileUploaded, initialPath, codigoCondominio, ano }) => {
  const [file, setFile] = useState(initialPath ? { name: initialPath.split(/[\\/]/).pop(), path: initialPath } : null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (initialPath) {
      setFile({ name: initialPath.split(/[\\/]/).pop(), path: initialPath });
    } else {
      setFile(null);
    }
  }, [initialPath]);

  const handleUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setUploading(true);
    setError(null);
    
    const formData = new FormData();
    if (codigoCondominio) formData.append('codigo_condominio', codigoCondominio);
    if (ano) formData.append('ano', ano);
    formData.append('documento', selectedFile);

    try {
      const token = localStorage.getItem('cp_token');
      const queryParams = new URLSearchParams();
      if (codigoCondominio) queryParams.set('codigo_condominio', codigoCondominio);
      if (ano) queryParams.set('ano', ano);
      const url = `/api/upload/dedetizacao/recibo${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const data = await res.json();
      
      if (res.ok) {
        const fileData = { name: data.filename || selectedFile.name, size: selectedFile.size, path: data.caminho };
        setFile(fileData);
        onFileUploaded(data.caminho);
      } else {
        setError(data.erro || 'Falha ao anexar o arquivo');
      }
    } catch (err) {
      setError('Erro de conexão ao anexar o arquivo');
    } finally {
      setUploading(false);
    }
  };

  const getPreviewUrl = () => {
    if (!file || !file.path) return '';
    return `/api/upload/preview?path=${encodeURIComponent(file.path)}`;
  };

  return (
    <div className="ded-form-group">
      <label>Nota / recibo</label>
      {file ? (
        <div className="ded-upload-file">
          <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
            <IcoDoc />
            <div style={{flex: 1}}>
              <div style={{fontSize:'13px', fontWeight:600}}>{file.name}</div>
              <div style={{fontSize:'11px', color:'#16a34a'}}>Anexado com sucesso</div>
            </div>
          </div>
          <div style={{display:'flex', gap:'8px'}}>
            <button type="button" className="ded-btn-outline" style={{padding: '4px 10px', fontSize: '12px'}} onClick={() => setShowPreview(true)}>Visualizar</button>
            <button type="button" className="ded-btn-icon" onClick={() => { setFile(null); onFileUploaded(null); }}>
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      ) : (
        <label className="ded-upload-area" style={{cursor: uploading ? 'wait' : 'pointer'}}>
           <input type="file" style={{display:'none'}} onChange={handleUpload} disabled={uploading} accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" />
           <div style={{color: '#64748b', marginBottom: '8px'}}><IcoDoc /></div>
           <div style={{fontSize:'13px', fontWeight:600}}>
             {uploading ? 'Enviando arquivo...' : 'Nota fiscal / recibo'}
           </div>
           <div style={{fontSize:'12px', color: error ? '#dc2626' : '#64748b'}}>
             {error || 'Arraste o arquivo aqui ou clique para selecionar'}
           </div>
        </label>
      )}

      {showPreview && (
        <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(15,23,42,0.8)', zIndex: 9999, display:'flex', flexDirection:'column', padding: '40px'}}>
          <div style={{display:'flex', justifyContent:'space-between', marginBottom: '16px'}}>
            <h3 style={{color:'white', margin:0}}>{file.name}</h3>
            <button onClick={() => setShowPreview(false)} style={{background:'none', border:'none', color:'white', fontSize:'24px', cursor:'pointer'}}>&times;</button>
          </div>
          <iframe 
            src={getPreviewUrl()} 
            style={{flex: 1, border: 'none', background: 'white', borderRadius: '8px'}}
            title="Visualização do documento"
          />
        </div>
      )}
    </div>
  );
};

export default function DedetizacaoDrawer({ open, onClose, mode, initialTab, rowData, onSaved, todosCondominios, servicoId }) {
  const { usuario } = useAuth();
  const isEmpresa = usuario?.papel === 'empresa';
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [confirmandoCancelamento, setConfirmandoCancelamento] = useState(false);

  // Aba ativa: 'agendamento' | 'execucao'
  const [abaAtiva, setAbaAtiva] = useState('agendamento');

  // Estados Agendamento
  const [condominioId, setCondominioId] = useState('');
  const [empresaAgendada, setEmpresaAgendada] = useState('');
  const [dataAgendada, setDataAgendada] = useState('');
  const [periodoAgendado, setPeriodoAgendado] = useState('Manhã');
  const [obsAgendamento, setObsAgendamento] = useState('');

  // Estados Execução
  const [empresaExecucao, setEmpresaExecucao] = useState('');
  const [dataExecucao, setDataExecucao] = useState('');
  const [unidadesObs, setUnidadesObs] = useState('');
  const [anexoPath, setAnexoPath] = useState(null);

  useEffect(() => {
    if (open) {
      setErro('');
      setConfirmandoCancelamento(false);

      if (mode === 'novo') {
        setCondominioId(rowData ? rowData.id : '');
        setEmpresaAgendada('');
        setDataAgendada('');
        setPeriodoAgendado('Manhã');
        setObsAgendamento('');
        setAbaAtiva('agendamento');
      } else {
        // Inicialização para condomínio existente
        if (initialTab) {
          setAbaAtiva(initialTab);
        } else if (rowData?.agendamento_id || rowData?.status === 'Agendado') {
          setAbaAtiva('agendamento');
        } else {
          setAbaAtiva('execucao');
        }

        // Dados de Agendamento
        setCondominioId(rowData?.id || '');
        const dataAgendadaRaw = rowData?.raw_data_agendada || (rowData?.dataAgendada && rowData.dataAgendada !== '-' ? rowData.dataAgendada.split('/').reverse().join('-') : '');
        setDataAgendada(dataAgendadaRaw);
        setPeriodoAgendado(rowData?.agendamento_periodo || rowData?.periodoAgendado || 'Manhã');
        setEmpresaAgendada(rowData?.agendamento_empresa || (rowData?.empresa && rowData.empresa !== '-' ? rowData.empresa : ''));
        setObsAgendamento(rowData?.agendamento_observacao || '');

        // Dados de Execução
        const hoje = new Date().toISOString().split('T')[0];
        setDataExecucao(rowData?.raw_data_execucao || hoje);
        setEmpresaExecucao(rowData?.empresa && rowData.empresa !== '-' ? rowData.empresa : (rowData?.agendamento_empresa || ''));
        setUnidadesObs(rowData?.observacao || '');
        setAnexoPath(rowData?.path || null);
      }
    }
  }, [open, mode, initialTab, rowData]);

  // Salvar / Editar Agendamento
  const handleSalvarAgendamento = async () => {
    const targetCondominioId = mode === 'novo' ? condominioId : rowData?.id;
    if (!targetCondominioId) {
      setErro('Selecione o condomínio.');
      return;
    }
    if (!dataAgendada) {
      setErro('Preencha a data do agendamento.');
      return;
    }

    setSalvando(true);
    setErro('');
    try {
      if (rowData?.agendamento_id) {
        // Atualiza agendamento existente
        await api.put(`/agendamentos/${rowData.agendamento_id}`, {
          data_agendada: dataAgendada,
          periodo: periodoAgendado,
          empresa: empresaAgendada ? empresaAgendada.trim().toUpperCase() : null,
          observacao: obsAgendamento || null
        });
      } else {
        // Cria novo agendamento
        await api.post('/agendamentos', {
          condominio_id: targetCondominioId,
          servico_id: servicoId,
          data_agendada: dataAgendada,
          periodo: periodoAgendado,
          empresa: empresaAgendada ? empresaAgendada.trim().toUpperCase() : null,
          observacao: obsAgendamento || null
        });
      }
      onSaved();
    } catch (e) {
      setErro(e.message || 'Erro ao salvar agendamento');
    } finally {
      setSalvando(false);
    }
  };

  // Cancelar Agendamento
  const handleCancelarAgendamento = async () => {
    if (!rowData?.agendamento_id) {
      setErro('Nenhum agendamento ativo para cancelar.');
      return;
    }
    setSalvando(true);
    setErro('');
    try {
      await api.delete(`/agendamentos/${rowData.agendamento_id}`);
      onSaved();
    } catch (e) {
      setErro(e.message || 'Erro ao cancelar agendamento');
    } finally {
      setSalvando(false);
      setConfirmandoCancelamento(false);
    }
  };

  // Salvar / Finalizar Execução
  const handleFinalizarExecucao = async () => {
    if (!dataExecucao) {
      setErro('Preencha a data de realização do serviço.');
      return;
    }
    setSalvando(true);
    setErro('');
    try {
      const empresaFinal = empresaExecucao 
        ? empresaExecucao.trim().toUpperCase() 
        : (rowData?.empresa && rowData.empresa !== '-' ? rowData.empresa.trim().toUpperCase() : null);

      await api.put(`/condominios/${rowData.id}/servicos/${servicoId}`, {
        data: dataExecucao,
        empresa: empresaFinal,
        observacao: unidadesObs || null,
        anexo: anexoPath
      });

      if (rowData?.agendamento_id) {
        await api.put(`/agendamentos/${rowData.agendamento_id}`, { status: 'realizado' }).catch(() => {});
      }
      onSaved();
    } catch (e) {
      setErro(e.message || 'Erro ao registrar execução');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className={`ded-drawer ${open ? 'open' : ''}`}>
      <div className="ded-drawer-header">
        <div>
          <h2>{mode === 'novo' ? 'Novo Agendamento' : (rowData?.condominio || 'Gerenciar Serviço')}</h2>
          {mode !== 'novo' && rowData?.codigo && (
            <span style={{fontSize:'12px', color:'#64748b'}}>Código: {rowData.codigo}</span>
          )}
        </div>
        <button className="ded-drawer-close" onClick={onClose}>&times;</button>
      </div>

      <div className="ded-drawer-body">
        {erro && (
          <div style={{background: '#fee2e2', color: '#dc2626', padding: '12px', borderRadius: '8px', fontSize: '13px', border: '1px solid #fecaca'}}>
            {erro}
          </div>
        )}

        {/* Modo de Criação Geral de Agendamento */}
        {mode === 'novo' ? (
          <div className="ded-form-section">
            <div className="ded-section-title">
              <div className="ded-section-number" style={{background:'#2563eb'}}>1</div>
              Dados do agendamento
            </div>

            <div className="ded-form-group">
              <label>Condomínio *</label>
              <select className="ded-input" value={condominioId} onChange={e => setCondominioId(e.target.value)}>
                <option value="">Selecione um condomínio...</option>
                {todosCondominios?.map(c => (
                  <option key={c.id} value={c.id}>{c.codigo} - {c.condominio}</option>
                ))}
              </select>
            </div>

            <div className="ded-form-group">
              <label>Empresa executora</label>
              <input 
                type="text" 
                className="ded-input" 
                value={empresaAgendada} 
                onChange={e => setEmpresaAgendada(e.target.value)} 
                placeholder="Ex: DDDRIN, MARCELO, COLUMBIA..." 
              />
            </div>

            <div className="ded-form-row">
              <div className="ded-form-group">
                <label>Data agendada *</label>
                <input type="date" className="ded-input" value={dataAgendada} onChange={e => setDataAgendada(e.target.value)} />
              </div>
              <div className="ded-form-group">
                <label>Período *</label>
                <select className="ded-input" value={periodoAgendado} onChange={e => setPeriodoAgendado(e.target.value)}>
                  <option value="Manhã">Manhã</option>
                  <option value="Tarde">Tarde</option>
                  <option value="Integral">Integral</option>
                </select>
              </div>
            </div>

            <div className="ded-form-group">
              <label>Observações do agendamento</label>
              <textarea 
                className="ded-textarea" 
                value={obsAgendamento} 
                onChange={e => setObsAgendamento(e.target.value)} 
                placeholder="Instruções de portaria, unidades solicitantes, horários preferenciais..."
              />
            </div>
          </div>
        ) : (
          /* Modo de Edição por Condomínio com Subpastas/Abas */
          <>
            {/* Subpastas / Tabs */}
            <div className="ded-drawer-tabs">
              <button 
                type="button" 
                className={`ded-drawer-tab-btn ${abaAtiva === 'agendamento' ? 'active' : ''}`}
                onClick={() => setAbaAtiva('agendamento')}
              >
                <IcoCalendario />
                {rowData?.agendamento_id ? 'Editar Agendamento' : 'Agendar Visita'}
              </button>
              <button 
                type="button" 
                className={`ded-drawer-tab-btn ${abaAtiva === 'execucao' ? 'active' : ''}`}
                onClick={() => setAbaAtiva('execucao')}
              >
                <IcoCheck />
                Registrar Execução
              </button>
            </div>

            {/* ABA 1: AGENDAMENTO */}
            {abaAtiva === 'agendamento' && (
              <div className="ded-form-section">
                {rowData?.agendamento_id ? (
                  <div style={{background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:'8px', padding:'12px', fontSize:'13px', color:'#1e40af'}}>
                    <strong>📅 Agendamento Ativo:</strong> Visita marcada para <strong>{rowData.dataAgendada}</strong> ({rowData.periodoAgendado || 'Manhã'}).
                  </div>
                ) : (
                  <div style={{background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:'8px', padding:'12px', fontSize:'13px', color:'#475569'}}>
                    ℹ️ <strong>Nenhum agendamento pendente.</strong> Preencha os campos abaixo para marcar uma nova data.
                  </div>
                )}

                <div className="ded-form-group">
                  <label>Empresa Executora</label>
                  <input 
                    type="text" 
                    className="ded-input" 
                    value={empresaAgendada} 
                    onChange={e => setEmpresaAgendada(e.target.value)} 
                    placeholder="Ex: DDDRIN, MARCELO, COLUMBIA..." 
                  />
                </div>

                <div className="ded-form-row">
                  <div className="ded-form-group">
                    <label>Data Agendada *</label>
                    <input 
                      type="date" 
                      className="ded-input" 
                      value={dataAgendada} 
                      onChange={e => setDataAgendada(e.target.value)} 
                    />
                  </div>
                  <div className="ded-form-group">
                    <label>Período *</label>
                    <select className="ded-input" value={periodoAgendado} onChange={e => setPeriodoAgendado(e.target.value)}>
                      <option value="Manhã">Manhã</option>
                      <option value="Tarde">Tarde</option>
                      <option value="Integral">Integral</option>
                    </select>
                  </div>
                </div>

                <div className="ded-form-group">
                  <label>Observações do Agendamento</label>
                  <textarea 
                    className="ded-textarea" 
                    value={obsAgendamento} 
                    onChange={e => setObsAgendamento(e.target.value)} 
                    placeholder="Ex: Chave na portaria, entrar em contato com o zelador, unidades que solicitaram dedetização..."
                  />
                  <div style={{fontSize:'11px', color:'#64748b'}}>Você pode alterar a data, empresa ou observação a qualquer momento.</div>
                </div>

                {/* Confirmação de cancelamento */}
                {rowData?.agendamento_id && (
                  <div style={{marginTop:'12px', borderTop:'1px dashed #e2e8f0', paddingTop:'16px'}}>
                    {confirmandoCancelamento ? (
                      <div style={{background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'8px', padding:'14px'}}>
                        <div style={{fontWeight:600, color:'#991b1b', fontSize:'13px', marginBottom:'8px'}}>
                          Tem certeza que deseja cancelar este agendamento?
                        </div>
                        <div style={{fontSize:'12px', color:'#b91c1c', marginBottom:'12px'}}>
                          O condomínio voltará para o status anterior (Pendente/Vencido).
                        </div>
                        <div style={{display:'flex', gap:'8px'}}>
                          <button 
                            type="button" 
                            className="ded-btn-danger" 
                            style={{padding:'6px 14px', fontSize:'12px'}}
                            onClick={handleCancelarAgendamento}
                            disabled={salvando}
                          >
                            {salvando ? 'Cancelando...' : 'Sim, cancelar agendamento'}
                          </button>
                          <button 
                            type="button" 
                            className="ded-btn-outline" 
                            style={{padding:'6px 14px', fontSize:'12px'}}
                            onClick={() => setConfirmandoCancelamento(false)}
                            disabled={salvando}
                          >
                            Não, manter
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        type="button" 
                        className="ded-btn-danger" 
                        style={{width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px'}}
                        onClick={() => setConfirmandoCancelamento(true)}
                        disabled={salvando}
                      >
                        <IcoTrash /> Cancelar este agendamento
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ABA 2: REGISTRAR EXECUÇÃO */}
            {abaAtiva === 'execucao' && (
              <div className="ded-form-section">
                {rowData?.agendamento_id && (
                  <div style={{background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'8px', padding:'12px', fontSize:'13px', color:'#166534'}}>
                    ✓ <strong>Vinculado ao agendamento de {rowData.dataAgendada}.</strong> Ao finalizar a execução, o agendamento será concluído.
                  </div>
                )}

                <div className="ded-form-group">
                  <label>Empresa executora</label>
                  <input 
                    type="text" 
                    className="ded-input" 
                    value={empresaExecucao} 
                    onChange={e => setEmpresaExecucao(e.target.value)} 
                    disabled={isEmpresa}
                    placeholder="Ex: DDDRIN, MARCELO, COLUMBIA..." 
                  />
                </div>

                <div className="ded-form-group">
                  <label>Data da execução *</label>
                  <input 
                    type="date" 
                    className="ded-input" 
                    value={dataExecucao} 
                    onChange={e => setDataExecucao(e.target.value)} 
                    disabled={isEmpresa && !!rowData?.dataExecucao}
                  />
                </div>

                <div className="ded-form-group">
                  <label>Unidades atendidas / observações</label>
                  <textarea 
                    className="ded-textarea" 
                    value={unidadesObs} 
                    onChange={e => setUnidadesObs(e.target.value)} 
                    disabled={isEmpresa && !!rowData?.observacao}
                    placeholder="Ex: Aptos 101, 102, 203, áreas comuns dedetizadas..."
                  />
                  <div style={{fontSize:'11px', color:'#64748b'}}>Informe as unidades atendidas e notas sobre a execução do serviço.</div>
                </div>

                <UploadDocumento 
                  onFileUploaded={setAnexoPath} 
                  initialPath={anexoPath} 
                  codigoCondominio={rowData?.codigo || rowData?.id}
                  ano={(dataExecucao || '').split('-')[0] || new Date().getFullYear()}
                />
              </div>
            )}
          </>
        )}
      </div>

      <div className="ded-drawer-footer">
        <button className="ded-btn-outline" onClick={onClose} disabled={salvando}>Fechar</button>
        
        {mode === 'novo' ? (
          <button className="ded-btn-primary" onClick={handleSalvarAgendamento} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar Agendamento'}
          </button>
        ) : abaAtiva === 'agendamento' ? (
          <button className="ded-btn-primary" onClick={handleSalvarAgendamento} disabled={salvando}>
            {salvando ? 'Salvando...' : (rowData?.agendamento_id ? 'Salvar Alterações' : 'Criar Agendamento')}
          </button>
        ) : (
          <button className="ded-btn-primary" onClick={handleFinalizarExecucao} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Finalizar Execução'}
          </button>
        )}
      </div>
    </div>
  );
}
