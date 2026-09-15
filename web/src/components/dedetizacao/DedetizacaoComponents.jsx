import React from 'react';
import { IcoCondominio, IcoCheck, IcoRelogio, IcoCalendario, IcoDoc, IcoSino } from '../icons';
import AnimatedNumber from '../AnimatedNumber';

export const DedetizacaoHeader = ({ onNovoAgendamento, onVerAgendamentos }) => (
  <div className="ded-header">
    <div className="ded-title">
      <div className="ded-title-icon"><IcoCondominio /></div>
      <div>
        <h1>Dedetização — Agendamentos</h1>
        <p>Controle das execuções de dedetização dos condomínios.</p>
      </div>
    </div>
    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
      <button 
        type="button"
        className="ded-btn-outline" 
        onClick={onVerAgendamentos}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 16px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
      >
        <IcoCalendario width={16} height={16} /> Ver Agendamentos
      </button>
      <button className="ded-btn-primary" onClick={onNovoAgendamento}>
        + Novo agendamento
      </button>
    </div>
  </div>
);

export const DedetizacaoStatusBadge = ({ status }) => {
  const map = {
    'Realizado': { cls: 'badge-realizado', label: 'Realizado' },
    'Agendado': { cls: 'badge-agendado', label: 'Agendado' },
    'Pendente': { cls: 'badge-pendente', label: 'Pendente' },
    'Atrasado': { cls: 'badge-atrasado', label: 'Atrasado' }
  };
  const badge = map[status] || { cls: 'badge-pendente', label: status || 'Pendente' };
  return <span className={`ded-badge ${badge.cls}`}>{badge.label}</span>;
};

