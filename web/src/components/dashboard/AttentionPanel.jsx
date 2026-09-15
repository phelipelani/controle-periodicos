import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatarData } from '../format';
import Modal from '../Modal';
import {
  IcoEye,
  IcoAlertTriangle,
  IcoCondominio,
  IcoDedetizacao,
  IcoExtintor,
  IcoReservatorio,
  IcoSeguro,
  IcoAvcb,
  IcoSpda,
  IcoServicos
} from '../icons';

const SERVICO_ICONS = {
  dedetizacao: IcoDedetizacao,
  extintor: IcoExtintor,
  reservatorio: IcoReservatorio,
  seguro: IcoSeguro,
  avcb: IcoAvcb,
  spda: IcoSpda
};

export default function AttentionPanel({ servicos = [], tiposServico = [] }) {
  const navigate = useNavigate();
  const [filtroServico, setFiltroServico] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [busca, setBusca] = useState('');
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState(null);

  // Filtros individuais por cabeçalho da tabela
  const [colFiltros, setColFiltros] = useState({
    status: 'todos',
    condominio: '',
    servico: 'todos',
    vencimento: 'todos',
    situacao: 'todos'
  });

  // Ordenação por cabeçalho da tabela
  const [ordenacao, setOrdenacao] = useState({
    campo: 'vencimento',
    direcao: 'asc'
  });

  const handleOrdenar = (campo) => {
    setOrdenacao(prev => ({
      campo,
      direcao: prev.campo === campo && prev.direcao === 'asc' ? 'desc' : 'asc'
    }));
  };

  const temFiltroAtivo = useMemo(() => {
    return (
      colFiltros.status !== 'todos' ||
      colFiltros.condominio.trim() !== '' ||
      colFiltros.servico !== 'todos' ||
      colFiltros.vencimento !== 'todos' ||
      colFiltros.situacao !== 'todos'
    );
  }, [colFiltros]);

  const limparTodosFiltros = () => {
    setColFiltros({
      status: 'todos',
      condominio: '',
      servico: 'todos',
      vencimento: 'todos',
      situacao: 'todos'
    });
  };

  const renderSortIcon = (campo) => {
    if (ordenacao.campo !== campo) {
      return <span style={{ opacity: 0.35, fontSize: '10px', marginLeft: '3px' }}>⇅</span>;
    }
    return (
      <span style={{ color: '#d4202a', fontSize: '10px', fontWeight: 800, marginLeft: '3px' }}>
        {ordenacao.direcao === 'asc' ? '▲' : '▼'}
      </span>
    );
  };

  // Lista base de pendências (vencidos e a vencer)
  const pendenciasBase = useMemo(() => {
    return servicos.filter(s => s.statusCalc === 'vencido' || s.statusCalc === 'a_vencer');
  }, [servicos]);

  // Contadores por tipo de serviço
  const contadoresServico = useMemo(() => {
    const counts = { todos: pendenciasBase.length };
    pendenciasBase.forEach(s => {
      const chave = s.servicoChave || s.servicoId;
      counts[chave] = (counts[chave] || 0) + 1;
    });
    return counts;
  }, [pendenciasBase]);

  // Aplicação dos filtros internos e de cabeçalho
  const pendenciasFiltradas = useMemo(() => {
    let list = pendenciasBase.filter(s => {
      const chave = s.servicoChave || s.servicoId;
      
      // Filtros rápidos superiores
      if (filtroServico !== 'todos' && chave !== filtroServico) return false;
      if (filtroStatus !== 'todos' && s.statusCalc !== filtroStatus) return false;
      if (busca.trim()) {
        const termo = busca.toLowerCase();
        const nome = (s.condominioNome || '').toLowerCase();
        const cod = (s.codigoCondominio || '').toLowerCase();
        const srv = (s.servicoNome || '').toLowerCase();
        if (!nome.includes(termo) && !cod.includes(termo) && !srv.includes(termo)) {
          return false;
        }
      }

      // Filtro de cabeçalho: Status
      if (colFiltros.status !== 'todos' && s.statusCalc !== colFiltros.status) {
        return false;
      }

      // Filtro de cabeçalho: Condomínio
      if (colFiltros.condominio.trim()) {
        const termo = colFiltros.condominio.toLowerCase();
        const nome = (s.condominioNome || '').toLowerCase();
        const cod = (s.codigoCondominio || '').toLowerCase();
        if (!nome.includes(termo) && !cod.includes(termo)) {
          return false;
        }
      }

      // Filtro de cabeçalho: Serviço
      if (colFiltros.servico !== 'todos' && chave !== colFiltros.servico && s.servicoNome !== colFiltros.servico) {
        return false;
      }

      // Filtro de cabeçalho: Vencimento
      if (colFiltros.vencimento !== 'todos') {
        const dias = s.diasRestantes != null ? s.diasRestantes : (s.statusCalc === 'vencido' ? -1 : 999);
        if (colFiltros.vencimento === 'vencido' && s.statusCalc !== 'vencido') return false;
        if (colFiltros.vencimento === '7dias' && (s.statusCalc === 'vencido' || dias > 7)) return false;
        if (colFiltros.vencimento === '15dias' && (s.statusCalc === 'vencido' || dias > 15)) return false;
        if (colFiltros.vencimento === '30dias' && (s.statusCalc === 'vencido' || dias > 30)) return false;
        if (colFiltros.vencimento === '60dias' && (s.statusCalc === 'vencido' || dias > 60)) return false;
      }

      // Filtro de cabeçalho: Situação
      if (colFiltros.situacao !== 'todos' && s.statusCalc !== colFiltros.situacao) {
        return false;
      }

      return true;
    });

    // Ordenação dinâmica pelos cabeçalhos
    list.sort((a, b) => {
      let valA, valB;
      switch (ordenacao.campo) {
        case 'status':
          valA = a.statusCalc === 'vencido' ? 0 : 1;
          valB = b.statusCalc === 'vencido' ? 0 : 1;
          break;
        case 'condominio':
          valA = (a.condominioNome || '').toLowerCase();
          valB = (b.condominioNome || '').toLowerCase();
          return ordenacao.direcao === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'servico':
          valA = (a.servicoNome || '').toLowerCase();
          valB = (b.servicoNome || '').toLowerCase();
          return ordenacao.direcao === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'situacao':
          valA = a.diasRestantes != null ? a.diasRestantes : 0;
          valB = b.diasRestantes != null ? b.diasRestantes : 0;
          break;
        case 'vencimento':
        default:
          valA = a.dataValidade || '9999-12-31';
          valB = b.dataValidade || '9999-12-31';
          return ordenacao.direcao === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (valA < valB) return ordenacao.direcao === 'asc' ? -1 : 1;
      if (valA > valB) return ordenacao.direcao === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [pendenciasBase, filtroServico, filtroStatus, busca, colFiltros, ordenacao]);

  const itensExibidos = mostrarTodos ? pendenciasFiltradas : pendenciasFiltradas.slice(0, 10);

  const renderDias = (s) => {
    if (s.statusCalc === 'vencido') {
      const dias = Math.abs(s.diasRestantes || 0);
      return `Vencido há ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
    }
    const dias = s.diasRestantes || 0;
    return `Vence em ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
  };

  const getServicoIcon = (chave) => {
    const IconComp = SERVICO_ICONS[chave] || IcoServicos;
    return <IconComp width={17} height={17} />;
  };

  const navegarParaServico = (chave) => {
    setItemSelecionado(null);
    navigate(`/servicos/${chave}`);
  };

  const navegarParaCondominio = (condominioId) => {
    setItemSelecionado(null);
    navigate(`/condominios/${condominioId}`);
  };

  // Lista de abas de serviços disponíveis (sempre exibe todos os serviços do sistema)
  const abasServico = useMemo(() => {
    const defaultServicos = [
      { chave: 'dedetizacao', nome: 'Dedetização' },
      { chave: 'extintor', nome: 'Extintores' },
      { chave: 'reservatorio', nome: 'Reservatórios' },
      { chave: 'seguro', nome: 'Seguros' },
      { chave: 'avcb', nome: 'AVCB' },
      { chave: 'spda', nome: 'SPDA' }
    ];

    return tiposServico.length > 0 ? tiposServico : defaultServicos;
  }, [tiposServico]);

  return (
    <div className="dash-card">
      {/* Header do Card */}
      <div className="dash-card-header" style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '20px', height: '20px', color: '#dc2626' }}>
              <IcoAlertTriangle width={20} height={20} />
            </div>
            <div>
              <h3 className="dash-card-title">Requer atenção</h3>
              <p className="dash-card-subtitle">
                {pendenciasBase.length === 0 
                  ? 'Nenhum item pendente' 
                  : `${pendenciasBase.length} ${pendenciasBase.length === 1 ? 'item que precisa' : 'itens que precisam'} de atenção`}
              </p>
            </div>
          </div>

          {/* Campo de Busca Rápida */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="text"
              className="dash-attention-search"
              placeholder="Buscar condomínio..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            {busca && (
              <button 
                type="button"
                className="dash-chip-clear" 
                onClick={() => setBusca('')}
                title="Limpar busca"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Barra de Filtros por Serviço (Chips) - Mostra todos os serviços */}
      <div className="dash-attention-chips">
        <button
          type="button"
          className={`dash-chip ${filtroServico === 'todos' ? 'active' : ''}`}
          onClick={() => setFiltroServico('todos')}
        >
          Todos <span className="dash-chip-count">{contadoresServico['todos'] || 0}</span>
        </button>

        {abasServico.map(ts => {
          const qtd = contadoresServico[ts.chave] || 0;
          return (
            <button
              key={ts.chave}
              type="button"
              className={`dash-chip ${filtroServico === ts.chave ? 'active' : ''}`}
              onClick={() => setFiltroServico(ts.chave)}
            >
              {ts.nome} <span className="dash-chip-count">{qtd}</span>
            </button>
          );
        })}
      </div>

      {/* Subfiltros de Status (Todos, Vencidos, A Vencer) */}
      <div className="dash-attention-subfilters">
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`dash-subchip ${filtroStatus === 'todos' ? 'active' : ''}`}
            onClick={() => setFiltroStatus('todos')}
          >
            Todos os status
          </button>
          <button
            type="button"
            className={`dash-subchip vencido ${filtroStatus === 'vencido' ? 'active' : ''}`}
            onClick={() => setFiltroStatus('vencido')}
          >
            Apenas Vencidos
          </button>
          <button
            type="button"
            className={`dash-subchip avencer ${filtroStatus === 'a_vencer' ? 'active' : ''}`}
            onClick={() => setFiltroStatus('a_vencer')}
          >
            Apenas A Vencer
          </button>
        </div>

        <div className="dash-attention-info">
          Mostrando <strong>{itensExibidos.length}</strong> de <strong>{pendenciasFiltradas.length}</strong> {pendenciasFiltradas.length === 1 ? 'pendência' : 'pendências'}
        </div>
      </div>

      {/* Tabela de Itens com Filtros nos Cabeçalhos */}
      <div className="dash-table-wrap">
        <table className="dash-table">
          <thead>
            {/* Linha 1: Título das Colunas + Ordenação */}
            <tr>
              <th style={{ width: '9%', textAlign: 'center' }}>
                <button
                  type="button"
                  className="dash-th-sort"
                  onClick={() => handleOrdenar('status')}
                  title="Ordenar por Status"
                >
                  STATUS {renderSortIcon('status')}
                </button>
              </th>
              <th style={{ width: '33%' }}>
                <button
                  type="button"
                  className="dash-th-sort"
                  onClick={() => handleOrdenar('condominio')}
                  title="Ordenar por Condomínio"
                >
                  CONDOMÍNIO {renderSortIcon('condominio')}
                </button>
              </th>
              <th style={{ width: '18%' }}>
                <button
                  type="button"
                  className="dash-th-sort"
                  onClick={() => handleOrdenar('servico')}
                  title="Ordenar por Serviço"
                >
                  SERVIÇO {renderSortIcon('servico')}
                </button>
              </th>
              <th style={{ width: '16%' }}>
                <button
                  type="button"
                  className="dash-th-sort"
                  onClick={() => handleOrdenar('vencimento')}
                  title="Ordenar por Vencimento"
                >
                  VENCIMENTO {renderSortIcon('vencimento')}
                </button>
              </th>
              <th style={{ width: '15%' }}>
                <button
                  type="button"
                  className="dash-th-sort"
                  onClick={() => handleOrdenar('situacao')}
                  title="Ordenar por Situação"
                >
                  SITUAÇÃO {renderSortIcon('situacao')}
                </button>
              </th>
              <th style={{ width: '9%', textAlign: 'center' }}>
                <span className="dash-th-sort" style={{ cursor: 'default' }}>
                  AÇÃO
                </span>
              </th>
            </tr>

            {/* Linha 2: Filtros de cada Cabeçalho */}
            <tr className="dash-th-filter-row">
              <th style={{ textAlign: 'center' }}>
                <select
                  className="dash-col-filter-select"
                  value={colFiltros.status}
                  onChange={(e) => setColFiltros(prev => ({ ...prev, status: e.target.value }))}
                  title="Filtrar por Status"
                >
                  <option value="todos">Todos</option>
                  <option value="vencido">🔴 Vencido</option>
                  <option value="a_vencer">🟡 A vencer</option>
                </select>
              </th>

              <th>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input
                    type="text"
                    className="dash-col-filter-input"
                    placeholder="Filtrar condomínio..."
                    value={colFiltros.condominio}
                    onChange={(e) => setColFiltros(prev => ({ ...prev, condominio: e.target.value }))}
                  />
                  {colFiltros.condominio && (
                    <button
                      type="button"
                      className="dash-col-filter-clear-btn"
                      onClick={() => setColFiltros(prev => ({ ...prev, condominio: '' }))}
                      title="Limpar filtro de condomínio"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </th>

              <th>
                <select
                  className="dash-col-filter-select"
                  value={colFiltros.servico}
                  onChange={(e) => setColFiltros(prev => ({ ...prev, servico: e.target.value }))}
                  title="Filtrar por Tipo de Serviço"
                >
                  <option value="todos">Todos os serviços</option>
                  {abasServico.map(ts => (
                    <option key={ts.chave} value={ts.chave}>
                      {ts.nome}
                    </option>
                  ))}
                </select>
              </th>

              <th>
                <select
                  className="dash-col-filter-select"
                  value={colFiltros.vencimento}
                  onChange={(e) => setColFiltros(prev => ({ ...prev, vencimento: e.target.value }))}
                  title="Filtrar por Prazo de Vencimento"
                >
                  <option value="todos">Todas as datas</option>
                  <option value="vencido">Já vencidos</option>
                  <option value="7dias">Próximos 7 dias</option>
                  <option value="15dias">Próximos 15 dias</option>
                  <option value="30dias">Próximos 30 dias</option>
                  <option value="60dias">Próximos 60 dias</option>
                </select>
              </th>

              <th>
                <select
                  className="dash-col-filter-select"
                  value={colFiltros.situacao}
                  onChange={(e) => setColFiltros(prev => ({ ...prev, situacao: e.target.value }))}
                  title="Filtrar por Situação"
                >
                  <option value="todos">Todas</option>
                  <option value="vencido">Vencido</option>
                  <option value="a_vencer">A vencer</option>
                </select>
              </th>

              <th style={{ textAlign: 'center' }}>
                {temFiltroAtivo ? (
                  <button
                    type="button"
                    className="dash-col-clear-all-btn"
                    onClick={limparTodosFiltros}
                    title="Limpar filtros dos cabeçalhos"
                  >
                    ✕ Limpar
                  </button>
                ) : (
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>—</span>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {itensExibidos.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '36px 20px' }}>
                  <div style={{ color: '#16a34a', fontWeight: 700, fontSize: '15px' }}>Tudo em ordem 🎉</div>
                  <div style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>
                    {busca || filtroServico !== 'todos' || filtroStatus !== 'todos' 
                      ? 'Nenhum item corresponde aos filtros selecionados.' 
                      : 'Nenhum serviço requer atenção no momento.'}
                  </div>
                </td>
              </tr>
            ) : (
              itensExibidos.map(s => (
                <tr key={s.id} className={s.statusCalc === 'vencido' ? 'vencido' : 'avencer'}>
                  <td style={{ textAlign: 'center' }}>
                    <div 
                      style={{ 
                        width: '9px', 
                        height: '9px', 
                        borderRadius: '50%', 
                        background: s.statusCalc === 'vencido' ? '#dc2626' : '#d97706', 
                        margin: '0 auto' 
                      }} 
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="dash-condo-link"
                      onClick={() => navegarParaCondominio(s.condominioId)}
                      title={`Abrir cadastro de ${s.condominioNome}`}
                    >
                      {s.condominioNome}
                    </button>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#64748b' }}>{getServicoIcon(s.servicoChave || s.servicoId)}</span>
                      <span>{s.servicoNome}</span>
                    </div>
                  </td>
                  <td>
                    <strong>{formatarData(s.dataValidade)}</strong>
                  </td>
                  <td>
                    {s.statusCalc === 'vencido' ? (
                      <span className="dash-badge vencido">VENCIDO</span>
                    ) : (
                      <span className="dash-badge avencer">{renderDias(s)}</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button 
                      type="button"
                      className="dash-btn-icon" 
                      style={{ margin: '0 auto' }} 
                      title="Visualizar detalhes do item"
                      onClick={() => setItemSelecionado(s)}
                    >
                      <IcoEye width={16} height={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Rodapé do Card com Toggle de Visualização Completa */}
      {pendenciasFiltradas.length > 10 && (
        <div className="dash-attention-footer">
          <button
            type="button"
            className="dash-link-btn"
            onClick={() => setMostrarTodos(!mostrarTodos)}
          >
            {mostrarTodos 
              ? '↑ Recolher para os 10 mais urgentes' 
              : `↓ Ver todos os ${pendenciasFiltradas.length} itens que requerem atenção`}
          </button>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            {mostrarTodos ? `Mostrando todos (${pendenciasFiltradas.length})` : `Mostrando 10 de ${pendenciasFiltradas.length}`}
          </span>
        </div>
      )}

      {/* Modal de Detalhes ao Clicar no Olhinho */}
      {itemSelecionado && (
        <Modal
          titulo="Detalhes do Serviço Periódico"
          onFechar={() => setItemSelecionado(null)}
          largura="520px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px 0' }}>
            {/* Bloco Condomínio */}
            <div className="dash-modal-box">
              <div className="dash-modal-label">
                <IcoCondominio width={15} height={15} /> Condomínio
              </div>
              <div className="dash-modal-title">
                {itemSelecionado.codigoCondominio && <span className="dash-modal-code">#{itemSelecionado.codigoCondominio}</span>}
                {itemSelecionado.condominioNome}
              </div>
            </div>

            {/* Bloco Serviço e Status */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="dash-modal-box">
                <div className="dash-modal-label">Serviço</div>
                <div className="dash-modal-val" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {getServicoIcon(itemSelecionado.servicoChave || itemSelecionado.servicoId)}
                  {itemSelecionado.servicoNome}
                </div>
              </div>

              <div className="dash-modal-box">
                <div className="dash-modal-label">Situação</div>
                <div style={{ marginTop: '4px' }}>
                  {itemSelecionado.statusCalc === 'vencido' ? (
                    <span className="dash-badge vencido" style={{ fontSize: '12px', padding: '4px 10px' }}>
                      {renderDias(itemSelecionado)}
                    </span>
                  ) : (
                    <span className="dash-badge avencer" style={{ fontSize: '12px', padding: '4px 10px' }}>
                      {renderDias(itemSelecionado)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bloco Vencimento e Empresa */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="dash-modal-box">
                <div className="dash-modal-label">Data de Vencimento</div>
                <div className="dash-modal-val">
                  {formatarData(itemSelecionado.dataValidade)}
                </div>
              </div>

              <div className="dash-modal-box">
                <div className="dash-modal-label">Última Realização</div>
                <div className="dash-modal-val">
                  {itemSelecionado.ultimaRealizacao ? formatarData(itemSelecionado.ultimaRealizacao) : 'Não registrada'}
                </div>
              </div>
            </div>

            {itemSelecionado.empresa && itemSelecionado.empresa !== '-' && (
              <div className="dash-modal-box">
                <div className="dash-modal-label">Empresa Responsável</div>
                <div className="dash-modal-val">
                  {itemSelecionado.empresa}
                </div>
              </div>
            )}

            {/* Ações Rápidas */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-secundario"
                onClick={() => navegarParaCondominio(itemSelecionado.condominioId)}
              >
                Ver Ficha do Condomínio
              </button>
              <button
                type="button"
                className="btn-primario"
                style={{ background: '#d4202a', color: '#ffffff', border: 'none' }}
                onClick={() => navegarParaServico(itemSelecionado.servicoChave || itemSelecionado.servicoId)}
              >
                Abrir Módulo de {itemSelecionado.servicoNome} →
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

