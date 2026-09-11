import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ExpirationChart({ servicos }) {
  // Gera os próximos 6 meses dinamicamente
  const chartData = useMemo(() => {
    const meses = [];
    const hoje = new Date();
    
    for (let i = 0; i < 6; i++) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
      const mesStr = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      // Capitalize
      const mesFormatado = mesStr.charAt(0).toUpperCase() + mesStr.slice(1);
      meses.push({
        mesRaw: d.toISOString().slice(0, 7), // yyyy-mm
        name: mesFormatado,
        'Em dia': 0,
        'A vencer': 0,
        'Vencidos': 0
      });
    }

    // Agrupa os serviços pelas datas de validade (apenas os que não são sem_registro e possuem data)
    servicos.forEach(s => {
      if (s.statusCalc === 'sem_registro' || !s.dataValidade) return;
      const yyyymm = s.dataValidade.slice(0, 7);
      const mesRef = meses.find(m => m.mesRaw === yyyymm);
      if (mesRef) {
        if (s.statusCalc === 'vencido') mesRef['Vencidos'] += 1;
        else if (s.statusCalc === 'a_vencer') mesRef['A vencer'] += 1;
        else mesRef['Em dia'] += 1;
      } else {
        // Se for vencido de um mês passado, joga no mês atual para visibilidade, ou ignora do chart futuro
        if (s.statusCalc === 'vencido' && s.dataValidade < meses[0].mesRaw) {
           meses[0]['Vencidos'] += 1;
        }
      }
    });

    return meses;
  }, [servicos]);

  return (
    <div className="dash-card">
      <div className="dash-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 className="dash-card-title">Vencimentos previstos</h3>
          <p className="dash-card-subtitle">Quantidade de serviços com vencimento por mês</p>
        </div>
        <select className="dash-filter-select" style={{ width: 'auto', padding: '6px 12px' }}>
          <option>Próximos 6 meses</option>
          <option>Próximos 12 meses</option>
        </select>
      </div>
      <div style={{ width: '100%', height: '220px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
            <Tooltip 
              cursor={{fill: '#f8fafc'}} 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            <Bar dataKey="Em dia" stackId="a" fill="#16a34a" radius={[0, 0, 4, 4]} />
            <Bar dataKey="A vencer" stackId="a" fill="#f59e0b" />
            <Bar dataKey="Vencidos" stackId="a" fill="#dc2626" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '16px', fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div className="dash-legend-color" style={{ background: '#dc2626' }}></div> Vencidos</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div className="dash-legend-color" style={{ background: '#f59e0b' }}></div> A vencer</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div className="dash-legend-color" style={{ background: '#16a34a' }}></div> Em dia</div>
      </div>
    </div>
  );
}
