import React from 'react';

export default function DashboardFilters({ filtros, setFiltros, condominios }) {
  return (
    <div className="dash-filters">
      <div className="dash-filter-group" style={{ flex: 1.5 }}>
        <label>Visão</label>
        <select 
          className="dash-filter-select"
          value={filtros.condominioId}
          onChange={e => setFiltros({...filtros, condominioId: e.target.value})}
        >
          <option value="todos">Todos os condomínios</option>
          {condominios.map(c => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </div>
      
      <div className="dash-filter-group" style={{ flex: 1.5 }}>
        <label>Serviço</label>
        <select 
          className="dash-filter-select"
          value={filtros.servicoId}
          onChange={e => setFiltros({...filtros, servicoId: e.target.value})}
        >
          <option value="todos">Todos os serviços</option>
          <option value="seguro">Seguros</option>
          <option value="extintores">Extintores</option>
          <option value="dedetizacao">Dedetização</option>
          <option value="reservatorios">Reservatórios</option>
          <option value="avcb">AVCB</option>
        </select>
      </div>

      <div className="dash-filter-group" style={{ flex: 1 }}>
        <label>Período</label>
        <select 
          className="dash-filter-select"
          value={filtros.periodo}
          onChange={e => setFiltros({...filtros, periodo: e.target.value})}
        >
          <option value="30">Próximos 30 dias</option>
          <option value="60">Próximos 60 dias</option>
          <option value="90">Próximos 90 dias</option>
          <option value="180">Próximos 6 meses</option>
          <option value="365">Próximos 12 meses</option>
        </select>
      </div>

      <button className="dash-btn-update">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-9.21l5.67-5.67"/></svg>
        Atualizar dados
      </button>
    </div>
  );
}
