import React from 'react';

export default function DashboardFilters({ filtros, setFiltros, condominios = [], tiposServico = [], onRefresh, carregando }) {
  const listaServicos = tiposServico.length > 0 ? tiposServico : [
    { id: 'seguro', chave: 'seguro', nome: 'Seguros' },
    { id: 'extintor', chave: 'extintor', nome: 'Extintores' },
    { id: 'dedetizacao', chave: 'dedetizacao', nome: 'Dedetização' },
    { id: 'reservatorio', chave: 'reservatorio', nome: 'Reservatórios' },
    { id: 'avcb', chave: 'avcb', nome: 'AVCB' },
    { id: 'spda', chave: 'spda', nome: 'SPDA' }
  ];

  return (
    <div className="dash-filters">
      <div className="dash-filter-group" style={{ flex: 1.5 }}>
        <label>Visão</label>
        <select 
          className="dash-filter-select"
          value={filtros.condominioId}
          onChange={e => setFiltros({...filtros, condominioId: e.target.value})}
        >
          <option value="todos">Todos os condomínios ({condominios.length})</option>
          {condominios.map(c => (
            <option key={c.id} value={String(c.id)}>{c.codigo ? `${c.codigo} - ` : ''}{c.nome}</option>
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
          {listaServicos.map(s => (
            <option key={s.chave || s.id} value={s.chave || s.id}>{s.nome}</option>
          ))}
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

      <button 
        type="button" 
        className="dash-btn-update" 
        onClick={onRefresh}
        disabled={carregando}
        style={{ cursor: carregando ? 'wait' : 'pointer', opacity: carregando ? 0.7 : 1 }}
      >
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          style={{ animation: carregando ? 'spin 1s linear infinite' : 'none' }}
        >
          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-9.21l5.67-5.67"/>
        </svg>
        {carregando ? 'Atualizando...' : 'Atualizar dados'}
      </button>
    </div>
  );
}
