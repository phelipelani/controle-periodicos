import React, { useState, useEffect, useRef } from 'react';
import {
  IcoEye,
  IcoEdit,
  IcoTrash,
  IcoDots,
  IcoCheck,
  IcoRelogio,
  IcoVencido,
  IcoDoc,
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

function renderBadge(status) {
  switch (status) {
    case 'ativo':
      return <span className="seg-badge ativo">Em dia</span>;
    case 'a_vencer':
      return <span className="seg-badge a_vencer">A vencer</span>;
    case 'vencido':
      return <span className="seg-badge vencido">Vencido</span>;
    default:
      return <span className="seg-badge sem_registro">Sem registro</span>;
  }
}

export default function SegurosTable({
  dados,
  carregando,
  isAdmin,
  onVisualizar,
  onEditar,
  onRenovar,
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

  return (
    <div className="seg-table-card">
      <div className="seg-table-wrap">
        <table className="seg-table">
          <thead>
            <tr>
              <th className="sortable" style={{ width: '80px' }} onClick={() => onOrdenar('codigo')}>
                Código {renderSortIcon('codigo')}
              </th>
              <th className="sortable" onClick={() => onOrdenar('condominio')}>
                Condomínio {renderSortIcon('condominio')}
              </th>
              <th className="sortable" onClick={() => onOrdenar('seguradora')}>
                Seguradora {renderSortIcon('seguradora')}
              </th>
              <th className="sortable" onClick={() => onOrdenar('corretora')}>
                Corretora {renderSortIcon('corretora')}
              </th>
              <th>Gerente</th>
              <th>Data renovação</th>
              <th className="sortable" onClick={() => onOrdenar('validade')}>
                Data validade {renderSortIcon('validade')}
              </th>
              <th className="sortable" onClick={() => onOrdenar('status')}>
                Status {renderSortIcon('status')}
              </th>
              <th style={{ width: '110px', textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {carregando ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  Carregando seguros...
                </td>
              </tr>
            ) : itensPaginados.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  Nenhum registro de seguro encontrado com os filtros selecionados.
                </td>
              </tr>
            ) : (
              itensPaginados.map((item) => (
                <tr key={item.id} className={`seg-row-${item.status}`}>
                  <td>
                    <span className="seg-code-badge">{item.codigo}</span>
                  </td>
                  <td>
                    <div className="seg-condo-title">{item.condominio}</div>
                  </td>
                  <td>{item.seguradora}</td>
                  <td>{item.corretora}</td>
                  <td>{item.gerente}</td>
                  <td>{formatarData(item.dataRenovacao)}</td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{formatarData(item.dataValidade)}</span>
                  </td>
                  <td>{renderBadge(item.status)}</td>
                  <td>
                    <div className="seg-actions" style={{ justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="seg-btn-icon"
                        title="Visualizar ficha completa"
                        onClick={() => onVisualizar(item)}
                      >
                        <IcoEye />
                      </button>
                      <button
                        type="button"
                        className="seg-btn-icon"
                        title="Editar dados"
                        onClick={() => onEditar(item)}
                      >
                        <IcoEdit />
                      </button>

                      <div className="seg-dropdown">
                        <button
                          type="button"
                          className="seg-btn-icon"
                          title="Mais opções"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDropdownAberto(dropdownAberto === item.id ? null : item.id);
                          }}
                        >
                          <IcoDots />
                        </button>

                        {dropdownAberto === item.id && (
                          <div className="seg-dropdown-menu" ref={dropdownRef}>
                            <button
                              type="button"
                              className="seg-dropdown-item"
                              onClick={() => {
                                setDropdownAberto(null);
                                onVisualizar(item);
                              }}
                            >
                              <IcoEye /> Ficha do seguro
                            </button>
                            <button
                              type="button"
                              className="seg-dropdown-item"
                              onClick={() => {
                                setDropdownAberto(null);
                                onEditar(item);
                              }}
                            >
                              <IcoEdit /> Editar dados
                            </button>
                            <button
                              type="button"
                              className="seg-dropdown-item"
                              onClick={() => {
                                setDropdownAberto(null);
                                onRenovar(item);
                              }}
                            >
                              <IcoCheck /> Renovar seguro
                            </button>
                            {item.documentoApolice && (
                              <a
                                href={`/api/upload/preview?path=${encodeURIComponent(item.documentoApolice.caminho)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="seg-dropdown-item"
                                onClick={() => setDropdownAberto(null)}
                              >
                                <IcoDoc /> Ver apólice
                              </a>
                            )}
                            {isAdmin && (
                              <button
                                type="button"
                                className="seg-dropdown-item danger"
                                onClick={() => {
                                  setDropdownAberto(null);
                                  onExcluir(item);
                                }}
                              >
                                <IcoTrash /> Limpar seguro
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

      {/* Pagination */}
      <div className="seg-pagination">
        <div>
          Mostrando <strong>{totalItens > 0 ? indiceInicio + 1 : 0}</strong> a{' '}
          <strong>{Math.min(indiceInicio + itensPorPagina, totalItens)}</strong> de{' '}
          <strong>{totalItens}</strong> registros
        </div>

        <div className="seg-pagination-controls">
          <label style={{ fontSize: '13px', color: '#64748b' }}>Itens por página:</label>
          <select
            className="seg-input"
            style={{ padding: '4px 8px', fontSize: '13px' }}
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
          </select>

          <button
            type="button"
            className="seg-pagination-btn"
            disabled={paginaAtual <= 1}
            onClick={() => setPaginaAtual((p) => Math.max(p - 1, 1))}
          >
            Anterior
          </button>

          {Array.from({ length: Math.min(totalPaginas, 7) }, (_, idx) => {
            const num = idx + 1;
            return (
              <button
                key={num}
                type="button"
                className={`seg-page-num ${paginaAtual === num ? 'active' : ''}`}
                onClick={() => setPaginaAtual(num)}
              >
                {num}
              </button>
            );
          })}

          <button
            type="button"
            className="seg-pagination-btn"
            disabled={paginaAtual >= totalPaginas}
            onClick={() => setPaginaAtual((p) => Math.min(p + 1, totalPaginas))}
          >
            Próxima
          </button>
        </div>
      </div>

      {/* Status Legend */}
      <div className="seg-legend">
        <div className="seg-legend-item">
          <div className="seg-legend-dot green" />
          <span><strong>Em dia</strong> — Seguro vigente dentro do prazo.</span>
        </div>
        <div className="seg-legend-item">
          <div className="seg-legend-dot orange" />
          <span><strong>A vencer</strong> — Vencimento nos próximos 30 dias.</span>
        </div>
        <div className="seg-legend-item">
          <div className="seg-legend-dot red" />
          <span><strong>Vencido</strong> — Seguro vencido. Requer atenção.</span>
        </div>
        <div className="seg-legend-item">
          <div className="seg-legend-dot slate" />
          <span><strong>Sem registro</strong> — Condomínio ainda não possui seguro cadastrado.</span>
        </div>
      </div>
    </div>
  );
}
