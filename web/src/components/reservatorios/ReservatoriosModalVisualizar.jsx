import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import {
  IcoCheck,
  IcoRelogio,
  IcoVencido,
  IcoDoc,
  IcoEdit,
  IcoAlertTriangle
} from '../icons';

function formatarData(dataStr) {
  if (!dataStr) return '—';
  const parts = dataStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dataStr;
}

function formatarCapacidade(litros) {
  if (litros === null || litros === undefined || litros === '') return '—';
  const num = Number(litros);
  if (isNaN(num)) return '—';
  return `${num.toLocaleString('pt-BR')} Litros`;
}

function renderBadge(status, diasRestantes) {
  switch (status) {
    case 'em_dia':
      return (
        <span className="res-badge em_dia">
          <IcoCheck /> Em dia
        </span>
      );
    case 'a_vencer':
      return (
        <span className="res-badge a_vencer">
          <IcoRelogio /> A vencer {diasRestantes != null ? `(${diasRestantes}d)` : ''}
        </span>
      );
    case 'vencido':
      return (
        <span className="res-badge vencido">
          <IcoVencido /> Vencido {diasRestantes != null ? `(${Math.abs(diasRestantes)}d)` : ''}
        </span>
      );
    default:
      return (
        <span className="res-badge sem_registro">
          <IcoAlertTriangle /> Sem registro
        </span>
      );
  }
}

export default function ReservatoriosModalVisualizar({
  item,
  onFechar,
  onEditar
}) {
  const [historico, setHistorico] = useState([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);

  useEffect(() => {
    if (item && item.id) {
      setCarregandoHistorico(true);
      api.get(`/condominios/${item.id}`)
        .then((res) => {
          const serv = (res.servicos || []).find((s) => s.chave === 'reservatorio');
          if (serv && serv.historico) {
            setHistorico(serv.historico);
          } else {
            setHistorico([]);
          }
        })
        .catch(() => setHistorico([]))
        .finally(() => setCarregandoHistorico(false));
    }
  }, [item]);

  if (!item) return null;

  return (
    <div className="res-modal-backdrop" onClick={onFechar}>
      <div className="res-modal" onClick={(e) => e.stopPropagation()}>
        <div className="res-modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="res-code-badge">{item.codigo}</span>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>{item.condominio}</h2>
            </div>
            {item.endereco && (
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                {item.endereco}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {renderBadge(item.status, item.diasRestantes)}
            <button type="button" className="res-drawer-close" onClick={onFechar}>
              &times;
            </button>
          </div>
        </div>

        <div className="res-modal-body">
          <div className="res-modal-grid">
            <div className="res-modal-item">
              <label>Gerente Responsável</label>
              <span>{item.gerente}</span>
            </div>
            <div className="res-modal-item">
              <label>Capacidade Total</label>
              <span style={{ color: '#0284c7' }}>
                {formatarCapacidade(item.capacidadeLitros)}
              </span>
            </div>
            <div className="res-modal-item">
              <label>Última Limpeza</label>
              <span>{formatarData(item.dataUltimaLimpeza)}</span>
            </div>
            <div className="res-modal-item">
              <label>Próximo Vencimento</label>
              <span style={{ color: item.status === 'vencido' ? '#dc2626' : '#0f172a' }}>
                {formatarData(item.dataProximoVencimento)}
              </span>
            </div>
          </div>

          {item.observacoes && (
            <div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Observações
              </h4>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', fontSize: '13px', color: '#334155', whiteSpace: 'pre-wrap' }}>
                {item.observacoes}
              </div>
            </div>
          )}

          {item.anexo && (
            <div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Documentação & Laudo
              </h4>
              <a
                href={`/api/upload/preview?path=${encodeURIComponent(item.anexo)}`}
                target="_blank"
                rel="noreferrer"
                className="res-file-card"
                style={{ textDecoration: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0284c7', fontWeight: 600 }}>
                  <IcoDoc />
                  <span>Visualizar laudo / recibo anexado</span>
                </div>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Abrir documento ↗</span>
              </a>
            </div>
          )}

          <div>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Histórico de Limpezas Anteriores
            </h4>
            {carregandoHistorico ? (
              <div style={{ fontSize: '13px', color: '#64748b' }}>Carregando histórico...</div>
            ) : historico.length === 0 ? (
              <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>
                Nenhum histórico anterior registrado para este condomínio.
              </div>
            ) : (
              <div className="res-timeline">
                {historico.map((h, i) => (
                  <div key={i} className="res-timeline-item">
                    <div className="res-timeline-dot" />
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                      {formatarData(h.data_realizacao)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {h.empresa ? `Empresa: ${h.empresa} • ` : ''}
                      {h.usuario_nome ? `Registrado por: ${h.usuario_nome}` : ''}
                    </div>
                    {h.observacao && (
                      <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                        {h.observacao}
                      </div>
                    )}
                    {h.anexo && (
                      <a
                        href={`/api/upload/preview?path=${encodeURIComponent(h.anexo)}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: '11px', color: '#0284c7', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}
                      >
                        <IcoDoc /> Ver anexo
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="res-modal-footer">
          <button type="button" className="res-btn-cancel" onClick={onFechar}>
            Fechar
          </button>
          <button
            type="button"
            className="res-btn-primary"
            onClick={() => {
              onFechar();
              onEditar(item);
            }}
          >
            <IcoEdit /> Editar registro
          </button>
        </div>
      </div>
    </div>
  );
}
