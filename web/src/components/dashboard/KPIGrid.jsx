import React from 'react';
import { IcoCondominio, IcoVencido, IcoRelogio, IcoCheck, IcoDoc } from '../icons';

export default function KPIGrid({ stats, activeFiltro, onKpiClick }) {
  return (
    <div className="dash-kpis">
      <div className={`dash-kpi ${activeFiltro === 'condominios' ? 'active' : ''}`} onClick={() => onKpiClick('condominios')} style={{color: '#0284c7'}}>
        <div className="dash-kpi-icon" style={{background: '#e0f2fe'}}><IcoCondominio /></div>
        <div className="dash-kpi-content">
          <div className="dash-kpi-title">Condomínios</div>
          <div className="dash-kpi-value">{stats.totalCondominios}</div>
          <div className="dash-kpi-desc">Monitorados</div>
        </div>
      </div>
      
      <div className={`dash-kpi ${activeFiltro === 'vencido' ? 'active' : ''}`} onClick={() => onKpiClick('vencido')} style={{color: '#dc2626'}}>
        <div className="dash-kpi-icon" style={{background: '#fee2e2'}}><IcoVencido /></div>
        <div className="dash-kpi-content">
          <div className="dash-kpi-title">Vencidos</div>
          <div className="dash-kpi-value">{stats.vencidos}</div>
          <div className="dash-kpi-desc" style={{fontWeight: 600}}>Requer atenção imediata</div>
        </div>
      </div>

      <div className={`dash-kpi ${activeFiltro === 'a_vencer' ? 'active' : ''}`} onClick={() => onKpiClick('a_vencer')} style={{color: '#d97706'}}>
        <div className="dash-kpi-icon" style={{background: '#fef3c7'}}><IcoRelogio /></div>
        <div className="dash-kpi-content">
          <div className="dash-kpi-title">A vencer</div>
          <div className="dash-kpi-value">{stats.aVencer}</div>
          <div className="dash-kpi-desc">Próximos 30 dias</div>
        </div>
      </div>

      <div className={`dash-kpi ${activeFiltro === 'em_dia' ? 'active' : ''}`} onClick={() => onKpiClick('em_dia')} style={{color: '#16a34a'}}>
        <div className="dash-kpi-icon" style={{background: '#dcfce7'}}><IcoCheck /></div>
        <div className="dash-kpi-content">
          <div className="dash-kpi-title">Em dia</div>
          <div className="dash-kpi-value">{stats.emDia}</div>
          <div className="dash-kpi-desc">{stats.percEmDia}% do total</div>
        </div>
      </div>

      <div className={`dash-kpi ${activeFiltro === 'sem_registro' ? 'active' : ''}`} onClick={() => onKpiClick('sem_registro')} style={{color: '#64748b'}}>
        <div className="dash-kpi-icon" style={{background: '#f1f5f9'}}><IcoDoc /></div>
        <div className="dash-kpi-content">
          <div className="dash-kpi-title">Sem registro</div>
          <div className="dash-kpi-value">{stats.semRegistro}</div>
          <div className="dash-kpi-desc">Precisam ser cadastrados</div>
        </div>
      </div>
    </div>
  );
}
