import React, { useMemo } from 'react';

export default function CriticalCondominiums({ condominios, servicos }) {
  const ranking = useMemo(() => {
    const list = condominios.map(c => {
      const srvs = servicos.filter(s => s.condominioId === c.id);
      const vencidos = srvs.filter(s => s.statusCalc === 'vencido').length;
      const aVencer = srvs.filter(s => s.statusCalc === 'a_vencer').length;
      return { ...c, vencidos, aVencer, totalCritico: vencidos + aVencer };
    });
    
    // Sort by vencidos desc, then aVencer desc
    list.sort((a, b) => {
      if (b.vencidos !== a.vencidos) return b.vencidos - a.vencidos;
      return b.aVencer - a.aVencer;
    });
    
    return list.filter(c => c.totalCritico > 0).slice(0, 5);
  }, [condominios, servicos]);

  return (
    <div className="dash-card">
      <div className="dash-card-header">
        <h3 className="dash-card-title">Condomínios em situação crítica</h3>
        <p className="dash-card-subtitle">Ranking dos condomínios que mais precisam de atenção</p>
      </div>
      
      <div className="dash-ranking-list">
        {ranking.length === 0 ? (
          <div style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>Nenhum condomínio em situação crítica.</div>
        ) : (
          ranking.map((c, i) => (
            <div key={c.id} className="dash-ranking-item">
              <div className="dash-ranking-num">{i + 1}</div>
              <div className="dash-ranking-info">
                <strong>{c.nome}</strong>
                <span>{c.vencidos} vencidos | {c.aVencer} próximos</span>
              </div>
            </div>
          ))
        )}
      </div>
      
      {ranking.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <a href="#" style={{ fontSize: '13px', fontWeight: 600, color: '#2563eb' }}>Ver ranking completo →</a>
        </div>
      )}
    </div>
  );
}
