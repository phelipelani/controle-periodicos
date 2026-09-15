import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IcoSeta } from '../icons';

export default function ExpirationCalendar({ servicos = [] }) {
  const navigate = useNavigate();
  const hoje = new Date();
  const [dataVisualizacao, setDataVisualizacao] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1));

  const ano = dataVisualizacao.getFullYear();
  const mes = dataVisualizacao.getMonth();

  const diasDoMes = new Date(ano, mes + 1, 0).getDate();
  const dias = Array.from({ length: diasDoMes }, (_, i) => i + 1);
  const offset = new Date(ano, mes, 1).getDay(); // 0 = Domingo, 1 = Segunda, etc.
  const diasMock = Array(offset).fill(null).concat(dias);

  const mesAnterior = () => {
    setDataVisualizacao(new Date(ano, mes - 1, 1));
  };

  const proximoMes = () => {
    setDataVisualizacao(new Date(ano, mes + 1, 1));
  };

  const hojeMesmo = () => {
    setDataVisualizacao(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  };

  const temVencimento = (dia) => {
    if (!dia) return null;
    const dStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    const srvs = servicos.filter(s => s.dataValidade === dStr);
    if (srvs.length === 0) return null;
    if (srvs.some(s => s.statusCalc === 'vencido')) return 'vencido';
    if (srvs.some(s => s.statusCalc === 'a_vencer')) return 'avencer';
    return 'emdia';
  };

  const getDayClass = (dia) => {
    if (!dia) return '';
    const isHoje = dia === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear();
    if (isHoje) return 'active-vencido';
    return '';
  };

  const nomeMesAno = dataVisualizacao.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());

  return (
    <div className="dash-card">
      <div className="dash-card-header" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '20px', height: '20px', color: '#dc2626' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M3 9.5h18M8 3v4M16 3v4" />
              </svg>
            </div>
            <h3 className="dash-card-title">Calendário de vencimentos</h3>
          </div>
          {(mes !== hoje.getMonth() || ano !== hoje.getFullYear()) && (
            <button
              type="button"
              onClick={hojeMesmo}
              style={{
                background: 'none',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '2px 8px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                color: '#475569'
              }}
            >
              Mês Atual
            </button>
          )}
        </div>
      </div>
      
      <div className="dash-cal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button 
          type="button"
          className="dash-btn-icon" 
          onClick={mesAnterior}
          title="Mês anterior"
        >
          <IcoSeta style={{ transform: 'rotate(180deg)' }} />
        </button>
        <span style={{ fontWeight: 700, fontSize: '14px' }}>{nomeMesAno}</span>
        <button 
          type="button"
          className="dash-btn-icon" 
          onClick={proximoMes}
          title="Próximo mês"
        >
          <IcoSeta />
        </button>
      </div>

      <div className="dash-cal-grid">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
          <div key={d} className="dash-cal-day-name">{d}</div>
        ))}
        {diasMock.map((dia, i) => {
          const status = temVencimento(dia);
          return (
            <div 
              key={i} 
              className={`dash-cal-day ${getDayClass(dia)}`}
              title={dia ? `Dia ${dia}/${mes + 1}/${ano}${status ? ` - Possui vencimentos (${status})` : ''}` : ''}
            >
              {dia || ''}
              {status && <div className={`dash-cal-dot ${status}`}></div>}
            </div>
          );
        })}
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <button
          type="button"
          className="dash-link-btn"
          onClick={() => navigate('/agendamentos')}
        >
          Ver agendamentos e calendário completo →
        </button>
      </div>
    </div>
  );
}
