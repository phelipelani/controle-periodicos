import React from 'react';
import { IcoSino, IcoCalendario } from '../icons';

export default function DashboardHeader({ usuario }) {
  const hojeExtenso = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  const primeiroNome = usuario?.nome ? usuario.nome.split(' ')[0] : 'Administrador';
  
  return (
    <div className="dash-header">
      <div>
        <h1>Olá, {primeiroNome}! <span>👋</span></h1>
        <p>Aqui está o resumo geral dos serviços dos condomínios em tempo real.</p>
      </div>
      <div className="dash-header-right">
        <div className="dash-date">
          <IcoCalendario /> {hojeExtenso}
        </div>
      </div>
    </div>
  );
}
