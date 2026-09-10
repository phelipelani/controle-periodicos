import React from 'react';
import { IcoCondominio, IcoCheck, IcoRelogio, IcoCalendario, IcoDoc, IcoSino } from '../icons';

export const DedetizacaoHeader = ({ onNovoAgendamento }) => (
  <div className="ded-header">
    <div className="ded-title">
      <div className="ded-title-icon"><IcoCondominio /></div>
      <div>
        <h1>Dedetização — Agendamentos</h1>
        <p>Controle das execuções de dedetização dos condomínios.</p>
      </div>
    </div>
    <button className="ded-btn-primary" onClick={onNovoAgendamento}>
      + Novo agendamento
    </button>
  </div>
);

export const DedetizacaoKpis = ({ stats, onKpiAction }) => (
  <div className="ded-kpis">
    <div className="ded-kpi-card" style={{borderTop: '4px solid #3b82f6'}}>
      <div className="ded-kpi-top">
        <div className="ded-kpi-icon" style={{background: '#eff6ff', color: '#3b82f6'}}><IcoCondominio /></div>
        <div className="ded-kpi-info">
          <span className="ded-kpi-label">Condomínios cadastrados</span>
          <span className="ded-kpi-value">{stats.condominios}</span>
        </div>
      </div>
      <div className="ded-kpi-desc">Total monitorados</div>
      <button onClick={() => onKpiAction('condominios')} className="ded-kpi-link" style={{color: '#3b82f6', background: 'none', border: 'none', padding: 0, cursor: 'pointer'}}>Ver condomínios &rarr;</button>
    </div>

    <div className="ded-kpi-card" style={{borderTop: '4px solid #16a34a'}}>
      <div className="ded-kpi-top">
        <div className="ded-kpi-icon" style={{background: '#f0fdf4', color: '#16a34a'}}><IcoCheck /></div>
        <div className="ded-kpi-info">
          <span className="ded-kpi-label">Em dia</span>
          <span className="ded-kpi-value">{stats.emDia}</span>
        </div>
      </div>
      <div className="ded-kpi-desc">{stats.percEmDia}% do total</div>
      <button onClick={() => onKpiAction('em_dia')} className="ded-kpi-link" style={{color: '#16a34a', background: 'none', border: 'none', padding: 0, cursor: 'pointer'}}>Ver em dia &rarr;</button>
    </div>

    <div className="ded-kpi-card" style={{borderTop: '4px solid #d97706'}}>
      <div className="ded-kpi-top">
        <div className="ded-kpi-icon" style={{background: '#fffbeb', color: '#d97706'}}><IcoRelogio /></div>
        <div className="ded-kpi-info">
          <span className="ded-kpi-label">Pendentes</span>
          <span className="ded-kpi-value">{stats.pendentes}</span>
        </div>
      </div>
      <div className="ded-kpi-desc">Aguardando execução</div>
      <button onClick={() => onKpiAction('pendentes')} className="ded-kpi-link" style={{color: '#d97706', background: 'none', border: 'none', padding: 0, cursor: 'pointer'}}>Ver pendentes &rarr;</button>
    </div>

    <div className="ded-kpi-card" style={{borderTop: '4px solid #8b5cf6'}}>
      <div className="ded-kpi-top">
        <div className="ded-kpi-icon" style={{background: '#f5f3ff', color: '#8b5cf6'}}><IcoCalendario /></div>
        <div className="ded-kpi-info">
          <span className="ded-kpi-label">Próximas execuções</span>
          <span className="ded-kpi-value">{stats.proximas}</span>
        </div>
      </div>
      <div className="ded-kpi-desc">Próximos 30 dias</div>
      <button onClick={() => onKpiAction('proximas')} className="ded-kpi-link" style={{color: '#8b5cf6', background: 'none', border: 'none', padding: 0, cursor: 'pointer'}}>Ver próximas &rarr;</button>
    </div>

    <div className="ded-kpi-card" style={{borderTop: '4px solid #dc2626'}}>
      <div className="ded-kpi-top">
        <div className="ded-kpi-icon" style={{background: '#fef2f2', color: '#dc2626'}}><IcoDoc /></div>
        <div className="ded-kpi-info">
          <span className="ded-kpi-label">Sem nota/recibo</span>
          <span className="ded-kpi-value">{stats.semNota}</span>
        </div>
      </div>
      <div className="ded-kpi-desc">Requer atenção</div>
      <button onClick={() => onKpiAction('sem_nota')} className="ded-kpi-link" style={{color: '#dc2626', background: 'none', border: 'none', padding: 0, cursor: 'pointer'}}>Ver sem nota &rarr;</button>
    </div>
  </div>
);

