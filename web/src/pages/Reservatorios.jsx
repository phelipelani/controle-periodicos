import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import '../reservatorios.css';

import { IcoReservatorio } from '../components/icons';
import ReservatoriosKpis from '../components/reservatorios/ReservatoriosKpis';
import ReservatoriosFilters from '../components/reservatorios/ReservatoriosFilters';
import ReservatoriosTable from '../components/reservatorios/ReservatoriosTable';
import ReservatoriosDrawer from '../components/reservatorios/ReservatoriosDrawer';
import ReservatoriosModalVisualizar from '../components/reservatorios/ReservatoriosModalVisualizar';

const initialFiltros = {
  busca: '',
  status: 'Todos',
  gerente: 'Todos',
  dataDe: '',
  dataAte: ''
};

export default function Reservatorios() {
  const { isAdmin } = useAuth();
  const [dados, setDados] = useState([]);
  const [gerentes, setGerentes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [toast, setToast] = useState('');

  const [filtros, setFiltros] = useState(initialFiltros);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);

  const [colunaOrdenacao, setColunaOrdenacao] = useState('status_padrao');
  const [ordemDirecao, setOrdemDirecao] = useState('asc');

  // Drawer / Modais
  const [drawerAberto, setDrawerAberto] = useState(false);
  const [condominioEditando, setCondominioEditando] = useState(null);
  const [itemVisualizando, setItemVisualizando] = useState(null);

  const carregarDados = () => {
    setCarregando(true);
    api.get('/reservatorios')
      .then((res) => {
        setDados(res || []);
        setErro('');
      })
      .catch((err) => {
        setErro(err.message || 'Erro ao carregar dados de reservatórios');
      })
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    carregarDados();
    api.get('/usuarios/gerentes')
      .catch(() => api.get('/usuarios'))
      .then((us) => setGerentes((us || []).filter((u) => u.papel === 'gerente' && (u.ativo === undefined || u.ativo === 1 || u.ativo === true))))
      .catch(() => {});
  }, []);

  const mostrarToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  const handleSalvar = async (payload) => {
    await api.post('/reservatorios', payload);
    mostrarToast('Registro de reservatório salvo com sucesso!');
    carregarDados();
  };

  const handleExcluir = async (item) => {
    if (!window.confirm(`Deseja limpar o registro de reservatório do condomínio ${item.condominio}?`)) return;
    try {
      await api.del(`/reservatorios/${item.id}`);
      mostrarToast('Registro de reservatório removido com sucesso!');
      carregarDados();
    } catch (e) {
      setErro(e.message || 'Erro ao excluir');
    }
  };

  const handleNovo = () => {
    setCondominioEditando(null);
    setDrawerAberto(true);
  };

  const handleEditar = (item) => {
    setCondominioEditando(item);
    setDrawerAberto(true);
  };

  const handleVisualizar = (item) => {
    setItemVisualizando(item);
  };

  // KPIs
  const stats = useMemo(() => {
    const base = dados.filter((item) => {
      if (filtros.busca) {
        const termo = filtros.busca.toLowerCase().trim();
        const nomeMatch = item.condominio.toLowerCase().includes(termo);
        const codMatch = item.codigo.toLowerCase().includes(termo);
        const endMatch = item.endereco ? item.endereco.toLowerCase().includes(termo) : false;
        if (!nomeMatch && !codMatch && !endMatch) return false;
      }
      if (filtros.gerente !== 'Todos' && item.gerente !== filtros.gerente) return false;
      if (filtros.dataDe && item.dataProximoVencimento && item.dataProximoVencimento < filtros.dataDe) return false;
      if (filtros.dataAte && item.dataProximoVencimento && item.dataProximoVencimento > filtros.dataAte) return false;
      return true;
    });

    const total = base.length;
    const emDia = base.filter((d) => d.status === 'em_dia').length;
    const aVencer = base.filter((d) => d.status === 'a_vencer').length;
    const vencidos = base.filter((d) => d.status === 'vencido').length;
    const semRegistro = base.filter((d) => d.status === 'sem_registro').length;

    return {
      total,
      emDia,
      aVencer,
      vencidos,
      semRegistro,
      gerenteAtivo: filtros.gerente !== 'Todos' ? filtros.gerente : null
    };
  }, [dados, filtros.busca, filtros.gerente, filtros.dataDe, filtros.dataAte]);

  // Filtros
  const handleFiltroChange = (chave, valor) => {
    setFiltros((prev) => ({ ...prev, [chave]: valor }));
    setPaginaAtual(1);
  };

  const handleLimparFiltros = () => {
    setFiltros(initialFiltros);
    setPaginaAtual(1);
  };

  const dadosFiltrados = useMemo(() => {
    return dados.filter((item) => {
      // Busca texto
      if (filtros.busca) {
        const termo = filtros.busca.toLowerCase().trim();
        const nomeMatch = item.condominio.toLowerCase().includes(termo);
        const codMatch = item.codigo.toLowerCase().includes(termo);
        const endMatch = item.endereco ? item.endereco.toLowerCase().includes(termo) : false;
        if (!nomeMatch && !codMatch && !endMatch) return false;
      }

      // Status
      if (filtros.status !== 'Todos') {
        if (item.status !== filtros.status) return false;
      }

      // Gerente
      if (filtros.gerente !== 'Todos') {
        if (item.gerente !== filtros.gerente) return false;
      }

      // Data De
      if (filtros.dataDe) {
        if (!item.dataProximoVencimento || item.dataProximoVencimento < filtros.dataDe) {
          return false;
        }
      }

      // Data Ate
      if (filtros.dataAte) {
        if (!item.dataProximoVencimento || item.dataProximoVencimento > filtros.dataAte) {
          return false;
        }
      }

      return true;
    });
  }, [dados, filtros]);

  // Ordenação
  const handleOrdenar = (coluna) => {
    if (colunaOrdenacao === coluna) {
      setOrdemDirecao((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setColunaOrdenacao(coluna);
      setOrdemDirecao('asc');
    }
  };

  const dadosOrdenados = useMemo(() => {
    const ordenados = [...dadosFiltrados];

    const getStatusWeight = (status) => {
      switch (status) {
        case 'vencido': return 1;
        case 'a_vencer': return 2;
        case 'em_dia': return 3;
        case 'sem_registro': return 4;
        default: return 5;
      }
    };

    ordenados.sort((a, b) => {
      if (colunaOrdenacao === 'status_padrao') {
        // Ordenação padrão da tela: Vencidos > A vencer > Em dia > Sem registro
        const pesoA = getStatusWeight(a.status);
        const pesoB = getStatusWeight(b.status);
        if (pesoA !== pesoB) return pesoA - pesoB;

        // Se ambos têm data de vencimento, ordena pela mais próxima
        if (a.dataProximoVencimento && b.dataProximoVencimento) {
          return a.dataProximoVencimento.localeCompare(b.dataProximoVencimento);
        }
        if (a.dataProximoVencimento) return -1;
        if (b.dataProximoVencimento) return 1;
        return a.condominio.localeCompare(b.condominio);
      }

      if (colunaOrdenacao === 'codigo') {
        const valA = Number(a.codigo) || 0;
        const valB = Number(b.codigo) || 0;
        return ordemDirecao === 'asc' ? valA - valB : valB - valA;
      }

      if (colunaOrdenacao === 'condominio') {
        return ordemDirecao === 'asc'
          ? (a.condominio || '').localeCompare(b.condominio || '')
          : (b.condominio || '').localeCompare(a.condominio || '');
      }

      if (colunaOrdenacao === 'gerente') {
        const valA = a.gerente || '';
        const valB = b.gerente || '';
        return ordemDirecao === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      if (colunaOrdenacao === 'limpeza') {
        const valA = a.dataUltimaLimpeza || '';
        const valB = b.dataUltimaLimpeza || '';
        if (!valA && !valB) return 0;
        if (!valA) return 1;
        if (!valB) return -1;
        return ordemDirecao === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      if (colunaOrdenacao === 'vencimento') {
        const valA = a.dataProximoVencimento || '';
        const valB = b.dataProximoVencimento || '';
        if (!valA && !valB) return 0;
        if (!valA) return 1;
        if (!valB) return -1;
        return ordemDirecao === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      if (colunaOrdenacao === 'capacidade') {
        const valA = a.capacidadeLitros || 0;
        const valB = b.capacidadeLitros || 0;
        return ordemDirecao === 'asc' ? valA - valB : valB - valA;
      }

      if (colunaOrdenacao === 'status') {
        const pesoA = getStatusWeight(a.status);
        const pesoB = getStatusWeight(b.status);
        return ordemDirecao === 'asc' ? pesoA - pesoB : pesoB - pesoA;
      }

      return 0;
    });

    return ordenados;
  }, [dadosFiltrados, colunaOrdenacao, ordemDirecao]);

  return (
    <div className="res-layout">
      <div className={`res-content ${drawerAberto ? 'drawer-open' : ''}`}>
        {/* Header */}
        <div className="res-header">
          <div className="res-title-area">
            <div className="res-title-icon">
              <IcoReservatorio />
            </div>
            <div>
              <h1>Limpeza de reservatórios</h1>
              <p>Controle de higienização, desinfecção e potabilidade dos reservatórios de água</p>
            </div>
          </div>

          <button type="button" className="res-btn-primary" onClick={handleNovo}>
            + Novo registro
          </button>
        </div>

        {/* Rule banner */}
        <div className="res-rule-card">
          <div className="res-rule-info">
            <span className="res-rule-pill">Periodicidade Semestral</span>
            <span>
              Higienização a cada <strong>6 meses</strong> conforme normas sanitárias vigentes (ANVISA / Portaria de Potabilidade).
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Base de cálculo: <strong>{stats.total} condomínios</strong>
          </div>
        </div>

        {erro && (
          <div
            style={{
              background: '#fee2e2',
              color: '#b91c1c',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '14px'
            }}
          >
            {erro}
          </div>
        )}

        {/* KPIs */}
        <ReservatoriosKpis
          stats={stats}
          filtroStatus={filtros.status}
          onSelectStatus={(status) => handleFiltroChange('status', status)}
        />

        {/* Filters */}
        <ReservatoriosFilters
          filtros={filtros}
          onFiltroChange={handleFiltroChange}
          onLimparFiltros={handleLimparFiltros}
          gerentes={gerentes}
        />

        {/* Table */}
        <ReservatoriosTable
          dados={dadosOrdenados}
          carregando={carregando}
          isAdmin={isAdmin}
          onVisualizar={handleVisualizar}
          onEditar={handleEditar}
          onExcluir={handleExcluir}
          paginaAtual={paginaAtual}
          setPaginaAtual={setPaginaAtual}
          itensPorPagina={itensPorPagina}
          setItensPorPagina={setItensPorPagina}
          colunaOrdenacao={colunaOrdenacao}
          ordemDirecao={ordemDirecao}
          onOrdenar={handleOrdenar}
        />
      </div>

      {/* Drawer Novo / Editar */}
      <ReservatoriosDrawer
        aberto={drawerAberto}
        onFechar={() => setDrawerAberto(false)}
        condominioEditando={condominioEditando}
        todosCondominios={dados}
        onSalvar={handleSalvar}
      />

      {/* Modal Visualizar Detalhes */}
      {itemVisualizando && (
        <ReservatoriosModalVisualizar
          item={itemVisualizando}
          onFechar={() => setItemVisualizando(null)}
          onEditar={(item) => {
            setItemVisualizando(null);
            handleEditar(item);
          }}
        />
      )}

      {/* Toast Feedback */}
      {toast && <div className="res-toast">{toast}</div>}
    </div>
  );
}
