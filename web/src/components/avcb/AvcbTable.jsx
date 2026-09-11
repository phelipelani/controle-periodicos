import React, { useState, useEffect, useRef } from 'react';
import {
  IcoEye,
  IcoEdit,
  IcoTrash,
  IcoDots,
  IcoCheck,
  IcoRelogio,
  IcoAlertTriangle,
  IcoSort,
  IcoSortAsc,
  IcoSortDesc
} from '../icons';

function formatarData(dataStr) {
  if (!dataStr) return '—';
  const parts = dataStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dataStr;
}

function renderBadge(status, diasRestantes) {
  switch (status) {
    case 'em_dia':
      return (
        <span className="avcb-badge em_dia">
          <IcoCheck /> Em dia
        </span>
      );
    case 'a_vencer':
      return (
        <span className="avcb-badge a_vencer">
          <IcoRelogio /> A vencer {diasRestantes != null ? `(${diasRestantes}d)` : ''}
        </span>
      );
    case 'vencido':
      return (
        <span className="avcb-badge vencido">
          <IcoAlertTriangle /> Vencido {diasRestantes != null ? `(${Math.abs(diasRestantes)}d)` : ''}
        </span>
      );
    default:
      return <span className="avcb-badge sem_registro">Sem registro</span>;
  }
}

