import React from 'react';
import { useNavigate } from 'react-router-dom';
import { IcoEngrenagem, IcoRelogio, IcoCheckCircle, IcoAlert, IcoAlertTriangle, IcoDedetizacao, IcoExtintor, IcoReservatorio, IcoSeguro, IcoAvcb, IcoSpda } from '../icons';

const iconMap = {
  dedetizacao: IcoDedetizacao,
  reservatorio: IcoReservatorio,
  extintor: IcoExtintor,
  avcb: IcoAvcb,
  seguro: IcoSeguro,
  spda: IcoSpda
};

export default function CondominioCard({ condominio, onEdit }) {
  const navigate = useNavigate();

  const getStatusInfo = (status) => {
    switch (status) {
      case 'em_dia': return { label: 'Todos em dia', cls: 'em_dia', Ico: IcoCheckCircle };
      case 'a_vencer': return { label: 'Atenção', cls: 'a_vencer', Ico: IcoAlert };
      case 'vencido': case 'sem_registro': return { label: 'Com pendências', cls: 'vencido', Ico: IcoAlertTriangle };
      default: return { label: 'Com pendências', cls: 'vencido', Ico: IcoAlertTriangle };
    }
  };

  const mainStatus = getStatusInfo(condominio.statusGeral);
  
  // Pegar a última data de atualização dentre os serviços
  let lastUpdate = null;
  if (condominio.servicos) {
    condominio.servicos.forEach(s => {
      if (s.ultima_realizacao && (!lastUpdate || new Date(s.ultima_realizacao) > new Date(lastUpdate))) {
        lastUpdate = s.ultima_realizacao;
      }
    });
  }

  const handleAction = (e) => {
    e.stopPropagation();
    onEdit(condominio);
  };

  const getServiceStatusText = (s) => {
    if (s.status === 'em_dia') return `Em dia (Próx: ${s.data_vencimento ? s.data_vencimento.split('-').reverse().join('/') : '-'})`;
    if (s.status === 'a_vencer') return `Atenção: Vence em ${s.diasRestantes} dias (${s.data_vencimento.split('-').reverse().join('/')})`;
    if (s.status === 'vencido') return `Atrasado: Venceu dia ${s.data_vencimento.split('-').reverse().join('/')}`;
    return 'Sem registro de execução/validade';
  };

  const codigoStr = condominio.codigo ? String(condominio.codigo).padStart(2, '0') : String(condominio.id).padStart(2, '0');

  // Garante a ordem dos 6 serviços fixos como no desenho do usuário:
  // Dedetização | Limpeza | Extintor | AVCB | Seguro | SPDA
  const servicosPadrao = [
    { chave: 'dedetizacao', nomeDisplay: 'Dedetização', defaultNome: 'Dedetização' },
    { chave: 'reservatorio', nomeDisplay: 'Limpeza', defaultNome: 'Reservatórios' },
    { chave: 'extintor', nomeDisplay: 'Extintor', defaultNome: 'Extintores' },
    { chave: 'avcb', nomeDisplay: 'AVCB', defaultNome: 'AVCB' },
    { chave: 'seguro', nomeDisplay: 'Seguro', defaultNome: 'Seguro' },
    { chave: 'spda', nomeDisplay: 'SPDA', defaultNome: 'SPDA' },
  ];

  const servicosExibicao = servicosPadrao.map(padrao => {
    const encontrado = condominio.servicos?.find(s => s.chave === padrao.chave);
    return encontrado || {
      chave: padrao.chave,
      nome: padrao.defaultNome,
      status: 'sem_registro'
    };
  });

  return (
    <div className="cond-card" onClick={() => navigate(`/condominios/${condominio.id}`)}>
      {/* Botão de Opções rápido no canto superior */}
      <div className="cond-card-top-actions">
        <button className="cond-btn-icon-float" onClick={handleAction} title="Opções do Condomínio">
          <IcoEngrenagem width="16" height="16" />
        </button>
      </div>

      {/* 1. Imagem de Capa do Condomínio */}
      <div className="cond-card-banner">
        {condominio.imagem ? (
          <img 
            src={condominio.imagem} 
            alt="Foto do condomínio" 
            className="cond-card-banner-img" 
            onError={(e) => { 
              e.target.onerror = null;
              e.target.src = '/Bg_login.png';
            }} 
          />
        ) : (
          <div className="cond-card-banner-placeholder">
            <img src="/Bg_login.png" alt="Condomínio" className="cond-card-banner-img" style={{ opacity: 0.35, filter: 'grayscale(0.3)' }} />
            <div className="cond-banner-overlay-icon">🏢</div>
          </div>
        )}
      </div>

      {/* 2. Informações Principais (Centralizadas) */}
      <div className="cond-card-body">
        <h3 className="cond-card-name-centered">
          {codigoStr} - {condominio.nome}
        </h3>

        <p className="cond-card-address-centered">
          {condominio.endereco || 'Endereço não informado'}
        </p>

        <div className="cond-card-meta-centered">
          <div className="cond-meta-gerente">Gerente: {condominio.gerente_nome || 'Não atribuído'}</div>
          <div className="cond-meta-unidades">
            {condominio.quantidade_apartamentos 
              ? `${condominio.quantidade_apartamentos} ${Number(condominio.quantidade_apartamentos) === 1 ? 'Unidade' : 'Unidades'}` 
              : '14 Unidades'}
          </div>
        </div>

        {/* 3. Badge de Status (Alinhado à direita antes da barra de serviços) */}
        <div className="cond-card-status-row">
          <span className={`cond-card-status-pill cond-status-${mainStatus.cls}`}>
            <mainStatus.Ico /> {mainStatus.label}
          </span>
        </div>

        {/* 4. Grade Interna dos 6 Serviços com Ícone, Nome e Bolinha de Status */}
        <div className="cond-services-grid">
          {servicosExibicao.map((s, idx) => {
            const SvgIcon = iconMap[s.chave] || IcoCheckCircle;
            const nomeExibicao = s.chave === 'reservatorio' ? 'Limpeza' : (s.nome ? s.nome.split(' ')[0] : s.chave);
            return (
              <div key={idx} className="cond-service-item">
                <div className="cond-service-icon"><SvgIcon /></div>
                <div className="cond-service-name">{nomeExibicao}</div>
                <div className={`cond-service-dot dot-${s.status || 'sem_registro'}`}></div>
                
                <div className="cond-tooltip">
                  <strong>{s.nome || nomeExibicao}</strong><br/>
                  {getServiceStatusText(s)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Rodapé: Última Atualização + Botão Acessar */}
      <div className="cond-card-footer">
        <div className="cond-last-update">
          <span className="cond-clock-ico"><IcoRelogio /></span>
          <div>
            <span className="cond-update-label">Última atualização</span>
            <span className="cond-update-date">{lastUpdate ? lastUpdate.split('-').reverse().join('/') : '—'}</span>
          </div>
        </div>
        <button className="cond-btn-acessar" onClick={(e) => { e.stopPropagation(); navigate(`/condominios/${condominio.id}`); }}>
          Acessar <span className="cond-arrow-ico">&rsaquo;</span>
        </button>
      </div>
    </div>
  );
}
