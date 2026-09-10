import React, { useState, useMemo, useEffect } from 'react';
import { IcoCondominio, IcoSeguro, IcoRelogio, IcoVencido, IcoCalendario, IcoCheck } from '../components/icons';
import '../seguros.css';

// SVG Icons inline para os botões e outros elementos
const IcoPlus = () => <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const IcoEye = () => <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>;
const IcoEdit = () => <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const IcoMore = () => <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>;

// Mock Data inicial
const gerarMocks = () => {
  const dados = [];
  const hoje = new Date();
  
  const seguradoras = ['Porto Seguro', 'Tokio Marine', 'SulAmérica', 'HDI Seguros', 'Mapfre', 'Allianz', 'Bradesco Seguros'];
  const corretoras = ['Corretora Alfa', 'Corretora Beta', 'Corretora Gama', 'Corretora Delta'];
  const gerentes = ['Lani', 'Administrador', 'Carlos', 'Maria'];
  const statusGeral = ['vencido', 'a_vencer', 'ativo'];

  for (let i = 1; i <= 124; i++) {
    const statusIdx = i <= 10 ? 0 : i <= 26 ? 1 : 2; // 10 vencidos, 16 a vencer, resto ativos
    const st = statusGeral[statusIdx];
    
    let dtValidade = new Date();
    if (st === 'vencido') {
      dtValidade.setDate(dtValidade.getDate() - Math.floor(Math.random() * 60) - 1);
    } else if (st === 'a_vencer') {
      dtValidade.setDate(dtValidade.getDate() + Math.floor(Math.random() * 29) + 1);
    } else {
      dtValidade.setDate(dtValidade.getDate() + Math.floor(Math.random() * 300) + 31);
    }

    const dtRenovacao = new Date(dtValidade);
    dtRenovacao.setFullYear(dtRenovacao.getFullYear() - 1);

    dados.push({
      id: i,
      codigoCondominio: String(i).padStart(3, '0'),
      nomeCondominio: `Condomínio Exemplo ${i}`,
      seguradora: seguradoras[i % seguradoras.length],
      corretora: corretoras[i % corretoras.length],
      gerente: gerentes[i % gerentes.length],
      numeroApolice: `AP-${Math.floor(Math.random() * 100000)}`,
      dataRenovacao: dtRenovacao.toISOString().split('T')[0],
      dataValidade: dtValidade.toISOString().split('T')[0],
    });
  }
  return dados;
};

const mockSeguros = gerarMocks();

// Funções utilitárias
const calcularStatus = (dataValidade) => {
  if (!dataValidade) return 'ativo';
  const hoje = new Date();
  hoje.setHours(0,0,0,0);
  const val = new Date(dataValidade);
  // timezone fix manual pro mock se precisar, mas string yyyy-mm-dd em Date as vezes cai num dia antes dependendo do TZ
  // usando split pra garantir
  const [y, m, d] = dataValidade.split('-');
  const dataReal = new Date(y, m - 1, d);
  
  const diffTime = dataReal - hoje;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'vencido';
  if (diffDays <= 30) return 'a_vencer';
  return 'ativo';
};

const formatarDataBr = (dataIso) => {
  if (!dataIso) return '--';
  const [y, m, d] = dataIso.split('-');
  return `${d}/${m}/${y}`;
};

