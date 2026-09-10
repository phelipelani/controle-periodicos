import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import '../dedetizacao.css';
import { getMockDedetizacoes } from '../components/dedetizacao/mockDataDedetizacao';
import { 
  DedetizacaoHeader, 
  DedetizacaoKpis, 
  DedetizacaoFilters, 
  DedetizacaoFooterLegenda 
} from '../components/dedetizacao/DedetizacaoComponents';
import DedetizacaoTable from '../components/dedetizacao/DedetizacaoTable';
import DedetizacaoDrawer from '../components/dedetizacao/DedetizacaoDrawer';

export default function Dedetizacao() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState('novo'); // 'novo' | 'execucao'
  const [activeRow, setActiveRow] = useState(null);

  const initialFilters = {
    busca: '',
    status: 'Todos',
    empresa: 'Todas',
    dataInicio: '',
    dataFim: '',
    nota: 'Todos'
  };
  const [filtros, setFiltros] = useState(initialFilters);

  const dadosBrutos = useMemo(() => getMockDedetizacoes(), []);

  // Filter logic
  const dadosFiltrados = useMemo(() => {
    return dadosBrutos.filter(d => {
      if (filtros.busca) {
        const term = filtros.busca.toLowerCase();
        if (!d.condominio.toLowerCase().includes(term) && !d.codigo.includes(term)) return false;
      }
      if (filtros.status !== 'Todos' && d.status !== filtros.status) return false;
      if (filtros.empresa !== 'Todas' && d.empresa !== filtros.empresa) return false;
      if (filtros.nota !== 'Todos') {
        const tem = d.temNota ? 'Anexada' : 'Pendente';
        if (tem !== filtros.nota) return false;
      }
      if (filtros.dataInicio) {
        // Simple logic for mock: if dataExecucao < dataInicio return false
        // Assuming dates are 'dd/mm/yyyy'
        const parse = dt => dt ? new Date(dt.split('/').reverse().join('-')) : new Date(0);
        if (d.dataExecucao && parse(d.dataExecucao) < new Date(filtros.dataInicio)) return false;
      }
      if (filtros.dataFim) {
        const parse = dt => dt ? new Date(dt.split('/').reverse().join('-')) : new Date(8640000000000000);
        if (d.dataExecucao && parse(d.dataExecucao) > new Date(filtros.dataFim)) return false;
      }
      return true;
    });
  }, [dadosBrutos, filtros]);

  const stats = useMemo(() => {
    const total = 124; // Mock
    const emDia = 98; // Mock para refletir imagem
    const pendentes = dadosBrutos.filter(d => d.status === 'Pendente').length;
    const proximas = 8;
    const semNota = dadosBrutos.filter(d => d.status === 'Realizado' && !d.temNota).length + 5; // offset mock
    return {
      condominios: total,
      emDia,
      percEmDia: 79.0,
      pendentes: 16,
      proximas,
      semNota: 5
    };
  }, [dadosBrutos]);

  const handleNovoAgendamento = () => {
    setDrawerMode('novo');
    setActiveRow(null);
    setDrawerOpen(true);
  };

  const handleEdit = (row) => {
    setDrawerMode('execucao');
    setActiveRow(row);
    setDrawerOpen(true);
  };

  const clearFilters = () => setFiltros(initialFilters);

  const navigate = useNavigate();

  const handleKpiAction = (action) => {
    if (action === 'condominios') {
      navigate('/condominios');
    } else if (action === 'em_dia') {
      setFiltros({ ...initialFilters, status: 'Realizado' });
    } else if (action === 'pendentes') {
      setFiltros({ ...initialFilters, status: 'Pendente' });
    } else if (action === 'proximas') {
      setFiltros({ ...initialFilters, status: 'Agendado' });
    } else if (action === 'sem_nota') {
      setFiltros({ ...initialFilters, nota: 'Pendente' });
    }
  };

  return (
    <div className="ded-layout">
      <div className={`ded-content ${drawerOpen ? 'drawer-open' : ''}`}>
        <DedetizacaoHeader onNovoAgendamento={handleNovoAgendamento} />
        <DedetizacaoKpis stats={stats} onKpiAction={handleKpiAction} />
        <DedetizacaoFilters 
          filtros={filtros} 
          setFiltros={setFiltros} 
          onClear={clearFilters} 
        />
        <DedetizacaoTable data={dadosFiltrados} onEdit={handleEdit} />
        <DedetizacaoFooterLegenda />
      </div>

      <DedetizacaoDrawer 
        open={drawerOpen} 
        onClose={() => setDrawerOpen(false)} 
        mode={drawerMode} 
        rowData={activeRow}
      />
    </div>
  );
}
