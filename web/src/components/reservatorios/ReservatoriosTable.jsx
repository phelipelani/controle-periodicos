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

function formatarCapacidade(litros) {
  if (litros === null || litros === undefined || litros === '') return '—';
  const num = Number(litros);
  if (isNaN(num)) return '—';
  return `${num.toLocaleString('pt-BR')} L`;
}

function renderBadge(status, diasRestantes) {
  switch (status) {
    case 'em_dia':
      return (
        <span className="res-badge em_dia">
          <IcoCheck /> Em dia
        </span>
      );
    case 'a_vencer':
      return (
        <span className="res-badge a_vencer">
          <IcoRelogio /> A vencer {diasRestantes != null ? `(${diasRestantes}d)` : ''}
        </span>
      );
    case 'vencido':
      return (
        <span className="res-badge vencido">
          <IcoVencido /> Vencido {diasRestantes != null ? `(${Math.abs(diasRestantes)}d)` : ''}
        </span>
      );
    default:
      return (
        <span className="res-badge sem_registro">
          <IcoAlertTriangle /> Sem registro
        </span>
      );
  }
}

export default function ReservatoriosTable({
  dados,
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

  return (
    <div className="res-table-card">
      <div className="res-table-wrap">
        <table className="res-table">
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
              <th className="sortable" onClick={() => onOrdenar('limpeza')}>
                Última limpeza {renderSortIcon('limpeza')}
              </th>
              <th className="sortable" onClick={() => onOrdenar('vencimento')}>
                Próximo vencimento {renderSortIcon('vencimento')}
              </th>
              <th className="sortable" onClick={() => onOrdenar('capacidade')}>
                Capacidade total {renderSortIcon('capacidade')}
              </th>
              <th className="sortable" onClick={() => onOrdenar('status')}>
                Situação {renderSortIcon('status')}
              </th>
              <th style={{ width: '110px', textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {carregando ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  Carregando registros de reservatórios...
                </td>
              </tr>
            ) : itensPaginados.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  Nenhum condomínio encontrado com os filtros selecionados.
                </td>
              </tr>
            ) : (
              itensPaginados.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className="res-code-badge">{item.codigo}</span>
                  </td>
                  <td>
                    <div className="res-condo-title">{item.condominio}</div>
                    {item.endereco && <div className="res-condo-sub">{item.endereco}</div>}
                  </td>
                  <td>
                    <span style={{ fontSize: '13px', color: item.gerente === 'Sem gerente' ? '#94a3b8' : 'inherit' }}>
                      {item.gerente}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: item.dataUltimaLimpeza ? '500' : 'normal', color: item.dataUltimaLimpeza ? 'inherit' : '#94a3b8' }}>
                      {formatarData(item.dataUltimaLimpeza)}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontWeight: item.dataProximoVencimento ? '600' : 'normal', color: item.status === 'vencido' ? '#ef4444' : 'inherit' }}>
                        {formatarData(item.dataProximoVencimento)}
                      </span>
                    </div>
                  </td>
                  <td>
                    {item.capacidadeLitros ? (
                      <span className="res-capacity-badge">
                        {formatarCapacidade(item.capacidadeLitros)}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>—</span>
                    )}
                  </td>
                  <td>
                    {renderBadge(item.status, item.diasRestantes)}
                  </td>
                  <td>
                    <div className="res-actions" style={{ justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="res-btn-icon"
                        title="Visualizar detalhes"
                        onClick={() => onVisualizar(item)}
                      >
                        <IcoEye />
                      </button>
                      <button
                        type="button"
                        className="res-btn-icon"
                        title="Editar registro"
                        onClick={() => onEditar(item)}
                      >
                        <IcoEdit />
                      </button>

                      <div className="res-dropdown">
                        <button
                          type="button"
                          className="res-btn-icon"
                          title="Mais opções"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDropdownAberto(dropdownAberto === item.id ? null : item.id);
                          }}
                        >
                          <IcoDots />
                        </button>

                        {dropdownAberto === item.id && (
                          <div className="res-dropdown-menu" ref={dropdownRef}>
                            <button
                              type="button"
                              className="res-dropdown-item"
                              onClick={() => {
                                setDropdownAberto(null);
                                onVisualizar(item);
                              }}
                            >
                              <IcoEye /> Visualizar detalhes
                            </button>
                            <button
                              type="button"
                              className="res-dropdown-item"
                              onClick={() => {
                                setDropdownAberto(null);
                                onEditar(item);
                              }}
                            >
                              <IcoEdit /> Editar registro
                            </button>
                            {item.anexo && (
                              <a
                                href={`/api/upload/preview?path=${encodeURIComponent(item.anexo)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="res-dropdown-item"
                                onClick={() => setDropdownAberto(null)}
                              >
                                <IcoDoc /> Ver laudo / recibo
                              </a>
                            )}
                            {isAdmin && (
                              <button
                                type="button"
                                className="res-dropdown-item danger"
                                onClick={() => {
                                  setDropdownAberto(null);
                                  onExcluir(item);
                                }}
                              >
                                <IcoTrash /> Limpar registro
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

      <div className="res-pagination">
        <div>
          Mostrando <strong>{totalItens > 0 ? indiceInicio + 1 : 0}</strong> a{' '}
          <strong>{Math.min(indiceInicio + itensPorPagina, totalItens)}</strong> de{' '}
          <strong>{totalItens}</strong> condomínios
        </div>

        <div className="res-pagination-controls">
          <label style={{ fontSize: '13px', color: '#64748b' }}>Linhas por página:</label>
          <select
            className="res-input"
            style={{ padding: '4px 8px', fontSize: '13px' }}
            value={itensPorPagina}
            onChange={(e) => {
              setItensPorPagina(Number(e.target.value));
              setPaginaAtual(1);
            }}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>

          <button
            type="button"
            className="res-pagination-btn"
            disabled={paginaAtual <= 1}
            onClick={() => setPaginaAtual((p) => Math.max(p - 1, 1))}
          >
            Anterior
          </button>
          <span>
            {paginaAtual} / {totalPaginas}
          </span>
          <button
            type="button"
            className="res-pagination-btn"
            disabled={paginaAtual >= totalPaginas}
            onClick={() => setPaginaAtual((p) => Math.min(p + 1, totalPaginas))}
          >
            Próximo
          </button>
        </div>
      </div>
    </div>
  );
}
