import React, { useState, useMemo } from 'react';
import { api } from '../../api';
import { IcoDownload, IcoSort, IcoSortAsc, IcoSortDesc } from '../icons';

function formatarMoeda(val) {
  if (val == null || val === '') return '—';
  const num = Number(val);
  if (isNaN(num)) return '—';
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(dataStr) {
  if (!dataStr) return '—';
  const parts = dataStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dataStr;
}

export default function TabelaPremiosModal({
  aberto,
  onFechar,
  seguros = [],
  seguradoras = [],
  corretoras = [],
  gerentes = [],
  onRecarregar
}) {
  const [busca, setBusca] = useState('');
  const [filtroSeguradora, setFiltroSeguradora] = useState('Todas');
  const [filtroCorretora, setFiltroCorretora] = useState('Todas');
  const [filtroGerente, setFiltroGerente] = useState('Todos');
  const [apenasComPremio, setApenasComPremio] = useState(false);
  const [colunaOrdenacao, setColunaOrdenacao] = useState('premio');
  const [ordemDirecao, setOrdemDirecao] = useState('desc');
  const [sincronizando, setSincronizando] = useState(false);
  const [msgSincronizacao, setMsgSincronizacao] = useState('');

  // Filtragem
  const segurosFiltrados = useMemo(() => {
    return (seguros || []).filter((s) => {
      if (apenasComPremio) {
        const val = s.premioLiquido ?? s.premio_liquido;
        if (val == null || Number(val) <= 0) return false;
      }
      if (busca) {
        const termo = busca.toLowerCase().trim();
        const nomeMatch = (s.condominio || '').toLowerCase().includes(termo);
        const codMatch = (s.codigo || '').toLowerCase().includes(termo);
        const apoliceMatch = (s.numeroApolice || '').toLowerCase().includes(termo);
        if (!nomeMatch && !codMatch && !apoliceMatch) return false;
      }
      if (filtroSeguradora !== 'Todas' && s.seguradora !== filtroSeguradora) return false;
      if (filtroCorretora !== 'Todas' && s.corretora !== filtroCorretora) return false;
      if (filtroGerente !== 'Todos' && s.gerente !== filtroGerente) return false;
      return true;
    });
  }, [seguros, busca, filtroSeguradora, filtroCorretora, filtroGerente, apenasComPremio]);

  // Ordenação
  const segurosOrdenados = useMemo(() => {
    const ordenados = [...segurosFiltrados];
    ordenados.sort((a, b) => {
      if (colunaOrdenacao === 'premio') {
        const valA = Number(a.premioLiquido ?? a.premio_liquido) || 0;
        const valB = Number(b.premioLiquido ?? b.premio_liquido) || 0;
        return ordemDirecao === 'asc' ? valA - valB : valB - valA;
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
      if (colunaOrdenacao === 'seguradora') {
        return ordemDirecao === 'asc'
          ? (a.seguradora || '').localeCompare(b.seguradora || '')
          : (b.seguradora || '').localeCompare(a.seguradora || '');
      }
      if (colunaOrdenacao === 'validade') {
        const valA = a.dataValidade || '';
        const valB = b.dataValidade || '';
        return ordemDirecao === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return 0;
    });
    return ordenados;
  }, [segurosFiltrados, colunaOrdenacao, ordemDirecao]);

  // Totais
  const totalGeral = useMemo(() => {
    return segurosOrdenados.reduce((acc, s) => {
      const val = Number(s.premioLiquido ?? s.premio_liquido);
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
  }, [segurosOrdenados]);

  const qtdComPremio = useMemo(() => {
    return segurosOrdenados.filter((s) => {
      const val = Number(s.premioLiquido ?? s.premio_liquido);
      return !isNaN(val) && val > 0;
    }).length;
  }, [segurosOrdenados]);

  const mediaPremio = qtdComPremio > 0 ? totalGeral / qtdComPremio : 0;

  const handleOrdenar = (coluna) => {
    if (colunaOrdenacao === coluna) {
      setOrdemDirecao((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setColunaOrdenacao(coluna);
      setOrdemDirecao(coluna === 'premio' ? 'desc' : 'asc');
    }
  };

  const renderSortIcon = (coluna) => {
    if (colunaOrdenacao !== coluna) return <IcoSort />;
    return ordemDirecao === 'asc' ? <IcoSortAsc /> : <IcoSortDesc />;
  };

  // Sincronizar PDFs já salvos
  const handleSincronizarApolices = async () => {
    setSincronizando(true);
    setMsgSincronizacao('');
    try {
      const res = await api.post('/seguros/reprocessar-premios');
      setMsgSincronizacao(`Varredura concluída: ${res.atualizados || 0} apólices atualizadas com sucesso!`);
      if (onRecarregar) onRecarregar();
    } catch (err) {
      setMsgSincronizacao('Erro ao sincronizar: ' + err.message);
    } finally {
      setSincronizando(false);
    }
  };

  // Exportar para CSV
  const handleExportarCSV = () => {
    const cabecalho = ['Codigo', 'Condominio', 'Seguradora', 'Corretora', 'Gerente', 'Numero_Apolice', 'Vigencia_Inicio', 'Vigencia_Fim', 'Status', 'Premio_Liquido_R$'];
    const linhas = segurosOrdenados.map((s) => {
      const valPremio = Number(s.premioLiquido ?? s.premio_liquido);
      const premioFormatado = isNaN(valPremio) || valPremio === 0 ? '0.00' : valPremio.toFixed(2);
      return [
        `"${s.codigo || ''}"`,
        `"${(s.condominio || '').replace(/"/g, '""')}"`,
        `"${(s.seguradora || '').replace(/"/g, '""')}"`,
        `"${(s.corretora || '').replace(/"/g, '""')}"`,
        `"${(s.gerente || '').replace(/"/g, '""')}"`,
        `"${(s.numeroApolice || '').replace(/"/g, '""')}"`,
        `"${s.dataRenovacao || ''}"`,
        `"${s.dataValidade || ''}"`,
        `"${s.status || ''}"`,
        premioFormatado
      ].join(';');
    });

    const csvContent = '\uFEFF' + [cabecalho.join(';'), ...linhas].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio_premios_liquidos_seguros_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImprimir = () => {
    window.print();
  };

  if (!aberto) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onFechar();
      }}
    >
      <div
        style={{
          background: 'var(--bg-surface, #ffffff)',
          border: '1px solid var(--border, #e2e8f0)',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '1100px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden'
        }}
      >
        {/* Cabeçalho */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-surface-elevated, #f8fafc)',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
              }}
            >
              💰
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)' }}>
                Tabela de Prêmios Líquidos dos Seguros
              </h2>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Relatório executivo com os valores pagos pelos condomínios em todas as apólices.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="seg-btn-secondary"
              onClick={handleSincronizarApolices}
              disabled={sincronizando}
              style={{ fontSize: '13px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Ler arquivos de apólices salvos no sistema e extrair valores de prêmio automaticamente"
            >
              <span>{sincronizando ? '⏳' : '🔄'}</span> {sincronizando ? 'Lendo PDFs...' : 'Atualizar dos PDFs'}
            </button>
            <button
              type="button"
              className="seg-btn-secondary"
              onClick={handleExportarCSV}
              style={{ fontSize: '13px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Baixar planilha para Excel"
            >
              <IcoDownload /> Excel (CSV)
            </button>
            <button
              type="button"
              className="seg-btn-secondary"
              onClick={handleImprimir}
              style={{ fontSize: '13px', padding: '8px 12px' }}
              title="Imprimir ou Salvar em PDF"
            >
              🖨️ Imprimir
            </button>
            <button
              type="button"
              className="seg-drawer-close"
              onClick={onFechar}
              style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-muted)', marginLeft: '4px' }}
            >
              &times;
            </button>
          </div>
        </div>

        {/* Mensagem de Feedback de Sincronização */}
        {msgSincronizacao && (
          <div style={{ padding: '8px 24px', background: '#ecfdf5', color: '#065f46', fontSize: '13px', fontWeight: 600, borderBottom: '1px solid #10b981' }}>
            {msgSincronizacao}
          </div>
        )}

        {/* Resumo / Cards de Totais */}
        <div
          style={{
            padding: '14px 24px',
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px'
          }}
        >
          <div
            style={{
              background: 'var(--bg-surface-elevated, #f8fafc)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '10px 14px'
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Total em Prêmios Líquidos</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)', marginTop: '2px' }}>
              {formatarMoeda(totalGeral)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Soma total dos seguros filtrados
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-surface-elevated, #f8fafc)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '10px 14px'
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Condomínios c/ Valor Informado</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
              {qtdComPremio} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>/ {segurosOrdenados.length}</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {segurosOrdenados.length > 0 ? ((qtdComPremio / segurosOrdenados.length) * 100).toFixed(1).replace('.', ',') : 0}% com valor cadastrado
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-surface-elevated, #f8fafc)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '10px 14px'
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Média do Prêmio Líquido</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
              {formatarMoeda(mediaPremio)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Valor médio por condomínio
            </div>
          </div>
        </div>

        {/* Barra de Filtros Interna */}
        <div
          style={{
            padding: '12px 24px',
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ flex: '1 1 180px' }}>
            <input
              type="text"
              className="seg-input"
              placeholder="Buscar condomínio, código..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <select
            className="seg-input"
            value={filtroSeguradora}
            onChange={(e) => setFiltroSeguradora(e.target.value)}
            style={{ width: 'auto', minWidth: '140px' }}
          >
            <option value="Todas">Todas Seguradoras</option>
            {(seguradoras || []).map((seg) => {
              const val = typeof seg === 'object' && seg !== null ? (seg.nome || seg.seguradora) : String(seg);
              return <option key={val} value={val}>{val}</option>;
            })}
          </select>

          <select
            className="seg-input"
            value={filtroCorretora}
            onChange={(e) => setFiltroCorretora(e.target.value)}
            style={{ width: 'auto', minWidth: '140px' }}
          >
            <option value="Todas">Todas Corretoras</option>
            {(corretoras || []).map((cor) => {
              const val = typeof cor === 'object' && cor !== null ? (cor.nome || cor.corretora) : String(cor);
              return <option key={val} value={val}>{val}</option>;
            })}
          </select>

          <select
            className="seg-input"
            value={filtroGerente}
            onChange={(e) => setFiltroGerente(e.target.value)}
            style={{ width: 'auto', minWidth: '140px' }}
          >
            <option value="Todos">Todos Gerentes</option>
            {(gerentes || []).map((g) => {
              const nome = typeof g === 'object' && g !== null ? (g.nome || g.id) : String(g);
              const key = typeof g === 'object' && g !== null ? (g.id || g.nome) : String(g);
              return <option key={key} value={nome}>{nome}</option>;
            })}
          </select>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              cursor: 'pointer',
              userSelect: 'none',
              marginLeft: 'auto'
            }}
          >
            <input
              type="checkbox"
              checked={apenasComPremio}
              onChange={(e) => setApenasComPremio(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Apenas com valor
          </label>
        </div>

        {/* Tabela de Resultados com Scroll */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px' }}>
          <table className="seg-table" style={{ marginTop: '12px', marginBottom: '16px' }}>
            <thead>
              <tr>
                <th className="sortable" style={{ width: '70px' }} onClick={() => handleOrdenar('codigo')}>
                  Cód. {renderSortIcon('codigo')}
                </th>
                <th className="sortable" onClick={() => handleOrdenar('condominio')}>
                  Condomínio {renderSortIcon('condominio')}
                </th>
                <th className="sortable" onClick={() => handleOrdenar('seguradora')}>
                  Seguradora {renderSortIcon('seguradora')}
                </th>
                <th>Corretora</th>
                <th>Nº Apólice</th>
                <th className="sortable" onClick={() => handleOrdenar('validade')}>
                  Vigência {renderSortIcon('validade')}
                </th>
                <th
                  className="sortable"
                  style={{ textAlign: 'right', color: 'var(--primary)', fontWeight: 700 }}
                  onClick={() => handleOrdenar('premio')}
                >
                  Prêmio Líquido (R$) {renderSortIcon('premio')}
                </th>
              </tr>
            </thead>
            <tbody>
              {segurosOrdenados.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Nenhum seguro encontrado com os filtros informados.
                  </td>
                </tr>
              ) : (
                segurosOrdenados.map((item) => {
                  const valPremio = item.premioLiquido ?? item.premio_liquido;
                  const temValor = valPremio != null && Number(valPremio) > 0;
                  return (
                    <tr key={item.id}>
                      <td>
                        <span className="seg-code-badge">{item.codigo}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.condominio}</div>
                        {item.gerente && item.gerente !== 'Sem gerente' && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Gerente: {item.gerente}</div>
                        )}
                      </td>
                      <td>
                        <span style={{ fontWeight: 500 }}>{item.seguradora || '—'}</span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{item.corretora || '—'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{item.numeroApolice || '—'}</td>
                      <td>
                        <div style={{ fontSize: '12px' }}>
                          {item.dataValidade ? formatarData(item.dataValidade) : '—'}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span
                          style={{
                            fontWeight: temValor ? 700 : 400,
                            fontSize: temValor ? '14px' : '13px',
                            color: temValor ? 'var(--primary)' : 'var(--text-muted)',
                            background: temValor ? 'rgba(215, 25, 32, 0.08)' : 'transparent',
                            padding: temValor ? '4px 8px' : '0',
                            borderRadius: '6px'
                          }}
                        >
                          {formatarMoeda(valPremio)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {segurosOrdenados.length > 0 && (
              <tfoot>
                <tr style={{ background: 'var(--bg-surface-elevated, #f8fafc)', fontWeight: 700, borderTop: '2px solid var(--border)' }}>
                  <td colSpan={6} style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', color: 'var(--text-primary)' }}>
                    TOTAL GERAL EM PRÊMIOS LÍQUIDOS ({segurosOrdenados.length} condomínios):
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '16px', color: 'var(--primary)' }}>
                    {formatarMoeda(totalGeral)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Rodapé Modal */}
        <div
          style={{
            padding: '12px 24px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-surface-elevated, #f8fafc)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Exibindo <strong>{segurosOrdenados.length}</strong> condomínio(s) • Total: <strong>{formatarMoeda(totalGeral)}</strong>
          </div>
          <button type="button" className="seg-btn-secondary" onClick={onFechar}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
