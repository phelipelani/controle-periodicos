import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import '../spda.css';

import { IcoSpda } from '../components/icons';
import SpdaKpis from '../components/spda/SpdaKpis';
import SpdaFilters from '../components/spda/SpdaFilters';
import SpdaTable from '../components/spda/SpdaTable';
import SpdaDrawer from '../components/spda/SpdaDrawer';
import SpdaFichaDrawer from '../components/spda/SpdaFichaDrawer';

const initialFiltros = {
  busca: '',
  gerente: 'Todos',
  status: 'Todos',
  dataDe: '',
  dataAte: ''
};

export default function Spda() {
  const { isAdmin } = useAuth();
  const [registros, setRegistros] = useState([]);
  const [kpis, setKpis] = useState({});
  const [gerentes, setGerentes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [toast, setToast] = useState('');

  const [filtros, setFiltros] = useState(initialFiltros);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(15);

  const [colunaOrdenacao, setColunaOrdenacao] = useState('status_padrao');
  const [ordemDirecao, setOrdemDirecao] = useState('asc');

  // Drawers
  const [drawerNovoEditarAberto, setDrawerNovoEditarAberto] = useState(false);
  const [itemEditando, setItemEditando] = useState(null);
  const [fichaCondominioId, setFichaCondominioId] = useState(null);

  const carregarDados = () => {
    setCarregando(true);
    api.get('/spda')
      .then((res) => {
        setRegistros(res.registros || []);
        setKpis(res.kpis || {});
        setErro('');
      })
      .catch((err) => {
        setErro(err.message || 'Erro ao carregar dados de SPDA.');
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
    await api.post('/spda', payload);
    mostrarToast('Registro de SPDA salvo com sucesso!');
    carregarDados();
  };

  const handleExcluir = async (item) => {
    if (!window.confirm(`Deseja limpar o registro de SPDA do condomínio ${item.condominio}?`)) return;
    try {
      await api.del(`/spda/${item.id}`);
      mostrarToast('Registro de SPDA removido com sucesso!');
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
        const endMatch = item.endereco ? item.endereco.toLowerCase().includes(termo) : false;
        if (!nomeMatch && !codMatch && !endMatch) return false;
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
        const endMatch = item.endereco ? item.endereco.toLowerCase().includes(termo) : false;
        if (!nomeMatch && !codMatch && !endMatch) return false;
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
        // Regra 9: 1. Vencidos; 2. A vencer; 3. Em dia; 4. Sem registro. Data mais próxima primeiro.
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
    <div className={`spda-layout ${drawerNovoEditarAberto || fichaCondominioId ? 'drawer-open' : ''}`}>
      {/* Top Header */}
      <div className="spda-header">
        <div className="spda-title-area">
          <div className="spda-title-icon">
            <IcoSpda />
          </div>
          <div>
            <h1>SPDA</h1>
            <p>Controle por data de validade · {registros.length} condomínio(s)</p>
          </div>
        </div>

        <button type="button" className="spda-btn-primary" onClick={handleNovo}>
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
      <SpdaKpis kpis={kpisInteligentes}
        filtroStatus={filtros.status}
        onSelectStatus={(st) => handleFiltroChange('status', st)}
      />

      {/* Filtros */}
      <SpdaFilters
        filtros={filtros}
        onFiltroChange={handleFiltroChange}
        onLimparFiltros={handleLimparFiltros}
        gerentes={gerentes}
      />

      {/* Tabela de Condomínios */}
      <SpdaTable
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
      <SpdaDrawer
        aberto={drawerNovoEditarAberto}
        onFechar={() => setDrawerNovoEditarAberto(false)}
        itemEditando={itemEditando}
        todosCondominios={registros}
        gerentes={gerentes}
        onSalvar={handleSalvar}
      />

      {/* Drawer: Visualizar Detalhes do SPDA */}
      <SpdaFichaDrawer
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
      {toast && <div className="spda-toast">{toast}</div>}
    </div>
  );
}
