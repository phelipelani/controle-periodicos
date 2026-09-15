import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import Modal from '../components/Modal';
import { formatarData } from '../components/format';
import { IcoDoc, IcoEye, IcoCheck, IcoAlertTriangle } from '../components/icons';

const ROTULO_AG = { agendado: 'Agendado', realizado: 'Realizado', cancelado: 'Cancelado' };
const CLASSE_AG = { agendado: 'a_vencer', realizado: 'em_dia', cancelado: 'sem_registro' };
const ROTULO_PERIODO = { manha: 'Manhã', tarde: 'Tarde' };
const hojeISO = () => new Date().toISOString().slice(0, 10);

export default function Agendamentos() {
  const [lista, setLista] = useState([]);
  const [condominios, setCondominios] = useState([]);
  const [filtro, setFiltro] = useState('agendado');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [form, setForm] = useState(null); // {} novo | objeto agendamento (editar)
  const [confirmando, setConfirmando] = useState(null); // objeto agendamento a confirmar realização
  const [anexandoRecibo, setAnexandoRecibo] = useState(null); // objeto agendamento para subir recibo
  const [visualizandoRecibo, setVisualizandoRecibo] = useState(null);

  function carregar() {
    const q = filtro ? `?status=${filtro}` : '';
    api.get(`/agendamentos${q}`)
      .then(setLista)
      .catch((e) => setErro(e.message));
  }

  useEffect(carregar, [filtro]);
  useEffect(() => { 
    api.get('/condominios').then(setCondominios).catch(() => {}); 
  }, []);

  async function salvar(dados) {
    try {
      setErro('');
      if (dados.id) await api.put(`/agendamentos/${dados.id}`, dados);
      else await api.post('/agendamentos', dados);
      setForm(null);
      setSucesso('Agendamento salvo com sucesso!');
      setTimeout(() => setSucesso(''), 4000);
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function cancelar(ag) {
    if (!confirm(`Cancelar o agendamento de dedetização do condomínio ${ag.condominio_nome}?`)) return;
    try {
      setErro('');
      await api.put(`/agendamentos/${ag.id}`, { status: 'cancelado' });
      setSucesso('Agendamento cancelado com sucesso.');
      setTimeout(() => setSucesso(''), 4000);
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function confirmarRealizacao(agId, formData) {
    try {
      setErro('');
      const token = localStorage.getItem('cp_token');
      const res = await fetch(`/api/agendamentos/${agId}/confirmar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || 'Falha ao confirmar realização');

      setConfirmando(null);
      setSucesso('Realização confirmada com sucesso! O cadastro da dedetização e histórico foram atualizados.');
      setTimeout(() => setSucesso(''), 5000);
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function enviarRecibo(agId, file) {
    try {
      setErro('');
      const formData = new FormData();
      formData.append('documento', file);
      
      const token = localStorage.getItem('cp_token');
      const res = await fetch(`/api/agendamentos/${agId}/recibo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || 'Falha ao anexar recibo');

      setAnexandoRecibo(null);
      setSucesso('Recibo salvo no OneDrive e vinculado com sucesso!');
      setTimeout(() => setSucesso(''), 4000);
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  const hoje = hojeISO();
  const deHoje = lista.filter((a) => a.status === 'agendado' && a.data_agendada === hoje);
  const vencidos = lista.filter((a) => a.status === 'agendado' && a.data_agendada < hoje);

  return (
    <div>
      <div className="barra-topo">
        <div>
          <h1>Dedetização — Agendamentos</h1>
          <p className="sub" style={{ margin: 0 }}>
            Gerencie datas programadas, confirme a execução após o serviço e anexe os comprovantes no OneDrive.
          </p>
        </div>
        <button onClick={() => setForm({})}>+ Novo agendamento</button>
      </div>

      {erro && <div className="erro">{erro}</div>}
      {sucesso && (
        <div style={{ background: '#dcfce7', color: '#15803d', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '14px', border: '1px solid #bbf7d0' }}>
          {sucesso}
        </div>
      )}

      {vencidos.length > 0 && filtro === 'agendado' && (
        <div className="aviso" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
          <strong>{vencidos.length}</strong> serviço(s) com data agendada que <strong>já passou</strong>. Clique em <strong>"Confirmar Realização"</strong> na linha do agendamento para atualizar a dedetização do condomínio.
        </div>
      )}

      {deHoje.length > 0 && (
        <div className="aviso">
          <strong>{deHoje.length}</strong> dedetização(ões) agendada(s) para <strong>hoje</strong>.
        </div>
      )}

      <div className="campo" style={{ maxWidth: 220 }}>
        <label>Filtrar por situação</label>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="agendado">Agendados</option>
          <option value="realizado">Realizados</option>
          <option value="cancelado">Cancelados</option>
          <option value="">Todos</option>
        </select>
      </div>

      {lista.length === 0 ? (
        <div className="card vazio">Nenhum agendamento nesta situação.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Condomínio</th>
              <th>Data agendada</th>
              <th>Período</th>
              <th>Empresa</th>
              <th>Situação</th>
              <th>Comprovante / Recibo</th>
              <th>Apartamentos / observação</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((a) => {
              const ehHoje = a.status === 'agendado' && a.data_agendada === hoje;
              const passouData = a.status === 'agendado' && a.data_agendada < hoje;
              const temRecibo = !!a.recibo_anexo;

              return (
                <tr key={a.id} className={ehHoje ? 'hoje' : (passouData ? 'vencido' : undefined)}>
                  <td>
                    <Link to={`/condominios/${a.condominio_id}`}>
                      <strong>{a.condominio_nome}</strong>
                    </Link>
                  </td>
                  <td>
                    <strong>{formatarData(a.data_agendada)}</strong>
                    {ehHoje && <span className="tag-hoje" style={{ marginLeft: '6px' }}>HOJE</span>}
                    {passouData && (
                      <span 
                        style={{ 
                          marginLeft: '6px', 
                          padding: '2px 6px', 
                          borderRadius: '4px', 
                          fontSize: '10px', 
                          fontWeight: 700, 
                          background: '#fee2e2', 
                          color: '#dc2626' 
                        }}
                      >
                        PENDENTE CONFIRMAÇÃO
                      </span>
                    )}
                  </td>
                  <td>{ROTULO_PERIODO[a.periodo] || '—'}</td>
                  <td>{a.empresa || '—'}</td>
                  <td>
                    <span className={`badge ${CLASSE_AG[a.status]}`}>{ROTULO_AG[a.status]}</span>
                  </td>
                  <td>
                    {a.status === 'realizado' ? (
                      temRecibo ? (
                        <button
                          type="button"
                          className="ded-nota ok"
                          style={{ cursor: 'pointer', border: 'none', background: '#dcfce7', color: '#15803d', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => setVisualizandoRecibo(a.recibo_anexo)}
                          title="Clique para visualizar o recibo"
                        >
                          <IcoDoc width={14} height={14} /> Recibo Anexado
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="ded-nota nok"
                          style={{ cursor: 'pointer', border: '1px dashed #d97706', background: '#fef3c7', color: '#b45309', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => setAnexandoRecibo(a)}
                          title="Clique para anexar o recibo no OneDrive"
                        >
                          <IcoAlertTriangle width={14} height={14} /> + Anexar Recibo
                        </button>
                      )
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '12px' }}>Aguardando realização</span>
                    )}
                  </td>
                  <td style={{ color: 'var(--muted)', maxWidth: 220 }}>{a.observacao || '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      {a.status === 'agendado' && (
                        <>
                          {passouData && (
                            <button 
                              className="primario" 
                              style={{ background: '#16a34a', borderColor: '#16a34a', color: '#ffffff', fontWeight: 700, padding: '5px 10px', fontSize: '12px' }}
                              onClick={() => setConfirmando(a)}
                              title="Confirmar que o serviço foi realizado na data agendada"
                            >
                              ✓ Confirmar Realização
                            </button>
                          )}
                          <button className="secundario" style={{ padding: '5px 10px', fontSize: '12px' }} onClick={() => setForm(a)}>
                            Editar
                          </button>
                          <button className="perigo" style={{ padding: '5px 10px', fontSize: '12px' }} onClick={() => cancelar(a)}>
                            Cancelar
                          </button>
                        </>
                      )}

                      {a.status === 'realizado' && !temRecibo && (
                        <button 
                          className="secundario" 
                          style={{ padding: '5px 10px', fontSize: '12px' }}
                          onClick={() => setAnexandoRecibo(a)}
                        >
                          Anexar Recibo
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Modal Novo / Editar Agendamento */}
      {form && (
        <FormAgendamento agendamento={form} condominios={condominios} onSalvar={salvar} onFechar={() => setForm(null)} />
      )}

      {/* Modal Confirmar Realização */}
      {confirmando && (
        <ModalConfirmacaoRealizacao
          agendamento={confirmando}
          onConfirmar={confirmarRealizacao}
          onFechar={() => setConfirmando(null)}
        />
      )}

      {/* Modal Anexar Recibo */}
      {anexandoRecibo && (
        <ModalUploadRecibo
          agendamento={anexandoRecibo}
          onUpload={enviarRecibo}
          onFechar={() => setAnexandoRecibo(null)}
        />
      )}

      {/* Modal Preview Recibo */}
      {visualizandoRecibo && (
        <div 
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.85)', zIndex: 9999, display: 'flex', flexDirection: 'column', padding: '30px' }}
          onClick={() => setVisualizandoRecibo(null)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ color: '#ffffff', margin: 0, fontSize: '18px' }}>
              Visualização do Recibo de Dedetização
            </h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <a 
                href={`/api/upload/download?path=${encodeURIComponent(visualizandoRecibo)}`} 
                className="btn-secundario"
                style={{ background: '#ffffff', color: '#0f172a', padding: '6px 12px', borderRadius: '6px', textDecoration: 'none', fontWeight: 600, fontSize: '13px' }}
                download
                onClick={(e) => e.stopPropagation()}
              >
                Baixar Arquivo
              </a>
              <button 
                onClick={() => setVisualizandoRecibo(null)} 
                style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '24px', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>
          </div>
          <iframe 
            src={`/api/upload/preview?path=${encodeURIComponent(visualizandoRecibo)}`} 
            style={{ width: '100%', height: '100%', border: 'none', borderRadius: '10px', background: '#ffffff' }}
            title="Preview Recibo"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

function FormAgendamento({ agendamento, condominios, onSalvar, onFechar }) {
  const editando = !!agendamento.id;
  const [form, setForm] = useState({
    id: agendamento.id,
    condominio_id: agendamento.condominio_id || '',
    data_agendada: agendamento.data_agendada || '',
    periodo: agendamento.periodo || '',
    empresa: agendamento.empresa || '',
    observacao: agendamento.observacao || '',
  });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const valido = form.condominio_id && form.data_agendada;

  return (
    <Modal titulo={editando ? 'Editar agendamento' : 'Novo agendamento de dedetização'} onFechar={onFechar}>
      <div className="campo">
        <label>Condomínio *</label>
        {editando ? (
          <input value={agendamento.condominio_nome} disabled />
        ) : (
          <select value={form.condominio_id} onChange={set('condominio_id')} autoFocus>
            <option value="">Selecione…</option>
            {condominios.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        )}
      </div>
      <div className="linha">
        <div className="campo">
          <label>Data agendada *</label>
          <input type="date" value={form.data_agendada} onChange={set('data_agendada')} />
        </div>
        <div className="campo">
          <label>Período</label>
          <select value={form.periodo} onChange={set('periodo')}>
            <option value="">Não definido</option>
            <option value="manha">Manhã</option>
            <option value="tarde">Tarde</option>
          </select>
        </div>
      </div>
      <div className="campo">
        <label>Empresa responsável</label>
        <input value={form.empresa} onChange={set('empresa')} placeholder="Empresa que fará a dedetização" />
      </div>
      <div className="campo">
        <label>Apartamentos que aderiram / observação</label>
        <textarea rows={3} value={form.observacao} onChange={set('observacao')} placeholder="Ex.: aptos 11, 22, 33…" />
      </div>
      <div className="modal-acoes">
        <button className="secundario" onClick={onFechar}>Cancelar</button>
        <button onClick={() => onSalvar(form)} disabled={!valido}>Salvar</button>
      </div>
    </Modal>
  );
}

function ModalConfirmacaoRealizacao({ agendamento, onConfirmar, onFechar }) {
  const [dataRealizacao, setDataRealizacao] = useState(agendamento.data_agendada || hojeISO());
  const [empresa, setEmpresa] = useState(agendamento.empresa || '');
  const [observacao, setObservacao] = useState(agendamento.observacao || '');
  const [arquivo, setArquivo] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSalvando(true);
    const formData = new FormData();
    formData.append('data_realizacao', dataRealizacao);
    formData.append('empresa', empresa);
    formData.append('observacao', observacao);
    formData.append('ano', (dataRealizacao || '').split('-')[0] || new Date().getFullYear());
    formData.append('codigo_condominio', agendamento.codigo_condominio || agendamento.condominio_id);
    if (arquivo) {
      formData.append('documento', arquivo);
    }
    await onConfirmar(agendamento.id, formData);
    setSalvando(false);
  };

  return (
    <Modal titulo="Confirmar Realização da Dedetização" onFechar={onFechar} largura="500px">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Condomínio</div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
            {agendamento.condominio_nome}
          </div>
        </div>

        <div className="campo">
          <label>Data Efetiva da Realização *</label>
          <input 
            type="date" 
            value={dataRealizacao} 
            onChange={(e) => setDataRealizacao(e.target.value)} 
            required 
          />
          <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            Atualizará a data de última execução na tela de Dedetização e calculará o próximo vencimento (+6 meses).
          </span>
        </div>

        <div className="campo">
          <label>Empresa Executora</label>
          <input 
            type="text" 
            value={empresa} 
            onChange={(e) => setEmpresa(e.target.value)} 
            placeholder="Nome da empresa prestadora" 
          />
        </div>

        <div className="campo">
          <label>Apartamentos / Observações</label>
          <textarea 
            rows={2} 
            value={observacao} 
            onChange={(e) => setObservacao(e.target.value)} 
            placeholder="Ex.: Realizado nas áreas comuns e 24 apartamentos..." 
          />
        </div>

        <div className="campo">
          <label>Recibo / Certificado (Opcional)</label>
          <input 
            type="file" 
            accept=".pdf,.png,.jpg,.jpeg" 
            onChange={(e) => setArquivo(e.target.files[0])} 
          />
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            Será salvo automaticamente no OneDrive do condomínio em <code>CONDOMÍNIOS/DEDETIZAÇÃO/[ano]/[codigo]</code>. Se preferir, a empresa pode anexar depois.
          </span>
        </div>

        <div className="modal-acoes" style={{ marginTop: '10px' }}>
          <button type="button" className="secundario" onClick={onFechar} disabled={salvando}>
            Cancelar
          </button>
          <button 
            type="submit" 
            style={{ background: '#16a34a', color: '#ffffff', border: 'none', fontWeight: 700 }}
            disabled={salvando || !dataRealizacao}
          >
            {salvando ? 'Confirmando…' : 'Confirmar Execução'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ModalUploadRecibo({ agendamento, onUpload, onFechar }) {
  const [arquivo, setArquivo] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!arquivo) return;
    setEnviando(true);
    await onUpload(agendamento.id, arquivo);
    setEnviando(false);
  };

  return (
    <Modal titulo="Anexar Recibo de Dedetização" onFechar={onFechar} largura="460px">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Condomínio</div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
            {agendamento.condominio_nome}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            Data do serviço: <strong>{formatarData(agendamento.data_agendada)}</strong>
          </div>
        </div>

        <div className="campo">
          <label>Selecione o arquivo do Recibo / Comprovante (PDF ou Imagem) *</label>
          <input 
            type="file" 
            accept=".pdf,.png,.jpg,.jpeg" 
            onChange={(e) => setArquivo(e.target.files[0])} 
            required 
          />
          <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            O arquivo será salvo na nuvem do OneDrive em <code>CONDOMÍNIOS/DEDETIZAÇÃO/[ano]/[codigo]</code>.
          </span>
        </div>

        <div className="modal-acoes" style={{ marginTop: '10px' }}>
          <button type="button" className="secundario" onClick={onFechar} disabled={enviando}>
            Cancelar
          </button>
          <button 
            type="submit" 
            style={{ background: '#d4202a', color: '#ffffff', border: 'none', fontWeight: 700 }}
            disabled={enviando || !arquivo}
          >
            {enviando ? 'Enviando ao OneDrive…' : 'Salvar Recibo'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

