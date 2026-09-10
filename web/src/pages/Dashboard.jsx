import React, { useState, useMemo } from 'react';
import '../dashboard.css';
import { gerarMockDashboard } from '../components/dashboard/mockData';

import DashboardHeader from '../components/dashboard/DashboardHeader';
import DashboardFilters from '../components/dashboard/DashboardFilters';
import KPIGrid from '../components/dashboard/KPIGrid';
import ServiceStatusChart from '../components/dashboard/ServiceStatusChart';
import ExpirationChart from '../components/dashboard/ExpirationChart';
import ServiceTypeStatus from '../components/dashboard/ServiceTypeStatus';
import ExpirationCalendar from '../components/dashboard/ExpirationCalendar';
import AttentionPanel from '../components/dashboard/AttentionPanel';
import CriticalCondominiums from '../components/dashboard/CriticalCondominiums';
import RecentActivities from '../components/dashboard/RecentActivities';

const { condominios, servicos, atividades } = gerarMockDashboard();

export default function Dashboard() {
  const [filtros, setFiltros] = useState({
    condominioId: 'todos',
    servicoId: 'todos',
    periodo: '30'
  });
  
  const [activeKpi, setActiveKpi] = useState(null);

  // Aplica os filtros nos serviços
  const servicosFiltrados = useMemo(() => {
    return servicos.filter(s => {
      if (filtros.condominioId !== 'todos' && String(s.condominioId) !== filtros.condominioId) return false;
      if (filtros.servicoId !== 'todos' && s.servicoId !== filtros.servicoId) return false;
      
      if (activeKpi && activeKpi !== 'condominios') {
        if (s.statusCalc !== activeKpi) return false;
      }
      
      return true;
    });
  }, [servicos, filtros, activeKpi]);

  // Calcula Stats globais para KPIs e Donut
  const stats = useMemo(() => {
    // Conta únicos baseados nos filtros de cima (ignorando activeKpi para não zerar os outros KPIs quando um estiver ativo)
    const baseServicos = servicos.filter(s => {
      if (filtros.condominioId !== 'todos' && String(s.condominioId) !== filtros.condominioId) return false;
      if (filtros.servicoId !== 'todos' && s.servicoId !== filtros.servicoId) return false;
      return true;
    });

    const emDia = baseServicos.filter(s => s.statusCalc === 'em_dia').length;
    const aVencer = baseServicos.filter(s => s.statusCalc === 'a_vencer').length;
    const vencidos = baseServicos.filter(s => s.statusCalc === 'vencido').length;
    const semRegistro = baseServicos.filter(s => s.statusCalc === 'sem_registro').length;
    
    // Total condominios visualizados no filtro
    const conds = new Set(baseServicos.map(s => s.condominioId)).size;
    const totalServicos = baseServicos.length;

    return {
      totalCondominios: filtros.condominioId === 'todos' ? condominios.length : 1,
      emDia, aVencer, vencidos, semRegistro, totalServicos,
      percEmDia: totalServicos ? ((emDia / totalServicos) * 100).toFixed(1) : 0
    };
  }, [servicos, condominios, filtros]);

  const handleKpiClick = (kpi) => {
    if (activeKpi === kpi) {
      setActiveKpi(null); // toggle off
    } else {
      setActiveKpi(kpi);
    }
  };

  return (
    <div className="dash-page">
      <DashboardHeader />
      
      <DashboardFilters 
        filtros={filtros} 
        setFiltros={setFiltros} 
        condominios={condominios} 
      />
      
      <KPIGrid 
        stats={stats} 
        activeFiltro={activeKpi} 
        onKpiClick={handleKpiClick} 
      />
      
      <div className="dash-2col" style={{ gridTemplateColumns: '1.2fr 2fr' }}>
        <ServiceStatusChart stats={stats} />
        <ExpirationChart servicos={servicosFiltrados} />
      </div>

      <div className="dash-2col" style={{ gridTemplateColumns: '1fr' }}>
        <ServiceTypeStatus servicos={servicosFiltrados} />
      </div>

      <div className="dash-2col">
        <AttentionPanel servicos={servicosFiltrados} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <ExpirationCalendar servicos={servicosFiltrados} />
          <CriticalCondominiums condominios={condominios} servicos={servicosFiltrados} />
          <RecentActivities atividades={atividades} />
        </div>
      </div>
    </div>
  );
}
