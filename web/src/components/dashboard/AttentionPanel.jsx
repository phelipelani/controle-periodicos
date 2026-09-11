import React, { useMemo } from 'react';
import { formatarData } from '../format';

const IcoEye = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>;

export default function AttentionPanel({ servicos = [] }) {
  const atencao = useMemo(() => {
    const pendentes = servicos.filter(s => s.statusCalc === 'vencido' || s.statusCalc === 'a_vencer');
    
    // Regra de ordenação:
    // 1. Vencidos primeiro (mais dias vencidos no topo, ou seja, data menor)
    // 2. A vencer depois (menos dias restantes no topo, ou seja, data menor)
    pendentes.sort((a, b) => {
      if (a.statusCalc === 'vencido' && b.statusCalc !== 'vencido') return -1;
      if (a.statusCalc !== 'vencido' && b.statusCalc === 'vencido') return 1;
      
      // Se ambos são mesmo status, ordena pela data (crescente)
      const dataA = a.dataValidade || '9999-12-31';
      const dataB = b.dataValidade || '9999-12-31';
      return dataA.localeCompare(dataB);
    });
    
    return pendentes.slice(0, 10); // Mostrar top 10
  }, [servicos]);

  const renderDias = (s) => {
    if(s.statusCalc === 'vencido') return `${Math.abs(s.diasRestantes)} dias`;
    return `${s.diasRestantes} dias`;
  };

  return (
    <div className="dash-card">
      <div className="dash-card-header" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '20px', height: '20px', color: '#dc2626' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
          <h3 className="dash-card-title">Requer atenção</h3>
        </div>
        <p className="dash-card-subtitle">Itens que precisam da sua atenção imediata</p>
      </div>

      <div className="dash-table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              <th style={{width: '10%'}}>Prioridade</th>
              <th style={{width: '35%'}}>Condomínio</th>
              <th style={{width: '15%'}}>Serviço</th>
              <th style={{width: '15%'}}>Vencimento</th>
              <th style={{width: '15%'}}>Situação</th>
              <th style={{width: '10%', textAlign: 'center'}}>Ação</th>
            </tr>
          </thead>
          <tbody>
            {atencao.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                  <div style={{ color: '#16a34a', fontWeight: 600, fontSize: '16px' }}>Tudo em ordem 🎉</div>
                  <div style={{ color: '#64748b', marginTop: '4px' }}>Nenhum serviço requer atenção neste momento.</div>
                </td>
              </tr>
            ) : (
              atencao.map(s => (
                <tr key={s.id} className={s.statusCalc === 'vencido' ? 'vencido' : 'avencer'}>
                  <td style={{textAlign: 'center'}}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.statusCalc === 'vencido' ? '#dc2626' : '#d97706', margin: '0 auto' }}></div>
                  </td>
                  <td><strong>{s.condominioNome}</strong></td>
                  <td>{s.servicoNome}</td>
                  <td>{formatarData(s.dataValidade)}</td>
                  <td>
                    {s.statusCalc === 'vencido' ? (
                      <span className="dash-badge vencido">VENCIDO</span>
                    ) : (
                      <span className="dash-badge avencer">{renderDias(s)}</span>
                    )}
                  </td>
                  <td style={{textAlign: 'center'}}>
                    <button className="dash-btn-icon" style={{margin: '0 auto'}} title="Visualizar">
                      <IcoEye />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {atencao.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <a href="#" style={{ fontSize: '13px', fontWeight: 600, color: '#2563eb' }}>Ver todos os itens que requerem atenção →</a>
        </div>
      )}
    </div>
  );
}
