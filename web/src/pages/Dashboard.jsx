import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import '../dashboard.css';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api';

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

export default function Dashboard() {
  const { usuario } = useAuth();

  // Se o usuário for perfil Empresa, redireciona diretamente para o serviço permitido (ex: Dedetização)
  if (usuario?.papel === 'empresa') {
    const permitidos = Array.isArray(usuario.servicos_permitidos) 
      ? usuario.servicos_permitidos 
      : (typeof usuario.servicos_permitidos === 'string' ? JSON.parse(usuario.servicos_permitidos || '[]') : []);
    const primeiroServico = permitidos[0] || 'dedetizacao';
    return <Navigate to={`/servicos/${primeiroServico}`} replace />;
  }

  const [condominios, setCondominios] = useState([]);
  const [tiposServico, setTiposServico] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [atividades, setAtividades] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const [filtros, setFiltros] = useState({
    condominioId: 'todos',
    servicoId: 'todos',
    periodo: '30'
  });
  
  const [activeKpi, setActiveKpi] = useState(null);

  const carregarDados = useCallback(async () => {
    try {
      setCarregando(true);
      setErro(null);
      const res = await api.get('/dashboard');
      if (res) {
        setCondominios(res.condominios || []);
        setTiposServico(res.tiposServico || []);
        setServicos(res.servicos || []);
        setAtividades(res.atividades || []);
      }
    } catch (err) {
      console.error('Erro ao carregar dados do dashboard:', err);
      setErro(err.message || 'Erro ao carregar dados do painel.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Aplica os filtros nos serviços
  const servicosFiltrados = useMemo(() => {
    return servicos.filter(s => {
      if (filtros.condominioId !== 'todos' && String(s.condominioId) !== String(filtros.condominioId)) return false;
      if (filtros.servicoId !== 'todos' && s.servicoId !== filtros.servicoId && s.servicoChave !== filtros.servicoId) return false;
      
      if (activeKpi && activeKpi !== 'condominios') {
        if (s.statusCalc !== activeKpi) return false;
      }
      
      return true;
    });
  }, [servicos, filtros, activeKpi]);

  // Calcula Stats globais para KPIs e Donut
  const stats = useMemo(() => {
    // Conta únicos baseados nos filtros de condomínio/serviço (sem activeKpi para manter coerência dos cards)
    const baseServicos = servicos.filter(s => {
      if (filtros.condominioId !== 'todos' && String(s.condominioId) !== String(filtros.condominioId)) return false;
      if (filtros.servicoId !== 'todos' && s.servicoId !== filtros.servicoId && s.servicoChave !== filtros.servicoId) return false;
      return true;
    });

    const emDia = baseServicos.filter(s => s.statusCalc === 'em_dia').length;
    const aVencer = baseServicos.filter(s => s.statusCalc === 'a_vencer').length;
    const vencidos = baseServicos.filter(s => s.statusCalc === 'vencido').length;
    const semRegistro = baseServicos.filter(s => s.statusCalc === 'sem_registro').length;
    
    const totalServicos = baseServicos.length;

    return {
      totalCondominios: filtros.condominioId === 'todos' ? condominios.length : 1,
      emDia, 
      aVencer, 
      vencidos, 
      semRegistro, 
      totalServicos,
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
      <DashboardHeader usuario={usuario} />
      
      <DashboardFilters 
        filtros={filtros} 
        setFiltros={setFiltros} 
        condominios={condominios}
        tiposServico={tiposServico}
        onRefresh={carregarDados}
        carregando={carregando}
      />

      {erro && (
        <div style={{
          background: '#fee2e2',
          border: '1px solid #f87171',
          color: '#991b1b',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{erro}</span>
          <button 
            onClick={carregarDados}
            style={{
              background: '#dc2626',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {carregando && servicos.length === 0 ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 20px',
          color: '#64748b'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e2e8f0',
            borderTopColor: '#d4202a',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            marginBottom: '16px'
          }} />
          <p style={{ fontWeight: 500 }}>Carregando métricas reais dos condomínios...</p>
        </div>
      ) : (
        <>
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
            <ServiceTypeStatus servicos={servicosFiltrados} tiposServico={tiposServico} />
          </div>

          <div className="dash-2col">
            <AttentionPanel servicos={servicosFiltrados} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <ExpirationCalendar servicos={servicosFiltrados} />
              <CriticalCondominiums condominios={condominios} servicos={servicosFiltrados} />
              <RecentActivities atividades={atividades} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
