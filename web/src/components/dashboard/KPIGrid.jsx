import React from 'react';
import { IcoCondominio, IcoVencido, IcoRelogio, IcoCheck, IcoDoc } from '../icons';
import AnimatedNumber from '../AnimatedNumber';

export default function KPIGrid({ stats, activeFiltro, onKpiClick }) {
  const total = stats.totalCondominios || 1;
  const pctVencidos = total > 0 ? Math.round(((stats.vencidos || 0) / total) * 100) : 0;
  const pctAVencer = total > 0 ? Math.round(((stats.aVencer || 0) / total) * 100) : 0;
  const pctEmDia = stats.percEmDia || (total > 0 ? Math.round(((stats.emDia || 0) / total) * 100) : 0);
  const pctSemRegistro = total > 0 ? Math.round(((stats.semRegistro || 0) / total) * 100) : 0;

  return (
    <div className="ded-kpis">
      <div 
        className={`ded-kpi-card ${activeFiltro === 'condominios' ? 'active' : ''}`} 
        onClick={() => onKpiClick('condominios')} 
        style={{ borderTop: '4px solid #3b82f6', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <div className="ded-kpi-top">
          <div className="ded-kpi-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}><IcoCondominio /></div>
          <div className="ded-kpi-info">
            <span className="ded-kpi-label">Condomínios</span>
            <span className="ded-kpi-value"><AnimatedNumber value={stats.totalCondominios || 0} /></span>
          </div>
        </div>
        <div className="ded-kpi-desc">Total monitorados</div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, height: '3px', width: stats.totalCondominios > 0 ? '100%' : '0%', background: '#3b82f6', transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }} />
      </div>
      
      <div 
        className={`ded-kpi-card ${activeFiltro === 'vencido' ? 'active' : ''}`} 
        onClick={() => onKpiClick('vencido')} 
        style={{ borderTop: '4px solid #dc2626', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <div className="ded-kpi-top">
          <div className="ded-kpi-icon" style={{ background: '#fee2e2', color: '#dc2626' }}><IcoVencido /></div>
          <div className="ded-kpi-info">
            <span className="ded-kpi-label">Vencidos</span>
            <span className="ded-kpi-value" style={{ color: '#dc2626' }}><AnimatedNumber value={stats.vencidos || 0} /></span>
          </div>
        </div>
        <div className="ded-kpi-desc">{pctVencidos}% do total</div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, height: '3px', width: `${pctVencidos}%`, background: '#dc2626', transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }} />
      </div>

      <div 
        className={`ded-kpi-card ${activeFiltro === 'a_vencer' ? 'active' : ''}`} 
        onClick={() => onKpiClick('a_vencer')} 
        style={{ borderTop: '4px solid #d97706', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <div className="ded-kpi-top">
          <div className="ded-kpi-icon" style={{ background: '#fef3c7', color: '#d97706' }}><IcoRelogio /></div>
          <div className="ded-kpi-info">
            <span className="ded-kpi-label">A vencer</span>
            <span className="ded-kpi-value" style={{ color: '#d97706' }}><AnimatedNumber value={stats.aVencer || 0} /></span>
          </div>
        </div>
        <div className="ded-kpi-desc">{pctAVencer}% do total (30 dias)</div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, height: '3px', width: `${pctAVencer}%`, background: '#d97706', transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }} />
      </div>

      <div 
        className={`ded-kpi-card ${activeFiltro === 'em_dia' ? 'active' : ''}`} 
        onClick={() => onKpiClick('em_dia')} 
        style={{ borderTop: '4px solid #16a34a', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <div className="ded-kpi-top">
          <div className="ded-kpi-icon" style={{ background: '#dcfce7', color: '#16a34a' }}><IcoCheck /></div>
          <div className="ded-kpi-info">
            <span className="ded-kpi-label">Em dia</span>
            <span className="ded-kpi-value" style={{ color: '#16a34a' }}><AnimatedNumber value={stats.emDia || 0} /></span>
          </div>
        </div>
        <div className="ded-kpi-desc">{pctEmDia}% do total</div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, height: '3px', width: `${pctEmDia}%`, background: '#16a34a', transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }} />
      </div>

      <div 
        className={`ded-kpi-card ${activeFiltro === 'sem_registro' ? 'active' : ''}`} 
        onClick={() => onKpiClick('sem_registro')} 
        style={{ borderTop: '4px solid #64748b', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <div className="ded-kpi-top">
          <div className="ded-kpi-icon" style={{ background: '#f1f5f9', color: '#64748b' }}><IcoDoc /></div>
          <div className="ded-kpi-info">
            <span className="ded-kpi-label">Sem registro</span>
            <span className="ded-kpi-value"><AnimatedNumber value={stats.semRegistro || 0} /></span>
          </div>
        </div>
        <div className="ded-kpi-desc">{pctSemRegistro}% do total</div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, height: '3px', width: `${pctSemRegistro}%`, background: '#64748b', transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }} />
      </div>
    </div>
  );
}
