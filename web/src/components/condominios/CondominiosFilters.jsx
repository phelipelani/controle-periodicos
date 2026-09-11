import React, { useState } from 'react';
import { IcoCondominio } from '../icons';

export default function CondominiosFilters({ filtros, setFiltros, gerentes }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const set = (k) => (e) => setFiltros({ ...filtros, [k]: e.target.value });

  return (
    <>
      <div className="cond-filters">
        <div className="cond-filter-group" style={{ flex: 2 }}>
          <input 
            type="text" 
            className="cond-filter-input" 
            placeholder="Buscar condomínio por nome, código ou gerente..." 
            value={filtros.busca}
            onChange={set('busca')}
          />
        </div>
        <div className="cond-filter-group">
          <select className="cond-filter-input" value={filtros.status} onChange={set('status')}>
            <option value="Todos">Status: Todos</option>
            <option value="em_dia">Em dia</option>
            <option value="a_vencer">Em atenção</option>
            <option value="vencido">Com pendências</option>
          </select>
        </div>
        <div className="cond-filter-group">
          <select className="cond-filter-input" value={filtros.gerente} onChange={set('gerente')}>
            <option value="Todos">Gerente: Todos</option>
            {gerentes.map(g => (
              <option key={g.id} value={g.nome}>{g.nome}</option>
            ))}
          </select>
        </div>
        {(filtros.busca || filtros.status !== 'Todos' || filtros.gerente !== 'Todos') && (
          <button 
            type="button" 
            className="cond-btn-clear" 
            onClick={() => setFiltros({ busca: '', status: 'Todos', gerente: 'Todos' })}
            title="Limpar todos os filtros"
          >
            Limpar filtros
          </button>
        )}
      </div>

      <div className="cond-mobile-filters">
        <div style={{ display: 'flex', gap: '8px' }}>
          <input 
            type="text" 
            className="cond-filter-input" 
            placeholder="Buscar..." 
            value={filtros.busca}
            onChange={set('busca')}
            style={{ flex: 1 }}
          />
          <button className="secundario" onClick={() => setMobileOpen(true)}>Filtros</button>
        </div>

        {mobileOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', zIndex: 999 }}>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#ffffff', padding: '24px', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', boxShadow: '0 -4px 20px rgba(0,0,0,0.15)' }}>
              <h3 style={{ marginTop: 0, color: '#0f172a' }}>Filtros</h3>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#64748b', fontSize: '12px', marginBottom: '8px', fontWeight: 600 }}>Status</label>
                <select className="cond-filter-input" value={filtros.status} onChange={set('status')}>
                  <option value="Todos">Todos</option>
                  <option value="em_dia">Em dia</option>
                  <option value="a_vencer">Em atenção</option>
                  <option value="vencido">Com pendências</option>
                </select>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', color: '#64748b', fontSize: '12px', marginBottom: '8px', fontWeight: 600 }}>Gerente</label>
                <select className="cond-filter-input" value={filtros.gerente} onChange={set('gerente')}>
                  <option value="Todos">Todos</option>
                  {gerentes.map(g => (
                    <option key={g.id} value={g.nome}>{g.nome}</option>
                  ))}
                </select>
              </div>

              <button style={{ width: '100%', marginBottom: '12px' }} onClick={() => setMobileOpen(false)}>Aplicar</button>
              <button className="secundario" style={{ width: '100%', border: 'none' }} onClick={() => { setFiltros({...filtros, status: 'Todos', gerente: 'Todos'}); setMobileOpen(false); }}>Limpar Filtros</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
