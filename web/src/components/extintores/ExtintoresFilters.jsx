import React from 'react';

export default function ExtintoresFilters({
  filtros,
  setFiltros,
  gerentes,
  onLimpar
}) {
  const set = (chave) => (e) => {
    setFiltros((prev) => ({ ...prev, [chave]: e.target.value }));
  };

  return (
    <div className="ext-filters">
      {/* Busca */}
      <div className="ext-filter-group" style={{ flex: 2, minWidth: '220px' }}>
        <label>Buscar condomínio</label>
        <input
          type="text"
          className="ext-input"
          placeholder="Digite o nome ou código"
          value={filtros.busca}
          onChange={set('busca')}
        />
      </div>

      {/* Situação */}
      <div className="ext-filter-group" style={{ flex: 1, minWidth: '150px' }}>
        <label>Situação</label>
        <select className="ext-input" value={filtros.status} onChange={set('status')}>
          <option value="Todos">Todos</option>
          <option value="em_dia">Em dia</option>
          <option value="a_vencer">A vencer</option>
          <option value="vencido">Vencido</option>
          <option value="sem_registro">Sem registro</option>
        </select>
      </div>

      {/* Gerente */}
      <div className="ext-filter-group" style={{ flex: 1, minWidth: '150px' }}>
        <label>Gerente</label>
        <select className="ext-input" value={filtros.gerente} onChange={set('gerente')}>
          <option value="Todos">Todos</option>
          {gerentes.map((g) => (
            <option key={g.id || g} value={g.nome || g}>
              {g.nome || g}
            </option>
          ))}
        </select>
      </div>

      {/* Período de Vencimento */}
      <div className="ext-filter-group" style={{ minWidth: '280px' }}>
        <label>Período de vencimento</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="date"
            className="ext-input"
            style={{ flex: 1 }}
            value={filtros.dataDe}
            onChange={set('dataDe')}
          />
          <span style={{ fontSize: '12px', color: '#64748b' }}>até</span>
          <input
            type="date"
            className="ext-input"
            style={{ flex: 1 }}
            value={filtros.dataAte}
            onChange={set('dataAte')}
          />
        </div>
      </div>

      {/* Limpar */}
      <div className="ext-filter-group">
        <button type="button" className="ext-btn-clear" onClick={onLimpar}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10"></polyline>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
          </svg>
          Limpar filtros
        </button>
      </div>
    </div>
  );
}