export const DedetizacaoFilters = ({ filtros, setFiltros, onClear }) => (
  <div className="ded-filters">
    <div className="ded-filter-group">
      <label>Buscar condomínio</label>
      <input 
        type="text" 
        className="ded-input" 
        placeholder="Digite o nome ou código" 
        value={filtros.busca}
        onChange={e => setFiltros({...filtros, busca: e.target.value})}
      />
    </div>
    <div className="ded-filter-group">
      <label>Status</label>
      <select 
        className="ded-input"
        value={filtros.status}
        onChange={e => setFiltros({...filtros, status: e.target.value})}
      >
        <option value="Todos">Todos</option>
        <option value="Agendado">Agendado</option>
        <option value="Pendente">Pendente</option>
        <option value="Realizado">Realizado</option>
        <option value="Atrasado">Atrasado</option>
      </select>
    </div>
    <div className="ded-filter-group">
      <label>Empresa executora</label>
      <select 
        className="ded-input"
        value={filtros.empresa}
        onChange={e => setFiltros({...filtros, empresa: e.target.value})}
      >
        <option value="Todas">Todas</option>
        <option value="DDD RIN">DDD RIN</option>
      </select>
    </div>
    <div className="ded-filter-group">
      <label>Período de execução</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input 
          type="date" 
          className="ded-input" 
          value={filtros.dataInicio}
          onChange={e => setFiltros({...filtros, dataInicio: e.target.value})}
        />
        <span style={{ fontSize: '13px', color: '#64748b' }}>até</span>
        <input 
          type="date" 
          className="ded-input" 
          value={filtros.dataFim}
          onChange={e => setFiltros({...filtros, dataFim: e.target.value})}
        />
      </div>
    </div>
    <div className="ded-filter-group">
      <label>Nota/recibo</label>
      <select 
        className="ded-input"
        value={filtros.nota}
        onChange={e => setFiltros({...filtros, nota: e.target.value})}
      >
        <option value="Todos">Todos</option>
        <option value="Anexada">Anexada</option>
        <option value="Pendente">Pendente</option>
      </select>
    </div>
    <button className="ded-btn-clear" onClick={onClear}>Limpar filtros</button>
  </div>
);

export const DedetizacaoStatusBadge = ({ status }) => {
  const map = {
    'Agendado': 'agendado',
    'Pendente': 'pendente',
    'Realizado': 'realizado',
    'Atrasado': 'atrasado',
    'Cancelado': 'cancelado'
  };
  return <span className={`ded-badge ${map[status]}`}>{status}</span>;
};

export const DedetizacaoFooterLegenda = () => (
  <div className="ded-legends">
    <div className="ded-legend-item">
      <div className="ded-legend-icon" style={{color:'#3b82f6'}}><IcoCalendario /></div>
      <div className="ded-legend-text"><strong>Agendado</strong><p>A dedetização foi agendada, mas ainda não foi realizada.</p></div>
    </div>
    <div className="ded-legend-item">
      <div className="ded-legend-icon" style={{color:'#d97706'}}><IcoRelogio /></div>
      <div className="ded-legend-text"><strong>Pendente</strong><p>A data de validade está próxima e ainda não houve execução.</p></div>
    </div>
    <div className="ded-legend-item">
      <div className="ded-legend-icon" style={{color:'#16a34a'}}><IcoCheck /></div>
      <div className="ded-legend-text"><strong>Realizado</strong><p>Execução realizada dentro do prazo e registrada no sistema.</p></div>
    </div>
    <div className="ded-legend-item">
      <div className="ded-legend-icon" style={{color:'#dc2626'}}><IcoSino /></div>
      <div className="ded-legend-text"><strong>Atrasado</strong><p>A data de validade passou e a execução não foi registrada.</p></div>
    </div>
    <div className="ded-legend-item">
      <div className="ded-legend-icon" style={{color:'#dc2626'}}><IcoDoc /></div>
      <div className="ded-legend-text"><strong>Sem nota/recibo</strong><p>Execução realizada, mas ainda não foi anexada a nota/recibo.</p></div>
    </div>
  </div>
);
