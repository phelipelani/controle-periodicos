import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import '../extintores.css';

import { IcoExtintor } from '../components/icons';
import ExtintoresKpis from '../components/extintores/ExtintoresKpis';
import ExtintoresFilters from '../components/extintores/ExtintoresFilters';
import ExtintoresTable from '../components/extintores/ExtintoresTable';
import ExtintoresDrawer from '../components/extintores/ExtintoresDrawer';
import ExtintoresModalVisualizar from '../components/extintores/ExtintoresModalVisualizar';

const initialFiltros = {
  busca: '',
  status: 'Todos',
  gerente: 'Todos',
  dataDe: '',
  dataAte: ''
};

export default function Extintores() {
  const { isAdmin } = useAuth();
  const [dados, setDados] = useState([]);
  const [gerentes, setGerentes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [toast, setToast] = useState('');

  const [filtros, setFiltros] = useState(initialFiltros);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);

  // Drawer / Modais
  const [drawerAberto, setDrawerAberto] = useState(false);
  const [condominioEditando, setCondominioEditando] = useState(null);
  const [itemVisualizando, setItemVisualizando] = useState(null);

  const carregarDados = () => {
    setCarregando(true);
    api.get('/extintores')
      .then((res) => {
        setDados(res || []);
        setErro('');
      })
      .catch((err) => {
        setErro(err.message || 'Erro ao carregar dados de extintores');
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
    await api.post('/extintores', payload);
    mostrarToast('Registro de extintores salvo com sucesso!');
    carregarDados();
  };

  const handleExcluir = async (item) => {
    if (!window.confirm(`Deseja limpar o registro de extintores do condomínio ${item.condominio}?`)) return;
    try {
      await api.del(`/extintores/${item.id}`);
      mostrarToast('Registro de extintores removido com sucesso!');
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

  const [colunaOrdenacao, setColunaOrdenacao] = useState('status_padrao');
  const [ordemDirecao, setOrdemDirecao] = useState('asc');

  const handleOrdenar = (coluna) => {
    if (colunaOrdenacao === coluna) {
      setOrdemDirecao((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setColunaOrdenacao(coluna);
      setOrdemDirecao('asc');
    }
  };

  // KPIs
  const stats = useMemo(() => {
    const base = dados.filter((item) => {
      if (filtros.busca) {
        const termo = filtros.busca.toLowerCase();
        const cod = item.codigo ? item.codigo.toLowerCase() : '';
        const nome = item.condominio ? item.condominio.toLowerCase() : '';
        if (!cod.includes(termo) && !nome.includes(termo)) return false;
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

  // Filtros combinados e ordenação por prioridade
  const dadosFiltrados = useMemo(() => {
    return dados.filter((item) => {
      if (filtros.busca) {
        const termo = filtros.busca.toLowerCase();
        const cod = item.codigo ? item.codigo.toLowerCase() : '';
        const nome = item.condominio ? item.condominio.toLowerCase() : '';
        if (!cod.includes(termo) && !nome.includes(termo)) return false;
      }

      if (filtros.status !== 'Todos' && item.status !== filtros.status) {
        return false;
      }

      if (filtros.gerente !== 'Todos') {
        if (item.gerente !== filtros.gerente) return false;
      }

      if (filtros.dataDe && item.dataProximoVencimento && item.dataProximoVencimento < filtros.dataDe) {
        return false;
      }

      if (filtros.dataAte && item.dataProximoVencimento && item.dataProximoVencimento > filtros.dataAte) {
        return false;
      }

      return true;
    });
  }, [dados, filtros]);

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
        const pesoA = getStatusWeight(a.status);
        const pesoB = getStatusWeight(b.status);
        if (pesoA !== pesoB) return pesoA - pesoB;

        if (a.dataProximoVencimento && b.dataProximoVencimento) {
          return a.dataProximoVencimento.localeCompare(b.dataProximoVencimento);
        }
        if (a.dataProximoVencimento) return -1;
        if (b.dataProximoVencimento) return 1;

        return a.condominio.localeCompare(b.condominio);
      }

      if (colunaOrdenacao === 'codigo') {
        const valA = Number(a.codigo || a.id) || 0;
        const valB = Number(b.codigo || b.id) || 0;
        return ordemDirecao === 'asc' ? valA - valB : valB - valA;
      }

      if (colunaOrdenacao === 'condominio') {
        const valA = (a.condominio || '').toLowerCase();
        const valB = (b.condominio || '').toLowerCase();
        return ordemDirecao === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      if (colunaOrdenacao === 'gerente') {
        const valA = (a.gerente || '').toLowerCase();
        const valB = (b.gerente || '').toLowerCase();
        return ordemDirecao === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      if (colunaOrdenacao === 'recarga') {
        const valA = a.dataUltimaRecarga || '';
        const valB = b.dataUltimaRecarga || '';
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

      if (colunaOrdenacao === 'hidrostatico') {
        const valA = a.dataUltimoTesteHidrostatico || '';
        const valB = b.dataUltimoTesteHidrostatico || '';
        if (!valA && !valB) return 0;
        if (!valA) return 1;
        if (!valB) return -1;
        return ordemDirecao === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      if (colunaOrdenacao === 'extintores') {
        const valA = Number(a.totalExtintores) || 0;
        const valB = Number(b.totalExtintores) || 0;
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
    <div className="ext-layout">
      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', background: '#16a34a', color: 'white', padding: '12px 20px', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.2)', zIndex: 9999, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          ✓ {toast}
        </div>
      )}

      <div className={`ext-content ${drawerAberto ? 'drawer-open' : ''}`}>
        {/* Header */}
        <div className="ext-header">
          <div className="ext-title-area">
            <div className="ext-title-icon">
              <IcoExtintor />
            </div>
            <div>
              <h1>Extintores — Controle e Recarga</h1>
              <p>Controle das recargas, inspeções e testes hidrostáticos dos extintores dos condomínios.</p>
            </div>
          </div>
          <button type="button" className="ext-btn-primary" onClick={handleNovo}>
            + Novo registro
          </button>
        </div>

        {erro && (
          <div style={{ background: '#fee2e2', color: '#dc2626', padding: '12px', borderRadius: '8px', fontSize: '13px' }}>
            {erro}
          </div>
        )}

        {/* KPIs */}
        <ExtintoresKpis
          stats={stats}
          filtroAtivo={filtros.status}
          onSelectFiltro={(st) => {
            setFiltros((prev) => ({ ...prev, status: st }));
            setPaginaAtual(1);
          }}
        />

        {/* Filtros */}
        <ExtintoresFilters
          filtros={filtros}
          setFiltros={(f) => {
            setFiltros(f);
            setPaginaAtual(1);
          }}
          gerentes={gerentes}
          onLimpar={() => {
            setFiltros(initialFiltros);
            setPaginaAtual(1);
          }}
        />

        {/* Tabela */}
        {carregando ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
            Carregando controle de extintores...
          </div>
        ) : (
          <ExtintoresTable
            dados={dadosOrdenados}
            onVisualizar={(item) => setItemVisualizando(item)}
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
        )}
      </div>

      {/* Drawer Lateral */}
      <ExtintoresDrawer
        aberto={drawerAberto}
        onFechar={() => setDrawerAberto(false)}
        condominioEditando={condominioEditando}
        todosCondominios={dados}
        onSalvar={handleSalvar}
      />

      {/* Modal Visualizar Detalhes */}
      {itemVisualizando && (
        <ExtintoresModalVisualizar
          item={itemVisualizando}
          onFechar={() => setItemVisualizando(null)}
        />
      )}
    </div>
  );
}