export default function AvcbTable({
  dados = [],
  carregando,
  isAdmin,
  onVisualizar,
  onEditar,
  onExcluir,
  paginaAtual,
  setPaginaAtual,
  itensPorPagina,
  setItensPorPagina,
  colunaOrdenacao,
  ordemDirecao,
  onOrdenar
}) {
  const [dropdownAberto, setDropdownAberto] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownAberto(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalItens = dados.length;
  const totalPaginas = Math.ceil(totalItens / itensPorPagina) || 1;
  const indiceInicio = (paginaAtual - 1) * itensPorPagina;
  const itensPaginados = dados.slice(indiceInicio, indiceInicio + itensPorPagina);

  const renderSortIcon = (coluna) => {
    if (colunaOrdenacao !== coluna) return <IcoSort />;
    return ordemDirecao === 'asc' ? <IcoSortAsc /> : <IcoSortDesc />;
  };

  const getPageNumbers = () => {
    const pages = [];
    if (totalPaginas <= 7) {
      for (let i = 1; i <= totalPaginas; i++) pages.push(i);
    } else {
      pages.push(1);
      if (paginaAtual > 3) pages.push('...');
      const start = Math.max(2, paginaAtual - 1);
      const end = Math.min(totalPaginas - 1, paginaAtual + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (paginaAtual < totalPaginas - 2) pages.push('...');
      pages.push(totalPaginas);
    }
    return pages;
  };

  return (
    <div className="avcb-table-card">
      <div className="avcb-table-header-bar">
        <div className="avcb-table-title">
          Condomínios <span className="avcb-table-count">{totalItens} registros</span>
        </div>
      </div>

      <div className="avcb-table-wrap">
        <table className="avcb-table">
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
              <th className="sortable" onClick={() => onOrdenar('atualizacao')}>
                Última atualização {renderSortIcon('atualizacao')}
              </th>
              <th className="sortable" onClick={() => onOrdenar('validade')}>
                Validade {renderSortIcon('validade')}
              </th>
              <th className="sortable" onClick={() => onOrdenar('status')}>
                Situação {renderSortIcon('status')}
              </th>
              <th style={{ width: '130px', textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {carregando ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  Carregando registros de AVCB...
                </td>
              </tr>
            ) : itensPaginados.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  Nenhum registro de AVCB encontrado com os filtros aplicados.
                </td>
              </tr>
            ) : (
              itensPaginados.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span style={{ fontWeight: 600, color: '#64748b' }}>{item.codigo}</span>
                  </td>
                  <td>
                    <div
                      className="avcb-condo-title"
                      style={{ fontWeight: 700, cursor: 'pointer' }}
                      onClick={() => onVisualizar(item)}
                      title="Clique para visualizar detalhes do AVCB"
                    >
                      {item.condominio}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 500 }}>{item.gerente}</span>
                  </td>
                  <td>{formatarData(item.dataAtualizacao)}</td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{formatarData(item.dataValidade)}</span>
                  </td>
                  <td>{renderBadge(item.status, item.diasRestantes)}</td>
                  <td>
                    <div className="avcb-actions" style={{ justifyContent: 'flex-end' }}>
                      {item.status === 'sem_registro' ? (
                        <button
                          type="button"
                          className="avcb-btn-action"
                          onClick={() => onEditar(item)}
                          title="Cadastrar AVCB"
                        >
                          registrar
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="avcb-btn-icon"
                            title="Visualizar ficha e documentos"
                            onClick={() => onVisualizar(item)}
                          >
                            <IcoEye />
                          </button>
                          <button
                            type="button"
                            className="avcb-btn-icon"
                            title="Editar registro de AVCB"
                            onClick={() => onEditar(item)}
                          >
                            <IcoEdit />
                          </button>
                        </>
                      )}

                      {/* Dropdown ⋮ */}
                      <div className="avcb-dropdown">
                        <button
                          type="button"
                          className="avcb-btn-icon"
                          title="Mais opções"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDropdownAberto(dropdownAberto === item.id ? null : item.id);
                          }}
                        >
                          <IcoDots />
                        </button>

                        {dropdownAberto === item.id && (
                          <div className="avcb-dropdown-menu" ref={dropdownRef}>
                            <button
                              type="button"
                              className="avcb-dropdown-item"
                              onClick={() => {
                                setDropdownAberto(null);
                                onVisualizar(item);
                              }}
                            >
                              <IcoEye /> Visualizar
                            </button>
                            <button
                              type="button"
                              className="avcb-dropdown-item"
                              onClick={() => {
                                setDropdownAberto(null);
                                onEditar(item);
                              }}
                            >
                              <IcoEdit /> Editar
                            </button>
                            {isAdmin && (
                              <button
                                type="button"
                                className="avcb-dropdown-item danger"
                                onClick={() => {
                                  setDropdownAberto(null);
                                  onExcluir(item);
                                }}
                              >
                                <IcoTrash /> Excluir
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
      <div className="avcb-pagination">
        <div className="avcb-per-page">
          <span>Itens por página:</span>
          <select
            className="avcb-select"
            style={{ width: '75px', padding: '6px 8px' }}
            value={itensPorPagina}
            onChange={(e) => {
              setItensPorPagina(Number(e.target.value));
              setPaginaAtual(1);
            }}
          >
            <option value={10}>10</option>
            <option value={12}>12</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span style={{ color: '#94a3b8' }}>
            Mostrando {totalItens === 0 ? 0 : indiceInicio + 1} -{' '}
            {Math.min(indiceInicio + itensPorPagina, totalItens)} de {totalItens}
          </span>
        </div>

        <div className="avcb-page-buttons">
          <button
            type="button"
            className="avcb-page-btn"
            disabled={paginaAtual === 1}
            onClick={() => setPaginaAtual((prev) => Math.max(1, prev - 1))}
          >
            Anterior
          </button>

          {getPageNumbers().map((p, idx) =>
            p === '...' ? (
              <span key={`dots-${idx}`} style={{ padding: '0 4px', color: '#94a3b8' }}>
                ...
              </span>
            ) : (
              <button
                key={p}
                type="button"
                className={`avcb-page-btn ${paginaAtual === p ? 'active' : ''}`}
                onClick={() => setPaginaAtual(p)}
              >
                {p}
              </button>
            )
          )}

          <button
            type="button"
            className="avcb-page-btn"
            disabled={paginaAtual === totalPaginas || totalPaginas === 0}
            onClick={() => setPaginaAtual((prev) => Math.min(totalPaginas, prev + 1))}
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
}
