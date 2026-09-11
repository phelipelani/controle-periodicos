import React from 'react';
import { IcoCondominio, IcoCheck, IcoRelogio, IcoVencido } from '../icons';
import AnimatedNumber from '../AnimatedNumber';

export default function SegurosKpis({ kpis = {}, filtroStatus = 'Todos', onSelectStatus }) {
  const {
    totalCondominios = 0,
    segurosAtivos = 0,
    percentualAtivos = '0,0%',
    proximosVencer = 0,
    segurosVencidos = 0,
    gerenteAtivo
  } = kpis;

  const pctAtivos = totalCondominios > 0 ? Math.round((segurosAtivos / totalCondominios) * 100) : 0;
  const pctAVencer = totalCondominios > 0 ? Math.round((proximosVencer / totalCondominios) * 100) : 0;
  const pctVencidos = totalCondominios > 0 ? Math.round((segurosVencidos / totalCondominios) * 100) : 0;

  const cards = [
    {
      id: 'Todos',
      title: 'Total de condomínios',
      value: totalCondominios,
      desc: gerenteAtivo ? `Gerente: ${gerenteAtivo}` : 'Total monitorados',
      icon: <IcoCondominio />,
      iconBg: '#eff6ff',
      iconColor: '#3b82f6',
      topBorder: '#3b82f6',
      valColor: '#0f172a',
      pct: totalCondominios > 0 ? 100 : 0,
      statusKey: 'Todos'
    },
    {
      id: 'ativo',
      title: 'Seguros ativos',
      value: segurosAtivos,
      desc: `${pctAtivos}% do escopo`,
      icon: <IcoCheck />,
      iconBg: '#f0fdf4',
      iconColor: '#16a34a',
      topBorder: '#16a34a',
      valColor: '#16a34a',
      pct: pctAtivos,
      statusKey: 'ativo'
    },
    {
      id: 'a_vencer',
      title: 'Próximos a vencer',
      value: proximosVencer,
      desc: `${pctAVencer}% do escopo (30 dias)`,
      icon: <IcoRelogio />,
      iconBg: '#fffbeb',
      iconColor: '#d97706',
      topBorder: '#d97706',
      valColor: '#d97706',
      pct: pctAVencer,
      statusKey: 'a_vencer'
    },
    {
      id: 'vencido',
      title: 'Seguros vencidos',
      value: segurosVencidos,
      desc: `${pctVencidos}% do escopo`,
      icon: <IcoVencido />,
      iconBg: '#fef2f2',
      iconColor: '#dc2626',
      topBorder: '#dc2626',
      valColor: '#dc2626',
      pct: pctVencidos,
      statusKey: 'vencido'
    }
  ];

  return (
    <div className="ded-kpis">
      {cards.map((card) => {
        const isActive = filtroStatus === card.statusKey;
        return (
          <div
            key={card.id}
            className={`ded-kpi-card ${isActive ? 'active' : ''}`}
            onClick={() => onSelectStatus(card.statusKey)}
            style={{ borderTop: `4px solid ${card.topBorder}`, position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
            <div className="ded-kpi-top">
              <div className="ded-kpi-icon" style={{ background: card.iconBg, color: card.iconColor }}>
                {card.icon}
              </div>
              <div className="ded-kpi-info">
                <span className="ded-kpi-label">{card.title}</span>
                <span className="ded-kpi-value" style={{ color: card.valColor }}>
                  <AnimatedNumber value={card.value} />
                </span>
              </div>
            </div>
            <div className="ded-kpi-desc">{card.desc}</div>
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                height: '3px',
                width: `${card.pct}%`,
                background: card.topBorder,
                transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
