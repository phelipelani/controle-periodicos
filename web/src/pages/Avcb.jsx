import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import '../avcb.css';

import { IcoAvcb } from '../components/icons';
import AvcbKpis from '../components/avcb/AvcbKpis';
import AvcbFilters from '../components/avcb/AvcbFilters';
import AvcbTable from '../components/avcb/AvcbTable';
import AvcbDrawer from '../components/avcb/AvcbDrawer';
import AvcbFichaDrawer from '../components/avcb/AvcbFichaDrawer';

const initialFiltros = {
  busca: '',
  gerente: 'Todos',
  status: 'Todos',
  dataDe: '',
  dataAte: ''
};

export default function Avcb() {
  const { isAdmin } = useAuth();
  const [registros, setRegistros] = useState([]);
  const [kpis, setKpis] = useState({});
  const [gerentes, setGerentes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [toast, setToast] = useState('');

  const [filtros, setFiltros] = useState(initialFiltros);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(12);

  const [colunaOrdenacao, setColunaOrdenacao] = useState('status_padrao');
  const [ordemDirecao, setOrdemDirecao] = useState('asc');

  // Drawers
  const [drawerNovoEditarAberto, setDrawerNovoEditarAberto] = useState(false);
  const [itemEditando, setItemEditando] = useState(null);
  const [fichaCondominioId, setFichaCondominioId] = useState(null);

  const carregarDados = () => {
    setCarregando(true);
    api.get('/avcb')
      .then((res) => {
        setRegistros(res.registros || []);
        setKpis(res.kpis || {});
        setErro('');
      })
      .catch((err) => {
        setErro(err.message || 'Erro ao carregar dados de AVCB.');
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
    await api.post('/avcb', payload);
    mostrarToast('Registro de AVCB salvo com sucesso!');
    carregarDados();
  };

  const handleExcluir = async (item) => {
    if (!window.confirm(`Deseja limpar o registro de AVCB do condomínio ${item.condominio}?`)) return;
    try {
      await api.del(`/avcb/${item.id || item.condominioId}`);
      mostrarToast('Registro de AVCB removido com sucesso!');
      carregarDados();
    } catch (e) {
      setErro(e.message || 'Erro ao excluir');
    }
  };

  const handleNovo = () => {
    setItemEditando(null);
    setDrawerNovoEditarAberto(true);
  };

  const handleEditar = (item) => {
    setItemEditando(item);
    setDrawerNovoEditarAberto(true);
  };

  const handleVisualizar = (item) => {
    setFichaCondominioId(item.condominioId || item.id);
  };

  // Filtros
  const handleFiltroChange = (chave, valor) => {
    setFiltros((prev) => ({ ...prev, [chave]: valor }));
    setPaginaAtual(1);
  };

  const handleLimparFiltros = () => {
    setFiltros(initialFiltros);
    setPaginaAtual(1);
  };

  const kpisInteligentes = useMemo(() => {
    const base = registros.filter((item) => {
      if (filtros.busca) {
        const termo = filtros.busca.toLowerCase().trim();
        const nomeMatch = (item.condominio || '').toLowerCase().includes(termo);
        const codMatch = (item.codigo || '').toLowerCase().includes(termo);
        const numMatch = item.numeroAvcb ? item.numeroAvcb.toLowerCase().includes(termo) : false;
        const endMatch = item.endereco ? item.endereco.toLowerCase().includes(termo) : false;
        if (!nomeMatch && !codMatch && !numMatch && !endMatch) return false;
      }
      if (filtros.gerente !== 'Todos' && item.gerente !== filtros.gerente) return false;
      if (filtros.dataDe && (!item.dataValidade || item.dataValidade < filtros.dataDe)) return false;
      if (filtros.dataAte && (!item.dataValidade || item.dataValidade > filtros.dataAte)) return false;
      return true;
    });

    const total = base.length;
    const emDia = base.filter((d) => d.status === 'em_dia').length;
    const aVencer = base.filter((d) => d.status === 'a_vencer').length;
    const vencidos = base.filter((d) => d.status === 'vencido').length;
    const semRegistro = base.filter((d) => d.status === 'sem_registro').length;

    return {
      totalCondominios: total,
      emDia,
      aVencer,
      vencidos,
      semRegistro,
      gerenteAtivo: filtros.gerente !== 'Todos' ? filtros.gerente : null
    };
  }, [registros, filtros.busca, filtros.gerente, filtros.dataDe, filtros.dataAte]);

  const dadosFiltrados = useMemo(() => {
    return registros.filter((item) => {
      // Busca texto
      if (filtros.busca) {
        const termo = filtros.busca.toLowerCase().trim();
        const nomeMatch = (item.condominio || '').toLowerCase().includes(termo);
        const codMatch = (item.codigo || '').toLowerCase().includes(termo);
        const numMatch = item.numeroAvcb ? item.numeroAvcb.toLowerCase().includes(termo) : false;
        const endMatch = item.endereco ? item.endereco.toLowerCase().includes(termo) : false;
        if (!nomeMatch && !codMatch && !numMatch && !endMatch) return false;
      }

      // Gerente
      if (filtros.gerente !== 'Todos') {
        if (item.gerente !== filtros.gerente) return false;
      }

      // Situação
      if (filtros.status !== 'Todos') {
        if (item.status !== filtros.status) return false;
      }

      // Data De
      if (filtros.dataDe) {
        if (!item.dataValidade || item.dataValidade < filtros.dataDe) return false;
      }

      // Data Ate
      if (filtros.dataAte) {
        if (!item.dataValidade || item.dataValidade > filtros.dataAte) return false;
      }

      return true;
    });
  }, [registros, filtros]);

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
        const pesoA = getStatusWeight(a.status);
        const pesoB = getStatusWeight(b.status);
        if (pesoA !== pesoB) return pesoA - pesoB;

        if (a.dataValidade && b.dataValidade) {
          return a.dataValidade.localeCompare(b.dataValidade);
        }
        if (a.dataValidade) return -1;
        if (b.dataValidade) return 1;
        return (a.condominio || '').localeCompare(b.condominio || '');
      }

      if (colunaOrdenacao === 'codigo') {
        const valA = Number(a.codigo || a.id) || 0;
        const valB = Number(b.codigo || b.id) || 0;
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
        return ordemDirecao === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      if (colunaOrdenacao === 'atualizacao') {
        const valA = a.dataAtualizacao || '';
        const valB = b.dataAtualizacao || '';
        if (!valA && !valB) return 0;
        if (!valA) return 1;
        if (!valB) return -1;
        return ordemDirecao === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      if (colunaOrdenacao === 'validade') {
        const valA = a.dataValidade || '';
        const valB = b.dataValidade || '';
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

    return ordenados;
  }, [dadosFiltrados, colunaOrdenacao, ordemDirecao]);

  return (
    <div className={`avcb-layout ${drawerNovoEditarAberto || fichaCondominioId ? 'drawer-open' : ''}`}>
      {/* Top Header */}
      <div className="avcb-header">
        <div className="avcb-title-area">
          <div className="avcb-title-icon">
            <IcoAvcb />
          </div>
          <div>
            <h1>AVCB — Auto de Vistoria do Corpo de Bombeiros</h1>
            <p>Controle por data de validade · {registros.length} condomínio(s)</p>
          </div>
        </div>

        <button type="button" className="avcb-btn-primary" onClick={handleNovo}>
          + Novo registro
        </button>
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

      {/* 4 KPIs Interativos */}
      <AvcbKpis kpis={kpisInteligentes}
        filtroStatus={filtros.status}
        onSelectStatus={(st) => handleFiltroChange('status', st)}
      />

      {/* Filtros */}
      <AvcbFilters
        filtros={filtros}
        onFiltroChange={handleFiltroChange}
        onLimparFiltros={handleLimparFiltros}
        gerentes={gerentes}
      />

      {/* Tabela de Condomínios */}
      <AvcbTable
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

      {/* Drawer: Novo / Editar Registro */}
      <AvcbDrawer
        aberto={drawerNovoEditarAberto}
        onFechar={() => setDrawerNovoEditarAberto(false)}
        itemEditando={itemEditando}
        todosCondominios={registros}
        gerentes={gerentes}
        onSalvar={handleSalvar}
      />

      {/* Drawer: Visualizar Detalhes do AVCB */}
      <AvcbFichaDrawer
        aberto={!!fichaCondominioId}
        condominioId={fichaCondominioId}
        onFechar={() => setFichaCondominioId(null)}
        onEditar={(ficha) => {
          setFichaCondominioId(null);
          handleEditar(ficha);
        }}
        isAdmin={isAdmin}
      />

      {/* Toast Feedback */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 9999,
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
            fontWeight: 600,
            fontSize: '14px',
            backgroundColor: '#10b981',
            color: '#ffffff'
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
