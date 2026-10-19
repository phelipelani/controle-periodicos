import React, { useState, useEffect } from 'react';
import Modal from '../Modal';
import { IcoDoc, IcoTrash } from '../icons';
import { api } from '../../api';

export default function DedetizacaoModalVisualizar({ item, onFechar, onReciboExcluido, onGerenciarAdesoes }) {
  const [excluindo, setExcluindo] = useState(false);
  const [historicoAgendamentos, setHistoricoAgendamentos] = useState([]);
  const [carregandoAdesoes, setCarregandoAdesoes] = useState(false);

  useEffect(() => {
    if (item && (item.condominio_id || item.id)) {
      const condId = item.condominio_id || item.id;
      setCarregandoAdesoes(true);
      api.get(`/agendamentos/condominio/${condId}/historico-adesoes`)
        .then((res) => {
          setHistoricoAgendamentos(res?.agendamentos || []);
        })
        .catch(() => {
          setHistoricoAgendamentos([]);
        })
        .finally(() => setCarregandoAdesoes(false));
    }
  }, [item]);

  if (!item) return null;

  const previewUrl = item.path
    ? `/api/upload/preview?path=${encodeURIComponent(item.path)}`
    : null;

  const handleExcluirRecibo = async () => {
    if (!item.path) return;
    if (!window.confirm('Deseja realmente excluir este recibo? O arquivo será apagado permanentemente da pasta no OneDrive.')) {
      return;
    }

    setExcluindo(true);
    try {
      const token = localStorage.getItem('cp_token');
      const res = await fetch(`/api/upload/arquivo?path=${encodeURIComponent(item.path)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || 'Falha ao excluir recibo');

      if (onReciboExcluido) onReciboExcluido();
      onFechar();
    } catch (err) {
      alert('Erro ao excluir recibo: ' + err.message);
    } finally {
      setExcluindo(false);
    }
  };

  // Lista de adesões da execução/agendamento atual ou do histórico mais recente
  const ultimoAg = historicoAgendamentos[0] || null;
  const adesoesAtuais = ultimoAg?.adesoes || item.adesoes || [];
  const dataAgendadaExibicao = (item.dataAgendada && item.dataAgendada !== '-')
    ? item.dataAgendada
    : (ultimoAg?.data_agendada ? ultimoAg.data_agendada.split('-').reverse().join('/') : '—');
  const periodoExibicao = item.periodoAgendado || ultimoAg?.periodo || '—';

  return (
    <Modal titulo={`Dedetização — ${item.codigo} - ${item.condominio}`} largura="740px" onFechar={onFechar}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '8px 0 4px' }}>
        
        {/* DADOS DO CONDOMÍNIO */}
        <div style={{ background: '#f8fafc', padding: '18px 20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
            Condomínio
          </div>
          <div style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
            {item.codigo} — {item.condominio}
          </div>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Empresa prestadora:</span>
            <strong style={{ color: '#0f172a' }}>{item.empresa || 'Não informada'}</strong>
          </div>
        </div>

        {/* DATAS E STATUS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ background: '#ffffff', padding: '16px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              Agendamento
            </div>
            <div style={{ fontSize: '14px', color: '#334155', marginBottom: '4px' }}>
              Data: <strong>{dataAgendadaExibicao}</strong>
            </div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>
              Período: <strong>{periodoExibicao}</strong>
            </div>
          </div>

          <div style={{ background: '#ffffff', padding: '16px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              Execução & Validade
            </div>
            <div style={{ fontSize: '14px', color: '#334155', marginBottom: '4px' }}>
              Data de execução: <strong style={{ color: item.dataExecucao ? '#0f172a' : '#d97706' }}>{item.dataExecucao || 'Pendente'}</strong>
            </div>
            <div style={{ fontSize: '13px', color: '#334155', marginBottom: '4px' }}>
              Serviço: <strong style={{ color: '#0f172a' }}>{item.servicoExecutado || 'Dedetização'}</strong>
            </div>
            <div style={{ fontSize: '13px', color: '#16a34a', fontWeight: 600 }}>
              Validade: {item.validade ? `${item.validade} (6 meses)` : 'Prevista'}
            </div>
          </div>
        </div>

        {/* OBSERVAÇÕES / UNIDADES */}
        {item.observacao && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
              Unidades / Observações
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', fontSize: '13px', color: '#334155', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {item.observacao}
            </div>
          </div>
        )}

        {/* HISTÓRICO DE UNIDADES QUE ADERIRAM */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🏢 Histórico de Unidades que Aderiram</span>
              <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700 }}>
                {adesoesAtuais.length} {adesoesAtuais.length === 1 ? 'unidade' : 'unidades'}
              </span>
            </div>
            {onGerenciarAdesoes && (
              <button
                type="button"
                onClick={() => {
                  onFechar();
                  onGerenciarAdesoes(item, ultimoAg);
                }}
                style={{
                  background: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                ➕ Adicionar / Editar Unidades
              </button>
            )}
          </div>

          {carregandoAdesoes ? (
            <div style={{ padding: '16px', textAlign: 'center', fontSize: '13px', color: '#64748b', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              Carregando unidades aderidas...
            </div>
          ) : historicoAgendamentos.some(ag => ag.adesoes && ag.adesoes.length > 0) ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {historicoAgendamentos.filter(ag => ag.adesoes && ag.adesoes.length > 0).map((ag) => {
                const dataBr = ag.data_agendada ? ag.data_agendada.split('-').reverse().join('/') : '—';
                const totalValor = (ag.adesoes || []).reduce((acc, u) => acc + (Number(u.valor) || 0), 0);
                return (
                  <div key={ag.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ background: '#f8fafc', padding: '10px 14px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                      <div>
                        <strong style={{ color: '#0f172a' }}>Data: {dataBr}</strong>
                        {ag.empresa ? <span style={{ color: '#64748b', marginLeft: '8px' }}>• Empresa: {ag.empresa}</span> : null}
                      </div>
                      <div style={{ fontWeight: 700, color: '#0f766e' }}>
                        {ag.adesoes.length} {ag.adesoes.length === 1 ? 'unidade' : 'unidades'} • Total: R$ {totalValor.toFixed(2).replace('.', ',')}
                      </div>
                    </div>
                    <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left' }}>
                            <th style={{ padding: '8px 12px', fontWeight: 700 }}>Unidade</th>
                            <th style={{ padding: '8px 12px', fontWeight: 700 }}>Morador / Responsável</th>
                            <th style={{ padding: '8px 12px', fontWeight: 700 }}>Categoria / Método</th>
                            <th style={{ padding: '8px 12px', fontWeight: 700 }}>Valor</th>
                            <th style={{ padding: '8px 12px', fontWeight: 700, textAlign: 'center' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ag.adesoes.map((u) => (
                            <tr key={u.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0369a1' }}>
                                Apto {u.unidade} {u.bloco ? `(${u.bloco})` : ''}
                              </td>
                              <td style={{ padding: '8px 12px', color: '#1e293b' }}>
                                <div>{u.nome_morador}</div>
                                {u.observacoes && (
                                  <div style={{ fontSize: '11px', color: '#92400e' }}>Obs: {u.observacoes}</div>
                                )}
                              </td>
                              <td style={{ padding: '8px 12px', color: '#64748b' }}>
                                {u.tipo_unidade || 'Padrão'} • {u.metodo || 'Pulverização'}
                              </td>
                              <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0f172a' }}>
                                R$ {Number(u.valor || 0).toFixed(2).replace('.', ',')}
                              </td>
                              <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                {u.executado ? (
                                  <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                                    ✓ Realizado
                                  </span>
                                ) : (
                                  <span style={{ background: '#fef3c7', color: '#d97706', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                                    Aderiu
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '10px', padding: '14px 16px', fontSize: '13px', color: '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span>Nenhuma unidade registrada na lista de adesões para este condomínio.</span>
              {onGerenciarAdesoes && (
                <button
                  type="button"
                  onClick={() => {
                    onFechar();
                    onGerenciarAdesoes(item, ultimoAg);
                  }}
                  style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '6px', padding: '5px 10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  + Registrar unidades que aderiram na hora
                </button>
              )}
            </div>
          )}
        </div>

        {/* DOCUMENTAÇÃO */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
            Nota Fiscal / Recibo
          </div>
          {previewUrl ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '10px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, color: '#0f172a', textDecoration: 'none', transition: 'background 0.2s' }}
              >
                <IcoDoc /> Visualizar recibo / nota fiscal &rarr;
              </a>
              <button
                type="button"
                onClick={handleExcluirRecibo}
                disabled={excluindo}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fee2e2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: excluindo ? 'wait' : 'pointer' }}
                title="Excluir o arquivo permanentemente da pasta do condomínio"
              >
                <IcoTrash /> {excluindo ? 'Excluindo...' : 'Excluir da pasta'}
              </button>
            </div>
          ) : (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: '#b45309', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚠️ Nenhum recibo anexado para este condomínio.
            </div>
          )}
        </div>
      </div>

      <div className="modal-acoes" style={{ marginTop: '24px' }}>
        <button type="button" className="secundario" onClick={onFechar} disabled={excluindo}>
          Fechar
        </button>
      </div>
    </Modal>
  );
}
