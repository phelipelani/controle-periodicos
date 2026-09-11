import React, { useState } from 'react';
import { DedetizacaoStatusBadge } from './DedetizacaoComponents';
import { IcoDoc, IcoSino, IcoEye, IcoEdit, IcoDots, IcoSort, IcoSortAsc, IcoSortDesc } from '../icons';

export default function DedetizacaoTable({
  data,
  onEdit,
  onVisualizar,
  colunaOrdenacao = 'codigo',
  ordemDirecao = 'asc',
  onOrdenar = () => {}
}) {
  const [menuAbertoId, setMenuAbertoId] = useState(null);

  const toggleMenu = (e, id) => {
    e.stopPropagation();
    setMenuAbertoId(menuAbertoId === id ? null : id);
  };

  const renderSortIcon = (coluna) => {
    if (colunaOrdenacao !== coluna) return <IcoSort />;
    return ordemDirecao === 'asc' ? <IcoSortAsc /> : <IcoSortDesc />;
  };

  return (
    <div className="ded-table-card" onClick={() => setMenuAbertoId(null)}>
      <div className="ded-table-wrap">
        <table className="ded-table">
          <thead>
            <tr>
              <th className="sortable" style={{ width: '85px' }} onClick={() => onOrdenar('codigo')}>
                Código {renderSortIcon('codigo')}
              </th>
              <th className="sortable" onClick={() => onOrdenar('condominio')}>
                Condomínio {renderSortIcon('condominio')}
              </th>
              <th className="sortable" onClick={() => onOrdenar('empresa')}>
                Empresa Executora {renderSortIcon('empresa')}
              </th>
              <th className="sortable" onClick={() => onOrdenar('dataAgendada')}>
                Data Agendada {renderSortIcon('dataAgendada')}
              </th>
              <th className="sortable" onClick={() => onOrdenar('dataExecucao')}>
                Data Execução {renderSortIcon('dataExecucao')}
              </th>
              <th className="sortable" onClick={() => onOrdenar('validade')}>
                Próxima Execução<br/><span style={{fontSize: '10px', color: '#94a3b8'}}>(Validade)</span> {renderSortIcon('validade')}
              </th>
              <th className="sortable" onClick={() => onOrdenar('status')}>
                Status {renderSortIcon('status')}
              </th>
              <th className="sortable" onClick={() => onOrdenar('nota')}>
                Nota / Recibo {renderSortIcon('nota')}
              </th>
              <th style={{ textAlign: 'center', width: '100px' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {data.map(row => (
              <tr key={row.id}>
                <td>{row.codigo}</td>
                <td><strong>{row.condominio}</strong></td>
                <td>{row.empresa}</td>
                <td>
                  {row.dataAgendada}<br/>
                  <span style={{color: '#64748b'}}>{row.periodoAgendado}</span>
                </td>
                <td>{row.dataExecucao || '—'}</td>
                <td>
                  {row.validade || row.dataAgendada}<br/>
                  <span style={{color: '#64748b'}}>{row.validade ? '(6 meses)' : '(Prevista)'}</span>
                </td>
                <td>
                  <DedetizacaoStatusBadge status={row.status} />
                </td>
                <td>
                  {row.temNota ? (
                    <div 
                      className="ded-nota ok" 
                      style={{ cursor: 'pointer' }} 
                      onClick={() => onVisualizar(row)}
                      title="Clique para ver o recibo"
                    >
                      <IcoDoc /> Anexada
                    </div>
                  ) : (
                    <div className="ded-nota nok"><IcoSino /> Pendente</div>
                  )}
                </td>
                <td>
                  <div className="ded-actions">
                    <button 
                      type="button" 
                      className="ded-btn-icon" 
                      title="Visualizar detalhes" 
                      onClick={() => onVisualizar(row)}
                    >
                      <IcoEye />
                    </button>
                    <button 
                      type="button" 
                      className="ded-btn-icon" 
                      title={row.agendamento_id ? "Editar agendamento / Registrar execução" : "Registrar execução / Agendar"} 
                      onClick={() => onEdit(row, row.agendamento_id ? 'agendamento' : 'execucao')}
                    >
                      <IcoEdit />
                    </button>
                    <div style={{ position: 'relative' }}>
                      <button 
                        type="button" 
                        className="ded-btn-icon" 
                        title="Mais opções"
                        onClick={(e) => toggleMenu(e, row.id)}
                      >
                        <IcoDots />
                      </button>

                      {menuAbertoId === row.id && (
                        <div
                          style={{
                            position: 'absolute',
                            right: 0,
                            top: '100%',
                            background: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            zIndex: 20,
                            minWidth: '180px',
                            padding: '4px 0'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', border: 'none', background: 'none', fontSize: '13px', color: '#334155', cursor: 'pointer' }}
                            onClick={() => { setMenuAbertoId(null); onVisualizar(row); }}
                          >
                            Visualizar detalhes
                          </button>
                          <button
                            type="button"
                            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', border: 'none', background: 'none', fontSize: '13px', color: '#2563eb', cursor: 'pointer' }}
                            onClick={() => { setMenuAbertoId(null); onEdit(row, 'agendamento'); }}
                          >
                            {row.agendamento_id ? 'Editar agendamento' : 'Agendar visita'}
                          </button>
                          <button
                            type="button"
                            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', border: 'none', background: 'none', fontSize: '13px', color: '#334155', cursor: 'pointer' }}
                            onClick={() => { setMenuAbertoId(null); onEdit(row, 'execucao'); }}
                          >
                            Registrar execução
                          </button>
                          {row.agendamento_id && (
                            <button
                              type="button"
                              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', border: 'none', background: 'none', fontSize: '13px', color: '#dc2626', cursor: 'pointer' }}
                              onClick={() => { setMenuAbertoId(null); onEdit(row, 'agendamento'); }}
                            >
                              Cancelar agendamento...
                            </button>
                          )}
                          {row.temNota && (
                            <button
                              type="button"
                              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', border: 'none', background: 'none', fontSize: '13px', color: '#16a34a', cursor: 'pointer' }}
                              onClick={() => { setMenuAbertoId(null); onVisualizar(row); }}
                            >
                              Ver recibo / nota
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="ded-pagination">
        <div>Mostrando 1 a 5 de 28 registros</div>
        <div className="ded-pag-controls">
          <button className="ded-pag-btn">Anterior</button>
          <button className="ded-pag-btn active">1</button>
          <button className="ded-pag-btn">2</button>
          <button className="ded-pag-btn">3</button>
          <button className="ded-pag-btn" style={{border: 'none', background: 'transparent'}}>...</button>
          <button className="ded-pag-btn">6</button>
          <button className="ded-pag-btn">Próxima</button>
        </div>
        <div>
          Itens por página: <select className="ded-input" style={{width:'auto', padding:'4px 8px'}}><option>10</option></select>
        </div>
      </div>
    </div>
  );
}
