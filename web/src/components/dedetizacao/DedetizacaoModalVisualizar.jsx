import React, { useState } from 'react';
import Modal from '../Modal';
import { IcoDoc, IcoTrash } from '../icons';

export default function DedetizacaoModalVisualizar({ item, onFechar, onReciboExcluido }) {
  const [excluindo, setExcluindo] = useState(false);
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

  return (
    <Modal titulo={`Dedetização — ${item.codigo} - ${item.condominio}`} largura="680px" onFechar={onFechar}>
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
              Data: <strong>{item.dataAgendada || '—'}</strong>
            </div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>
              Período: <strong>{item.periodoAgendado || '—'}</strong>
            </div>
          </div>

          <div style={{ background: '#ffffff', padding: '16px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              Execução & Validade
            </div>
            <div style={{ fontSize: '14px', color: '#334155', marginBottom: '4px' }}>
              Data de execução: <strong style={{ color: item.dataExecucao ? '#0f172a' : '#d97706' }}>{item.dataExecucao || 'Pendente'}</strong>
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
