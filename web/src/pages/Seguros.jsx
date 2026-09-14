import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import '../seguros.css';

import { IcoSeguro } from '../components/icons';
import SegurosKpis from '../components/seguros/SegurosKpis';
import SegurosFilters from '../components/seguros/SegurosFilters';
import SegurosTable from '../components/seguros/SegurosTable';
import SeguroFichaDrawer from '../components/seguros/SeguroFichaDrawer';
import SeguroNovoEditarDrawer from '../components/seguros/SeguroNovoEditarDrawer';

const initialFiltros = {
  busca: '',
  seguradora: 'Todas',
  corretora: 'Todas',
  gerente: 'Todos',
  dataDe: '',
  dataAte: '',
  status: 'Todos'
};

export default function Seguros() {
  const { usuario, isAdmin } = useAuth();
  const [seguros, setSeguros] = useState([]);
  const [kpis, setKpis] = useState({});
  const [seguradoras, setSeguradoras] = useState([]);
  const [corretoras, setCorretoras] = useState([]);
  const [gerentes, setGerentes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [toast, setToast] = useState('');

  const [filtros, setFiltros] = useState(initialFiltros);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(15);

  const [colunaOrdenacao, setColunaOrdenacao] = useState('codigo');
  const [ordemDirecao, setOrdemDirecao] = useState('asc');

  // Drawers
  const [fichaCondominioId, setFichaCondominioId] = useState(null);
  const [drawerNovoEditarAberto, setDrawerNovoEditarAberto] = useState(false);
  const [seguroEditando, setSeguroEditando] = useState(null);

  const podeEditarCadastrais = isAdmin || usuario?.papel === 'gerente';

  const carregarDados = () => {
    setCarregando(true);
    api.get('/seguros')
      .then((res) => {
        setSeguros(res.seguros || []);
        setKpis(res.kpis || {});
        setSeguradoras(res.seguradoras || []);
        setCorretoras(res.corretoras || []);
        setErro('');
      })
      .catch((err) => {
        setErro(err.message || 'Erro ao carregar dados de seguros.');
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
    await api.post('/seguros', payload);
    mostrarToast('Seguro salvo com sucesso!');
    carregarDados();
  };

  const handleRenovar = async (item) => {
    const novaApolice = window.prompt(`Informe o número da nova apólice para ${item.condominio}:`, item.numeroApolice !== '—' ? item.numeroApolice : '');
    if (novaApolice === null) return;

    let novaDataValidade = '';
    if (item.dataValidade) {
      const [y, m, d] = item.dataValidade.split('-').map(Number);
      const dataVenc = new Date(y + 1, m - 1, d);
      novaDataValidade = `${dataVenc.getFullYear()}-${String(dataVenc.getMonth() + 1).padStart(2, '0')}-${String(dataVenc.getDate()).padStart(2, '0')}`;
    }

    try {
      await api.post(`/seguros/${item.id}/renovar`, {
        nova_apolice: novaApolice,
        nova_data_renovacao: item.dataValidade || new Date().toISOString().split('T')[0],
        nova_data_validade: novaDataValidade
      });
      mostrarToast('Apólice renovada com sucesso!');
      carregarDados();
    } catch (e) {
      setErro(e.message || 'Erro ao renovar');
    }
  };

  const handleExcluir = async (item) => {
    if (!window.confirm(`Deseja limpar os dados de seguro do condomínio ${item.condominio}?`)) return;
    try {
      await api.del(`/seguros/${item.id}`);
      mostrarToast('Registro de seguro removido com sucesso!');
      carregarDados();
    } catch (e) {
      setErro(e.message || 'Erro ao excluir');
    }
  };

  const handleNovo = () => {
    setSeguroEditando(null);
    setDrawerNovoEditarAberto(true);
  };

  const handleEditar = (item) => {
    setSeguroEditando(item);
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
    const base = seguros.filter((item) => {
      if (filtros.busca) {
        const termo = filtros.busca.toLowerCase().trim();
        const nomeMatch = (item.condominio || '').toLowerCase().includes(termo);
        const codMatch = (item.codigo || '').toLowerCase().includes(termo);
        const endMatch = item.endereco ? item.endereco.toLowerCase().includes(termo) : false;
        if (!nomeMatch && !codMatch && !endMatch) return false;
      }
      if (filtros.seguradora !== 'Todas' && item.seguradora !== filtros.seguradora) return false;
      if (filtros.corretora !== 'Todas' && item.corretora !== filtros.corretora) return false;
      if (filtros.gerente !== 'Todos' && item.gerente !== filtros.gerente) return false;
      if (filtros.dataDe && (!item.dataValidade || item.dataValidade < filtros.dataDe)) return false;
      if (filtros.dataAte && (!item.dataValidade || item.dataValidade > filtros.dataAte)) return false;
      return true;
    });

    const totalCondominios = base.length;
    const segurosAtivos = base.filter((d) => d.status === 'ativo').length;
    const proximosVencer = base.filter((d) => d.status === 'a_vencer').length;
    const segurosVencidos = base.filter((d) => d.status === 'vencido').length;
    const pctAtivos = totalCondominios > 0 ? ((segurosAtivos / totalCondominios) * 100).toFixed(1).replace('.', ',') + '%' : '0,0%';

    return {
      totalCondominios,
      segurosAtivos,
      proximosVencer,
      segurosVencidos,
      percentualAtivos: pctAtivos,
      gerenteAtivo: filtros.gerente !== 'Todos' ? filtros.gerente : null
    };
  }, [seguros, filtros.busca, filtros.seguradora, filtros.corretora, filtros.gerente, filtros.dataDe, filtros.dataAte]);

  const dadosFiltrados = useMemo(() => {
    return seguros.filter((item) => {
      // Busca texto
      if (filtros.busca) {
        const termo = filtros.busca.toLowerCase().trim();
        const nomeMatch = item.condominio.toLowerCase().includes(termo);
        const codMatch = item.codigo.toLowerCase().includes(termo);
        const endMatch = item.endereco ? item.endereco.toLowerCase().includes(termo) : false;
        if (!nomeMatch && !codMatch && !endMatch) return false;
      }

      // Seguradora
      if (filtros.seguradora !== 'Todas') {
        if (item.seguradora !== filtros.seguradora) return false;
      }

      // Corretora
      if (filtros.corretora !== 'Todas') {
        if (item.corretora !== filtros.corretora) return false;
      }

      // Gerente
      if (filtros.gerente !== 'Todos') {
        if (item.gerente !== filtros.gerente) return false;
      }

      // Status
      if (filtros.status !== 'Todos') {
        if (item.status !== filtros.status) return false;
      }

      // Data De
      if (filtros.dataDe) {
        if (!item.dataValidade || item.dataValidade < filtros.dataDe) {
          return false;
        }
      }

      // Data Ate
      if (filtros.dataAte) {
        if (!item.dataValidade || item.dataValidade > filtros.dataAte) {
          return false;
        }
      }

      return true;
    });
  }, [seguros, filtros]);

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
        case 'ativo': return 3;
        case 'sem_registro': return 4;
        default: return 5;
      }
    };

    ordenados.sort((a, b) => {
      if (colunaOrdenacao === 'status_padrao') {
        // Ordenação padrão: Vencidos > A vencer > Ativos > Sem registro
        const pesoA = getStatusWeight(a.status);
        const pesoB = getStatusWeight(b.status);
        if (pesoA !== pesoB) return pesoA - pesoB;

        if (a.dataValidade && b.dataValidade) {
          return a.dataValidade.localeCompare(b.dataValidade);
        }
        if (a.dataValidade) return -1;
        if (b.dataValidade) return 1;
        return a.condominio.localeCompare(b.condominio);
      }

      if (colunaOrdenacao === 'codigo') {
        const valA = Number(a.codigo) || 0;
        const valB = Number(b.codigo) || 0;
        return ordemDirecao === 'asc' ? valA - valB : valB - valA;
      }

      if (colunaOrdenacao === 'condominio') {
        return ordemDirecao === 'asc'
          ? a.condominio.localeCompare(b.condominio)
          : b.condominio.localeCompare(a.condominio);
      }

      if (colunaOrdenacao === 'seguradora') {
        return ordemDirecao === 'asc'
          ? a.seguradora.localeCompare(b.seguradora)
          : b.seguradora.localeCompare(a.seguradora);
      }

      if (colunaOrdenacao === 'corretora') {
        return ordemDirecao === 'asc'
          ? a.corretora.localeCompare(b.corretora)
          : b.corretora.localeCompare(a.corretora);
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

  const drawerAbertoGeral = !!fichaCondominioId || drawerNovoEditarAberto;

  return (
    <div className="seg-layout">
      <div className={`seg-content ${drawerAbertoGeral ? 'drawer-open' : ''}`}>
        {/* Header */}
        <div className="seg-header">
          <div className="seg-title-area">
            <div className="seg-title-icon">
              <IcoSeguro />
            </div>
            <div>
              <h1>Seguros</h1>
              <p>Gestão e controle dos seguros dos condomínios.</p>
            </div>
          </div>

          <button type="button" className="seg-btn-primary" onClick={handleNovo}>
            + Novo seguro
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

        {/* KPIs */}
        <SegurosKpis kpis={kpisInteligentes}
          filtroStatus={filtros.status}
          onSelectStatus={(status) => handleFiltroChange('status', status)}
        />

        {/* Filters */}
        <SegurosFilters
          filtros={filtros}
          onFiltroChange={handleFiltroChange}
          onLimparFiltros={handleLimparFiltros}
          seguradoras={seguradoras}
          corretoras={corretoras}
          gerentes={gerentes}
        />

        {/* Table */}
        <SegurosTable
          dados={dadosOrdenados}
          carregando={carregando}
          isAdmin={isAdmin}
          onVisualizar={handleVisualizar}
          onEditar={handleEditar}
          onRenovar={handleRenovar}
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

      {/* Drawer Ficha do Seguro */}
      <SeguroFichaDrawer
        aberto={!!fichaCondominioId}
        condominioId={fichaCondominioId}
        onFechar={() => setFichaCondominioId(null)}
        onEditar={(ficha) => {
          setFichaCondominioId(null);
          handleEditar(ficha);
        }}
        onNotificar={mostrarToast}
        podeEditarCadastrais={podeEditarCadastrais}
      />

      {/* Drawer Novo / Editar Seguro */}
      <SeguroNovoEditarDrawer
        aberto={drawerNovoEditarAberto}
        onFechar={() => setDrawerNovoEditarAberto(false)}
        seguroEditando={seguroEditando}
        todosCondominios={seguros}
        gerentes={gerentes}
        onSalvar={handleSalvar}
        podeEditarCadastrais={podeEditarCadastrais}
      />

      {/* Toast Feedback */}
      {toast && <div className="seg-toast">{toast}</div>}
    </div>
  );
}