export const DedetizacaoKpis = ({ stats = {}, filtroAtivo = 'Todos', onKpiAction }) => {
  const total = stats.condominios || 1;
  const pctEmDia = stats.condominios > 0 ? Math.round((stats.emDia / stats.condominios) * 100) : 0;
  const pctPendentes = stats.condominios > 0 ? Math.round((stats.pendentes / stats.condominios) * 100) : 0;
  const pctProximas = stats.condominios > 0 ? Math.round((stats.proximas / stats.condominios) * 100) : 0;
  const pctSemNota = stats.condominios > 0 ? Math.round((stats.semNota / stats.condominios) * 100) : 0;

  return (
    <div className="ded-kpis">
      <div
        className={`ded-kpi-card ${filtroAtivo === 'Todos' ? 'active' : ''}`}
        style={{ borderTop: '4px solid #3b82f6', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}
        onClick={() => onKpiAction('todos')}
      >
        <div className="ded-kpi-top">
          <div className="ded-kpi-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}><IcoCondominio /></div>
          <div className="ded-kpi-info">
            <span className="ded-kpi-label">Condomínios cadastrados</span>
            <span className="ded-kpi-value">
              <AnimatedNumber value={stats.condominios} />
            </span>
          </div>
        </div>
        <div className="ded-kpi-desc">
          {stats.empresaAtiva ? `Empresa: ${stats.empresaAtiva}` : 'Total no escopo'}
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, height: '3px', width: stats.condominios > 0 ? '100%' : '0%', background: '#3b82f6', transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }} />
      </div>

      <div
        className={`ded-kpi-card ${filtroAtivo === 'Realizado' ? 'active' : ''}`}
        style={{ borderTop: '4px solid #16a34a', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}
        onClick={() => onKpiAction('em_dia')}
      >
        <div className="ded-kpi-top">
          <div className="ded-kpi-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}><IcoCheck /></div>
          <div className="ded-kpi-info">
            <span className="ded-kpi-label">Em dia</span>
            <span className="ded-kpi-value" style={{ color: '#16a34a' }}>
              <AnimatedNumber value={stats.emDia} />
            </span>
          </div>
        </div>
        <div className="ded-kpi-desc">{pctEmDia}% do escopo</div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, height: '3px', width: `${pctEmDia}%`, background: '#16a34a', transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }} />
      </div>

      <div
        className={`ded-kpi-card ${filtroAtivo === 'Pendente' ? 'active' : ''}`}
        style={{ borderTop: '4px solid #d97706', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}
        onClick={() => onKpiAction('pendentes')}
      >
        <div className="ded-kpi-top">
          <div className="ded-kpi-icon" style={{ background: '#fffbeb', color: '#d97706' }}><IcoRelogio /></div>
          <div className="ded-kpi-info">
            <span className="ded-kpi-label">Pendentes</span>
            <span className="ded-kpi-value" style={{ color: '#d97706' }}>
              <AnimatedNumber value={stats.pendentes} />
            </span>
          </div>
        </div>
        <div className="ded-kpi-desc">{pctPendentes}% do escopo</div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, height: '3px', width: `${pctPendentes}%`, background: '#d97706', transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }} />
      </div>

      <div
        className={`ded-kpi-card ${filtroAtivo === 'Agendado' ? 'active' : ''}`}
        style={{ borderTop: '4px solid #8b5cf6', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}
        onClick={() => onKpiAction('proximas')}
      >
        <div className="ded-kpi-top">
          <div className="ded-kpi-icon" style={{ background: '#f5f3ff', color: '#8b5cf6' }}><IcoCalendario /></div>
          <div className="ded-kpi-info">
            <span className="ded-kpi-label">Próximas execuções</span>
            <span className="ded-kpi-value" style={{ color: '#8b5cf6' }}>
              <AnimatedNumber value={stats.proximas} />
            </span>
          </div>
        </div>
        <div className="ded-kpi-desc">{pctProximas}% do escopo</div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, height: '3px', width: `${pctProximas}%`, background: '#8b5cf6', transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }} />
      </div>

      <div
        className={`ded-kpi-card ${filtroAtivo === 'Sem nota' ? 'active' : ''}`}
        style={{ borderTop: '4px solid #dc2626', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}
        onClick={() => onKpiAction('sem_nota')}
      >
        <div className="ded-kpi-top">
          <div className="ded-kpi-icon" style={{ background: '#fef2f2', color: '#dc2626' }}><IcoDoc /></div>
          <div className="ded-kpi-info">
            <span className="ded-kpi-label">Sem nota/recibo</span>
            <span className="ded-kpi-value" style={{ color: '#dc2626' }}>
              <AnimatedNumber value={stats.semNota} />
            </span>
          </div>
        </div>
        <div className="ded-kpi-desc">{pctSemNota}% do escopo</div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, height: '3px', width: `${pctSemNota}%`, background: '#dc2626', transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }} />
      </div>
    </div>
  );
};

export const DedetizacaoFilters = ({ filtros, setFiltros, onClear, empresas = [] }) => (
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
        {empresas.map((emp) => (
          <option key={emp} value={emp}>
            {emp}
          </option>
        ))}
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
    <div className="ded-filter-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
      <button className="ded-btn-clear" onClick={onClear}>
        <IcoSino /> Limpar filtros
      </button>
    </div>
  </div>
);

export const DedetizacaoFooterLegenda = () => (
  <div className="ded-footer-legenda">
    <div className="ded-legenda-item">
      <span className="ded-badge badge-agendado">Agendado</span>
      <span>Visita futura confirmada</span>
    </div>
    <div className="ded-legenda-item">
      <span className="ded-badge badge-pendente">Pendente</span>
      <span>Sem agendamento ou fora da validade</span>
    </div>
    <div className="ded-legenda-item">
      <span className="ded-badge badge-realizado">Realizado</span>
      <span>Serviço executado dentro do prazo</span>
    </div>
    <div className="ded-legenda-item">
      <span className="ded-badge badge-atrasado">Atrasado</span>
      <span>Validade vencida sem novo registro</span>
    </div>
  </div>
);
