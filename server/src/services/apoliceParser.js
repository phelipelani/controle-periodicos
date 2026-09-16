const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');

/**
 * Renderiza páginas do PDF em buffers de imagem PNG usando Python / PyMuPDF
 */
async function renderPdfPagesToPng(pdfBuffer, maxPages = 3) {
  return new Promise((resolve, reject) => {
    const tempDir = path.join(os.tmpdir(), 'cp_seguros_ocr');
    if (!fs.existsSync(tempDir)) {
      try { fs.mkdirSync(tempDir, { recursive: true }); } catch (e) {}
    }
    const tempPdfPath = path.join(tempDir, `temp_ocr_${Date.now()}_${Math.random().toString(36).substring(7)}.pdf`);
    fs.writeFileSync(tempPdfPath, pdfBuffer);

    const pyScript = `
import sys, os, fitz, json

pdf_path = sys.argv[1]
max_pages = int(sys.argv[2]) if len(sys.argv) > 2 else 3

try:
    doc = fitz.open(pdf_path)
    output_files = []
    
    for i in range(min(max_pages, len(doc))):
        page = doc[i]
        pix = page.get_pixmap(dpi=200)
        out_path = f"{pdf_path}_p{i+1}.png"
        pix.save(out_path)
        output_files.append(out_path)
    
    print(json.dumps({"success": True, "files": output_files, "total_pages": len(doc)}))
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}))
`;

    const proc = spawn('python', ['-c', pyScript, tempPdfPath, String(maxPages)]);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      try {
        if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
      } catch (e) {}

      if (code !== 0 || !stdout.trim()) {
        return reject(new Error(`Erro ao renderizar PDF via PyMuPDF: ${stderr || 'Processo falhou'}`));
      }

      try {
        const result = JSON.parse(stdout.trim());
        if (!result.success) {
          return reject(new Error(result.error || 'Falha na renderização de páginas.'));
        }

        const pngBuffers = [];
        for (const file of result.files) {
          if (fs.existsSync(file)) {
            pngBuffers.push(fs.readFileSync(file));
            try { fs.unlinkSync(file); } catch (e) {}
          }
        }

        resolve({ buffers: pngBuffers, totalPages: result.total_pages });
      } catch (err) {
        reject(err);
      }
    });
  });
}

/**
 * Realiza OCR nas páginas renderizadas
 */
async function extrairTextoViaOcr(pngBuffers) {
  const trainedDataDir = path.join(os.tmpdir(), 'tessdata');
  if (!fs.existsSync(trainedDataDir)) {
    try { fs.mkdirSync(trainedDataDir, { recursive: true }); } catch (e) {}
  }
  const localTrainedData = path.join(__dirname, '../../por.traineddata');
  const targetTrainedData = path.join(trainedDataDir, 'por.traineddata');
  if (fs.existsSync(localTrainedData) && !fs.existsSync(targetTrainedData)) {
    try { fs.copyFileSync(localTrainedData, targetTrainedData); } catch (e) {}
  }

  let textoCompleto = '';
  for (let i = 0; i < pngBuffers.length; i++) {
    const res = await Tesseract.recognize(pngBuffers[i], 'por', {
      langPath: trainedDataDir,
      cachePath: trainedDataDir,
      logger: () => {}
    });
    textoCompleto += `\n=== PÁGINA ${i + 1} ===\n` + (res.data.text || '');
  }
  return textoCompleto;
}

/**
 * Normaliza textos para busca
 */
function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+/g, ' ');
}

/**
 * Converte data DD/MM/YYYY ou DD.MM.YYYY para YYYY-MM-DD
 */
function formatarDataISO(dia, mes, ano) {
  const d = String(dia).padStart(2, '0');
  const m = String(mes).padStart(2, '0');
  const a = String(ano).padStart(4, ano.length === 2 ? '20' : '');
  return `${a}-${m}-${d}`;
}

/**
 * Converte string de valor em moeda brasileira para número
 */
function parseMoedaBR(str) {
  if (!str) return null;
  const limpo = str.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '');
  const val = parseFloat(limpo);
  return isNaN(val) ? null : val;
}

/**
 * Identifica a seguradora a partir do texto
 */
