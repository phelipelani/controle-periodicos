import React, { useMemo } from 'react';
import { tiposServico } from './mockData';
import { IcoSeguro, IcoCondominio, IcoCheck, IcoVencido, IcoDoc } from '../icons'; // reuse icons for mockup

export default function ServiceTypeStatus({ servicos }) {
  const tableData = useMemo(() => {
    return tiposServico.map(tipo => {
      const srvs = servicos.filter(s => s.servicoId === tipo.id);
      const emDia = srvs.filter(s => s.statusCalc === 'em_dia').length;
      const aVencer = srvs.filter(s => s.statusCalc === 'a_vencer').length;
      const vencidos = srvs.filter(s => s.statusCalc === 'vencido').length;
      const sem = srvs.filter(s => s.statusCalc === 'sem_registro').length;
      
      const total = srvs.length;
      const percEmDia = total > 0 ? Math.round((emDia / total) * 100) : 0;
      
      return { ...tipo, emDia, aVencer, vencidos, sem, percEmDia, total };
    });
  }, [servicos]);

  const Icos = {
    'seguro': IcoSeguro,
    'extintores': IcoVencido, // placeholder
    'dedetizacao': IcoCheck,
    'reservatorios': IcoDoc,
    'avcb': IcoCondominio,
  };

  return (
    <div className="dash-card">
      <div className="dash-card-header">
        <h3 className="dash-card-title">Situação por tipo de serviço</h3>
      </div>
      
      <div className="dash-table-wrap">
        <table className="dash-table" style={{ width: '100%', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ width: '25%' }}>Serviço</th>
              <th style={{ width: '15%', textAlign: 'center' }}>Em dia</th>
              <th style={{ width: '15%', textAlign: 'center' }}>A vencer</th>
              <th style={{ width: '15%', textAlign: 'center' }}>Vencidos</th>
              <th style={{ width: '30%' }}>% Em dia</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map(row => {
              const Icon = Icos[row.id] || IcoSeguro;
              return (
                <tr key={row.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#334155' }}>
                      <div style={{ color: row.cor, fontSize: '18px', display: 'flex' }}><Icon /></div>
                      {row.nome}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', color: '#16a34a' }}>{row.emDia}</td>
                  <td style={{ textAlign: 'center', color: '#d97706' }}>{row.aVencer}</td>
                  <td style={{ textAlign: 'center', color: '#dc2626' }}>{row.vencidos}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569', width: '36px' }}>{row.percEmDia}%</span>
                      <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${row.percEmDia}%`, height: '100%', background: '#16a34a', borderRadius: '3px' }}></div>
                      </div>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: '16px' }}>
        <a href="/servicos" style={{ fontSize: '13px', fontWeight: 600, color: '#2563eb' }}>Ver todos os serviços →</a>
      </div>
    </div>
  );
}
