import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { metaServico } from '../components/servicosMeta';
import { IcoSeta } from '../components/icons';

export default function Servicos() {
  const navigate = useNavigate();
  const [servicos, setServicos] = useState([]);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.get('/servicos').then(setServicos).catch((e) => setErro(e.message));
  }, []);

  const irPara = (chave) => navigate(chave === 'dedetizacao' ? '/agendamentos' : `/servicos/${chave}`);

  return (
    <div>
      <h1>Serviços</h1>
      <p className="sub">Acompanhe cada tipo de serviço em todos os condomínios.</p>

      {erro && <div className="erro">{erro}</div>}

      <div className="sv-grid">
        {servicos.map((s) => {
          const { Icone, cor } = metaServico(s.chave);
          return (
            <button key={s.id} className="sv-card" style={{ '--cor': cor }} onClick={() => irPara(s.chave)}>
              <span className="sv-ico" style={{ color: cor, background: `${cor}1a` }}><Icone /></span>
              <span className="sv-nome">{s.nome}</span>
              <span className="sv-tipo">
                {s.tipo_controle === 'validade' ? 'Por data de validade' : `A cada ${s.periodicidade_meses} meses`}
              </span>
              <span className="sv-seta"><IcoSeta /></span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
