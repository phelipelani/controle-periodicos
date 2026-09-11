import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function ServiceStatusChart({ stats }) {
  const data = [
    { name: 'Em dia', value: stats.emDia, color: '#16a34a' },
    { name: 'A vencer', value: stats.aVencer, color: '#f59e0b' },
    { name: 'Vencidos', value: stats.vencidos, color: '#dc2626' },
    { name: 'Sem registro', value: stats.semRegistro, color: '#cbd5e1' }
  ];

  return (
    <div className="dash-card">
      <div className="dash-card-header">
        <h3 className="dash-card-title">Situação geral dos serviços</h3>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', height: '200px' }}>
        <div style={{ width: '180px', height: '180px', position: 'relative' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value} serviços`, '']} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
            <div className="dash-donut-val" style={{ fontSize: '24px', fontWeight: 700 }}>{stats.totalCondominios}</div>
            <div className="dash-donut-lbl" style={{ fontSize: '11px', color: '#94a3b8' }}>Condomínios</div>
          </div>
        </div>
        <div className="dash-legend">
          {data.map((item, i) => (
            <div key={i} className="dash-legend-item">
              <div className="dash-legend-color" style={{ background: item.color }}></div>
              <div style={{ flex: 1 }}>{item.name}</div>
              <div style={{ fontWeight: 600 }}>{item.value} <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 400 }}>({((item.value / stats.totalServicos) * 100 || 0).toFixed(0)}%)</span></div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 'auto', paddingTop: '16px', fontSize: '11px', color: '#94a3b8' }}>
        Dados atualizados em {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
      </div>
    </div>
  );
}
