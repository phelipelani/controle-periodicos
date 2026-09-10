import React from 'react';

const IcoAction = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>;

export default function RecentActivities({ atividades }) {
  return (
    <div className="dash-card">
      <div className="dash-card-header">
        <h3 className="dash-card-title">Atividades recentes</h3>
        <p className="dash-card-subtitle">Últimas ações no sistema</p>
      </div>
      
      <div className="dash-activity-list">
        {atividades.map((a) => (
          <div key={a.id} className="dash-activity-item">
            <div className="dash-activity-icon">
              <IcoAction />
            </div>
            <div className="dash-activity-info">
              <p><strong>{a.descricao}</strong></p>
              <span>{a.hora} &rarr; {a.servicoNome}</span>
            </div>
          </div>
        ))}
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <a href="#" style={{ fontSize: '13px', fontWeight: 600, color: '#2563eb' }}>Ver todas atividades →</a>
      </div>
    </div>
  );
}