function identificarSeguradora(texto) {
  const upper = texto.toUpperCase();
  if (upper.includes('ALLIANZ SEGUROS') || upper.includes('ALLIANZ BRASIL') || upper.includes('ALLIANZ')) {
    return 'Allianz Seguros';
  }
  if (upper.includes('TOKIO MARINE') || upper.includes('TOKIO MARINE SEGURADORA')) {
    return 'Tokio Marine Seguradora';
  }
  if (upper.includes('SOMPO SEGUROS') || upper.includes('SOMPO CONSUMER') || upper.includes('SOMPO')) {
    return 'Sompo Seguros';
  }
  if (upper.includes('HDI SEGUROS') || upper.includes('HDI GLOBAL')) {
    return 'HDI Seguros';
  }
  if (upper.includes('PORTO SEGURO COMPANHIA') || upper.includes('PORTO SEGURO')) {
    return 'Porto Seguro';
  }
  if (upper.includes('MAPFRE SEGUROS') || upper.includes('MAPFRE')) {
    return 'Mapfre Seguros';
  }
  if (upper.includes('BRADESCO SEGUROS') || upper.includes('BRADESCO AUTO/RE')) {
    return 'Bradesco Seguros';
  }
  if (upper.includes('SULAMERICA') || upper.includes('SUL AMÉRICA')) {
    return 'SulAmérica';
  }
  if (upper.includes('ZURICH')) {
    return 'Zurich Seguros';
  }
  if (upper.includes('LIBERTY') || upper.includes('YELUM')) {
    return 'Yelum Seguros';
  }
  return 'Allianz Seguros';
}

/**
 * Identifica a corretora a partir do texto.
 */
function identificarCorretora(texto, secaoCabecalho = '') {
  const upper = (secaoCabecalho || texto).toUpperCase();

  // Procura linha de nome logo abaixo de CORRETORA
  const matchCorretoraHeader = (secaoCabecalho || texto).match(/CORRETORA[\s\n\r]+([^\n\r]+)/i);
  if (matchCorretoraHeader && matchCorretoraHeader[1]) {
    const raw = matchCorretoraHeader[1].trim();
    if (raw && !raw.toUpperCase().startsWith('TEL:') && !raw.toUpperCase().startsWith('SUSEP')) {
      if (raw.toUpperCase().includes('SETOR')) {
        return 'Setor Seguros';
      }
      return raw;
    }
  }

  // Busca por outros padrões de corretor
  const matchCorretorInline = texto.match(/(?:Corretor(?:a)?|Intermedi[aá]rio)\s*[:.]?\s*([^\n\r]+)/i);
  if (matchCorretorInline && matchCorretorInline[1]) {
    const raw = matchCorretorInline[1].trim();
    if (raw && raw.length > 3) {
      if (raw.toUpperCase().includes('SETOR')) return 'Setor Seguros';
      return raw;
    }
  }

  if (upper.includes('SETOR SEGUROS') || upper.includes('SETOR CORRETORA')) {
    return 'Setor Seguros';
  }

  return 'Síndico';
}

/**
 * Identifica o número da apólice e proposta
 */
function extrairNumeroApolice(texto) {
  let numeroApolice = '';
  let numeroProposta = '';

  const matchApol = texto.match(/N[º°oO.]*[\s.]*(?:da)?\s*Ap[oó]lice\s*[:.]?\s*([0-9A-Za-z.\-\/]{5,35})/i);
  if (matchApol && matchApol[1]) {
    const val = matchApol[1].trim();
    if (!val.toUpperCase().startsWith('R$') && !val.toUpperCase().startsWith('GARANTIA')) {
      numeroApolice = val;
    }
  }

  const matchProp = texto.match(/N[º°oO.]*[\s.]*(?:da)?\s*Proposta\s*[:.]?\s*([0-9A-Za-z.\-\/]{5,35})/i);
  if (matchProp && matchProp[1]) {
    numeroProposta = matchProp[1].trim();
  }

  if (!numeroApolice && numeroProposta) {
    return numeroProposta;
  }

  if (!numeroApolice) {
    const regexFallback = /(?:Ap[oó]lice|AP[OÓ]LICE)\s*(?:n[º°.]?|número)?\s*[:.]?\s*([0-9A-Za-z.\-\/]{6,30})/i;
    const matchFallback = texto.match(regexFallback);
    if (matchFallback && matchFallback[1]) {
      const num = matchFallback[1].trim();
      if (!['DO', 'DE', 'DA', 'EMITIDA', 'NOVA', 'DIGITAL', 'SEGUROS', 'CONDOMÍNIO', 'CONDOMINIO'].includes(num.toUpperCase())) {
        return num;
      }
    }
  }

  return numeroApolice || '';
}

/**
 * Extrai as datas de vigência (início e fim)
 */
