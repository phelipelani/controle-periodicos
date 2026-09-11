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
        <span className="spda-badge em_dia">
          <IcoCheck /> Em dia
        </span>
      );
    case 'a_vencer':
      return (
        <span className="spda-badge a_vencer">
          <IcoRelogio /> A vencer {diasRestantes != null ? `(${diasRestantes}d)` : ''}
        </span>
      );
    case 'vencido':
      return (
        <span className="spda-badge vencido">
          <IcoAlertTriangle /> Vencido {diasRestantes != null ? `(${Math.abs(diasRestantes)}d)` : ''}
        </span>
      );
    default:
      return <span className="spda-badge sem_registro">Sem registro</span>;
  }
}

export default function SpdaTable({
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

  // Geração de botões de página (1, 2, 3... total)
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
    <div className="spda-table-card">
      <div className="spda-table-header-bar">
        <div className="spda-table-title">
          Condomínios <span className="spda-table-count">{totalItens} registros</span>
        </div>
      </div>

      <div className="spda-table-wrap">
        <table className="spda-table">
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
                  Carregando registros de SPDA...
                </td>
              </tr>
            ) : itensPaginados.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  Nenhum registro de SPDA encontrado com os filtros aplicados.
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
                      className="spda-condo-title"
                      style={{ fontWeight: 700, cursor: 'pointer' }}
                      onClick={() => onVisualizar(item)}
                      title="Clique para visualizar detalhes do SPDA"
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
                    <div className="spda-actions" style={{ justifyContent: 'flex-end' }}>
                      {item.status === 'sem_registro' ? (
                        <button
                          type="button"
                          className="spda-btn-action"
                          onClick={() => onEditar(item)}
                          title="Cadastrar SPDA"
                        >
                          registrar
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="spda-btn-icon"
                            title="Visualizar ficha e documentos"
                            onClick={() => onVisualizar(item)}
                          >
                            <IcoEye />
                          </button>
                          <button
                            type="button"
                            className="spda-btn-icon"
                            title="Editar registro de SPDA"
                            onClick={() => onEditar(item)}
                          >
                            <IcoEdit />
                          </button>
                        </>
                      )}

                      {/* Dropdown ⋮ */}
                      <div className="spda-dropdown">
                        <button
                          type="button"
                          className="spda-btn-icon"
                          title="Mais opções"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDropdownAberto(dropdownAberto === item.id ? null : item.id);
                          }}
                        >
                          <IcoDots />
                        </button>

                        {dropdownAberto === item.id && (
                          <div className="spda-dropdown-menu" ref={dropdownRef}>
                            <button
                              type="button"
                              className="spda-dropdown-item"
                              onClick={() => {
                                setDropdownAberto(null);
                                onVisualizar(item);
                              }}
                            >
                              <IcoEye /> Visualizar
                            </button>
                            <button
                              type="button"
                              className="spda-dropdown-item"
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
                                className="spda-dropdown-item danger"
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

      {/* Barra de Paginação */}
      <div className="spda-pagination-bar">
        <div>
          Mostrando {totalItens === 0 ? 0 : indiceInicio + 1} a{' '}
          {Math.min(indiceInicio + itensPorPagina, totalItens)} de {totalItens} registros
        </div>

        <div className="spda-pagination-controls">
          <button
            type="button"
            className="spda-page-btn"
            disabled={paginaAtual <= 1}
            onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
          >
            Anterior
          </button>

          {getPageNumbers().map((num, idx) =>
            num === '...' ? (
              <span key={`dots-${idx}`} style={{ padding: '0 4px', color: '#94a3b8' }}>
                ...
              </span>
            ) : (
              <button
                key={num}
                type="button"
                className={`spda-page-btn ${paginaAtual === num ? 'active' : ''}`}
                onClick={() => setPaginaAtual(num)}
              >
                {num}
              </button>
            )
          )}

          <button
            type="button"
            className="spda-page-btn"
            disabled={paginaAtual >= totalPaginas}
            onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
          >
            Próxima
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Itens por página:</span>
          <select
            className="spda-select"
            style={{ width: '70px', height: '32px' }}
            value={itensPorPagina}
            onChange={(e) => {
              setItensPorPagina(Number(e.target.value));
              setPaginaAtual(1);
            }}
          >
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>
    </div>
  );
}
