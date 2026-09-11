import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import StatusBadge from '../components/StatusBadge';
import { formatarData, textoDias } from '../components/format';
import { metaServico } from '../components/servicosMeta';
import { IcoSort, IcoSortAsc, IcoSortDesc } from '../components/icons';

export default function ServicoPagina() {
  const { chave } = useParams();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [colunaOrdenacao, setColunaOrdenacao] = useState('codigo');
  const [ordemDirecao, setOrdemDirecao] = useState('asc');

  useEffect(() => {
    setDados(null);
    setErro('');
    api.get(`/servicos/${chave}/condominios`).then(setDados).catch((e) => setErro(e.message));
  }, [chave]);

  const handleOrdenar = (coluna) => {
    if (colunaOrdenacao === coluna) {
      setOrdemDirecao((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setColunaOrdenacao(coluna);
      setOrdemDirecao('asc');
    }
  };

  const renderSortIcon = (coluna) => {
    if (colunaOrdenacao !== coluna) return <IcoSort />;
    return ordemDirecao === 'asc' ? <IcoSortAsc /> : <IcoSortDesc />;
  };

  const itensOrdenados = useMemo(() => {
    if (!dados?.itens) return [];
    const lista = [...dados.itens];

    const getStatusWeight = (status) => {
      switch (status) {
        case 'vencido': return 1;
        case 'a_vencer': return 2;
        case 'em_dia': return 3;
        case 'sem_registro': return 4;
        default: return 5;
      }
    };

    lista.sort((a, b) => {
      if (colunaOrdenacao === 'codigo') {
        const valA = Number(a.condominio_id) || 0;
        const valB = Number(b.condominio_id) || 0;
        return ordemDirecao === 'asc' ? valA - valB : valB - valA;
      }

      if (colunaOrdenacao === 'condominio') {
        return ordemDirecao === 'asc'
          ? (a.condominio_nome || '').localeCompare(b.condominio_nome || '')
          : (b.condominio_nome || '').localeCompare(a.condominio_nome || '');
      }

      if (colunaOrdenacao === 'gerente') {
        const valA = a.gerente_nome || '';
        const valB = b.gerente_nome || '';
        return ordemDirecao === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      if (colunaOrdenacao === 'realizacao') {
        const valA = a.ultima_realizacao || '';
        const valB = b.ultima_realizacao || '';
        if (!valA && !valB) return 0;
        if (!valA) return 1;
        if (!valB) return -1;
        return ordemDirecao === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      if (colunaOrdenacao === 'vencimento') {
        const valA = a.data_vencimento || '';
        const valB = b.data_vencimento || '';
        if (!valA && !valB) return 0;
        if (!valA) return 1;
        if (!valB) return -1;
        return ordemDirecao === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      if (colunaOrdenacao === 'status') {
        const pesoA = getStatusWeight(a.status);
        const pesoB = getStatusWeight(b.status);
        return ordemDirecao === 'asc' ? pesoA - pesoB : pesoB - pesoA;
      }

      return 0;
    });

    return lista;
  }, [dados?.itens, colunaOrdenacao, ordemDirecao]);

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

      {itensOrdenados.length === 0 ? (
        <div className="card vazio">Nenhum condomínio para mostrar.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th className="sortable" style={{ width: '85px' }} onClick={() => handleOrdenar('codigo')}>
                Código {renderSortIcon('codigo')}
              </th>
              <th className="sortable" onClick={() => handleOrdenar('condominio')}>
                Condomínio {renderSortIcon('condominio')}
              </th>
              <th className="sortable" onClick={() => handleOrdenar('gerente')}>
                Gerente {renderSortIcon('gerente')}
              </th>
              <th className="sortable" onClick={() => handleOrdenar('realizacao')}>
                {ehValidade ? 'Última atualização' : 'Última realização'} {renderSortIcon('realizacao')}
              </th>
              <th className="sortable" onClick={() => handleOrdenar('vencimento')}>
                {ehValidade ? 'Validade' : 'Vencimento'} {renderSortIcon('vencimento')}
              </th>
              <th className="sortable" onClick={() => handleOrdenar('status')}>
                Situação {renderSortIcon('status')}
              </th>
              <th style={{ width: '90px' }}></th>
            </tr>
          </thead>
          <tbody>
            {itensOrdenados.map((i) => (
              <tr key={i.condominio_id}>
                <td style={{ fontWeight: 600, color: 'var(--muted)' }}>
                  {String(i.condominio_id).padStart(3, '0')}
                </td>
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
