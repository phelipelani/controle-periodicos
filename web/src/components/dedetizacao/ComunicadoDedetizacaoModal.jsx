import React, { useState, useEffect } from 'react';
import Modal from '../Modal';

function limparNomeCondominio(nomeRaw = '') {
  // Remove prefixos numéricos como "001 - " ou "009 - 010 - " mantendo o nome oficial do condomínio
  return String(nomeRaw)
    .replace(/^(\d+\s*-\s*)+/, '')
    .trim()
    .toUpperCase();
}

function formatarMoedaBR(valor) {
  const num = Number(valor) || 0;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatarPeriodoTexto(periodo = '') {
  const p = String(periodo).toLowerCase();
  if (p.includes('tarde')) return 'no período da tarde';
  if (p.includes('manha') || p.includes('manhã')) return 'no período da manhã';
  if (p.includes('integral')) return 'em período integral';
  return `no período da ${periodo.toLowerCase()}`;
}

function formatarPeriodoTabela(periodo = '') {
  const p = String(periodo).toLowerCase();
  if (p.includes('tarde')) return 'TARDE';
  if (p.includes('manha') || p.includes('manhã')) return 'MANHÃ';
  if (p.includes('integral')) return 'INTEGRAL';
  return String(periodo || 'MANHÃ').toUpperCase();
}

export default function ComunicadoDedetizacaoModal({ agendamento, onFechar }) {
  if (!agendamento) return null;

  const DEFAULT_TIPOS = [
    { nome: 'Dedetização (aptos tipo)', valor: 85 }
  ];

  const parseTiposIniciais = () => {
    const raw = agendamento.tipos_unidades;
    if (!raw) return DEFAULT_TIPOS;
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(t => ({
          nome: t.nome || t.tipo || 'Dedetização (aptos tipo)',
          valor: Number(t.valor) || 0
        }));
      }
    } catch {
      // fallback
    }
    return DEFAULT_TIPOS;
  };

  const dataRaw = agendamento.data_agendada || agendamento.raw_data_agendada || '';
  const dataBrInicial = dataRaw.includes('-')
    ? dataRaw.split('-').reverse().join('/')
    : (agendamento.dataAgendada && agendamento.dataAgendada !== '-' ? agendamento.dataAgendada : '');

  const nomeCondInicial = limparNomeCondominio(
    agendamento.condominio_nome || agendamento.condominio || ''
  );

  const linkPadrao = agendamento.token_adesao
    ? `${window.location.origin}/adesao/${agendamento.token_adesao}`
    : `${window.location.origin}/adesao/`;

  const [condominioNome, setCondominioNome] = useState(nomeCondInicial);
  const [dataBr, setDataBr] = useState(dataBrInicial);
  const [periodo, setPeriodo] = useState(agendamento.periodo || agendamento.periodoAgendado || 'Tarde');
  const [empresa, setEmpresa] = useState((agendamento.empresa || 'DDDRIN').toUpperCase());
  const [linkAdesao, setLinkAdesao] = useState(linkPadrao);
  const [tiposUnidades, setTiposUnidades] = useState(parseTiposIniciais);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    setCondominioNome(limparNomeCondominio(agendamento.condominio_nome || agendamento.condominio || ''));
    const dRaw = agendamento.data_agendada || agendamento.raw_data_agendada || '';
    setDataBr(dRaw.includes('-') ? dRaw.split('-').reverse().join('/') : (agendamento.dataAgendada || ''));
    setPeriodo(agendamento.periodo || agendamento.periodoAgendado || 'Tarde');
    setEmpresa((agendamento.empresa && agendamento.empresa !== '-' ? agendamento.empresa : 'DDDRIN').toUpperCase());
    setLinkAdesao(
      agendamento.token_adesao
        ? `${window.location.origin}/adesao/${agendamento.token_adesao}`
        : `${window.location.origin}/adesao/`
    );
    setTiposUnidades(parseTiposIniciais());
  }, [agendamento]);

  const periodoTexto = formatarPeriodoTexto(periodo);
  const periodoTabela = formatarPeriodoTabela(periodo);

  const formatarNomeLinhaTabela = (nome) => {
    const n = String(nome || '').trim();
    if (!n) return 'Dedetização (aptos tipo)';
    if (n.toLowerCase().startsWith('dedetiza')) return n;
    const lower = n.toLowerCase();
    if (lower.includes('padrão') || lower.includes('padrao') || lower === 'apartamento' || lower.includes('comum') || lower.includes('tipo')) {
      return 'Dedetização (aptos tipo)';
    }
    if (lower.includes('cobertura') || lower.includes('duplex')) {
      return 'Dedetização (aptos cobertura)';
    }
    if (lower.includes('loja') || lower.includes('comercial') || lower.includes('sala')) {
      return 'Dedetização (lojas / comercial)';
    }
    return `Dedetização (${n})`;
  };

  // Gera o HTML oficial do Comunicado (usado tanto para Impressão/PDF quanto para exportação Word .doc)
  const gerarHtmlDocumento = (paraWord = false) => {
    const linhasValoresHtml = tiposUnidades
      .filter(t => t.nome && String(t.nome).trim())
      .map(t => `
        <tr>
          <td style="border: 1px solid #cbd5e1; padding: 7px 12px; font-weight: 600; color: #1e293b;">${formatarNomeLinhaTabela(t.nome)}</td>
          <td style="border: 1px solid #cbd5e1; padding: 7px 12px; font-weight: 700; color: #0f172a; text-align: center;">R$ ${formatarMoedaBR(t.valor)}</td>
          <td style="border: 1px solid #cbd5e1; padding: 7px 12px; color: #334155; text-align: center;">Pulverização ou Sem Odor</td>
        </tr>
      `).join('');

    return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40" lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Comunicado Dedetização - ${condominioNome}</title>
  ${paraWord ? `
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  ` : ''}
  <style>
    @page {
      size: A4;
      margin: 14mm 16mm;
    }
    body {
      font-family: 'Segoe UI', Calibri, Arial, sans-serif;
      color: #1e293b;
      line-height: 1.42;
      font-size: 10.5pt;
      margin: 0;
      padding: ${paraWord ? '0' : '20px'};
      background: #ffffff;
    }
    .page-container {
      max-width: 720px;
      margin: 0 auto;
    }
    .header-box {
      text-align: center;
      border-bottom: 2px solid #1e3a8a;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }
    .comunicado-tag {
      font-size: 16pt;
      font-weight: 800;
      color: #1e3a8a;
      letter-spacing: 1px;
      margin: 0;
    }
    .comunicado-sub {
      font-size: 10.5pt;
      font-weight: 700;
      color: #334155;
      margin-top: 3px;
      text-transform: uppercase;
    }
    .destinatario-box {
      margin-bottom: 10px;
    }
    .destinatario-label {
      font-size: 9.5pt;
      color: #475569;
      margin: 0;
    }
    .condominio-titulo {
      font-size: 12.5pt;
      font-weight: 800;
      color: #0f172a;
      margin: 2px 0 0 0;
      text-transform: uppercase;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0 12px 0;
    }
    .info-table td {
      border: 1px solid #94a3b8;
      background: #f8fafc;
      padding: 7px 12px;
      text-align: center;
      width: 33.33%;
    }
    .info-label {
      font-size: 8pt;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      display: block;
    }
    .info-val {
      font-size: 11pt;
      font-weight: 800;
      color: #0f172a;
      display: block;
      margin-top: 2px;
    }
    p {
      margin: 0 0 8px 0;
      text-align: justify;
    }
    .cta-table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      background: #eff6ff;
      border: 2px solid #2563eb;
    }
    .cta-table td {
      padding: 12px 14px;
      text-align: center;
    }
    .cta-title {
      font-size: 10.5pt;
      font-weight: 800;
      color: #1e3a8a;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .cta-desc {
      font-size: 9.5pt;
      color: #334155;
      margin-bottom: 10px;
    }
    .cta-btn {
      display: inline-block;
      background: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 800;
      font-size: 10.5pt;
      padding: 8px 20px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .section-title {
      font-size: 10.5pt;
      font-weight: 800;
      color: #1e3a8a;
      margin: 11px 0 5px 0;
      text-transform: uppercase;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 2px;
    }
    ol, ul {
      margin: 4px 0 8px 0;
      padding-left: 20px;
    }
    li {
      margin-bottom: 3px;
    }
    .valores-table {
      width: 100%;
      border-collapse: collapse;
      margin: 6px 0 6px 0;
      font-size: 10pt;
    }
    .valores-table th {
      background: #1e3a8a;
      color: #ffffff;
      border: 1px solid #1e3a8a;
      padding: 6px 12px;
      text-align: left;
      font-weight: 700;
    }
    .nota-importante {
      font-size: 9pt;
      color: #475569;
      font-style: italic;
      margin-bottom: 8px;
    }
    .assinatura {
      margin-top: 14px;
      text-align: left;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="page-container">
    <div class="header-box">
      <div class="comunicado-tag">COMUNICADO</div>
      <div class="comunicado-sub">DEDETIZAÇÃO DAS ÁREAS COMUNS E ADESÃO PARA AS UNIDADES</div>
    </div>

    <div class="destinatario-box">
      <div class="destinatario-label">Aos Condôminos(as):</div>
      <div class="condominio-titulo">${condominioNome}</div>
    </div>

    <table class="info-table">
      <tr>
        <td>
          <span class="info-label">DATA PREVISTA</span>
          <span class="info-val">${dataBr || 'A DEFINIR'}</span>
        </td>
        <td>
          <span class="info-label">PERÍODO</span>
          <span class="info-val">${periodoTabela}</span>
        </td>
        <td>
          <span class="info-label">EMPRESA</span>
          <span class="info-val">${empresa || 'ESPECIALIZADA'}</span>
        </td>
      </tr>
    </table>

    <p>
      Informamos que no dia <strong>${dataBr}</strong>, ${periodoTexto}, será realizado o serviço de dedetização nas áreas comuns do condomínio. O procedimento será executado por empresa especializada, com o objetivo de auxiliar no controle de insetos e preservar as condições de higiene e segurança das áreas do condomínio.
    </p>
    <p>
      Além da aplicação nas áreas comuns, os moradores que desejarem poderão aderir à dedetização de sua unidade. Para facilitar o processo, não será necessário entrar em contato por telefone ou e-mail: a adesão será realizada diretamente pelo portal.
    </p>

    <table class="cta-table">
      <tr>
        <td>
          <div class="cta-title">ADESÃO À DEDETIZAÇÃO DA UNIDADE</div>
          <div class="cta-desc">Clique no link abaixo, informe os dados da sua unidade e escolha o método de aplicação desejado.</div>
          <div>
            <a href="${linkAdesao}" target="_blank" rel="noopener noreferrer" class="cta-btn">
              ACESSAR PORTAL DE ADESÃO — CLIQUE AQUI
            </a>
          </div>
          <div style="margin-top: 6px; font-size: 8.5pt; color: #475569;">
            Link direto: <a href="${linkAdesao}" style="color: #1d4ed8;">${linkAdesao}</a>
          </div>
        </td>
      </tr>
    </table>

    <div class="section-title">Como realizar a adesão</div>
    <ol>
      <li>Acesse o link do Portal de Adesão.</li>
      <li>Selecione o tipo da sua unidade.</li>
      <li>Informe os dados solicitados, incluindo a unidade e as informações necessárias para acesso ao imóvel.</li>
      <li>Escolha o método de aplicação desejado.</li>
      <li>Confira os dados e confirme a adesão.</li>
    </ol>

    <div class="section-title">Valor e métodos disponíveis</div>
    <table class="valores-table">
      <thead>
        <tr>
          <th>Tipo de unidade</th>
          <th style="text-align: center;">Valor</th>
          <th style="text-align: center;">Método de aplicação</th>
        </tr>
      </thead>
      <tbody>
        ${linhasValoresHtml}
      </tbody>
    </table>
    <div class="nota-importante">
      <strong>Importante:</strong> o valor e as condições apresentados acima correspondem às informações atualmente configuradas no Portal de Adesão. Caso existam categorias diferentes de unidades no condomínio, os valores serão apresentados automaticamente no sistema conforme a categoria selecionada.
    </div>

    <div class="section-title">Métodos de aplicação</div>
    <p style="margin-bottom: 5px;">
      <strong>Pulverização</strong> – método com garantia de 06 (seis) meses contra baratas. Requer cuidados específicos após a aplicação, conforme orientação da empresa, incluindo ausência durante o procedimento, período de reentrada e ventilação do ambiente.
    </p>
    <p>
      <strong>Aplicação sem odor</strong> – método com garantia de 03 (três) meses contra baratas, com aplicação de inseticida líquido nos ralos e gel-isca inodoro em pontos estratégicos, como cozinha, banheiros e armários. Conforme orientação apresentada no portal, não necessita de desocupação do local.
    </p>

    <div class="section-title">Orientações importantes</div>
    <ul>
      <li>A escolha do método de aplicação deverá ser realizada no próprio Portal de Adesão.</li>
      <li>Os moradores que optarem pela pulverização deverão seguir integralmente as orientações de segurança e reentrada fornecidas pela empresa responsável.</li>
      <li>A não realização da dedetização dentro da unidade pode favorecer a permanência ou proliferação de insetos em áreas não tratadas.</li>
      <li>Após a realização do serviço, será emitido o certificado correspondente, com as informações de validade da dedetizadora.</li>
      <li>A cobrança da adesão será realizada conforme as condições informadas no Portal de Adesão e no resumo apresentado antes da confirmação.</li>
    </ul>

    <p style="margin-top: 8px;">
      Contamos com a colaboração de todos para que o serviço seja realizado de forma organizada e segura.
    </p>

    <div class="assinatura">
      <div>Atenciosamente,</div>
      <div style="font-weight: 800; color: #1e3a8a; margin-top: 2px;">IMCOSTA – ADMINISTRADORA</div>
    </div>
  </div>
</body>
</html>`;
  };

  const handleImprimirPDF = () => {
    const html = gerarHtmlDocumento(false);
    const win = window.open('', '_blank');
    if (!win) {
      alert('Permita pop-ups no navegador para abrir a visualização de impressão / PDF.');
      return;
    }
    win.document.write(html);
    win.document.close();
    setTimeout(() => {
      win.focus();
      win.print();
    }, 300);
  };

  const handleBaixarWord = () => {
    const html = gerarHtmlDocumento(true);
    const blob = new Blob(['\ufeff', html], {
      type: 'application/msword;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const slug = condominioNome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
    a.href = url;
    a.download = `Comunicado_Dedetizacao_${slug || 'condominio'}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopiarWhatsApp = () => {
    const linhasValores = tiposUnidades
      .filter(t => t.nome && String(t.nome).trim())
      .map(t => `• *${formatarNomeLinhaTabela(t.nome)}:* R$ ${formatarMoedaBR(t.valor)} (Pulverização ou Sem Odor)`)
      .join('\n');

    const texto = `📢 *COMUNICADO — DEDETIZAÇÃO DAS ÁREAS COMUNS E ADESÃO PARA AS UNIDADES*

Aos Condôminos(as):
🏢 *${condominioNome}*

📅 *DATA PREVISTA:* ${dataBr}
🕒 *PERÍODO:* ${periodoTabela}
🛠️ *EMPRESA:* ${empresa}

Informamos que no dia *${dataBr}*, ${periodoTexto}, será realizado o serviço de dedetização nas áreas comuns do condomínio. O procedimento será executado por empresa especializada, com o objetivo de auxiliar no controle de insetos e preservar as condições de higiene e segurança das áreas do condomínio.

Além da aplicação nas áreas comuns, os moradores que desejarem poderão aderir à dedetização de sua unidade diretamente pelo portal:

🔗 *ACESSAR PORTAL DE ADESÃO:*
👉 ${linkAdesao}

💰 *VALOR E MÉTODOS DISPONÍVEIS:*
${linhasValores}

🔬 *MÉTODOS DE APLICAÇÃO:*
• *Pulverização:* garantia de 06 (seis) meses contra baratas. Requer cuidados específicos após a aplicação, incluindo ausência durante o procedimento, período de reentrada e ventilação do ambiente.
• *Aplicação sem odor:* garantia de 03 (três) meses contra baratas, com aplicação de inseticida líquido nos ralos e gel-isca inodoro na cozinha, banheiros e armários. Não necessita de desocupação do local.

Contamos com a colaboração de todos para que o serviço seja realizado de forma organizada e segura.

Atenciosamente,
*IMCOSTA – ADMINISTRADORA*`;

    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  };

  const aplicarPresetCategorias = (preset) => {
    if (preset === '1') {
      setTiposUnidades([
        { nome: 'Dedetização (aptos tipo)', valor: tiposUnidades[0]?.valor || 85 }
      ]);
    } else if (preset === '2') {
      setTiposUnidades([
        { nome: 'Dedetização (aptos tipo)', valor: tiposUnidades[0]?.valor || 85 },
        { nome: 'Dedetização (aptos cobertura)', valor: tiposUnidades[1]?.valor || 140 }
      ]);
    } else if (preset === '3') {
      setTiposUnidades([
        { nome: 'Dedetização (aptos tipo)', valor: tiposUnidades[0]?.valor || 85 },
        { nome: 'Dedetização (aptos cobertura)', valor: tiposUnidades[1]?.valor || 140 },
        { nome: 'Dedetização (lojas / comercial)', valor: tiposUnidades[2]?.valor || 160 }
      ]);
    }
  };

  const handleTipoChange = (idx, campo, valor) => {
    setTiposUnidades(prev => {
      const novo = [...prev];
      novo[idx] = { ...novo[idx], [campo]: campo === 'valor' ? valor : valor };
      return novo;
    });
  };

  return (
    <Modal titulo="📄 Comunicado Oficial de Dedetização (Gerado Automaticamente)" largura="860px" onFechar={onFechar}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* BARRA DE AÇÕES RÁPIDAS */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '12px 16px', borderRadius: '10px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ fontWeight: 700, color: '#1e3a8a', fontSize: '14px' }}>
              ✓ Comunicado pronto para envio!
            </div>
            <div style={{ fontSize: '12px', color: '#475569' }}>
              O nome do condomínio, data, empresa, link clicável e tabela de valores já foram preenchidos.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleBaixarWord}
              style={{ background: '#1d4ed8', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '9px 14px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              title="Baixar arquivo editável do Word (.doc) já preenchido"
            >
              📝 Baixar em Word (.doc)
            </button>
            <button
              type="button"
              onClick={handleImprimirPDF}
              style={{ background: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '9px 14px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              title="Imprimir ou Salvar como PDF com link clicável"
            >
              🖨️ Salvar PDF / Imprimir
            </button>
            <button
              type="button"
              onClick={handleCopiarWhatsApp}
              style={{ background: copiado ? '#15803d' : '#059669', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '9px 14px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              {copiado ? '✓ Copiado!' : '📲 Copiar p/ WhatsApp'}
            </button>
          </div>
        </div>

        {/* AJUSTE RÁPIDO DAS VARIÁVEIS DINÂMICAS */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <strong style={{ fontSize: '12px', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              ⚙️ Campos Dinâmicos do Comunicado (Personalize se necessário)
            </strong>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
              <span style={{ color: '#64748b', fontWeight: 600 }}>Modelo de Tabela:</span>
              <button
                type="button"
                onClick={() => aplicarPresetCategorias('1')}
                style={{ background: tiposUnidades.length === 1 ? '#0284c7' : '#e2e8f0', color: tiposUnidades.length === 1 ? '#fff' : '#334155', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
              >
                Só Apto Comum
              </button>
              <button
                type="button"
                onClick={() => aplicarPresetCategorias('2')}
                style={{ background: tiposUnidades.length === 2 ? '#0284c7' : '#e2e8f0', color: tiposUnidades.length === 2 ? '#fff' : '#334155', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
              >
                Apto + Cobertura
              </button>
              <button
                type="button"
                onClick={() => aplicarPresetCategorias('3')}
                style={{ background: tiposUnidades.length === 3 ? '#0284c7' : '#e2e8f0', color: tiposUnidades.length === 3 ? '#fff' : '#334155', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
              >
                Apto + Cobertura + Loja
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Condomínio</label>
              <input
                type="text"
                value={condominioNome}
                onChange={e => setCondominioNome(e.target.value)}
                style={{ width: '100%', padding: '6px 8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Data Prevista</label>
              <input
                type="text"
                value={dataBr}
                onChange={e => setDataBr(e.target.value)}
                placeholder="DD/MM/AAAA"
                style={{ width: '100%', padding: '6px 8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Período</label>
              <select
                value={periodo}
                onChange={e => setPeriodo(e.target.value)}
                style={{ width: '100%', padding: '6px 8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
              >
                <option value="Manhã">Manhã</option>
                <option value="Tarde">Tarde</option>
                <option value="Integral">Integral</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Empresa</label>
              <input
                type="text"
                value={empresa}
                onChange={e => setEmpresa(e.target.value.toUpperCase())}
                style={{ width: '100%', padding: '6px 8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
              />
            </div>
          </div>

          {/* Categorias e valores dinâmicos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {tiposUnidades.map((t, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={t.nome}
                  onChange={e => handleTipoChange(idx, 'nome', e.target.value)}
                  placeholder="Descrição na tabela (ex: Dedetização (aptos tipo))"
                  style={{ padding: '5px 8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>R$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={t.valor}
                    onChange={e => handleTipoChange(idx, 'valor', e.target.value)}
                    style={{ width: '100%', padding: '5px 8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  />
                </div>
                {tiposUnidades.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setTiposUnidades(prev => prev.filter((_, i) => i !== idx))}
                    style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', padding: '5px 8px', fontSize: '12px', cursor: 'pointer' }}
                    title="Remover linha"
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* PREVIEW FIEL AO DOCUMENTO WORD */}
        <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', background: '#ffffff', padding: '24px 28px', maxHeight: '420px', overflowY: 'auto', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.03)', fontSize: '13px', lineHeight: 1.5, color: '#1e293b' }}>
          <div style={{ textAlign: 'center', borderBottom: '2px solid #1e3a8a', paddingBottom: '10px', marginBottom: '12px' }}>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#1e3a8a', letterSpacing: '1px' }}>COMUNICADO</div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginTop: '2px' }}>
              DEDETIZAÇÃO DAS ÁREAS COMUNS E ADESÃO PARA AS UNIDADES
            </div>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '12px', color: '#475569' }}>Aos Condôminos(as):</div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>{condominioNome}</div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #94a3b8', background: '#f8fafc', padding: '6px 10px', textAlign: 'center', width: '33.3%' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b' }}>DATA PREVISTA</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{dataBr || 'A DEFINIR'}</div>
                </td>
                <td style={{ border: '1px solid #94a3b8', background: '#f8fafc', padding: '6px 10px', textAlign: 'center', width: '33.3%' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b' }}>PERÍODO</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{periodoTabela}</div>
                </td>
                <td style={{ border: '1px solid #94a3b8', background: '#f8fafc', padding: '6px 10px', textAlign: 'center', width: '33.3%' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b' }}>EMPRESA</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{empresa}</div>
                </td>
              </tr>
            </tbody>
          </table>

          <p style={{ margin: '0 0 8px 0', textAlign: 'justify' }}>
            Informamos que no dia <strong>{dataBr}</strong>, {periodoTexto}, será realizado o serviço de dedetização nas áreas comuns do condomínio. O procedimento será executado por empresa especializada, com o objetivo de auxiliar no controle de insetos e preservar as condições de higiene e segurança das áreas do condomínio.
          </p>
          <p style={{ margin: '0 0 12px 0', textAlign: 'justify' }}>
            Além da aplicação nas áreas comuns, os moradores que desejarem poderão aderir à dedetização de sua unidade. Para facilitar o processo, não será necessário entrar em contato por telefone ou e-mail: a adesão será realizada diretamente pelo portal.
          </p>

          <div style={{ background: '#eff6ff', border: '2px solid #2563eb', borderRadius: '8px', padding: '12px', textAlign: 'center', marginBottom: '12px' }}>
            <div style={{ fontWeight: 800, color: '#1e3a8a', fontSize: '13px', marginBottom: '4px' }}>
              ADESÃO À DEDETIZAÇÃO DA UNIDADE
            </div>
            <div style={{ fontSize: '12px', color: '#334155', marginBottom: '8px' }}>
              Clique no link abaixo, informe os dados da sua unidade e escolha o método de aplicação desejado.
            </div>
            <a
              href={linkAdesao}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-block', background: '#2563eb', color: '#ffffff', fontWeight: 800, fontSize: '12px', padding: '7px 18px', borderRadius: '6px', textDecoration: 'none' }}
            >
              ACESSAR PORTAL DE ADESÃO — CLIQUE AQUI
            </a>
          </div>

          <div style={{ fontWeight: 800, color: '#1e3a8a', fontSize: '13px', textTransform: 'uppercase', marginBottom: '6px' }}>
            Valor e métodos disponíveis
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#1e3a8a', color: '#ffffff' }}>
                <th style={{ padding: '6px 10px', textAlign: 'left', border: '1px solid #1e3a8a' }}>Tipo de unidade</th>
                <th style={{ padding: '6px 10px', textAlign: 'center', border: '1px solid #1e3a8a' }}>Valor</th>
                <th style={{ padding: '6px 10px', textAlign: 'center', border: '1px solid #1e3a8a' }}>Método de aplicação</th>
              </tr>
            </thead>
            <tbody>
              {tiposUnidades.filter(t => t.nome && String(t.nome).trim()).map((t, i) => (
                <tr key={i}>
                  <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', fontWeight: 600 }}>{formatarNomeLinhaTabela(t.nome)}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'center', fontWeight: 700 }}>R$ {formatarMoedaBR(t.valor)}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'center' }}>Pulverização ou Sem Odor</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="secundario" onClick={onFechar}>
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  );
}
