import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { IcoDoc, IcoTrash, IcoCheck } from '../icons';

export default function AgendamentoAdesoesDrawer({ open, onClose, agendamento, onAtualizar }) {
  const [adesoes, setAdesoes] = useState([]);
  const [agendamentoCompleto, setAgendamentoCompleto] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [busca, setBusca] = useState('');
  const [copiadoLink, setCopiadoLink] = useState(false);
  const [copiadoTexto, setCopiadoTexto] = useState(false);

  // Form para adicionar adesão manualmente
  const [mostrandoAdd, setMostrandoAdd] = useState(false);
  const [novaUnidade, setNovaUnidade] = useState('');
  const [novoBloco, setNovoBloco] = useState('');
  const [novoNome, setNovoNome] = useState('');
  const [novoTelefone, setNovoTelefone] = useState('');
  const [novoTipo, setNovoTipo] = useState('');
  const [novoMetodo, setNovoMetodo] = useState('Pulverização e Gel');
  const [novasObs, setNovasObs] = useState('');

  const agAtual = agendamentoCompleto || agendamento || {};

  const tipos = (() => {
    const rawTipos = agAtual.tipos_unidades || agendamento?.tipos_unidades;
    if (!rawTipos) return [];
    if (typeof rawTipos === 'string') {
      try { return JSON.parse(rawTipos); } catch { return []; }
    }
    return Array.isArray(rawTipos) ? rawTipos : [];
  })();

  const carregarAdesoes = async () => {
    if (!agendamento?.id) return;
    try {
      setCarregando(true);
      setErro('');
      const data = await api.get(`/agendamentos/${agendamento.id}/adesoes`);
      const lista = Array.isArray(data) ? data : (data?.adesoes || []);
      setAdesoes(lista);
      if (data?.agendamento) {
        setAgendamentoCompleto(data.agendamento);
      }
    } catch (err) {
      setErro(err.message || 'Erro ao carregar lista de adesões');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (open && agendamento?.id) {
      carregarAdesoes();
      if (tipos.length > 0) {
        setNovoTipo(tipos[0].nome);
      }
    }
  }, [open, agendamento?.id]);

  const tokenFinal = agAtual.token_adesao || agendamento?.token_adesao;
  const linkAdesao = tokenFinal
    ? `${window.location.origin}/adesao/${tokenFinal}`
    : '';

  const copiarLink = () => {
    if (!linkAdesao) return;
    navigator.clipboard.writeText(linkAdesao);
    setCopiadoLink(true);
    setTimeout(() => setCopiadoLink(false), 3000);
  };

  const gerarTextoComunicado = () => {
    const dataBr = agAtual.data_agendada ? agAtual.data_agendada.split('-').reverse().join('/') : 'A definir';
    const periodo = agAtual.periodo ? (agAtual.periodo === 'manha' ? 'Manhã' : agAtual.periodo === 'tarde' ? 'Tarde' : agAtual.periodo) : 'Manhã';
    const empresa = agAtual.empresa || 'Especializada';
    const condNome = agAtual.condominio_nome || agAtual.condominio || 'Condomínio';
    
    let linhasTabela = '';
    if (tipos && tipos.length > 0) {
      linhasTabela = '\n💰 *VALORES PARA ADESÃO DE UNIDADES:*\n' + tipos.map(t => `• ${t.nome}: R$ ${Number(t.valor).toFixed(2).replace('.', ',')}`).join('\n') + '\n';
    }

    const texto = `📢 *COMUNICADO DE DEDETIZAÇÃO*
🏢 *${condNome.toUpperCase()}*
📅 *Data do Serviço:* ${dataBr} (${periodo})
🛠️ *Empresa Responsável:* ${empresa}

Prezados condôminos,

Informamos que será realizada a dedetização periódica das áreas comuns do nosso condomínio.
Caso deseje realizar a dedetização dentro de sua *unidade privativa*, confirme sua adesão pelo link abaixo:

🔗 *LINK PARA ADESÃO:*
👉 ${linkAdesao}
${linhasTabela}
💳 *FORMA DE COBRANÇA:*
• A taxa será cobrada junto à taxa condominial do mês seguinte à dedetização.

---
🔬 *MÉTODOS DE APLICAÇÃO E CUIDADOS:*

🧪 *1. PULVERIZAÇÃO - CUIDADOS ESPECIAIS:*
• Deverão permanecer ausentes do local durante a aplicação, manter o local fechado por um período de no mínimo 2 horas;
• Pessoas com problemas alérgicos ou respiratórios, crianças e lactentes, animais domésticos, deverão permanecer ausentes do local durante a aplicação e após por um período de no mínimo 48 horas;
• A limpeza e higienização poderão ser feitas normalmente após 96 horas;
• Arejar o ambiente antes de usá-lo;
• Utensílios domésticos se estiverem expostos, cobrir com plástico ou lavar antes de usar, agora se o local de armazenamento for bem vedado não há necessidade pois não se faz dentro dele;
• *Garantia:* 06 (seis) meses contra baratas.

🌿 *2. APLICAÇÃO SEM ODOR (sem necessidade de desocupar o local):*
• Desinsetização contra baratas;
• Aplicação de inseticida líquido apenas nos ralos;
• Aplicação de gel-isca inodoro na cozinha, banheiros e armários;
• Não necessita de cuidados especiais com os utensílios domésticos;
• *Garantia:* 03 (três) meses contra baratas.

⚠️ *Observações Importantes:*
• Optando por não realizar a dedetização dentro de sua residência, há o risco de os insetos alvos da dedetização (aranhas, baratas, formigas, etc.) fazerem seus ninhos em áreas não dedetizadas.
• Após a dedetização, será emitido um certificado com os dados de validade da dedetizadora.

Agradecemos pela compreensão e cooperação de todos. A segurança e o conforto de nossa comunidade são nossa prioridade.

Atenciosamente,
*${condNome.toUpperCase()}*
*IMCosta Administradora*`;

    return texto;
  };

  const copiarTextoComunicado = () => {
    const texto = gerarTextoComunicado();
    navigator.clipboard.writeText(texto);
    setCopiadoTexto(true);
    setTimeout(() => setCopiadoTexto(false), 3000);
  };

  const handleToggleExecutado = async (adesaoId, atual) => {
    try {
      await api.patch(`/agendamentos/${agendamento.id}/adesoes/${adesaoId}/executado`, {
        executado: !atual
      });
      setAdesoes(prev => prev.map(a => a.id === adesaoId ? { ...a, executado: !atual ? 1 : 0 } : a));
      if (onAtualizar) onAtualizar();
    } catch (err) {
      alert(err.message || 'Erro ao atualizar status');
    }
  };

  const handleExcluirAdesao = async (adesaoId, unidadeNome) => {
    if (!window.confirm(`Deseja remover a adesão da unidade ${unidadeNome}?`)) return;
    try {
      await api.delete(`/agendamentos/${agendamento.id}/adesoes/${adesaoId}`);
      setAdesoes(prev => prev.filter(a => a.id !== adesaoId));
      if (onAtualizar) onAtualizar();
    } catch (err) {
      alert(err.message || 'Erro ao remover adesão');
    }
  };

  const handleAddManual = async (e) => {
    e.preventDefault();
    if (!novaUnidade.trim() || !novoNome.trim()) {
      alert('Informe a unidade e o nome do morador.');
      return;
    }
    const tipoObj = tipos.find(t => t.nome === novoTipo);
    const valor = tipoObj ? tipoObj.valor : 0;

    try {
      const res = await fetch(`/api/agendamentos/adesao/${agendamento.token_adesao}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({
          unidade: novaUnidade.trim(),
          bloco: novoBloco.trim() || null,
          nome_morador: novoNome.trim(),
          telefone: novoTelefone.trim() || 'Não informado',
          tipo_unidade: novoTipo || 'Apartamento',
          valor: valor,
          metodo: novoMetodo,
          observacoes: novasObs.trim() || null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || 'Erro ao registrar adesão manual');

      setNovaUnidade('');
      setNovoBloco('');
      setNovoNome('');
      setNovoTelefone('');
      setNovasObs('');
      setMostrandoAdd(false);
      setSucesso('Unidade adicionada com sucesso!');
      setTimeout(() => setSucesso(''), 3500);
      carregarAdesoes();
      if (onAtualizar) onAtualizar();
    } catch (err) {
      alert(err.message || 'Falha ao adicionar unidade');
    }
  };

  const imprimirLista = () => {
    const dataBr = agendamento.data_agendada ? agendamento.data_agendada.split('-').reverse().join('/') : '';
    const janela = window.open('', '_blank');
    janela.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Lista de Dedetização - ${agendamento.condominio_nome}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 25px; color: #1e293b; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
          .logo { height: 44px; }
          .title { font-size: 18px; font-weight: bold; margin: 0; }
          .sub { font-size: 12px; color: #64748b; margin-top: 4px; }
          .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: #f8fafc; padding: 12px; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 20px; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
          th { background: #f1f5f9; font-weight: bold; }
          .center { text-align: center; }
          .assinatura { width: 160px; height: 30px; }
          .footer { margin-top: 30px; display: flex; justify-content: space-between; font-size: 12px; }
          .sig-box { border-top: 1px solid #000; width: 220px; text-align: center; padding-top: 6px; margin-top: 40px; }
          @media print {
            body { margin: 10mm; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">LISTA DE CONTROLE DE DEDETIZAÇÃO</h1>
            <div class="sub">IMCOSTA Administradora de Condomínios</div>
          </div>
          <div style="font-size: 12px; text-align: right; color: #64748b;">
            Emissão: ${new Date().toLocaleDateString('pt-BR')}
          </div>
        </div>

        <div class="meta-grid">
          <div><strong>Condomínio:</strong><br>${agendamento.condominio_nome}</div>
          <div><strong>Data Prevista:</strong><br>${dataBr} (${agendamento.periodo || 'Manhã'})</div>
          <div><strong>Empresa:</strong><br>${agendamento.empresa || 'Especializada'}</div>
          <div><strong>Total Unidades:</strong><br>${adesoes.length} unidades</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40px;" class="center">#</th>
              <th style="width: 80px;">Unidade</th>
              <th>Morador / Responsável</th>
              <th>Telefone</th>
              <th>Categoria / Valor</th>
              <th>Método / Obs</th>
              <th class="center" style="width: 140px;">Assinatura do Morador</th>
              <th class="center" style="width: 50px;">Visto</th>
            </tr>
          </thead>
          <tbody>
            ${adesoes.map((a, idx) => `
              <tr>
                <td class="center">${idx + 1}</td>
                <td><strong>${a.unidade}</strong> ${a.bloco ? `(${a.bloco})` : ''}</td>
                <td>${a.nome_morador || '—'}</td>
                <td>${a.telefone || '—'}</td>
                <td>${a.tipo_unidade || 'Apto'} (R$ ${Number(a.valor || 0).toFixed(2).replace('.', ',')})</td>
                <td><small>${a.metodo || 'Pulverização'}${a.observacoes ? ` | Obs: ${a.observacoes}` : ''}</small></td>
                <td></td>
                <td class="center"><input type="checkbox" ${a.executado ? 'checked' : ''} /></td>
              </tr>
            `).join('')}
            ${adesoes.length === 0 ? `<tr><td colspan="8" class="center" style="padding: 20px;">Nenhuma unidade confirmada para este agendamento.</td></tr>` : ''}
          </tbody>
        </table>

        <div class="footer">
          <div class="sig-box">
            Visto do Técnico Responsável
          </div>
          <div class="sig-box">
            Visto do Síndico / Zelador
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    janela.document.close();
  };

  const listaSegura = Array.isArray(adesoes) ? adesoes : [];
  const adesoesFiltradas = listaSegura.filter(a => {
    if (!busca) return true;
    const b = busca.toLowerCase();
    return (
      (a.unidade && a.unidade.toLowerCase().includes(b)) ||
      (a.nome_morador && a.nome_morador.toLowerCase().includes(b)) ||
      (a.bloco && a.bloco.toLowerCase().includes(b))
    );
  });

  const totalPrivativo = listaSegura.reduce((acc, a) => acc + (Number(a.valor) || 0), 0);
  const totalExecutados = listaSegura.filter(a => a.executado).length;

  if (!open) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.drawer} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>
              🏢 Adesões — {agAtual.condominio_nome || agAtual.condominio || agendamento?.condominio_nome}
            </h2>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
              Data agendada: <strong>{agAtual.data_agendada ? agAtual.data_agendada.split('-').reverse().join('/') : agendamento?.data_agendada?.split('-').reverse().join('/')}</strong> ({agAtual.periodo || agendamento?.periodo || 'Manhã'}) • Empresa: <strong>{agAtual.empresa || agendamento?.empresa || '—'}</strong>
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>

        {/* Caixa de Link Visível com Ações */}
        <div style={{ padding: '14px 20px 10px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ background: '#ffffff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '10px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                🔗 Link de Adesão dos Moradores
              </span>
              {linkAdesao && (
                <a 
                  href={linkAdesao} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{ fontSize: '12px', fontWeight: '600', color: '#0284c7', textDecoration: 'none' }}
                >
                  Abrir Página ↗
                </a>
              )}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input 
                type="text" 
                readOnly 
                value={linkAdesao || 'Gerando link...'} 
                onClick={e => e.target.select()}
                style={{ flex: 1, padding: '6px 8px', fontSize: '12px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#1e293b' }}
              />
              <button 
                type="button" 
                onClick={copiarLink}
                style={{ ...styles.actionBtn, background: copiadoLink ? '#15803d' : '#0284c7', padding: '6px 12px' }}
                title="Copiar link para a área de transferência"
              >
                {copiadoLink ? '✓ Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <button 
              type="button" 
              onClick={copiarTextoComunicado}
              style={{ ...styles.actionBtn, flex: 1, justifyContent: 'center', background: copiadoTexto ? '#15803d' : '#059669' }}
              title="Copiar comunicado formatado com tabela de preços e link para WhatsApp ou E-mail"
            >
              {copiadoTexto ? '✓ Comunicado Copiado!' : '✉️ Copiar Comunicado Pronto'}
            </button>

            <button 
              type="button" 
              onClick={imprimirLista}
              style={{ ...styles.actionBtn, background: '#475569' }}
              title="Imprimir folha A4 para o técnico colher assinaturas porta a porta"
            >
              🖨️ Imprimir Lista
            </button>
          </div>
        </div>

        {/* KPIs de Adesão */}
        <div style={styles.kpiRow}>
          <div style={styles.kpiCard}>
            <span style={styles.kpiLabel}>Unidades Aderidas</span>
            <strong style={styles.kpiValue}>{listaSegura.length}</strong>
            <span style={{ fontSize: '11px', color: '#16a34a' }}>{totalExecutados} atendidas</span>
          </div>

          <div style={styles.kpiCard}>
            <span style={styles.kpiLabel}>Total Privativo</span>
            <strong style={{ ...styles.kpiValue, color: '#0f766e' }}>
              R$ {totalPrivativo.toFixed(2).replace('.', ',')}
            </strong>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Rateio morador</span>
          </div>

          <div style={styles.kpiCard}>
            <span style={styles.kpiLabel}>Área Comum</span>
            <strong style={{ ...styles.kpiValue, color: '#475569' }}>
              R$ {Number(agAtual.valor_area_comum || agendamento?.valor_area_comum || 0).toFixed(2).replace('.', ',')}
            </strong>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Custo condomínio</span>
          </div>

          <div style={styles.kpiCard}>
            <span style={styles.kpiLabel}>Total Geral Previsto</span>
            <strong style={{ ...styles.kpiValue, color: '#2563eb' }}>
              R$ {(totalPrivativo + Number(agAtual.valor_area_comum || agendamento?.valor_area_comum || 0)).toFixed(2).replace('.', ',')}
            </strong>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Serviço total</span>
          </div>
        </div>

        {/* Content Body */}
        <div style={styles.body}>
          {erro && (
            <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '12px' }}>
              {erro}
            </div>
          )}

          {sucesso && (
            <div style={{ background: '#dcfce7', color: '#15803d', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '12px' }}>
              {sucesso}
            </div>
          )}

          {/* Search & Add button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '10px' }}>
            <input 
              type="text" 
              placeholder="Buscar unidade, bloco ou morador..." 
              value={busca} 
              onChange={e => setBusca(e.target.value)}
              style={styles.searchInput}
            />
            <button 
              type="button" 
              onClick={() => setMostrandoAdd(!mostrandoAdd)}
              style={styles.btnAddManual}
            >
              {mostrandoAdd ? 'Fechar' : '+ Adicionar Unidade'}
            </button>
          </div>

          {/* Form manual de adição */}
          {mostrandoAdd && (
            <form onSubmit={handleAddManual} style={styles.formManual}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                Incluir Unidade Manualmente
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <input 
                  type="text" 
                  placeholder="Nº Unidade / Apto *" 
                  value={novaUnidade} 
                  onChange={e => setNovaUnidade(e.target.value)} 
                  required 
                  style={styles.inputMini}
                />
                <input 
                  type="text" 
                  placeholder="Bloco / Torre" 
                  value={novoBloco} 
                  onChange={e => setNovoBloco(e.target.value)} 
                  style={styles.inputMini}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <input 
                  type="text" 
                  placeholder="Nome do Responsável *" 
                  value={novoNome} 
                  onChange={e => setNovoNome(e.target.value)} 
                  required 
                  style={styles.inputMini}
                />
                <input 
                  type="text" 
                  placeholder="WhatsApp / Telefone" 
                  value={novoTelefone} 
                  onChange={e => setNovoTelefone(e.target.value)} 
                  style={styles.inputMini}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                {tipos && tipos.length > 0 ? (
                  <select value={novoTipo} onChange={e => setNovoTipo(e.target.value)} style={styles.inputMini}>
                    {tipos.map((t, idx) => (
                      <option key={idx} value={t.nome}>{t.nome} (R$ {Number(t.valor).toFixed(2)})</option>
                    ))}
                  </select>
                ) : (
                  <input type="text" value={novoTipo} onChange={e => setNovoTipo(e.target.value)} placeholder="Tipo (Apto)" style={styles.inputMini} />
                )}
                <select value={novoMetodo} onChange={e => setNovoMetodo(e.target.value)} style={styles.inputMini}>
                  <option value="Pulverização e Gel">Pulverização e Gel</option>
                  <option value="Pulverização">Apenas Pulverização</option>
                  <option value="Gel Inodoro">Apenas Gel Inodoro</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setMostrandoAdd(false)} style={styles.btnSecundarioMini}>Cancelar</button>
                <button type="submit" style={styles.btnPrimarioMini}>Salvar Unidade</button>
              </div>
            </form>
          )}

          {/* Listagem */}
          {carregando ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Carregando adesões...</div>
          ) : adesoesFiltradas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>📋</div>
              <div style={{ fontWeight: '600', color: '#334155', fontSize: '14px' }}>Nenhuma unidade registrada ainda</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Copie o link ou o comunicado acima para divulgar entre os moradores.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {adesoesFiltradas.map((a) => (
                <div key={a.id} style={{ ...styles.adesaoCard, borderLeft: a.executado ? '4px solid #16a34a' : '4px solid #0284c7' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={styles.unitBadge}>Apto {a.unidade} {a.bloco ? `(${a.bloco})` : ''}</span>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>{a.nome_morador}</span>
                        {a.executado ? (
                          <span style={styles.badgeRealizado}>✓ Executado</span>
                        ) : (
                          <span style={styles.badgePendente}>Pendente</span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                        <span>📞 {a.telefone || 'Sem tel'}</span>
                        <span>🏷️ {a.tipo_unidade || 'Padrão'}</span>
                        <span>💵 R$ {Number(a.valor || 0).toFixed(2).replace('.', ',')}</span>
                        <span>🧪 {a.metodo || 'Pulverização'}</span>
                      </div>
                      {a.observacoes && (
                        <div style={{ fontSize: '11px', color: '#92400e', background: '#fffbeb', padding: '4px 8px', borderRadius: '4px', marginTop: '6px' }}>
                          💬 {a.observacoes}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button 
                        type="button" 
                        onClick={() => handleToggleExecutado(a.id, a.executado)}
                        style={{ ...styles.btnAcaoMini, background: a.executado ? '#f1f5f9' : '#dcfce7', color: a.executado ? '#64748b' : '#15803d' }}
                        title={a.executado ? 'Marcar como não executado' : 'Marcar como executado'}
                      >
                        {a.executado ? 'Desmarcar' : '✓ Feito'}
                      </button>

                      <button 
                        type="button" 
                        onClick={() => handleExcluirAdesao(a.id, a.unidade)}
                        style={{ ...styles.btnAcaoMini, background: '#fee2e2', color: '#dc2626' }}
                        title="Excluir adesão"
                      >
                        <IcoTrash width={12} height={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button style={styles.btnSecundario} onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(15, 23, 42, 0.6)',
    zIndex: 9999,
    display: 'flex',
    justifyContent: 'flex-end',
    backdropFilter: 'blur(2px)'
  },
  drawer: {
    width: '100%',
    maxWidth: '620px',
    height: '100%',
    background: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '-4px 0 25px rgba(0,0,0,0.15)',
    animation: 'slideLeft 0.25s ease-out'
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#f8fafc'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: '#64748b',
    cursor: 'pointer',
    padding: '4px 8px'
  },
  actionBanner: {
    padding: '12px 20px',
    background: '#f1f5f9',
    borderBottom: '1px solid #e2e8f0'
  },
  actionBtn: {
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'background 0.2s'
  },
  kpiRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '10px',
    padding: '12px 20px',
    borderBottom: '1px solid #e2e8f0',
    background: '#ffffff'
  },
  kpiCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  kpiLabel: {
    fontSize: '11px',
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  kpiValue: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#0f172a'
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 20px'
  },
  searchInput: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '13px',
    outline: 'none'
  },
  btnAddManual: {
    background: '#0f172a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  formManual: {
    background: '#f8fafc',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '14px'
  },
  inputMini: {
    width: '100%',
    padding: '7px 10px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '12px',
    boxSizing: 'border-box',
    outline: 'none',
    background: '#ffffff'
  },
  btnPrimarioMini: {
    background: '#0284c7',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  btnSecundarioMini: {
    background: '#ffffff',
    color: '#475569',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '12px',
    cursor: 'pointer'
  },
  adesaoCard: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '10px 14px'
  },
  unitBadge: {
    background: '#e0f2fe',
    color: '#0369a1',
    fontWeight: '700',
    fontSize: '12px',
    padding: '2px 8px',
    borderRadius: '4px'
  },
  badgeRealizado: {
    background: '#dcfce7',
    color: '#15803d',
    fontSize: '11px',
    fontWeight: '700',
    padding: '2px 6px',
    borderRadius: '4px'
  },
  badgePendente: {
    background: '#fef3c7',
    color: '#d97706',
    fontSize: '11px',
    fontWeight: '700',
    padding: '2px 6px',
    borderRadius: '4px'
  },
  btnAcaoMini: {
    border: 'none',
    borderRadius: '4px',
    padding: '4px 8px',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px'
  },
  footer: {
    padding: '12px 20px',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'flex-end',
    background: '#f8fafc'
  },
  btnSecundario: {
    background: '#ffffff',
    color: '#334155',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer'
  }
};

