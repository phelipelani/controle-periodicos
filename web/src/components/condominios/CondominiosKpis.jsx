import React from 'react';
import { IcoCondominio, IcoCheckCircle, IcoAlert, IcoAlertTriangle } from '../icons';
import AnimatedNumber from '../AnimatedNumber';

export default function CondominiosKpis({ stats = {}, filtroStatus = 'Todos', onFilterStatus }) {
  const {
    total = 0,
    emDia = 0,
    pctEmDia = 0,
    emAtencao = 0,
    pctAtencao = 0,
    comPendencias = 0,
    pctPendencias = 0,
    gerenteAtivo
  } = stats;

  const getSubText = (pct, baseText) => {
    if (gerenteAtivo) {
      return `${pct}% de ${gerenteAtivo}`;
    }
    return baseText;
  };

  return (
    <div className="ded-kpis">
      {/* TOTAL */}
      <div
        className={`ded-kpi-card ${filtroStatus === 'Todos' ? 'active' : ''}`}
        onClick={() => onFilterStatus('Todos')}
        style={{ borderTop: '4px solid #3b82f6', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}
        title="Clique para ver todos os condomínios no filtro"
      >
        <div className="ded-kpi-top">
          <div className="ded-kpi-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}>
            <IcoCondominio />
          </div>
          <div className="ded-kpi-info">
            <span className="ded-kpi-label">Condomínios</span>
            <span className="ded-kpi-value">
              <AnimatedNumber value={total} />
            </span>
          </div>
        </div>
        <div className="ded-kpi-desc">
          {gerenteAtivo ? `Gerente: ${gerenteAtivo}` : 'Total monitorados'}
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, height: '3px', width: total > 0 ? '100%' : '0%', background: '#3b82f6', transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }} />
      </div>

      {/* EM DIA */}
      <div
        className={`ded-kpi-card ${filtroStatus === 'em_dia' ? 'active' : ''}`}
        onClick={() => onFilterStatus('em_dia')}
        style={{ borderTop: '4px solid #16a34a', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}
        title="Clique para filtrar apenas condomínios em dia"
      >
        <div className="ded-kpi-top">
          <div className="ded-kpi-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
            <IcoCheckCircle />
          </div>
          <div className="ded-kpi-info">
            <span className="ded-kpi-label">Em dia</span>
            <span className="ded-kpi-value" style={{ color: '#16a34a' }}>
              <AnimatedNumber value={emDia} />
            </span>
          </div>
        </div>
        <div className="ded-kpi-desc">
          {getSubText(pctEmDia, `${pctEmDia}% do total`)}
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, height: '3px', width: `${pctEmDia}%`, background: '#16a34a', transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }} />
      </div>

      {/* EM ATENÇÃO */}
      <div
        className={`ded-kpi-card ${filtroStatus === 'a_vencer' ? 'active' : ''}`}
        onClick={() => onFilterStatus('a_vencer')}
        style={{ borderTop: '4px solid #d97706', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}
        title="Clique para filtrar condomínios em atenção"
      >
        <div className="ded-kpi-top">
          <div className="ded-kpi-icon" style={{ background: '#fffbeb', color: '#d97706' }}>
            <IcoAlert />
          </div>
          <div className="ded-kpi-info">
            <span className="ded-kpi-label">Em atenção</span>
            <span className="ded-kpi-value" style={{ color: '#d97706' }}>
              <AnimatedNumber value={emAtencao} />
            </span>
          </div>
        </div>
        <div className="ded-kpi-desc">
          {getSubText(pctAtencao, `${pctAtencao}% do total`)}
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, height: '3px', width: `${pctAtencao}%`, background: '#d97706', transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }} />
      </div>

      {/* COM PENDÊNCIAS */}
      <div
        className={`ded-kpi-card ${filtroStatus === 'vencido' ? 'active' : ''}`}
        onClick={() => onFilterStatus('vencido')}
        style={{ borderTop: '4px solid #dc2626', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}
        title="Clique para filtrar condomínios com pendências"
      >
        <div className="ded-kpi-top">
          <div className="ded-kpi-icon" style={{ background: '#fef2f2', color: '#dc2626' }}>
            <IcoAlertTriangle />
          </div>
          <div className="ded-kpi-info">
            <span className="ded-kpi-label">Com pendências</span>
            <span className="ded-kpi-value" style={{ color: '#dc2626' }}>
              <AnimatedNumber value={comPendencias} />
            </span>
          </div>
        </div>
        <div className="ded-kpi-desc">
          {getSubText(pctPendencias, `${pctPendencias}% do total`)}
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, height: '3px', width: `${pctPendencias}%`, background: '#dc2626', transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }} />
      </div>
    </div>
  );
}
