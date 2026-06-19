import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import StatusBadge from '../components/StatusBadge';
import { formatarData, textoDias } from '../components/format';
import { metaServico } from '../components/servicosMeta';

export default function ServicoPagina() {
  const { chave } = useParams();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    setDados(null);
    setErro('');
    api.get(`/servicos/${chave}/condominios`).then(setDados).catch((e) => setErro(e.message));
  }, [chave]);

  if (erro) return <div className="erro">{erro}</div>;
  if (!dados) return <div className="centro">Carregando…</div>;

  const { servico, itens } = dados;
  const { Icone, cor } = metaServico(servico.chave);
  const ehValidade = servico.tipo_controle === 'validade';
  const vencidos = itens.filter((i) => i.status === 'vencido').length;
  const aVencer = itens.filter((i) => i.status === 'a_vencer').length;
  const semRegistro = itens.filter((i) => i.status === 'sem_registro').length;

  return (
    <div>
      <div className="pn-topo">
        <div className="sp-titulo">
          <span className="sp-ico" style={{ color: cor, background: `${cor}1a` }}><Icone /></span>
          <div>
            <h1 style={{ margin: 0 }}>{servico.nome}</h1>
            <p className="sub" style={{ margin: 0 }}>
              {ehValidade ? 'Controle por data de validade' : `Periodicidade: a cada ${servico.periodicidade_meses} meses`}
              {' · '}{itens.length} condomínio(s)
            </p>
          </div>
        </div>
        {servico.chave === 'dedetizacao' && <Link className="btn" to="/agendamentos">Agendamentos</Link>}
      </div>

      <div className="sp-resumo">
        <span><b style={{ color: 'var(--vencido)' }}>{vencidos}</b> vencido(s)</span>
        <span><b style={{ color: 'var(--avencer)' }}>{aVencer}</b> a vencer</span>
        <span><b style={{ color: 'var(--sem)' }}>{semRegistro}</b> sem registro</span>
      </div>

      {itens.length === 0 ? (
        <div className="card vazio">Nenhum condomínio para mostrar.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Condomínio</th>
              <th>Gerente</th>
              <th>{ehValidade ? 'Última atualização' : 'Última realização'}</th>
              <th>{ehValidade ? 'Validade' : 'Vencimento'}</th>
              <th>Situação</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {itens.map((i) => (
              <tr key={i.condominio_id}>
                <td><Link to={`/condominios/${i.condominio_id}`}><strong>{i.condominio_nome}</strong></Link></td>
                <td style={{ color: 'var(--muted)' }}>{i.gerente_nome || '—'}</td>
                <td>{ehValidade ? '—' : formatarData(i.ultima_realizacao)}</td>
                <td>
                  {formatarData(i.data_vencimento)}
                  {i.data_vencimento && <span style={{ color: 'var(--muted)' }}> · {textoDias(i.status, i.diasRestantes)}</span>}
                </td>
                <td><StatusBadge status={i.status} /></td>
                <td><Link to={`/condominios/${i.condominio_id}`}>registrar</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