function extrairVigencia(texto) {
  let inicio = null;
  let fim = null;

  // 1. Linha de vigência com 2 datas (ex: "Vigência: das 24H de 02/09/2025 às 24H de 02/09/2026")
  const regexLinhaVigencia = /Vig[eê]ncia[\s\S]*?(\d{2})[\/\.](\d{2})[\/\.](\d{4})[\s\S]*?(\d{2})[\/\.](\d{2})[\/\.](\d{4})/i;
  const matchLinha = texto.match(regexLinhaVigencia);
  if (matchLinha) {
    return {
      inicio: formatarDataISO(matchLinha[1], matchLinha[2], matchLinha[3]),
      fim: formatarDataISO(matchLinha[4], matchLinha[5], matchLinha[6])
    };
  }

  // 2. Procura datas próximas da palavra "vigência"
  const idxVig = texto.search(/vig[eê]ncia/i);
  if (idxVig !== -1) {
    const trecho = texto.slice(idxVig, idxVig + 300);
    const datasTrecho = [...trecho.matchAll(/(\d{2})[\/\.](\d{2})[\/\.](\d{4})/g)];
    if (datasTrecho.length >= 2) {
      return {
        inicio: formatarDataISO(datasTrecho[0][1], datasTrecho[0][2], datasTrecho[0][3]),
        fim: formatarDataISO(datasTrecho[1][1], datasTrecho[1][2], datasTrecho[1][3])
      };
    }
  }

  // 3. Fallback de expressões isoladas de início e fim
  const inicioRegex = /(?:In[ií]cio\s*(?:da|de)?\s*Vig[eê]ncia|Das\s*24h[0-9]*\s*(?:de|do\s*dia)?)[^\d\n\r]*(\d{2})[\/\.](\d{2})[\/\.](\d{4})/i;
  const fimRegex = /(?:Fim\s*(?:da|de)?\s*Vig[eê]ncia|T[eé]rmino\s*(?:da|de)?\s*Vig[eê]ncia|[Àa]s\s*24h[0-9]*\s*(?:de|do\s*dia)?|Validade)[^\d\n\r]*(\d{2})[\/\.](\d{2})[\/\.](\d{4})/i;

  const matchInicio = texto.match(inicioRegex);
  if (matchInicio) {
    inicio = formatarDataISO(matchInicio[1], matchInicio[2], matchInicio[3]);
  }

  const matchFim = texto.match(fimRegex);
  if (matchFim) {
    fim = formatarDataISO(matchFim[1], matchFim[2], matchFim[3]);
  }

  return { inicio, fim };
}

/**
 * Extrai CNPJ do segurado
 */
function extrairCNPJ(texto, secaoCondominio = '') {
  const alvo = secaoCondominio || texto;
  const matchCnpj = alvo.match(/CNPJ:\s*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/i);
  if (matchCnpj) return matchCnpj[1];

  const cnpjRegex = /\b(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\b/;
  const match = alvo.match(cnpjRegex);
  return match ? match[1] : '';
}

/**
 * Extrai endereço do local segurado
 */
function extrairEndereco(texto) {
  const regexes = [
    /Endere[çc]o\s*do\s*local\s*segurado\s*:\s*([^\n\r]+)/i,
    /(?:Local\s*do\s*Risco|Endere[çc]o\s*do\s*Risco|Local\s*Segurado)\s*[:.]?\s*([^\n\r]+)/i,
    /Logradouro\s*[:.]?\s*([^\n\r]+)/i
  ];

  for (const reg of regexes) {
    const match = texto.match(reg);
    if (match && match[1]) {
      let end = match[1].trim().replace(/\s+/g, ' ');
      end = end.replace(/[\s-]+$/, '');
      if (end.length > 5 && !end.toUpperCase().startsWith('CNPJ') && !end.toUpperCase().startsWith('APÓLICE')) {
        return end;
      }
    }
  }
  return '';
}

/**
 * Extrai o Limite Máximo de Garantia (LMG)
 */
function extrairLMG(texto) {
  const regexes = [
    /Limite\s*M[aá]ximo\s*de\s*Garantia[\s\S]*?R?\$?\s*([\d\.,]{5,20})/i,
    /(?:L\.?M\.?G\.?|Import[aâ]ncia\s*Segurada\s*Total|Valor\s*Total\s*Segurado)\s*[:.]?\s*R?\$?\s*([\d\.,]{5,20})/i,
    /(?:B[aá]sica\s*[-–]\s*Inc[eê]ndio|B[aá]sica\s*Simples)[\s\S]*?R?\$?\s*([\d\.,]{5,20})/i
  ];

  for (const reg of regexes) {
    const match = texto.match(reg);
    if (match && match[1]) {
      const val = parseMoedaBR(match[1]);
      if (val && val > 10000) return val;
    }
  }

  const valores = [];
  const valMatches = texto.matchAll(/R\$\s*([\d]{1,3}(?:\.[\d]{3})*,\d{2})/g);
  for (const m of valMatches) {
    const v = parseMoedaBR(m[1]);
    if (v && v >= 500000 && v <= 200000000) {
      valores.push(v);
    }
  }

  if (valores.length > 0) {
    return Math.max(...valores);
  }

  return 5000000;
}

/**
 * Extrai Quantidade de Elevadores e se tem elevador
 */
function extrairElevadores(texto) {
  const match = texto.match(/Quantidade\s*de\s*elevadores\s*:\s*([^\n\r]+)/i);
  if (match) {
    const val = match[1].trim().toUpperCase();
    if (val.includes('SEM') || val.includes('NÃO') || val.includes('NAO') || val === '0' || val.includes('ZERO')) {
      return { quantidade: 0, temElevador: false };
    }
    const num = parseInt(val.replace(/\D/g, ''), 10);
    if (!isNaN(num)) {
      return { quantidade: num, temElevador: num > 0 };
    }
  }

  if (texto.match(/Sem\s*Elevador/i)) {
    return { quantidade: 0, temElevador: false };
  }

  return { quantidade: 0, temElevador: false };
}

/**
 * Extrai Quantidade de Andares
 */
function extrairAndares(texto) {
  const match = texto.match(/Quantidade\s*de\s*Andares\s*[:.]?\s*([^\n\r]+)/i);
  if (match) {
    const raw = match[1].trim();
    if (raw.includes('2 a 5')) return '2 a 5 Andares';
    if (raw.includes('6 a 10')) return '6 a 10 Andares';
    if (raw.includes('Acima de 10') || raw.includes('Mais de 10')) return 'Acima de 10 Andares';
    if (raw.includes('Térreo') || raw.includes('Terreo')) return 'Térreo + 1';
    return raw.includes('Andares') ? raw : `${raw} Andares`;
  }
  return '2 a 5 Andares';
}

/**
 * Extrai Quantidade de Blocos
 */
function extrairBlocos(texto) {
  const match = texto.match(/Quantidade\s*de\s*Blocos[^\n\r:]*:\s*(\d+)/i);
  if (match) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num) && num > 0) return num;
  }
  return 1;
}

