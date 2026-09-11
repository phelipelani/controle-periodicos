import React, { useState } from 'react';
import { IcoEye, IcoEdit, IcoDots, IcoCheckCircle, IcoRelogio, IcoAlertTriangle, IcoDoc, IcoSort, IcoSortAsc, IcoSortDesc, IcoTrash } from '../icons';

export default function ExtintoresTable({
  dados,
  onVisualizar,
  onEditar,
  onExcluir,
  paginaAtual,
  setPaginaAtual,
  itensPorPagina,
  setItensPorPagina,
  colunaOrdenacao = 'status_padrao',
  ordemDirecao = 'asc',
  onOrdenar = () => {}
}) {
  const [menuAbertoId, setMenuAbertoId] = useState(null);

  const formatarData = (d) => {
    if (!d) return '—';
    const [y, m, dia] = d.split('-');
    return `${dia}/${m}/${y}`;
  };

  const renderBadge = (status) => {
    switch (status) {
      case 'em_dia':
        return <span className="ext-badge em_dia">Em dia</span>;
      case 'a_vencer':
        return <span className="ext-badge a_vencer">A vencer</span>;
      case 'vencido':
        return <span className="ext-badge vencido">Vencido</span>;
      default:
        return <span className="ext-badge sem_registro">Sem registro</span>;
    }
  };

  const renderSortIcon = (coluna) => {
    if (colunaOrdenacao !== coluna) return <IcoSort />;
    return ordemDirecao === 'asc' ? <IcoSortAsc /> : <IcoSortDesc />;
  };

  // Paginação
  const totalRegistros = dados.length;
  const totalPaginas = Math.ceil(totalRegistros / itensPorPagina) || 1;
  const pagAtualReal = Math.min(paginaAtual, totalPaginas);
  const inicio = (pagAtualReal - 1) * itensPorPagina;
  const dadosPaginados = dados.slice(inicio, inicio + itensPorPagina);

  const toggleMenu = (e, id) => {
    e.stopPropagation();
    setMenuAbertoId(menuAbertoId === id ? null : id);
  };

  return (
    <div className="ext-table-card">
      <div className="ext-table-wrap">
        <table className="ext-table">
          <thead>
            <tr>
              <th className="sortable" style={{ width: '85px' }} onClick={() => onOrdenar('codigo')}>
                Código {renderSortIcon('codigo')}
              </th>
              <th className="sortable" onClick={() => onOrdenar('condominio')}>
                Condomínio {renderSortIcon('condominio')}
              </th>
              <th className="sortable" onClick={() => onOrdenar('gerente')}>
                Gerente {renderSortIcon('gerente')}
              </th>
              <th className="sortable" onClick={() => onOrdenar('recarga')}>
                Última Recarga {renderSortIcon('recarga')}
              </th>
              <th className="sortable" onClick={() => onOrdenar('vencimento')}>
                Próximo Vencimento {renderSortIcon('vencimento')}
              </th>
              <th className="sortable" onClick={() => onOrdenar('hidrostatico')}>
                Último Teste Hidrostático {renderSortIcon('hidrostatico')}
              </th>
              <th className="sortable" onClick={() => onOrdenar('extintores')}>
                Extintores {renderSortIcon('extintores')}
              </th>
              <th className="sortable" onClick={() => onOrdenar('status')}>
                Situação {renderSortIcon('status')}
              </th>
              <th style={{ textAlign: 'center', width: '110px' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {dadosPaginados.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  Nenhum condomínio encontrado com os filtros selecionados.
                </td>
              </tr>
            ) : (
              dadosPaginados.map((item) => (
                <tr key={item.id} className={`ext-row-${item.status}`}>
                  <td style={{ fontWeight: 600, color: '#64748b', fontFamily: 'monospace' }}>
                    {item.codigo}
                  </td>
                  <td>
                    <strong>{item.condominio}</strong>
                  </td>
                  <td>{item.gerente}</td>
                  <td>{formatarData(item.dataUltimaRecarga)}</td>
                  <td>
                    {item.dataProximoVencimento ? (
                      <span style={{ fontWeight: item.status === 'vencido' ? 700 : 500, color: item.status === 'vencido' ? '#dc2626' : 'inherit' }}>
                        {formatarData(item.dataProximoVencimento)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{formatarData(item.dataUltimoTesteHidrostatico)}</td>
                  <td>
                    {item.totalExtintores > 0 ? (
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>
                        {item.totalExtintores} ext.
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{renderBadge(item.status)}</td>
                  <td>
                    <div className="ext-actions">
                      <button
                        type="button"
                        className="ext-btn-icon"
                        title="Visualizar detalhes"
                        onClick={() => onVisualizar(item)}
                      >
                        <IcoEye />
                      </button>
                      <button
                        type="button"
                        className="ext-btn-icon"
                        title="Editar extintores"
                        onClick={() => onEditar(item)}
                      >
                        <IcoEdit />
                      </button>
                      <div style={{ position: 'relative' }}>
                        <button
                          type="button"
                          className="ext-btn-icon"
                          title="Mais opções"
                          onClick={(e) => toggleMenu(e, item.id)}
                        >
                          <IcoDots />
                        </button>

                        {menuAbertoId === item.id && (
                          <div
                            style={{
                              position: 'absolute',
                              right: 0,
                              top: '100%',
                              background: 'white',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                              zIndex: 10,
                              minWidth: '150px',
                              padding: '4px 0'
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', border: 'none', background: 'none', fontSize: '13px', color: '#334155', cursor: 'pointer' }}
                              onClick={() => { setMenuAbertoId(null); onVisualizar(item); }}
                            >
                              Visualizar
                            </button>
                            <button
                              type="button"
                              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', border: 'none', background: 'none', fontSize: '13px', color: '#334155', cursor: 'pointer' }}
                              onClick={() => { setMenuAbertoId(null); onEditar(item); }}
                            >
                              Editar
                            </button>
                            {item.status !== 'sem_registro' && (
                              <button
                                type="button"
                                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', border: 'none', background: 'none', fontSize: '13px', color: '#dc2626', cursor: 'pointer' }}
                                onClick={() => { setMenuAbertoId(null); onExcluir(item); }}
                              >
                                Limpar cadastro
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="ext-pagination">
        <div>
          Mostrando {totalRegistros > 0 ? inicio + 1 : 0} a {Math.min(inicio + itensPorPagina, totalRegistros)} de {totalRegistros} registros
        </div>

        <div className="ext-pag-controls">
          <button
            type="button"
            className="ext-pag-btn"
            disabled={pagAtualReal === 1}
            onClick={() => setPaginaAtual((p) => p - 1)}
          >
            Anterior
          </button>

          {Array.from({ length: totalPaginas }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPaginas || Math.abs(p - pagAtualReal) <= 2)
            .map((p, idx, arr) => (
              <React.Fragment key={p}>
                {idx > 0 && arr[idx - 1] !== p - 1 && (
                  <span style={{ color: '#94a3b8', padding: '0 4px' }}>...</span>
                )}
                <button
                  type="button"
                  className={`ext-pag-btn ${pagAtualReal === p ? 'active' : ''}`}
                  onClick={() => setPaginaAtual(p)}
                >
                  {p}
                </button>
              </React.Fragment>
            ))}

          <button
            type="button"
            className="ext-pag-btn"
            disabled={pagAtualReal === totalPaginas}
            onClick={() => setPaginaAtual((p) => p + 1)}
          >
            Próxima
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Itens por página:</span>
          <select
            className="ext-input"
            style={{ width: 'auto', padding: '4px 8px' }}
            value={itensPorPagina}
            onChange={(e) => {
              setItensPorPagina(Number(e.target.value));
              setPaginaAtual(1);
            }}
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
      </div>

      {/* Legendas */}
      <div className="ext-legends">
        <div className="ext-legend-item">
          <div className="ext-legend-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
            <IcoCheckCircle />
          </div>
          <div className="ext-legend-text">
            <strong>Em dia</strong>
            <p>Extintores recarregados e dentro do prazo de validade (12 meses).</p>
          </div>
        </div>

        <div className="ext-legend-item">
          <div className="ext-legend-icon" style={{ background: '#fffbeb', color: '#d97706' }}>
            <IcoRelogio />
          </div>
          <div className="ext-legend-text">
            <strong>A vencer</strong>
            <p>Vencimento nos próximos 90 dias.</p>
          </div>
        </div>

        <div className="ext-legend-item">
          <div className="ext-legend-icon" style={{ background: '#fef2f2', color: '#dc2626' }}>
            <IcoAlertTriangle />
          </div>
          <div className="ext-legend-text">
            <strong>Vencido</strong>
            <p>Prazo de validade expirado. Requer atenção imediata.</p>
          </div>
        </div>

        <div className="ext-legend-item">
          <div className="ext-legend-icon" style={{ background: '#f1f5f9', color: '#475569' }}>
            <IcoDoc />
          </div>
          <div className="ext-legend-text">
            <strong>Sem registro</strong>
            <p>Condomínios que ainda não possuem cadastro de extintores.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
