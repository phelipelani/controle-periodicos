import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import StatusBadge from '../components/StatusBadge';
import { formatarData, textoDias } from '../components/format';
import { metaServico } from '../components/servicosMeta';
import {
  IcoCondominio, IcoVencido, IcoRelogio, IcoDoc, IcoCheck,
  IcoSeta, IcoSino, IcoSeguro, IcoCalendario,
} from '../components/icons';

const hojeExtenso = () =>
  new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

export default function Dashboard() {
  const { usuario } = useAuth();
  const [dados, setDados] = useState(null);
  const [servicos, setServicos] = useState([]);
  const [erro, setErro] = useState('');
  const [aberto, setAberto] = useState(null); // 'vencido' | 'a_vencer'

  useEffect(() => {
    api.get('/dashboard').then(setDados).catch((e) => setErro(e.message));
    api.get('/servicos').then(setServicos).catch(() => {});
  }, []);

  if (erro) return <div className="erro">{erro}</div>;
  if (!dados) return <div className="centro">Carregando…</div>;

  const { contadores, vencidos, aVencer } = dados;
  const primeiroNome = (usuario?.nome || '').split(' ')[0] || 'Olá';

  const cards = [
    { rotulo: 'Condomínios', sub: 'Cadastrados', valor: contadores.condominios, cor: '#d4202a', Icone: IcoCondominio },
    { rotulo: 'Vencidos', sub: 'Requer atenção', valor: contadores.vencidos, cor: '#dc2626', Icone: IcoVencido },
    { rotulo: 'A vencer', sub: 'Próximos 30 dias', valor: contadores.aVencer, cor: '#d97706', Icone: IcoRelogio },
    { rotulo: 'Sem registro', sub: 'Sem informação', valor: contadores.semRegistro, cor: '#64748b', Icone: IcoDoc },
    { rotulo: 'Em dia', sub: 'Tudo em ordem', valor: contadores.emDia, cor: '#16a34a', Icone: IcoCheck },
  ];

  return (
    <div>
      <div className="pn-topo">
        <div>
          <h1 className="pn-ola">Olá, {primeiroNome}! <span>👋</span></h1>
          <p className="sub" style={{ margin: 0 }}>Visão geral dos serviços de todos os condomínios.</p>
        </div>
        <div className="pn-data"><IcoCalendario /> {hojeExtenso()}</div>
      </div>

      <div className="pn-cards">
        {cards.map((c) => (
          <div key={c.rotulo} className="pn-card" style={{ '--cor': c.cor }}>
            <div className="pn-card-ico"><c.Icone /></div>
            <div className="pn-card-num" style={{ color: c.cor }}>{c.valor}</div>
            <div className="pn-card-rot">{c.rotulo}</div>
            <div className="pn-card-sub">{c.sub}</div>
          </div>
        ))}
      </div>

      <SecaoAlerta
        tipo="vencido"
        cor="#dc2626"
        Icone={IcoVencido}
        titulo={`Vencidos (${contadores.vencidos})`}
        descricao="Serviços que já passaram da data de vencimento."
        chamadaTitulo="Atenção necessária!"
        chamadaTexto="Existem serviços vencidos que precisam ser regularizados."
        botao="Visualizar vencidos"
        itens={vencidos}
        aberto={aberto === 'vencido'}
        onToggle={() => setAberto(aberto === 'vencido' ? null : 'vencido')}
      />

      <SecaoAlerta
        tipo="a_vencer"
        cor="#d97706"
        Icone={IcoSino}
        titulo={`A vencer (${contadores.aVencer})`}
        descricao="Serviços que vencem nos próximos 30 dias."
        chamadaTitulo="Fique atento aos próximos vencimentos!"
        chamadaTexto="Antecipe-se e mantenha tudo em conformidade."
        botao="Visualizar a vencer"
        itens={aVencer}
        aberto={aberto === 'a_vencer'}
        onToggle={() => setAberto(aberto === 'a_vencer' ? null : 'a_vencer')}
      />

      <ServicosMonitorados servicos={servicos} />
    </div>
  );
}

function SecaoAlerta({ cor, Icone, titulo, descricao, chamadaTitulo, chamadaTexto, botao, itens, aberto, onToggle }) {
  const vazio = itens.length === 0;
  return (
    <div className="card pn-secao" style={{ '--cor': cor }}>
      <div className="pn-secao-head">
        <div className="pn-secao-ico"><Icone /></div>
        <div style={{ flex: 1 }}>
          <h2>{titulo}</h2>
          <p>{descricao}</p>
        </div>
        {!vazio && (
          <button className="pn-vertodos" onClick={onToggle}>
            {aberto ? 'Recolher' : 'Ver todos'} <IcoSeta />
          </button>
        )}
      </div>

      {vazio ? (
        <div className="pn-vazio">Tudo certo por aqui — nenhum serviço nesta situação. 🎉</div>
      ) : aberto ? (
        <TabelaItens itens={itens} />
      ) : (
        <div className="pn-chamada">
          <div className="pn-ilustra"><Icone /></div>
          <div>
            <strong>{chamadaTitulo}</strong>
            <p>{chamadaTexto}</p>
            <button className="pn-btn" style={{ background: cor }} onClick={onToggle}>{botao}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function TabelaItens({ itens }) {
  return (
    <table style={{ marginTop: 6 }}>
      <thead>
        <tr><th>Condomínio</th><th>Serviço</th><th>Vencimento</th><th>Situação</th><th></th></tr>
      </thead>
      <tbody>
        {itens.map((i) => (
          <tr key={`${i.condominio_id}-${i.servico_id}`}>
            <td>{i.condominio_nome}</td>
            <td>{i.servico_nome}</td>
            <td>{formatarData(i.data_vencimento)} <span style={{ color: 'var(--muted)' }}>· {textoDias(i.status, i.diasRestantes)}</span></td>
            <td><StatusBadge status={i.status} /></td>
            <td><Link to={`/condominios/${i.condominio_id}`}>abrir</Link></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ServicosMonitorados({ servicos }) {
  const navigate = useNavigate();
  const irPara = (chave) => navigate(chave === 'dedetizacao' ? '/agendamentos' : `/servicos/${chave}`);
  return (
    <div className="card pn-monitorados">
      <div className="pn-mon-head">
        <div className="pn-mon-ico"><IcoSeguro /></div>
        <div>
          <h2>Serviços monitorados</h2>
          <p>Tipos de serviços periódicos gerenciados no sistema.</p>
        </div>
      </div>
      <div className="pn-mon-itens">
        {servicos.map((s) => {
          const { Icone, cor } = metaServico(s.chave);
          return (
            <button key={s.id} className="pn-mon-chip" onClick={() => irPara(s.chave)}>
              <span className="pn-mon-bolha" style={{ color: cor, background: `${cor}1a` }}><Icone /></span>
              {s.nome}
            </button>
          );
        })}
      </div>
    </div>
  );
}
