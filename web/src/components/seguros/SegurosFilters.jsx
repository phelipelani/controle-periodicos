import React from 'react';

export default function SegurosFilters({
  filtros,
  onFiltroChange,
  onLimparFiltros,
  seguradoras = [],
  corretoras = [],
  gerentes = []
}) {
  return (
    <div className="seg-filters">
      <div className="seg-filter-group" style={{ flex: '1 1 200px' }}>
        <label>Buscar condomínio</label>
        <input
          type="text"
          className="seg-input"
          placeholder="Digite o nome ou código..."
          value={filtros.busca}
          onChange={(e) => onFiltroChange('busca', e.target.value)}
        />
      </div>

      <div className="seg-filter-group" style={{ minWidth: '150px' }}>
        <label>Seguradora</label>
        <select
          className="seg-input"
          value={filtros.seguradora}
          onChange={(e) => onFiltroChange('seguradora', e.target.value)}
        >
          <option value="Todas">Todas</option>
          {seguradoras.map((s, idx) => (
            <option key={idx} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="seg-filter-group" style={{ minWidth: '150px' }}>
        <label>Corretora</label>
        <select
          className="seg-input"
          value={filtros.corretora}
          onChange={(e) => onFiltroChange('corretora', e.target.value)}
        >
          <option value="Todas">Todas</option>
          {corretoras.map((c, idx) => (
            <option key={idx} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="seg-filter-group" style={{ minWidth: '150px' }}>
        <label>Gerente</label>
        <select
          className="seg-input"
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

      <div className="seg-filter-group" style={{ minWidth: '130px' }}>
        <label>Vencimento de</label>
        <input
          type="date"
          className="seg-input"
          value={filtros.dataDe}
          onChange={(e) => onFiltroChange('dataDe', e.target.value)}
        />
      </div>

      <div className="seg-filter-group" style={{ minWidth: '130px' }}>
        <label>Até</label>
        <input
          type="date"
          className="seg-input"
          value={filtros.dataAte}
          onChange={(e) => onFiltroChange('dataAte', e.target.value)}
        />
      </div>

      <div className="seg-filter-group" style={{ minWidth: '140px' }}>
        <label>Status</label>
        <select
          className="seg-input"
          value={filtros.status}
          onChange={(e) => onFiltroChange('status', e.target.value)}
        >
          <option value="Todos">Todos</option>
          <option value="ativo">Ativo</option>
          <option value="a_vencer">Próximo a vencer</option>
          <option value="vencido">Vencido</option>
          <option value="sem_registro">Sem registro</option>
        </select>
      </div>

      <button
        type="button"
        className="seg-btn-clear"
        onClick={onLimparFiltros}
        title="Limpar todos os filtros"
      >
        Limpar filtros
      </button>
    </div>
  );
}
