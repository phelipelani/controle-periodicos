import React from 'react';
import { DedetizacaoStatusBadge } from './DedetizacaoComponents';
import { IcoDoc, IcoSino, IcoEye, IcoEdit, IcoDots } from '../icons';

export default function DedetizacaoTable({ data, onEdit }) {
  return (
    <div className="ded-table-card">
      <div className="ded-table-wrap">
        <table className="ded-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Condomínio</th>
              <th>Empresa Executora</th>
              <th>Data Agendada</th>
              <th>Data Execução</th>
              <th>Próxima Execução<br/><span style={{fontSize: '10px', color: '#94a3b8'}}>(Validade)</span></th>
              <th>Status</th>
              <th>Nota / Recibo</th>
              <th>Ações</th>
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
                    <div className="ded-nota ok"><IcoDoc /> Anexada</div>
                  ) : (
                    <div className="ded-nota nok"><IcoSino /> Pendente</div>
                  )}
                </td>
                <td>
                  <div className="ded-actions">
                    <button className="ded-btn-icon" title="Visualizar agendamento"><IcoEye /></button>
                    <button className="ded-btn-icon" title="Registrar execução / Editar" onClick={() => onEdit(row)}><IcoEdit /></button>
                    <button className="ded-btn-icon" title="Mais opções"><IcoDots /></button>
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
