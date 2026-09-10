import React, { useState } from 'react';
import { IcoDoc } from '../icons';

const UploadDocumento = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setUploading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('documento', selectedFile);

    try {
      const token = localStorage.getItem('cp_token');
      const res = await fetch('/api/upload/dedetizacao/recibo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setFile({ name: data.filename || selectedFile.name, size: selectedFile.size, path: data.caminho });
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
              <div style={{fontSize:'11px', color:'#16a34a'}}>Salvo em Z:\DEDETIZAÇÃO\...</div>
            </div>
          </div>
          <div style={{display:'flex', gap:'8px'}}>
            <button type="button" className="ded-btn-outline" style={{padding: '4px 10px', fontSize: '12px'}} onClick={() => setShowPreview(true)}>Visualizar</button>
            <button type="button" className="ded-btn-icon" onClick={() => setFile(null)}>
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

export default function DedetizacaoDrawer({ open, onClose, mode, rowData }) {
  // mode pode ser 'novo' ou 'execucao'
  
  return (
    <div className={`ded-drawer ${open ? 'open' : ''}`}>
      <div className="ded-drawer-header">
        <h2>{mode === 'novo' ? 'Novo agendamento' : 'Registrar execução'}</h2>
        <button className="ded-drawer-close" onClick={onClose}>&times;</button>
      </div>

      <div className="ded-drawer-body">
        {mode === 'novo' ? (
          <>
            <div className="ded-form-section">
              <div className="ded-section-title"><div className="ded-section-number" style={{background:'#2563eb'}}>1</div> Dados do agendamento</div>
              <div className="ded-form-group">
                <label>Condomínio *</label>
                <select className="ded-input">
                  <option>024 - Edifício Barão de Bocaina</option>
                  <option>079 - Condomínio Residencial San Rafael</option>
                </select>
              </div>
              <div className="ded-form-group">
                <label>Empresa executora *</label>
                <select className="ded-input">
                  <option>DDD RIN</option>
                </select>
              </div>
              <div className="ded-form-row">
                <div className="ded-form-group">
                  <label>Data do agendamento *</label>
                  <input type="date" className="ded-input" defaultValue="2026-12-20" />
                </div>
                <div className="ded-form-group">
                  <label>Período *</label>
                  <select className="ded-input">
                    <option>Manhã</option>
                    <option>Tarde</option>
                    <option>Integral</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="ded-form-section">
              <div className="ded-section-title" style={{fontSize:'13px'}}>Valores</div>
              <div className="ded-form-group">
                <label>Valor da área comum (R$) *</label>
                <input type="text" className="ded-input" defaultValue="450,00" />
              </div>
              <div style={{fontSize:'13px', fontWeight:600, marginTop:'8px'}}>Valores por unidade</div>
              
              <div className="ded-form-row" style={{alignItems:'center'}}>
                <span style={{fontSize:'12px', flex: 1}}>1 dormitório (R$)</span>
                <input type="text" className="ded-input" style={{flex: 1}} defaultValue="25,00" />
              </div>
              <div className="ded-form-row" style={{alignItems:'center'}}>
                <span style={{fontSize:'12px', flex: 1}}>2 dormitórios (R$)</span>
                <input type="text" className="ded-input" style={{flex: 1}} defaultValue="32,00" />
              </div>
              <div className="ded-form-row" style={{alignItems:'center'}}>
                <span style={{fontSize:'12px', flex: 1}}>Cobertura (R$)</span>
                <input type="text" className="ded-input" style={{flex: 1}} defaultValue="45,00" />
              </div>
            </div>

            <div className="ded-form-section">
              <div className="ded-form-group">
                <label>Observações</label>
                <textarea className="ded-textarea" placeholder="Informações adicionais (opcional)"></textarea>
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={{background:'#f8fafc', padding:'16px', borderRadius:'8px', border:'1px solid #e2e8f0'}}>
              <div style={{fontWeight:700, fontSize:'14px', color:'#0f172a'}}>{rowData?.condominio || 'Edifício Barão de Bocaina'}</div>
              <div style={{fontSize:'12px', color:'#64748b', marginTop:'4px'}}>Agendamento: {rowData?.dataAgendada || '20/12/2026'} — {rowData?.periodoAgendado || 'Manhã'}</div>
            </div>

            <div className="ded-form-section">
              <div className="ded-section-title"><div className="ded-section-number">2</div> Execução <span style={{fontSize:'11px', fontWeight:400, color:'#64748b'}}>(preencher após a realização)</span></div>
              
              <div className="ded-form-group">
                <label>Data da execução</label>
                <input type="date" className="ded-input" defaultValue="2026-06-24" />
              </div>

              <div className="ded-form-group">
                <label>Unidades / observações *</label>
                <textarea className="ded-textarea" defaultValue="203 A (chave na portaria), 106 B, 402 A, 05, 22 (s/ odor), 26, 28 e 32 autorizadas."></textarea>
                <div style={{fontSize:'11px', color:'#64748b'}}>Informe as unidades atendidas e observações relevantes sobre o acesso.</div>
              </div>

              <UploadDocumento />
            </div>
          </>
        )}
      </div>

      <div className="ded-drawer-footer">
        <button className="ded-btn-outline" onClick={onClose}>Cancelar</button>
        <button className="ded-btn-primary" onClick={onClose}>{mode === 'novo' ? 'Salvar agendamento' : 'Finalizar execução'}</button>
      </div>
    </div>
  );
}
