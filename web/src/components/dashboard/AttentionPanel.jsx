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

  // Aplicação dos filtros internos
  const pendenciasFiltradas = useMemo(() => {
    let list = pendenciasBase.filter(s => {
      const chave = s.servicoChave || s.servicoId;
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
      return true;
    });

    // Ordenação:
    // 1. Vencidos primeiro (mais dias vencidos no topo)
    // 2. A vencer depois (menos dias restantes no topo)
    list.sort((a, b) => {
      if (a.statusCalc === 'vencido' && b.statusCalc !== 'vencido') return -1;
      if (a.statusCalc !== 'vencido' && b.statusCalc === 'vencido') return 1;
      const dataA = a.dataValidade || '9999-12-31';
      const dataB = b.dataValidade || '9999-12-31';
      return dataA.localeCompare(dataB);
    });

    return list;
  }, [pendenciasBase, filtroServico, filtroStatus, busca]);

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

      {/* Tabela de Itens */}
      <div className="dash-table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              <th style={{ width: '8%', textAlign: 'center' }}>Status</th>
              <th style={{ width: '36%' }}>Condomínio</th>
              <th style={{ width: '18%' }}>Serviço</th>
              <th style={{ width: '16%' }}>Vencimento</th>
              <th style={{ width: '14%' }}>Situação</th>
              <th style={{ width: '8%', textAlign: 'center' }}>Ação</th>
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

