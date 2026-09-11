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
        style={{ borderTop: '4px solid #3B82F6', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}
        title="Clique para ver todos os condomínios no filtro"
      >
        <div className="ded-kpi-top">
          <div className="ded-kpi-icon" style={{ background: '#20395A', color: '#60A5FA' }}>
            <IcoCondominio />
          </div>
          <div className="ded-kpi-info">
            <span className="ded-kpi-label">Condomínios</span>
            <span className="ded-kpi-value" style={{ color: '#F1F5F9' }}>
              <AnimatedNumber value={total} />
            </span>
          </div>
        </div>
        <div className="ded-kpi-desc">
          {gerenteAtivo ? `Gerente: ${gerenteAtivo}` : 'Total monitorados'}
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, height: '3px', width: total > 0 ? '100%' : '0%', background: '#3B82F6', transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }} />
      </div>

      {/* EM DIA */}
      <div
        className={`ded-kpi-card ${filtroStatus === 'em_dia' ? 'active' : ''}`}
        onClick={() => onFilterStatus('em_dia')}
        style={{ borderTop: '4px solid #22C55E', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}
        title="Clique para filtrar apenas condomínios em dia"
      >
        <div className="ded-kpi-top">
          <div className="ded-kpi-icon" style={{ background: '#123222', color: '#22C55E' }}>
            <IcoCheckCircle />
          </div>
          <div className="ded-kpi-info">
            <span className="ded-kpi-label">Em dia</span>
            <span className="ded-kpi-value" style={{ color: '#F1F5F9' }}>
              <AnimatedNumber value={emDia} />
            </span>
          </div>
        </div>
        <div className="ded-kpi-desc">
          {getSubText(pctEmDia, `${pctEmDia}% do total`)}
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, height: '3px', width: `${pctEmDia}%`, background: '#22C55E', transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }} />
      </div>

      {/* EM ATENÇÃO */}
      <div
        className={`ded-kpi-card ${filtroStatus === 'a_vencer' ? 'active' : ''}`}
        onClick={() => onFilterStatus('a_vencer')}
        style={{ borderTop: '4px solid #F59E0B', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}
        title="Clique para filtrar condomínios em atenção"
      >
        <div className="ded-kpi-top">
          <div className="ded-kpi-icon" style={{ background: '#3A2A10', color: '#F59E0B' }}>
            <IcoAlert />
          </div>
          <div className="ded-kpi-info">
            <span className="ded-kpi-label">Em atenção</span>
            <span className="ded-kpi-value" style={{ color: '#F1F5F9' }}>
              <AnimatedNumber value={emAtencao} />
            </span>
          </div>
        </div>
        <div className="ded-kpi-desc">
          {getSubText(pctAtencao, `${pctAtencao}% do total`)}
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, height: '3px', width: `${pctAtencao}%`, background: '#F59E0B', transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }} />
      </div>

      {/* COM PENDÊNCIAS */}
      <div
        className={`ded-kpi-card ${filtroStatus === 'vencido' ? 'active' : ''}`}
        onClick={() => onFilterStatus('vencido')}
        style={{ borderTop: '4px solid #EF233C', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}
        title="Clique para filtrar condomínios com pendências"
      >
        <div className="ded-kpi-top">
          <div className="ded-kpi-icon" style={{ background: '#431923', color: '#EF233C' }}>
            <IcoAlertTriangle />
          </div>
          <div className="ded-kpi-info">
            <span className="ded-kpi-label">Com pendências</span>
            <span className="ded-kpi-value" style={{ color: '#F1F5F9' }}>
              <AnimatedNumber value={comPendencias} />
            </span>
          </div>
        </div>
        <div className="ded-kpi-desc">
          {getSubText(pctPendencias, `${pctPendencias}% do total`)}
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, height: '3px', width: `${pctPendencias}%`, background: '#EF233C', transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }} />
      </div>
    </div>
  );
}