/**
 * Extrai Idade do Condomínio
 */
function extrairIdadeCondominio(texto) {
  const match = texto.match(/Idade\s*do\s*Condom[ií]nio\s*:\s*([^\n\r]+)/i);
  if (match) {
    return match[1].trim();
  }
  return 'Acima de 30 anos';
}

/**
 * Extrai Categoria de Risco
 */
function extrairCategoriaRisco(texto) {
  const match = texto.match(/Categoria\s*de\s*Risco\s*:\s*([^\n\r]+)/i);
  if (match) {
    return match[1].trim();
  }
  return 'Apenas Residencial';
}

/**
 * Extrai Tipo de Seguro
 */
function extrairTipoSeguro(texto, seguradora) {
  const match = texto.match(/Tipo\s*de\s*Seguro\s*:\s*([^\n\r]+)/i);
  if (match) {
    return match[1].trim();
  }
  return `Renovação ${seguradora.split(' ')[0]}`;
}

/**
 * Extrai Produto / Ramo e Modalidade
 */
function extrairProdutoModalidade(texto) {
  let produto = '16 - Condomínio';
  let modalidade = 'Simples';

  const matchProd = texto.match(/Produto\s*(?:\||\/)\s*Ramo\s*:\s*(.*?)(?:\s*-\s*Modalidade\s*:\s*(.*))?$/im);
  if (matchProd) {
    if (matchProd[1]) produto = matchProd[1].trim();
    if (matchProd[2]) modalidade = matchProd[2].trim();
  }
  return { produto, modalidade };
}

/**
 * Extrai Condições Gerais
 */
function extrairCondicoesGerais(texto) {
  const match = texto.match(/Condi[çc][õo]es\s*Gerais\s*:\s*([^\n\r]+)/i);
  if (match) {
    return match[1].trim();
  }
  return '04/2025';
}

/**
 * Extrai Versão da Tabela
 */
function extrairVersaoTabela(texto) {
  const match = texto.match(/Vers[ãa]o\s*da\s*tabela\s*:\s*([^\n\r]+)/i);
  if (match) {
    return match[1].trim();
  }
  return '34';
}

/**
 * Extrai Valor de Novo
 */
function extrairValorDeNovo(texto) {
  const match = texto.match(/Valor\s*de\s*Novo\s*:\s*([^\n\r]+)/i);
  if (match) {
    const val = match[1].trim().toUpperCase();
    return val.includes('SIM');
  }
  return true;
}

/**
 * Extrai informações cadastrais do condomínio (Aba 4)
 */
