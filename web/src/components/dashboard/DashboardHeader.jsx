import React from 'react';
import { IcoSino, IcoCalendario } from '../icons';

export default function DashboardHeader() {
  const hojeExtenso = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  
  return (
    <div className="dash-header">
      <div>
        <h1>Olá, Administrador! <span>👋</span></h1>
        <p>Aqui está o resumo geral dos serviços dos condomínios.</p>
      </div>
      <div className="dash-header-right">
        <div className="dash-date">
          <IcoCalendario /> {hojeExtenso}
        </div>
      </div>
    </div>
  );
}
