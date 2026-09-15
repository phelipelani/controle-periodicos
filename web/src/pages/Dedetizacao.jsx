import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../dedetizacao.css';
import { api } from '../api';
import { 
  DedetizacaoHeader, 
  DedetizacaoKpis, 
  DedetizacaoFilters, 
  DedetizacaoFooterLegenda 
} from '../components/dedetizacao/DedetizacaoComponents';
import DedetizacaoTable from '../components/dedetizacao/DedetizacaoTable';
import DedetizacaoDrawer from '../components/dedetizacao/DedetizacaoDrawer';
import DedetizacaoModalVisualizar from '../components/dedetizacao/DedetizacaoModalVisualizar';

export default function Dedetizacao() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState('novo'); // 'novo' | 'execucao'
  const [activeRow, setActiveRow] = useState(null);
  const [itemVisualizando, setItemVisualizando] = useState(null);
  const [dadosBrutos, setDadosBrutos] = useState([]);
  const [usuariosEmpresas, setUsuariosEmpresas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const initialFilters = {
    busca: '',
    status: 'Todos',
    empresa: 'Todas',
    dataInicio: '',
    dataFim: '',
    nota: 'Todos'
  };
  const [filtros, setFiltros] = useState(initialFilters);
  const navigate = useNavigate();

  const [servicoId, setServicoId] = useState(null);

  const carregarDados = () => {
    setCarregando(true);
    api.get('/servicos/dedetizacao/detalhado')
      .then((res) => {
        setServicoId(res.servico.id);
        const mapeados = (res.itens || []).map(r => {
          const dictStatus = {
            'em_dia': 'Realizado',
            'pendente': 'Pendente',
            'agendado': 'Agendado',
            'vencido': 'Atrasado',
            'sem_nota': 'Realizado' // visually Realizado but sem nota
          };
          
          return {
            id: r.id,
            condominio_id: r.id,
            codigo: String(r.id).padStart(3, '0'),
            condominio: r.condominio_nome,
            empresa: (r.empresa_executora && r.empresa_executora !== '-') ? r.empresa_executora.trim().toUpperCase() : (r.empresa_executora || '-'),
            dataAgendada: r.data_agendada ? r.data_agendada.split('-').reverse().join('/') : '-',
            raw_data_agendada: r.data_agendada || '',
            periodoAgendado: r.agendamento_periodo || r.periodo || 'Manhã',
            dataExecucao: r.data_execucao ? r.data_execucao.split('-').reverse().join('/') : null,
            validade: r.proxima_execucao ? r.proxima_execucao.split('-').reverse().join('/') : null,
            status: dictStatus[r.status] || 'Pendente',
            status_original: r.status,
            temNota: r.nota && r.nota.status === 'Anexada',
            path: r.nota ? r.nota.path : null,
            agendamento_id: r.agendamento_id,
            agendamento_empresa: r.agendamento_empresa || '',
            agendamento_periodo: r.agendamento_periodo || r.periodo || 'Manhã',
            agendamento_observacao: r.agendamento_observacao || '',
            historico_id: r.historico_id,
            observacao: r.observacoes || '',
            // also keep raw dates for filtering
            raw_data_execucao: r.data_execucao
          };
        });
        setDadosBrutos(mapeados);
        setErro(null);
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    carregarDados();
    api.get('/usuarios')
      .then((us) => setUsuariosEmpresas((us || []).filter((u) => u.papel === 'empresa' && u.ativo)))
      .catch(() => {});
  }, []);

  // Filter logic
  // Lista dinâmica e completa de empresas dedetizadoras (das execuções + usuários do tipo empresa) em CAPS
  const empresasDisponiveis = useMemo(() => {
    const set = new Set();
    
    // Das execuções da tabela
    dadosBrutos.forEach((d) => {
      if (d.empresa && d.empresa !== '-' && d.empresa.trim() !== '') {
        set.add(d.empresa.trim().toUpperCase());
      }
    });

    // Dos usuários cadastrados como empresa
    (usuariosEmpresas || []).forEach((u) => {
      const nomeEmp = u.empresa_nome || u.nome;
      if (nomeEmp && nomeEmp.trim() !== '') {
        set.add(nomeEmp.trim().toUpperCase());
      }
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [dadosBrutos, usuariosEmpresas]);

  const dadosFiltrados = useMemo(() => {
    return dadosBrutos.filter(d => {
      if (filtros.busca) {
        const term = filtros.busca.toLowerCase();
        if (!d.condominio.toLowerCase().includes(term) && !d.codigo.includes(term)) return false;
      }
      if (filtros.status !== 'Todos') {
        const statusMap = { 'Realizado': 'Realizado', 'Pendente': 'Pendente', 'Agendado': 'Agendado', 'Atrasado': 'Atrasado', 'Sem nota': 'Realizado' };
        if (d.status !== statusMap[filtros.status]) return false;
        if (filtros.status === 'Sem nota' && d.status_original !== 'sem_nota') return false;
      }
      if (filtros.empresa !== 'Todas') {
        if (!d.empresa || d.empresa.trim().toUpperCase() !== filtros.empresa.trim().toUpperCase()) return false;
      }
      if (filtros.nota !== 'Todos') {
        const tem = d.temNota ? 'Anexada' : 'Pendente';
        if (tem !== filtros.nota) return false;
      }
      if (filtros.dataInicio) {
        if (d.raw_data_execucao && new Date(d.raw_data_execucao) < new Date(filtros.dataInicio)) return false;
      }
      if (filtros.dataFim) {
        if (d.raw_data_execucao && new Date(d.raw_data_execucao) > new Date(filtros.dataFim)) return false;
      }
      return true;
    });
  }, [dadosBrutos, filtros]);

  const [colunaOrdenacao, setColunaOrdenacao] = useState('codigo');
  const [ordemDirecao, setOrdemDirecao] = useState('asc');

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

    ordenados.sort((a, b) => {
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

      if (colunaOrdenacao === 'empresa') {
        const valA = (a.empresa || '').toLowerCase();
        const valB = (b.empresa || '').toLowerCase();
        return ordemDirecao === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      if (colunaOrdenacao === 'dataAgendada') {
        const valA = a.dataAgendada || '';
        const valB = b.dataAgendada || '';
        return ordemDirecao === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      if (colunaOrdenacao === 'dataExecucao') {
        const valA = a.raw_data_execucao || a.dataExecucao || '';
        const valB = b.raw_data_execucao || b.dataExecucao || '';
        if (!valA && !valB) return 0;
        if (!valA) return 1;
        if (!valB) return -1;
        return ordemDirecao === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      if (colunaOrdenacao === 'validade') {
        const valA = a.validade || '';
        const valB = b.validade || '';
        if (!valA && !valB) return 0;
        if (!valA) return 1;
        if (!valB) return -1;
        return ordemDirecao === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      if (colunaOrdenacao === 'status') {
        const statusPeso = { 'Atrasado': 1, 'Pendente': 2, 'Agendado': 3, 'Realizado': 4 };
        const pesoA = statusPeso[a.status] || 5;
        const pesoB = statusPeso[b.status] || 5;
        return ordemDirecao === 'asc' ? pesoA - pesoB : pesoB - pesoA;
      }

      if (colunaOrdenacao === 'nota') {
        const valA = a.temNota ? 1 : 0;
        const valB = b.temNota ? 1 : 0;
        return ordemDirecao === 'asc' ? valB - valA : valA - valB;
      }

      return 0;
    });

    return ordenados;
  }, [dadosFiltrados, colunaOrdenacao, ordemDirecao]);

  const stats = useMemo(() => {
    const base = dadosBrutos.filter(d => {
      if (filtros.busca) {
        const term = filtros.busca.toLowerCase();
        if (!d.condominio.toLowerCase().includes(term) && !d.codigo.includes(term)) return false;
      }
      if (filtros.empresa !== 'Todas') {
        if (!d.empresa || d.empresa.toLowerCase() !== filtros.empresa.toLowerCase()) return false;
      }
      if (filtros.dataInicio) {
        const dataExe = d.raw_data_execucao || (d.dataExecucao ? d.dataExecucao.split('/').reverse().join('-') : '');
        if (!dataExe || dataExe < filtros.dataInicio) return false;
      }
      if (filtros.dataFim) {
        const dataExe = d.raw_data_execucao || (d.dataExecucao ? d.dataExecucao.split('/').reverse().join('-') : '');
        if (!dataExe || dataExe > filtros.dataFim) return false;
      }
      return true;
    });

    const total = base.length;
    const emDia = base.filter(d => d.status === 'Realizado').length;
    const pendentes = base.filter(d => d.status === 'Pendente' || d.status === 'Atrasado').length;
    const proximas = base.filter(d => d.status === 'Agendado').length;
    const semNota = base.filter(d => d.status_original === 'sem_nota' || (!d.temNota && d.status === 'Realizado')).length;

    return {
      condominios: total,
      emDia,
      percEmDia: total > 0 ? Math.round((emDia / total) * 100) : 0,
      pendentes,
      proximas,
      semNota,
      empresaAtiva: filtros.empresa !== 'Todas' ? filtros.empresa : null
    };
  }, [dadosBrutos, filtros.busca, filtros.empresa, filtros.dataInicio, filtros.dataFim]);

  const [drawerTab, setDrawerTab] = useState('agendamento');

  const handleNovoAgendamento = () => {
    setDrawerMode('novo');
    setDrawerTab('agendamento');
    setActiveRow(null);
    setDrawerOpen(true);
  };

  const handleEdit = (row, initialTab) => {
    setDrawerMode('editar');
    setDrawerTab(initialTab || (row.agendamento_id || row.status === 'Agendado' ? 'agendamento' : 'execucao'));
    setActiveRow(row);
    setDrawerOpen(true);
  };

  const clearFilters = () => setFiltros(initialFilters);

  const handleKpiAction = (action) => {
    if (action === 'todos') {
      setFiltros(prev => ({ ...prev, status: 'Todos', nota: 'Todos' }));
    } else if (action === 'em_dia') {
      setFiltros(prev => ({ ...prev, status: prev.status === 'Realizado' ? 'Todos' : 'Realizado', nota: 'Todos' }));
    } else if (action === 'pendentes') {
      setFiltros(prev => ({ ...prev, status: prev.status === 'Pendente' ? 'Todos' : 'Pendente', nota: 'Todos' }));
    } else if (action === 'proximas') {
      setFiltros(prev => ({ ...prev, status: prev.status === 'Agendado' ? 'Todos' : 'Agendado', nota: 'Todos' }));
    } else if (action === 'sem_nota') {
      setFiltros(prev => ({ ...prev, nota: prev.nota === 'Pendente' ? 'Todos' : 'Pendente', status: 'Todos' }));
    }
  };

  const onSaved = () => {
    setDrawerOpen(false);
    carregarDados();
  };

  return (
    <div className="ded-layout">
      <div className={`ded-content ${drawerOpen ? 'drawer-open' : ''}`}>
        <DedetizacaoHeader 
          onNovoAgendamento={handleNovoAgendamento} 
          onVerAgendamentos={() => navigate('/agendamentos')} 
        />
        
        {erro ? (
          <div style={{ color: 'red', margin: '20px' }}>Erro: {erro}</div>
        ) : carregando ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Carregando dados reais...</div>
        ) : (
          <>
            <DedetizacaoKpis stats={stats} filtroAtivo={filtros.nota === 'Pendente' ? 'Sem nota' : filtros.status} onKpiAction={handleKpiAction} />
            <DedetizacaoFilters filtros={filtros} setFiltros={setFiltros} onClear={clearFilters} empresas={empresasDisponiveis} />
            <DedetizacaoTable 
              data={dadosOrdenados} 
              onEdit={handleEdit} 
              onVisualizar={(row) => setItemVisualizando(row)}
              colunaOrdenacao={colunaOrdenacao}
              ordemDirecao={ordemDirecao}
              onOrdenar={handleOrdenar}
            />
          </>
        )}
        <DedetizacaoFooterLegenda />
      </div>

      <DedetizacaoDrawer 
        open={drawerOpen} 
        onClose={() => setDrawerOpen(false)} 
        mode={drawerMode}
        initialTab={drawerTab}
        rowData={activeRow}
        onSaved={onSaved}
        todosCondominios={dadosBrutos}
        servicoId={servicoId}
      />

      {itemVisualizando && (
        <DedetizacaoModalVisualizar
          item={itemVisualizando}
          onFechar={() => setItemVisualizando(null)}
          onReciboExcluido={carregarDados}
        />
      )}
    </div>
  );
}
