import React from 'react';
import { useNavigate } from 'react-router-dom';
import { IcoDots, IcoRelogio, IcoCheckCircle, IcoAlert, IcoAlertTriangle, IcoDedetizacao, IcoExtintor, IcoReservatorio, IcoSeguro, IcoAvcb, IcoSpda } from '../icons';

const iconMap = {
  dedetizacao: IcoDedetizacao,
  extintor: IcoExtintor,
  reservatorio: IcoReservatorio,
  seguro: IcoSeguro,
  avcb: IcoAvcb,
  spda: IcoSpda
};

export default function CondominioCard({ condominio, onEdit }) {
  const navigate = useNavigate();

  const getStatusInfo = (status) => {
    switch (status) {
      case 'em_dia': return { label: 'Todos em dia', cls: 'em_dia', Ico: IcoCheckCircle };
      case 'a_vencer': return { label: 'Atenção', cls: 'a_vencer', Ico: IcoAlert };
      case 'vencido': case 'sem_registro': return { label: 'Com pendências', cls: 'vencido', Ico: IcoAlertTriangle };
      default: return { label: 'Desconhecido', cls: '', Ico: IcoAlert };
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

  const codigoStr = String(condominio.id).padStart(3, '0');

  return (
    <div className="cond-card" onClick={() => navigate(`/condominios/${condominio.id}`)}>
      <div className="cond-card-header">
        <div className="cond-card-title">
          {condominio.imagem ? (
            <img 
              src={condominio.imagem} 
              alt="Foto do condomínio" 
              className="cond-card-img" 
              onError={(e) => { 
                e.target.onerror = null;
                e.target.src = '';
                e.target.style.display = 'none';
              }} 
            />
          ) : (
            <div className="cond-card-img-placeholder">🏢</div>
          )}
          <div className="cond-card-info">
            <div className="cond-card-code">{codigoStr}</div>
            <h3 className="cond-card-name">{condominio.nome}</h3>
            <p className="cond-card-address">
              <span className="cond-loc-ico">📍</span> {condominio.endereco || 'Endereço não informado'}
            </p>
            <p className="cond-card-gerente">
              <span className="cond-mgr-ico">👤</span> {condominio.gerente_nome || 'Sem gerente'} 
              <span className="cond-badge-gerente">Gerente</span>
            </p>
          </div>
        </div>
        <div className="cond-card-actions">
          <button className="cond-btn-icon" onClick={handleAction} title="Opções"><IcoDots /></button>
          <div className={`cond-card-status cond-status-${mainStatus.cls}`}>
            <mainStatus.Ico /> {mainStatus.label}
          </div>
        </div>
      </div>

      <div className="cond-services-grid">
        {condominio.servicos && condominio.servicos.map((s, idx) => {
          const SvgIcon = iconMap[s.chave] || IcoCheckCircle;
          return (
            <div key={idx} className="cond-service-item">
              <div className="cond-service-icon"><SvgIcon /></div>
              <div className="cond-service-name">{s.nome.split(' ')[0]}</div>
              <div className={`cond-service-dot dot-${s.status}`}></div>
              
              <div className="cond-tooltip">
                <strong>{s.nome}</strong><br/>
                {getServiceStatusText(s)}
              </div>
            </div>
          );
        })}
      </div>

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
