import React from 'react';
import { IcoSeta } from '../icons';

export default function ExpirationCalendar({ servicos }) {
  const hoje = new Date();
  
  // Para simplificar o mock visual do calendário, vamos fixar no mês atual
  const diasDoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const dias = Array.from({length: diasDoMes}, (_, i) => i + 1);
  const offset = new Date(hoje.getFullYear(), hoje.getMonth(), 1).getDay(); // dia da semana do dia 1
  const diasMock = Array(offset).fill(null).concat(dias);

  const temVencimento = (dia) => {
    if(!dia) return null;
    const dStr = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
    const srvs = servicos.filter(s => s.dataValidade === dStr);
    if(srvs.length === 0) return null;
    if(srvs.some(s => s.statusCalc === 'vencido')) return 'vencido';
    if(srvs.some(s => s.statusCalc === 'a_vencer')) return 'avencer';
    return 'emdia';
  };

  const getDayClass = (dia) => {
    if(!dia) return '';
    if(dia === hoje.getDate()) return 'active-vencido'; // Mock highlight
    return '';
  };

  return (
    <div className="dash-card">
      <div className="dash-card-header" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '20px', height: '20px', color: '#dc2626' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9.5h18M8 3v4M16 3v4" /></svg></div>
          <h3 className="dash-card-title">Calendário de vencimentos</h3>
        </div>
      </div>
      
      <div className="dash-cal-header">
        <button className="dash-btn-icon" style={{border:'none'}}><IcoSeta style={{transform: 'rotate(180deg)'}}/></button>
        {hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
        <button className="dash-btn-icon" style={{border:'none'}}><IcoSeta /></button>
      </div>

      <div className="dash-cal-grid">
        {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
          <div key={d} className="dash-cal-day-name">{d}</div>
        ))}
        {diasMock.map((dia, i) => {
          const status = temVencimento(dia);
          return (
            <div key={i} className={`dash-cal-day ${getDayClass(dia)}`}>
              {dia || ''}
              {status && <div className={`dash-cal-dot ${status}`}></div>}
            </div>
          )
        })}
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <a href="#" style={{ fontSize: '13px', fontWeight: 600, color: '#2563eb' }}>Ver calendário completo →</a>
      </div>
    </div>
  );
}
