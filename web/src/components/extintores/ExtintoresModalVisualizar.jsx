import React from 'react';
import Modal from '../Modal';
import { IcoDoc, IcoEye } from '../icons';

export default function ExtintoresModalVisualizar({ item, onFechar }) {
  if (!item) return null;

  const formatarData = (d) => {
    if (!d) return 'Não informado';
    const [y, m, dia] = d.split('-');
    return `${dia}/${m}/${y}`;
  };

  const previewUrl = item.anexo
    ? `/api/upload/preview?path=${encodeURIComponent(item.anexo)}`
    : null;

  return (
    <Modal titulo={`Extintores — ${item.codigo} - ${item.condominio}`} onFechar={onFechar}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '4px 0' }}>
        
        {/* DADOS DO CONDOMÍNIO */}
        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
            Dados do Condomínio
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
            {item.codigo} — {item.condominio}
          </div>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
            📍 {item.endereco || 'Endereço não informado'}
          </div>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
            👤 Gerente responsável: <strong style={{ color: '#0f172a' }}>{item.gerente}</strong>
          </div>
        </div>

        {/* RECARGA E TESTE HIDROSTÁTICO */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div style={{ background: '#ffffff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
              Recarga & Vencimento
            </div>
            <div style={{ fontSize: '13px', color: '#334155', marginBottom: '4px' }}>
              Última recarga: <strong>{formatarData(item.dataUltimaRecarga)}</strong>
            </div>
            <div style={{ fontSize: '13px', color: '#334155' }}>
              Próximo vencimento: <strong style={{ color: item.status === 'vencido' ? '#dc2626' : '#16a34a' }}>{formatarData(item.dataProximoVencimento)}</strong>
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
              Periodicidade padrão: 12 meses
            </div>
          </div>

          <div style={{ background: '#ffffff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
              Teste Hidrostático
            </div>
            <div style={{ fontSize: '13px', color: '#334155', marginBottom: '4px' }}>
              Último teste: <strong>{formatarData(item.dataUltimoTesteHidrostatico)}</strong>
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
              Revisão técnica qüinqüenal (a cada 5 anos)
            </div>
          </div>
        </div>

        {/* EXTINTORES DO CONDOMÍNIO */}
        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Inventário de Extintores
            </span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '4px 10px', borderRadius: '6px' }}>
              Total: {item.totalExtintores} extintores
            </span>
          </div>

          {item.tipos && item.tipos.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
              {item.tipos.map((t, idx) => (
                <div key={idx} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#334155', fontWeight: 500 }}>{t.tipo}</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{t.quantidade}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>
              Nenhum tipo detalhado cadastrado.
            </div>
          )}
        </div>

        {/* OBSERVAÇÕES */}
        {item.observacoes && (
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
              Observações Técnicas
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', fontSize: '13px', color: '#334155', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {item.observacoes}
            </div>
          </div>
        )}

        {/* DOCUMENTAÇÃO */}
        {previewUrl && (
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
              Documentação Anexada
            </div>
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#ffffff', border: '1px solid #cbd5e1', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#0f172a', textDecoration: 'none' }}
            >
              <IcoDoc /> Ver certificado / laudo anexado &rarr;
            </a>
          </div>
        )}
      </div>

      <div className="modal-acoes" style={{ marginTop: '20px' }}>
        <button type="button" className="secundario" onClick={onFechar}>
          Fechar
        </button>
      </div>
    </Modal>
  );
}