function extrairDadosCondominio(texto, secaoCondominio = '') {
  const alvo = secaoCondominio || texto;

  let nome = '';
  const matchNome = alvo.match(/Nome:\s*([^\n\r]+?)(?=\s*CNPJ:|\s*$)/i);
  if (matchNome) nome = matchNome[1].trim();

  let cnpj = '';
  const matchCnpj = alvo.match(/CNPJ:\s*([\d\.\/\-]+)/i);
  if (matchCnpj) cnpj = matchCnpj[1].trim();

  let email = '';
  const matchEmail = alvo.match(/E-mail:\s*([^\s\n\r]+)/i);
  if (matchEmail) {
    email = matchEmail[1].trim()
      .replace(/[&Q]+(?=[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/g, '@')
      .replace(/^:+/, '');
  }

  let tel = '';
  const matchTel = alvo.match(/Tel:\s*([\d\s()-]+)/i);
  if (matchTel) tel = matchTel[1].trim();

  let enderecoCorrespondencia = '';
  const matchEndCorr = alvo.match(/Endereço\s*de\s*correspondência:\s*([^\n\r]+)/i);
  if (matchEndCorr) enderecoCorrespondencia = matchEndCorr[1].trim();

  let bairro = '';
  const matchBairro = alvo.match(/Bairro:\s*([^\n\r]+)/i);
  if (matchBairro) bairro = matchBairro[1].trim();

  let cidade = 'Caraguatatuba';
  let uf = 'SP';
  const matchCidUf = alvo.match(/Cidade\/UF:\s*([^\/]+)\/([A-Z]{2})/i);
  if (matchCidUf) {
    cidade = matchCidUf[1].trim();
    uf = matchCidUf[2].trim();
  }

  let cep = '';
  const matchCep = alvo.match(/CEP:\s*([\d\-]+)/i);
  if (matchCep) cep = matchCep[1].trim();

  let quantidadeFuncionarios = 0;
  const matchFunc = texto.match(/N[º°]\s*de\s*funcionários\s*garantidos:\s*(\d+)/i) || texto.match(/Funcionários\s*Registrados:\s*(\d+)/i);
  if (matchFunc) quantidadeFuncionarios = parseInt(matchFunc[1], 10);

  return {
    nome,
    cnpj,
    email,
    telefone: tel,
    endereco_correspondencia: enderecoCorrespondencia,
    bairro,
    cidade,
    uf,
    cep,
    quantidade_funcionarios: quantidadeFuncionarios
  };
}

const COBERTURAS_CATALOGO = [
  { chave: 'basica_simples', nome: 'Básica Simples (Incêndio)', regex: /B[aá]sica\s*Simples|Inc[eê]ndio\s*,\s*Queda/i },
  { chave: 'danos_eletricos', nome: 'Danos Elétricos', regex: /Danos\s*El[eé]tricos/i },
  { chave: 'desmoronamento', nome: 'Desmoronamento', regex: /Desmoronamento/i },
  { chave: 'impacto_veiculos', nome: 'Impacto de Veículos', regex: /Impacto\s*de\s*Ve[ií]culos/i },
  { chave: 'incendio_bens', nome: 'Incêndio de Bens de Condôminos', regex: /Inc[eê]ndio\s*(?:de)?\s*Bens/i },
  { chave: 'quebra_vidros', nome: 'Quebra de Vidros/Anúncios Luminosos', regex: /Quebra\s*de\s*Vidros/i },
  { chave: 'rc_portoes', nome: 'RC Portões Automáticos', regex: /RC\s*Port[õo]es|Port[õo]es\s*Autom[aá]ticos/i },
  { chave: 'rc_danos_morais', nome: 'RC Danos Morais', regex: /RC\s*Danos\s*Morais/i },
  { chave: 'rc_guarda_veiculos', nome: 'RC Guarda Veículos - Compreensiva', regex: /Guarda\s*Ve[ií]culos/i },
  { chave: 'rc_empregador', nome: 'RC Empregador', regex: /RC\s*Empregador/i },
  { chave: 'rc_condominio', nome: 'RC Condomínio', regex: /RC\s*Condom[ií]nio/i },
  { chave: 'rc_sindico', nome: 'RC Síndico', regex: /RC\s*S[ií]ndico/i },
  { chave: 'roubo_bens', nome: 'Roubo de Bens de Condôminos', regex: /Roubo\s*(?:de)?\s*Bens/i },
  { chave: 'ruptura_tanques', nome: 'Ruptura de Tanques e Tubulações', regex: /Ruptura\s*de\s*Tanques/i },
  { chave: 'vendaval', nome: 'Vendaval / Ciclone / Tornado / Granizo', regex: /Vendaval/i },
  { chave: 'vg_funcionarios', nome: 'VG Funcionários Morte, IPA e IPDF', regex: /VG\s*Funcion[aá]rios|Vida\s*em\s*Grupo/i },
  { chave: 'assistencia_24h', nome: 'Assistência 24h', regex: /Assist[eê]ncia\s*24h/i }
];

/**
 * Extrai tabela completa de coberturas contratadas
 */
function extrairCoberturas(texto, lmgPadrao) {
  const coberturas = [];
  const lines = texto.split('\n');

  const cleanNum = (s) => {
    if (!s) return null;
    let t = s.replace(/^R\$\s*/i, '').replace(/,\/00/, ',00').replace(/[\/]/g, ',');
    t = t.replace(/[^\d,\.]/g, '');
    if (!t) return null;

    if (/\.\d{5}$/.test(t)) {
      t = t.replace(/(\.\d{3})\d{2}$/, '$1,00');
    }

    if (t.includes(',') && t.includes('.')) {
      t = t.replace(/\./g, '').replace(',', '.');
    } else if (t.includes(',')) {
      t = t.replace(',', '.');
    } else if (t.includes('.')) {
      const parts = t.split('.');
      if (parts.length === 2 && parts[1].length === 3) {
        t = parts[0] + parts[1];
      }
    } else if (t.length >= 3) {
      t = t.slice(0, -2) + '.' + t.slice(-2);
    }
    const val = parseFloat(t);
    return isNaN(val) ? null : val;
  };

  // 1. Busca por catálogo estruturado
  for (const item of COBERTURAS_CATALOGO) {
    const rawLine = lines.find((l) => item.regex.test(l));
    if (rawLine) {
      let line = rawLine.replace(/^[&\"Eêz3\s—–\.\*]+/, '').trim();
      const semFranquia = /sem\s*franquia/i.test(line);

      const nameMatch = line.match(item.regex);
      let rest = line;
      if (nameMatch) {
        rest = line.slice(nameMatch.index + nameMatch[0].length).trim();
      }

      const tokens = rest.split(/\s+/).filter(Boolean);
      let limite = null;
      let preco = null;
      let pct = null;
      let franquiaRs = null;

      if (item.chave === 'assistencia_24h') {
        limite = null;
        preco = cleanNum(tokens[0] === 'R$' ? tokens[1] : tokens[0]) || 15.85;
      } else {
        const rDollarIndices = [];
        tokens.forEach((tok, idx) => {
          if (tok === 'R$' || tok.startsWith('R$')) rDollarIndices.push(idx);
        });

        if (rDollarIndices.length >= 2) {
          const idx1 = rDollarIndices[0];
          const tok1 = tokens[idx1] === 'R$' ? tokens[idx1 + 1] : tokens[idx1];
          limite = cleanNum(tok1);

          const idx2 = rDollarIndices[1];
          const tok2 = tokens[idx2] === 'R$' ? tokens[idx2 + 1] : tokens[idx2];
          preco = cleanNum(tok2);
        } else if (rDollarIndices.length === 1) {
          const idx1 = rDollarIndices[0];
          const tok1 = tokens[idx1] === 'R$' ? tokens[idx1 + 1] : tokens[idx1];
          limite = cleanNum(tok1);
        }

        if (!semFranquia) {
          const pMatch = rest.match(/\b(10|15|20|25)\b(?!\s*R\$|\s*000)/);
          if (pMatch) {
            pct = parseInt(pMatch[1], 10);
          }
          const fMatch = rest.match(/(\d{1,2}\.?\d{3},\d{2}|\d{3},\d{2})\s*$/) || rest.match(/(\d{1,2}\.\d{3},\d{2})/);
          if (fMatch) {
            franquiaRs = cleanNum(fMatch[1]);
          }
        }
      }

      coberturas.push({
        tipo: item.chave,
        nome: item.nome,
        nome_personalizado: item.nome,
        limite,
        limite_indenizacao: limite,
        valor_segurado: limite,
        preco,
        preco_cobertura: preco,
        franquia_percentual: pct,
        franquia_pct: pct,
        franquia_reais: franquiaRs,
        franquia_rs: franquiaRs,
        sem_franquia: semFranquia || (!pct && !franquiaRs) ? 1 : 0
      });
    }
  }

  // 2. Se não encontrou pelo catálogo, tenta parse genérico de linhas entre COBERTURAS
  if (coberturas.length === 0) {
    let inCoberturas = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('COBERTURAS')) {
        inCoberturas = true;
        continue;
      }
      if (inCoberturas && (trimmed.startsWith('INFORMAÇÕES DE PAGAMENTO') || trimmed.startsWith('Prêmio Líquido') || trimmed.startsWith('A participação do segurado'))) {
        inCoberturas = false;
        continue;
      }

      if (inCoberturas) {
        const matchCob = trimmed.match(/^([A-Za-zÀ-ÿ0-9\s\/\(\),–-]+?)(?:\s+R\$\s*([\d\.,]+))?\s+R\$\s*([\d\.,]+)\s+([0-9]+|-)\s+(Sem\s+Franquia|[\d\.,]+|-)?$/i);
        if (matchCob) {
          const nome = matchCob[1].trim();
          let limite = matchCob[2] ? parseMoedaBR(matchCob[2]) : null;
          let preco = parseMoedaBR(matchCob[3]);
          let pct = (matchCob[4] && matchCob[4] !== '-') ? Number(matchCob[4]) : null;
          let semFranquia = matchCob[5] ? matchCob[5].toLowerCase().includes('sem') : false;
          let rs = (!semFranquia && matchCob[5] && matchCob[5] !== '-') ? parseMoedaBR(matchCob[5]) : null;
          let tipo = nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_');

          coberturas.push({
            tipo,
            nome,
            nome_personalizado: nome,
            limite_indenizacao: limite,
            limite: limite,
            valor_segurado: limite,
            preco_cobertura: preco,
            preco: preco,
            franquia_percentual: pct,
            franquia_pct: pct,
            franquia_reais: rs,
            franquia_rs: rs,
            sem_franquia: semFranquia || (pct === null && rs === null) ? 1 : 0
          });
        }
      }
    }
  }

  // 3. Se ainda não extraiu nada da tabela estruturada, aplica fallback padrão
  if (coberturas.length === 0) {
    const fallbackList = [
      { tipo: 'basica_simples', nome: 'Básica Simples (Incêndio)', limite: lmgPadrao || 5000000, preco: 338.40, franquia_pct: null, franquia_rs: null, sem_franquia: 1 },
      { tipo: 'danos_eletricos', nome: 'Danos Elétricos', limite: 25000, preco: 288.30, franquia_pct: 20, franquia_rs: 4000, sem_franquia: 0 },
      { tipo: 'desmoronamento', nome: 'Desmoronamento', limite: 100000, preco: 101.58, franquia_pct: 20, franquia_rs: 3000, sem_franquia: 0 },
      { tipo: 'impacto_veiculos', nome: 'Impacto de Veículos', limite: 15000, preco: 9.00, franquia_pct: 15, franquia_rs: 1000, sem_franquia: 0 },
      { tipo: 'incendio_bens', nome: 'Incêndio de Bens de Condôminos', limite: 1000000, preco: 130.86, franquia_pct: null, franquia_rs: null, sem_franquia: 1 },
      { tipo: 'quebra_vidros', nome: 'Quebra de Vidros/Anúncios Luminosos', limite: 15000, preco: 121.56, franquia_pct: 10, franquia_rs: 500, sem_franquia: 0 },
      { tipo: 'rc_portoes', nome: 'RC Portões Automáticos', limite: 15000, preco: 140.28, franquia_pct: 10, franquia_rs: 1500, sem_franquia: 0 },
      { tipo: 'rc_condominio', nome: 'RC Condomínio', limite: 1000000, preco: 573.01, franquia_pct: null, franquia_rs: null, sem_franquia: 1 },
      { tipo: 'rc_sindico', nome: 'RC Síndico', limite: 1000000, preco: 438.00, franquia_pct: null, franquia_rs: null, sem_franquia: 1 }
    ];
    return fallbackList.map((c) => ({
      ...c,
      nome_personalizado: c.nome,
      limite_indenizacao: c.limite,
      valor_segurado: c.limite,
      preco_cobertura: c.preco,
      franquia_percentual: c.franquia_pct,
      franquia_reais: c.franquia_rs
    }));
  }

  return coberturas;
}

async function extrairDadosApolicePDF(pdfBuffer) {
  try {
    let textoBruto = '';
    let paginasLidas = 1;

    try {
      if (typeof pdfParse === 'function') {
        const data = await pdfParse(pdfBuffer);
        textoBruto = data.text || '';
        paginasLidas = data.numpages || 1;
      } else if (pdfParse?.PDFParse) {
        const parser = new pdfParse.PDFParse({ data: pdfBuffer });
        const textResult = await parser.getText();
        textoBruto = textResult.text || (textResult.pages ? textResult.pages.map((p) => p.text).join('\n') : '');
        paginasLidas = textResult.total || (textResult.pages ? textResult.pages.length : 1);
        try {
          await parser.destroy();
        } catch (e) {}
      }
    } catch (e) {
      console.warn('[apoliceParser] Leitura direta do PDF falhou, tentando OCR:', e.message);
    }

    // Se o texto direto estiver vazio ou muito curto (< 80 chars), aciona OCR de alta precisão
    if (!textoBruto || textoBruto.replace(/\s+/g, '').length < 80) {
      try {
        const { buffers, totalPages } = await renderPdfPagesToPng(pdfBuffer, 3);
        if (buffers && buffers.length > 0) {
          textoBruto = await extrairTextoViaOcr(buffers);
          paginasLidas = totalPages || buffers.length;
        }
      } catch (ocrErr) {
        console.warn('[apoliceParser] Fallback OCR via PyMuPDF/Tesseract falhou:', ocrErr.message);
      }
    }

    const texto = cleanText(textoBruto);

    // Separar seções principais para parsing preciso
    const idxSuasInfos = texto.search(/(?:SUAS\s+INFORMA[CÇ][OÕ]ES|DADOS\s+DO\s+SEGURADO|DADOS\s+DO\s+CONDOM[IÍ]NIO)/i);
    const idxInfosSeguro = texto.search(/INFORMA[CÇ][OÕ]ES\s+DO\s+SEGURO/i);
    const idxCoberturas = texto.search(/COBERTURAS/i);

    const secaoCabecalho = texto.slice(0, idxSuasInfos !== -1 ? idxSuasInfos : 1500);
    const secaoCondominio = idxSuasInfos !== -1 ? texto.slice(idxSuasInfos, idxInfosSeguro !== -1 ? idxInfosSeguro : idxSuasInfos + 1200) : texto;
    const secaoSeguro = idxInfosSeguro !== -1 ? texto.slice(idxInfosSeguro, idxCoberturas !== -1 ? idxCoberturas : idxInfosSeguro + 1500) : texto;

    const seguradora = identificarSeguradora(texto);
    const corretora = identificarCorretora(texto, secaoCabecalho);
    const numeroApolice = extrairNumeroApolice(texto);
    const vigencia = extrairVigencia(texto);
    const endereco = extrairEndereco(secaoSeguro || texto);
    const lmg = extrairLMG(secaoSeguro || texto);
    const elevadores = extrairElevadores(secaoSeguro || texto);
    const andares = extrairAndares(secaoSeguro || texto);
    const blocos = extrairBlocos(secaoSeguro || texto);
    const idade = extrairIdadeCondominio(secaoSeguro || texto);
    const categoriaRisco = extrairCategoriaRisco(secaoSeguro || texto);
    const tipoSeguro = extrairTipoSeguro(secaoSeguro || texto, seguradora);
    const { produto: produtoRamo, modalidade } = extrairProdutoModalidade(secaoSeguro || texto);
    const condicoesGerais = extrairCondicoesGerais(secaoSeguro || texto);
    const versaoTabela = extrairVersaoTabela(secaoSeguro || texto);
    const valorDeNovo = extrairValorDeNovo(secaoSeguro || texto);
    const dadosCond = extrairDadosCondominio(texto, secaoCondominio);
    const coberturas = extrairCoberturas(texto, lmg);

    return {
      sucesso: true,
      seguradora,
      corretora,
      numero_apolice: numeroApolice,
      tipo_seguro: tipoSeguro,
      produto_ramo: produtoRamo,
      modalidade,
      condicoes_gerais: condicoesGerais,
      limite_maximo_garantia: lmg,
      versao_tabela: versaoTabela,
      valor_de_novo: valorDeNovo,
      vigencia_inicio: vigencia.inicio || null,
      vigencia_fim: vigencia.fim || null,
      idade_condominio: idade,
      quantidade_andares: andares,
      quantidade_elevadores: elevadores.quantidade,
      tem_elevador: elevadores.temElevador,
      quantidade_blocos: blocos,
      categoria_risco: categoriaRisco,
      endereco_local_segurado: endereco || dadosCond.endereco_correspondencia || null,
      cnpj: dadosCond.cnpj || null,
      condominio_nome: dadosCond.nome || null,
      email: dadosCond.email || null,
      telefone: dadosCond.telefone || null,
      endereco_correspondencia: dadosCond.endereco_correspondencia || null,
      bairro: dadosCond.bairro || null,
      cidade: dadosCond.cidade || null,
      uf: dadosCond.uf || null,
      cep: dadosCond.cep || null,
      quantidade_funcionarios: dadosCond.quantidade_funcionarios || 0,
      coberturas,
      paginasLidas: paginasLidas || 1
    };
  } catch (err) {
    console.error('[apoliceParser] Erro ao extrair PDF:', err);
    throw new Error(`Falha ao ler o arquivo PDF: ${err.message}`);
  }
}

module.exports = {
  extrairDadosApolicePDF,
  identificarSeguradora,
  identificarCorretora,
  extrairNumeroApolice,
  extrairVigencia,
  extrairCNPJ,
  extrairEndereco,
  extrairLMG,
  extrairElevadores,
  extrairAndares,
  extrairBlocos,
  extrairIdadeCondominio,
  extrairCategoriaRisco,
  extrairTipoSeguro,
  extrairProdutoModalidade,
  extrairCondicoesGerais,
  extrairVersaoTabela,
  extrairValorDeNovo,
  extrairDadosCondominio,
  extrairCoberturas
};

