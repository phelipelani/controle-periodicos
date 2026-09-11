import React from 'react';

export default function ReservatoriosFilters({
  filtros,
  onFiltroChange,
  onLimparFiltros,
  gerentes
}) {
  return (
    <div className="res-filters">
      <div className="res-filter-group" style={{ flex: '1 1 200px' }}>
        <label>Buscar condomínio ou código</label>
        <input
          type="text"
          className="res-input"
          placeholder="Ex: Reserva Imperial ou 012..."
          value={filtros.busca}
          onChange={(e) => onFiltroChange('busca', e.target.value)}
        />
      </div>

      <div className="res-filter-group" style={{ minWidth: '160px' }}>
        <label>Situação</label>
        <select
          className="res-input"
          value={filtros.status}
          onChange={(e) => onFiltroChange('status', e.target.value)}
        >
          <option value="Todos">Todas as situações</option>
          <option value="em_dia">Em dia</option>
          <option value="a_vencer">A vencer</option>
          <option value="vencido">Vencido</option>
          <option value="sem_registro">Sem registro</option>
        </select>
      </div>

      <div className="res-filter-group" style={{ minWidth: '160px' }}>
        <label>Gerente responsável</label>
        <select
          className="res-input"
          value={filtros.gerente}
          onChange={(e) => onFiltroChange('gerente', e.target.value)}
        >
          <option value="Todos">Todos os gerentes</option>
          {gerentes.map((g) => (
            <option key={g.id} value={g.nome}>
              {g.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="res-filter-group" style={{ minWidth: '130px' }}>
        <label>Vencimento de</label>
        <input
          type="date"
          className="res-input"
          value={filtros.dataDe}
          onChange={(e) => onFiltroChange('dataDe', e.target.value)}
        />
      </div>

      <div className="res-filter-group" style={{ minWidth: '130px' }}>
        <label>Vencimento até</label>
        <input
          type="date"
          className="res-input"
          value={filtros.dataAte}
          onChange={(e) => onFiltroChange('dataAte', e.target.value)}
        />
      </div>

      <button
        type="button"
        className="res-btn-clear"
        onClick={onLimparFiltros}
        title="Limpar todos os filtros"
      >
        Limpar filtros
      </button>
    </div>
  );
}
