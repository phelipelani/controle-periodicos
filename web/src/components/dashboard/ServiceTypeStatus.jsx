import React, { useMemo } from 'react';
import { IcoSeguro, IcoCondominio, IcoCheck, IcoVencido, IcoDoc, IcoSpda } from '../icons';

export default function ServiceTypeStatus({ servicos = [], tiposServico = [] }) {
  const tableData = useMemo(() => {
    const catalogo = tiposServico.length > 0 ? tiposServico : [
      { id: 'seguro', chave: 'seguro', nome: 'Seguros', cor: '#16a34a' },
      { id: 'extintor', chave: 'extintor', nome: 'Extintores', cor: '#ef4444' }, 
      { id: 'dedetizacao', chave: 'dedetizacao', nome: 'Dedetização', cor: '#d4202a' },
      { id: 'reservatorio', chave: 'reservatorio', nome: 'Reservatórios', cor: '#0ea5e9' },
      { id: 'avcb', chave: 'avcb', nome: 'AVCB', cor: '#d97706' },
      { id: 'spda', chave: 'spda', nome: 'SPDA', cor: '#8b5cf6' }
    ];

    return catalogo.map(tipo => {
      const chave = tipo.chave || tipo.id;
      const srvs = servicos.filter(s => s.servicoId === chave || s.servicoChave === chave);
      const emDia = srvs.filter(s => s.statusCalc === 'em_dia').length;
      const aVencer = srvs.filter(s => s.statusCalc === 'a_vencer').length;
      const vencidos = srvs.filter(s => s.statusCalc === 'vencido').length;
      const sem = srvs.filter(s => s.statusCalc === 'sem_registro').length;
      
      const total = srvs.length;
      const percEmDia = total > 0 ? Math.round((emDia / total) * 100) : 0;
      
      return { ...tipo, id: chave, emDia, aVencer, vencidos, sem, percEmDia, total };
    });
  }, [servicos, tiposServico]);

  const Icos = {
    'seguro': IcoSeguro,
    'extintor': IcoVencido,
    'extintores': IcoVencido,
    'dedetizacao': IcoCheck,
    'reservatorio': IcoDoc,
    'reservatorios': IcoDoc,
    'avcb': IcoCondominio,
    'spda': IcoSpda,
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                      <div style={{ color: row.cor, fontSize: '18px', display: 'flex' }}><Icon /></div>
                      <span className="dash-service-name">{row.nome}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', color: '#16a34a', fontWeight: 600 }}>{row.emDia}</td>
                  <td style={{ textAlign: 'center', color: '#f59e0b', fontWeight: 600 }}>{row.aVencer}</td>
                  <td style={{ textAlign: 'center', color: '#ef4444', fontWeight: 600 }}>{row.vencidos}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className="dash-service-pct" style={{ fontSize: '13px', fontWeight: 600, width: '36px' }}>{row.percEmDia}%</span>
                      <div className="dash-progress-track" style={{ flex: 1, height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
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
    </div>
  );
}