export default function Seguros() {
  const [seguros, setSeguros] = useState(mockSeguros);
  const [filtroBusca, setFiltroBusca] = useState('');
  const [filtroSeguradora, setFiltroSeguradora] = useState('Todas');
  const [filtroCorretora, setFiltroCorretora] = useState('Todas');
  const [filtroGerente, setFiltroGerente] = useState('Todos');
  const [filtroStatus, setFiltroStatus] = useState('Todos');
  const [filtroVencimentoDe, setFiltroVencimentoDe] = useState('');
  const [filtroVencimentoAte, setFiltroVencimentoAte] = useState('');
  
  const [ordemCol, setOrdemCol] = useState('auto'); // auto, dataValidade, etc.
  const [ordemDir, setOrdemDir] = useState('asc'); // asc, desc
  
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);
  
  const [modalAtivo, setModalAtivo] = useState(null); // 'novo', 'visualizar', 'renovar'
  const [seguroSelecionado, setSeguroSelecionado] = useState(null);
  
  const [menuAbertoId, setMenuAbertoId] = useState(null);

  // Listas para os selects (dinâmicas baseadas nos dados)
  const seguradoras = ['Todas', ...Array.from(new Set(mockSeguros.map(s => s.seguradora)))];
  const corretoras = ['Todas', ...Array.from(new Set(mockSeguros.map(s => s.corretora)))];
  const gerentes = ['Todos', ...Array.from(new Set(mockSeguros.map(s => s.gerente)))];

  // Processamento dos dados com cálculos dinâmicos
  const dadosProcessados = useMemo(() => {
    return seguros.map(s => ({
      ...s,
      statusCalc: calcularStatus(s.dataValidade)
    }));
  }, [seguros]);

  // KPIs
  const totalCondominios = dadosProcessados.length;
  const segurosAtivos = dadosProcessados.filter(s => s.statusCalc === 'ativo').length;
  const ativosPerc = totalCondominios ? ((segurosAtivos / totalCondominios) * 100).toFixed(1) : 0;
  const proximosAVencer = dadosProcessados.filter(s => s.statusCalc === 'a_vencer').length;
  const segurosVencidos = dadosProcessados.filter(s => s.statusCalc === 'vencido').length;

  // Filtros
  const dadosFiltrados = useMemo(() => {
    return dadosProcessados.filter(s => {
      if (filtroBusca) {
        const busca = filtroBusca.toLowerCase();
        if (!s.nomeCondominio.toLowerCase().includes(busca) && !s.codigoCondominio.includes(busca)) return false;
      }
      if (filtroSeguradora !== 'Todas' && s.seguradora !== filtroSeguradora) return false;
      if (filtroCorretora !== 'Todas' && s.corretora !== filtroCorretora) return false;
      if (filtroGerente !== 'Todos' && s.gerente !== filtroGerente) return false;
      
      if (filtroStatus !== 'Todos') {
        const mapSt = { 'Ativo': 'ativo', 'Próximo a vencer': 'a_vencer', 'Vencido': 'vencido' };
        if (s.statusCalc !== mapSt[filtroStatus]) return false;
      }
      
      if (filtroVencimentoDe && s.dataValidade < filtroVencimentoDe) return false;
      if (filtroVencimentoAte && s.dataValidade > filtroVencimentoAte) return false;
      
      return true;
    });
  }, [dadosProcessados, filtroBusca, filtroSeguradora, filtroCorretora, filtroGerente, filtroStatus, filtroVencimentoDe, filtroVencimentoAte]);

  // Ordenação
  const dadosOrdenados = useMemo(() => {
    const list = [...dadosFiltrados];
    if (ordemCol === 'auto') {
      const rank = { 'vencido': 1, 'a_vencer': 2, 'ativo': 3 };
      list.sort((a, b) => {
        if (rank[a.statusCalc] !== rank[b.statusCalc]) {
          return rank[a.statusCalc] - rank[b.statusCalc];
        }
        return a.dataValidade.localeCompare(b.dataValidade);
      });
    } else {
      list.sort((a, b) => {
        let valA = a[ordemCol];
        let valB = b[ordemCol];
        if (valA < valB) return ordemDir === 'asc' ? -1 : 1;
        if (valA > valB) return ordemDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [dadosFiltrados, ordemCol, ordemDir]);

  // Paginação
  const totalPaginas = Math.ceil(dadosOrdenados.length / itensPorPagina) || 1;
  const pagAtualReal = Math.min(paginaAtual, totalPaginas);
  const dadosPaginados = dadosOrdenados.slice((pagAtualReal - 1) * itensPorPagina, pagAtualReal * itensPorPagina);

  useEffect(() => {
    if (paginaAtual > totalPaginas) setPaginaAtual(totalPaginas || 1);
  }, [totalPaginas, paginaAtual]);

  const alternarOrdem = (col) => {
    if (ordemCol === col) {
      if (ordemDir === 'asc') setOrdemDir('desc');
      else { setOrdemCol('auto'); setOrdemDir('asc'); }
    } else {
      setOrdemCol(col);
      setOrdemDir('asc');
    }
  };

  const limparFiltros = () => {
    setFiltroBusca('');
    setFiltroSeguradora('Todas');
    setFiltroCorretora('Todas');
    setFiltroGerente('Todos');
    setFiltroStatus('Todos');
    setFiltroVencimentoDe('');
    setFiltroVencimentoAte('');
    setOrdemCol('auto');
  };

  const renderBadge = (status) => {
    if (status === 'vencido') return <span className="sg-badge vencido">VENCIDO</span>;
    if (status === 'a_vencer') return <span className="sg-badge avencer">PRÓXIMO A VENCER</span>;
    return <span className="sg-badge ativo">ATIVO</span>;
  };

  const renderRowClass = (status) => {
    if (status === 'vencido') return 'sg-row-vencido';
    if (status === 'a_vencer') return 'sg-row-avencer';
    return 'sg-row-ativo';
  };
  
  const abrirMenuRow = (e, id) => {
    e.stopPropagation();
    setMenuAbertoId(menuAbertoId === id ? null : id);
  };
  
  // Fecha o menu ao clicar fora
  useEffect(() => {
    const handleCb = () => setMenuAbertoId(null);
    window.addEventListener('click', handleCb);
    return () => window.removeEventListener('click', handleCb);
  }, []);

  return (
    <div className="sg-page">
      <div className="sg-header">
        <div className="sg-title-area">
          <div className="sg-shield-icon">
            <IcoSeguro />
          </div>
          <div>
            <h1>Seguros</h1>
            <p>Gestão e controle dos seguros dos condomínios.</p>
          </div>
        </div>
        <button className="sg-btn-primary" onClick={() => setModalAtivo('novo')}>
          <IcoPlus /> Novo seguro
        </button>
      </div>

      <div className="sg-kpis">
        <div className="sg-kpi-card" onClick={() => { limparFiltros(); }}>
          <div className="sg-kpi-header">
            <span className="sg-kpi-title">Total de condomínios</span>
            <div className="sg-kpi-icon blue"><IcoCondominio /></div>
          </div>
          <div className="sg-kpi-value">{totalCondominios}</div>
          <div className="sg-kpi-desc">Condomínios cadastrados</div>
        </div>
        <div className="sg-kpi-card" onClick={() => { setFiltroStatus('Ativo'); }}>
          <div className="sg-kpi-header">
            <span className="sg-kpi-title">Seguros ativos</span>
            <div className="sg-kpi-icon green"><IcoCheck /></div>
          </div>
          <div className="sg-kpi-value">{segurosAtivos}</div>
          <div className="sg-kpi-desc">{ativosPerc}% dos condomínios</div>
        </div>
        <div className="sg-kpi-card" onClick={() => { setFiltroStatus('Próximo a vencer'); }} style={{ border: filtroStatus === 'Próximo a vencer' ? '1px solid #d97706' : '' }}>
          <div className="sg-kpi-header">
            <span className="sg-kpi-title" style={{color: '#d97706'}}>Próximos a vencer</span>
            <div className="sg-kpi-icon orange"><IcoRelogio /></div>
          </div>
          <div className="sg-kpi-value">{proximosAVencer}</div>
          <div className="sg-kpi-desc">Nos próximos 30 dias</div>
        </div>
        <div className="sg-kpi-card" onClick={() => { setFiltroStatus('Vencido'); }} style={{ border: filtroStatus === 'Vencido' ? '1px solid #dc2626' : '' }}>
          <div className="sg-kpi-header">
            <span className="sg-kpi-title" style={{color: '#dc2626'}}>Seguros vencidos</span>
            <div className="sg-kpi-icon red"><IcoVencido /></div>
          </div>
          <div className="sg-kpi-value">{segurosVencidos}</div>
          <div className="sg-kpi-desc" style={{color: '#dc2626', fontWeight: 600}}>Requer atenção imediata</div>
        </div>
      </div>

      <div className="sg-filters-card">
        <div className="sg-filters-grid">
          <div className="sg-filter-group" style={{ flexGrow: 1, minWidth: '240px' }}>
            <label>Buscar condomínio</label>
            <input 
              className="sg-filter-input" 
              placeholder="Digite o nome ou código"
              value={filtroBusca} onChange={e => setFiltroBusca(e.target.value)} 
            />
          </div>
          <div className="sg-filter-group">
            <label>Seguradora</label>
            <select className="sg-filter-input" value={filtroSeguradora} onChange={e => setFiltroSeguradora(e.target.value)}>
              {seguradoras.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="sg-filter-group">
            <label>Corretora</label>
            <select className="sg-filter-input" value={filtroCorretora} onChange={e => setFiltroCorretora(e.target.value)}>
              {corretoras.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="sg-filter-group">
            <label>Gerente</label>
            <select className="sg-filter-input" value={filtroGerente} onChange={e => setFiltroGerente(e.target.value)}>
              {gerentes.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="sg-filter-group" style={{ display: 'flex', flexDirection: 'row', gap: '8px', minWidth: '280px', alignItems: 'flex-end' }}>
             <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label>Vencimento entre</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input type="date" className="sg-filter-input" style={{flex:1}} value={filtroVencimentoDe} onChange={e => setFiltroVencimentoDe(e.target.value)} />
                  <span style={{color: '#64748b'}}>até</span>
                  <input type="date" className="sg-filter-input" style={{flex:1}} value={filtroVencimentoAte} onChange={e => setFiltroVencimentoAte(e.target.value)} />
                </div>
             </div>
          </div>
          <div className="sg-filter-group">
            <label>Status</label>
            <select className="sg-filter-input" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
              <option value="Todos">Todos</option>
              <option value="Ativo">Ativo</option>
              <option value="Próximo a vencer">Próximo a vencer</option>
              <option value="Vencido">Vencido</option>
            </select>
          </div>
          <div className="sg-filter-group">
            <button className="sg-btn-clear" onClick={limparFiltros}>
              Limpar filtros
            </button>
          </div>
        </div>
      </div>

      <div className="sg-table-card">
        <div className="sg-table-responsive">
          <table className="sg-table">
            <thead>
              <tr>
                <th onClick={() => alternarOrdem('codigoCondominio')}>Código {ordemCol === 'codigoCondominio' && (ordemDir === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => alternarOrdem('nomeCondominio')}>Condomínio {ordemCol === 'nomeCondominio' && (ordemDir === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => alternarOrdem('seguradora')}>Seguradora {ordemCol === 'seguradora' && (ordemDir === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => alternarOrdem('corretora')}>Corretora {ordemCol === 'corretora' && (ordemDir === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => alternarOrdem('gerente')}>Gerente {ordemCol === 'gerente' && (ordemDir === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => alternarOrdem('dataRenovacao')}>Data Renovação {ordemCol === 'dataRenovacao' && (ordemDir === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => alternarOrdem('dataValidade')}>Data Validade {ordemCol === 'dataValidade' && (ordemDir === 'asc' ? '↑' : '↓')}</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {dadosPaginados.length === 0 ? (
                <tr>
                  <td colSpan="9">
                    <div className="sg-empty">
                      <h3>Não encontramos seguros</h3>
                      <p>Altere os filtros ou tente uma nova busca.</p>
                      <button className="sg-btn-clear" style={{display: 'inline-flex', margin: '0 auto'}} onClick={limparFiltros}>Limpar filtros</button>
                    </div>
                  </td>
                </tr>
              ) : (
                dadosPaginados.map(s => (
                  <tr key={s.id} className={renderRowClass(s.statusCalc)}>
                    <td style={{fontWeight: 600}}>{s.codigoCondominio}</td>
                    <td><strong>{s.nomeCondominio}</strong></td>
                    <td>{s.seguradora}</td>
                    <td>{s.corretora}</td>
                    <td>{s.gerente}</td>
                    <td>{formatarDataBr(s.dataRenovacao)}</td>
                    <td>{formatarDataBr(s.dataValidade)}</td>
                    <td>{renderBadge(s.statusCalc)}</td>
                    <td>
                      <div className="sg-actions">
                        <button className="sg-btn-icon" onClick={() => { setSeguroSelecionado(s); setModalAtivo('visualizar'); }} title="Visualizar"><IcoEye /></button>
                        <button className="sg-btn-icon" onClick={() => { setSeguroSelecionado(s); setModalAtivo('novo'); /* simula editar */ }} title="Editar"><IcoEdit /></button>
                        <div style={{ position: 'relative' }}>
                          <button className="sg-btn-icon" onClick={(e) => abrirMenuRow(e, s.id)}><IcoMore /></button>
                          {menuAbertoId === s.id && (
                            <div className="sg-dropdown-menu">
                              <button className="sg-dropdown-item" onClick={() => { setSeguroSelecionado(s); setModalAtivo('visualizar'); }}>Visualizar seguro</button>
                              <button className="sg-dropdown-item" onClick={() => { setSeguroSelecionado(s); setModalAtivo('novo'); }}>Editar seguro</button>
                              <button className="sg-dropdown-item" onClick={() => { setSeguroSelecionado(s); setModalAtivo('renovar'); }}>Renovar seguro</button>
                              <button className="sg-dropdown-item">Histórico</button>
                              <button className="sg-dropdown-item danger" onClick={() => alert('Tem certeza que deseja excluir?')}>Excluir</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {dadosFiltrados.length > 0 && (
          <div className="sg-pagination">
            <div className="sg-pag-info">
              Mostrando {((pagAtualReal - 1) * itensPorPagina) + 1} a {Math.min(pagAtualReal * itensPorPagina, dadosOrdenados.length)} de {dadosOrdenados.length} registros
            </div>
            
            <div className="sg-pag-controls">
              <button className="sg-pag-btn" disabled={pagAtualReal === 1} onClick={() => setPaginaAtual(p => p - 1)}>Anterior</button>
              
              {/* Paginação Simplificada no mockup */}
              <button className="sg-pag-btn active">{pagAtualReal}</button>
              {pagAtualReal < totalPaginas && <button className="sg-pag-btn" onClick={() => setPaginaAtual(pagAtualReal + 1)}>{pagAtualReal + 1}</button>}
              {totalPaginas > pagAtualReal + 1 && <span style={{color: '#64748b'}}>...</span>}
              {totalPaginas > pagAtualReal + 1 && <button className="sg-pag-btn" onClick={() => setPaginaAtual(totalPaginas)}>{totalPaginas}</button>}
              
              <button className="sg-pag-btn" disabled={pagAtualReal === totalPaginas} onClick={() => setPaginaAtual(p => p + 1)}>Próxima</button>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="sg-pag-info">Itens por página:</span>
              <select className="sg-filter-input" style={{ width: '80px', padding: '6px' }} value={itensPorPagina} onChange={e => { setItensPorPagina(Number(e.target.value)); setPaginaAtual(1); }}>
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Modal Mockups */}
      {modalAtivo && (
        <div className="sg-modal-overlay" onClick={() => setModalAtivo(null)}>
          <div className="sg-modal" onClick={e => e.stopPropagation()}>
            <div className="sg-modal-header">
              <h2>{modalAtivo === 'novo' ? (seguroSelecionado ? 'Editar Seguro' : 'Novo Seguro') : modalAtivo === 'visualizar' ? 'Detalhes do Seguro' : 'Renovar Seguro'}</h2>
              <button className="sg-modal-close" onClick={() => setModalAtivo(null)}>&times;</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
               <div className="sg-filter-group"><label>Condomínio</label><input className="sg-filter-input" defaultValue={seguroSelecionado?.nomeCondominio || ''} readOnly={modalAtivo === 'visualizar'}/></div>
               <div className="sg-filter-group"><label>Número da Apólice</label><input className="sg-filter-input" defaultValue={seguroSelecionado?.numeroApolice || ''} readOnly={modalAtivo === 'visualizar'}/></div>
               <div className="sg-filter-group"><label>Seguradora</label><input className="sg-filter-input" defaultValue={seguroSelecionado?.seguradora || ''} readOnly={modalAtivo === 'visualizar'}/></div>
               <div className="sg-filter-group"><label>Corretora</label><input className="sg-filter-input" defaultValue={seguroSelecionado?.corretora || ''} readOnly={modalAtivo === 'visualizar'}/></div>
               <div className="sg-filter-group"><label>Data Renovação</label><input type="date" className="sg-filter-input" defaultValue={seguroSelecionado?.dataRenovacao || ''} readOnly={modalAtivo === 'visualizar'}/></div>
               <div className="sg-filter-group"><label>Data Validade</label><input type="date" className="sg-filter-input" defaultValue={seguroSelecionado?.dataValidade || ''} readOnly={modalAtivo === 'visualizar'}/></div>
               
               {modalAtivo !== 'visualizar' && (
                  <div className="sg-filter-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Upload da Apólice (PDF)</label>
                    <input type="file" className="sg-filter-input" accept=".pdf" />
                  </div>
               )}
            </div>

            {modalAtivo === 'visualizar' && (
               <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                 <h3 style={{ fontSize: '16px', margin: '0 0 12px' }}>Histórico</h3>
                 <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 8px' }}>• {formatarDataBr(seguroSelecionado?.dataRenovacao)} - Seguro renovado.</p>
                 <p style={{ fontSize: '14px', color: '#64748b', margin: '0' }}>• 01/01/2022 - Seguro cadastrado.</p>
               </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button className="sg-btn-clear" onClick={() => setModalAtivo(null)}>Fechar</button>
              {modalAtivo !== 'visualizar' && (
                 <button className="sg-btn-primary" onClick={() => { alert('Ação simulada com sucesso!'); setModalAtivo(null); }}>Salvar</button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
