import React from 'react';

export default function SpdaFilters({
  filtros,
  onFiltroChange,
  onLimparFiltros,
  gerentes = []
}) {
  return (
    <div className="spda-filters-card">
      {/* 1. Busca por Nome / Código */}
      <div className="spda-filter-group busca">
        <label className="spda-filter-label">Buscar condomínio</label>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <span
            style={{
              position: 'absolute',
              left: '12px',
              color: '#94a3b8',
              pointerEvents: 'none',
              fontSize: '14px',
              display: 'flex'
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            className="spda-input"
            style={{ paddingLeft: '36px' }}
            placeholder="Digite o nome do condomínio"
            value={filtros.busca}
            onChange={(e) => onFiltroChange('busca', e.target.value)}
          />
        </div>
      </div>

      {/* 2. Gerente */}
      <div className="spda-filter-group">
        <label className="spda-filter-label">Gerente</label>
        <select
          className="spda-select"
          value={filtros.gerente}
          onChange={(e) => onFiltroChange('gerente', e.target.value)}
        >
          <option value="Todos">Todos</option>
          {gerentes.map((g) => (
            <option key={g.id || g.nome} value={g.nome}>
              {g.nome}
            </option>
          ))}
        </select>
      </div>

      {/* 3. Situação */}
      <div className="spda-filter-group">
        <label className="spda-filter-label">Situação</label>
        <select
          className="spda-select"
          value={filtros.status}
          onChange={(e) => onFiltroChange('status', e.target.value)}
        >
          <option value="Todos">Todas</option>
          <option value="em_dia">Em dia</option>
          <option value="a_vencer">A vencer</option>
          <option value="vencido">Vencido</option>
          <option value="sem_registro">Sem registro</option>
        </select>
      </div>

      {/* 4. Validade entre */}
      <div className="spda-filter-group datas">
        <label className="spda-filter-label">Validade entre</label>
        <div className="spda-date-range">
          <input
            type="date"
            className="spda-input"
            value={filtros.dataDe}
            onChange={(e) => onFiltroChange('dataDe', e.target.value)}
          />
          <span>até</span>
          <input
            type="date"
            className="spda-input"
            value={filtros.dataAte}
            onChange={(e) => onFiltroChange('dataAte', e.target.value)}
          />
        </div>
      </div>

      {/* Botão Limpar Filtros */}
      <div>
        <button type="button" className="spda-btn-clear" onClick={onLimparFiltros}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Limpar filtros
        </button>
      </div>
    </div>
  );
}
