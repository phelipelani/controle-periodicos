import React from 'react';
import { IcoCondominio, IcoCheck, IcoRelogio, IcoAlertTriangle } from '../icons';
import AnimatedNumber from '../AnimatedNumber';

export default function SpdaKpis({ kpis = {}, filtroStatus = 'Todos', onSelectStatus }) {
  const {
    totalCondominios = 0,
    emDia = 0,
    percentualEmDia = '0,0%',
    aVencer = 0,
    vencidos = 0,
    semRegistro = 0,
    gerenteAtivo
  } = kpis;

  const pctEmDia = totalCondominios > 0 ? Math.round((emDia / totalCondominios) * 100) : 0;
  const pctAVencer = totalCondominios > 0 ? Math.round((aVencer / totalCondominios) * 100) : 0;
  const pctVencidos = totalCondominios > 0 ? Math.round((vencidos / totalCondominios) * 100) : 0;

  return (
    <div className="ded-kpis">
      {/* KPI 1 - Total */}
      <div
        className={`ded-kpi-card ${filtroStatus === 'Todos' ? 'active' : ''}`}
        onClick={() => onSelectStatus('Todos')}
        style={{ borderTop: '4px solid #3b82f6', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}
        title="Clique para ver todos os condomínios monitorados"
      >
        <div className="ded-kpi-top">
          <div className="ded-kpi-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}>
            <IcoCondominio />
          </div>
          <div className="ded-kpi-info">
            <span className="ded-kpi-label">Condomínios cadastrados</span>
            <span className="ded-kpi-value">
              <AnimatedNumber value={totalCondominios} />
            </span>
          </div>
        </div>
        <div className="ded-kpi-desc">
          {gerenteAtivo ? `Gerente: ${gerenteAtivo}` : 'Total monitorados'}
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, height: '3px', width: totalCondominios > 0 ? '100%' : '0%', background: '#3b82f6', transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }} />
      </div>

      {/* KPI 2 - Em dia */}
      <div
        className={`ded-kpi-card ${filtroStatus === 'em_dia' ? 'active' : ''}`}
        onClick={() => onSelectStatus(filtroStatus === 'em_dia' ? 'Todos' : 'em_dia')}
        style={{ borderTop: '4px solid #16a34a', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}
        title="Clique para filtrar apenas condomínios em dia"
      >
        <div className="ded-kpi-top">
          <div className="ded-kpi-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
            <IcoCheck />
          </div>
          <div className="ded-kpi-info">
            <span className="ded-kpi-label">Em dia</span>
            <span className="ded-kpi-value" style={{ color: '#16a34a' }}>
              <AnimatedNumber value={emDia} />
            </span>
          </div>
        </div>
        <div className="ded-kpi-desc">{pctEmDia}% do escopo</div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, height: '3px', width: `${pctEmDia}%`, background: '#16a34a', transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }} />
      </div>

      {/* KPI 3 - A vencer */}
      <div
        className={`ded-kpi-card ${filtroStatus === 'a_vencer' ? 'active' : ''}`}
        onClick={() => onSelectStatus(filtroStatus === 'a_vencer' ? 'Todos' : 'a_vencer')}
        style={{ borderTop: '4px solid #d97706', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}
        title="Clique para filtrar condomínios que vencem nos próximos 30 dias"
      >
        <div className="ded-kpi-top">
          <div className="ded-kpi-icon" style={{ background: '#fffbeb', color: '#d97706' }}>
            <IcoRelogio />
          </div>
          <div className="ded-kpi-info">
            <span className="ded-kpi-label">A vencer</span>
            <span className="ded-kpi-value" style={{ color: '#d97706' }}>
              <AnimatedNumber value={aVencer} />
            </span>
          </div>
        </div>
        <div className="ded-kpi-desc">{pctAVencer}% do escopo</div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, height: '3px', width: `${pctAVencer}%`, background: '#d97706', transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }} />
      </div>

      {/* KPI 4 - Vencidos */}
      <div
        className={`ded-kpi-card ${filtroStatus === 'vencido' ? 'active' : ''}`}
        onClick={() => onSelectStatus(filtroStatus === 'vencido' ? 'Todos' : 'vencido')}
        style={{ borderTop: '4px solid #dc2626', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}
        title="Clique para filtrar condomínios vencidos"
      >
        <div className="ded-kpi-top">
          <div className="ded-kpi-icon" style={{ background: '#fef2f2', color: '#dc2626' }}>
            <IcoAlertTriangle />
          </div>
          <div className="ded-kpi-info">
            <span className="ded-kpi-label">Vencidos</span>
            <span className="ded-kpi-value" style={{ color: '#dc2626' }}>
              <AnimatedNumber value={vencidos} />
            </span>
          </div>
        </div>
        <div className="ded-kpi-desc">{pctVencidos}% do escopo</div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, height: '3px', width: `${pctVencidos}%`, background: '#dc2626', transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }} />
      </div>
    </div>
  );
}
