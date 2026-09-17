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
 * Identifica a corretora a partir do texto
 */
function identificarCorretora(texto, secaoCabecalho = '') {
  const alvo = (secaoCabecalho || texto);
  
  // Padrão HDI: "Corretor % Participação\n00000202048414 - JOY DIAS & DIAS CORRET DE SEG 100,00"
  const matchHdi = alvo.match(/Corretor\s*(?:%\s*Participa[çc][ãa]o)?[\s\n\r]+(?:[0-9]+\s*-\s*)?([A-Za-zÀ-ÿ0-9\s&.,-]+?)(?:\s+100[,.]00|\s+[0-9]+[,.][0-9]+|\s*Telefone|\s*$)/i);
  if (matchHdi && matchHdi[1] && !matchHdi[1].toUpperCase().includes('PARTICIPAÇÃO')) {
    let nome = matchHdi[1].trim().replace(/^[0-9\s-]+/, '');
    if (nome.length > 3) return nome;
  }

  // Padrão Allianz / Cabeçalho: "CORRETORA\nCARAGUA SEG CORRETORA DE SEGUROS LTDA\nTel:"
  const matchCorretoraHeader = alvo.match(/CORRETORA[\s\n\r]+([^\n\r]+)/i);
  if (matchCorretoraHeader && matchCorretoraHeader[1]) {
    const raw = matchCorretoraHeader[1].trim();
    if (raw && !raw.toUpperCase().startsWith('TEL:') && !raw.toUpperCase().startsWith('SUSEP') && !raw.toUpperCase().includes('PARTICIPAÇÃO')) {
      return raw.toUpperCase().includes('SETOR') ? 'Setor Seguros' : raw;
    }
  }

  // Busca por outros padrões inline
  const matchCorretorInline = alvo.match(/(?:Corretor(?:a)?|Intermedi[aá]rio)\s*[:.]?\s*(?:[0-9]+\s*-\s*)?([^\n\r]+)/i);
  if (matchCorretorInline && matchCorretorInline[1]) {
    let raw = matchCorretorInline[1].trim().replace(/^[0-9\s-]+/, '').replace(/\s+[0-9]+[,.][0-9]+%?$/, '');
    if (raw && raw.length > 3 && !raw.toUpperCase().includes('PARTICIPAÇÃO')) {
      return raw.toUpperCase().includes('SETOR') ? 'Setor Seguros' : raw;
    }
  }

  if (alvo.toUpperCase().includes('SETOR SEGUROS') || alvo.toUpperCase().includes('SETOR CORRETORA')) {
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

  const matchApol = texto.match(/N[º°oO.]*[\s.]*(?:da)?\s*Ap[oó]lice\s*[:.]?\s*([0-9A-Za-z.\-\/]{5,35})/i) ||
                    texto.match(/Ap[oó]lice\s*[:.]?\s*([0-9A-Za-z.\-\/]{5,35})/i);
  if (matchApol && matchApol[1]) {
    const val = matchApol[1].trim();
    if (!val.toUpperCase().startsWith('R$') && !val.toUpperCase().startsWith('GARANTIA') && !['DE', 'DO', 'DA', 'EMITIDA'].includes(val.toUpperCase())) {
      numeroApolice = val;
    }
  }

  const matchProp = texto.match(/N[º°oO.]*[\s.]*(?:da)?\s*Proposta\s*[:.]?\s*([0-9A-Za-z.\-\/]{5,35})/i) ||
                    texto.match(/Proposta\s*[:.]?\s*([0-9A-Za-z.\-\/]{5,35})/i);
  if (matchProp && matchProp[1]) {
    numeroProposta = matchProp[1].trim();
  }

  if (!numeroApolice && numeroProposta) return numeroProposta;
  return numeroApolice || '';
}

/**
 * Extrai as datas de vigência (início e fim)
 */
function extrairVigencia(texto) {
  const regexLinhaVigencia = /Vig[eê]ncia[\s\S]*?(\d{2})[\/\.](\d{2})[\/\.](\d{4})[\s\S]*?(\d{2})[\/\.](\d{2})[\/\.](\d{4})/i;
  const matchLinha = texto.match(regexLinhaVigencia);
  if (matchLinha) {
    return {
      inicio: formatarDataISO(matchLinha[1], matchLinha[2], matchLinha[3]),
      fim: formatarDataISO(matchLinha[4], matchLinha[5], matchLinha[6])
    };
  }
  return { inicio: null, fim: null };
}

/**
 * Extrai CNPJ do segurado
 */
function extrairCNPJ(texto, secaoCondominio = '') {
  const alvo = secaoCondominio || texto;
  const matchCnpj = alvo.match(/CPF\/CNPJ:\s*([\d\.\/\-]+)/i) ||
                    alvo.match(/CNPJ:\s*([\d\.\/\-]+)/i) ||
                    alvo.match(/\b(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\b/);
  return matchCnpj ? matchCnpj[1].trim() : '';
}

/**
 * Extrai endereço do local segurado
 */
function extrairEndereco(texto) {
  const regexes = [
    /Endere[çc]o\s*do\s*(?:local|im[oó]vel)\s*segurado\s*:\s*([^\n\r]+)/i,
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
    /LIMITE\s*M[AÁ]XIMO\s*DE\s*GARANTIA\s*DA\s*AP[OÓ]LICE\s*\([^)]+\)\s*[:.]?\s*R?\$?\s*([\d\.,]{5,20})/i,
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
  const match = texto.match(/Quantidade\s*de\s*elevadores\s*:\s*([^\n\r]+)/i) ||
                texto.match(/Qual\s*a\s*quantidade\s*de\s*elevadores\??\s*([^\n\r]+)/i);
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
  const match = texto.match(/Quantidade\s*de\s*Andares\s*[:.]?\s*([^\n\r]+)/i) ||
                texto.match(/Quantidade\s*de\s*Pavimentos[^\n\r?]*\?\s*([^\n\r]+)/i);
  if (match) {
    const raw = match[1].trim();
    if (raw.includes('2 a 5')) return '2 a 5 Andares';
    if (raw.includes('6 a 10')) return '6 a 10 Andares';
    if (raw.includes('Acima de 10') || raw.includes('Mais de 10')) return 'Acima de 10 Andares';
    if (raw.includes('Térreo') || raw.includes('Terreo')) return 'Térreo + 1';
    return raw.includes('Andares') || raw.includes('andares') ? raw : `${raw} Andares`;
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
  const match = texto.match(/Idade\s*do\s*Condom[ií]nio\s*:\s*([^\n\r]+)/i) ||
                texto.match(/Qual\s*a\s*idade\s*do\s*Condominio\??\s*([^\n\r]+)/i);
  if (match) {
    const raw = match[1].trim();
    if (raw.toLowerCase().startsWith('de ') && !raw.toLowerCase().includes('anos')) {
      return `${raw} anos`;
    }
    return raw;
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

  const matchProd = texto.match(/Produto\s*(?:\||\/)\s*Ramo\s*:\s*(.*?)(?:\s*-\s*Modalidade\s*:\s*(.*))?$/im) ||
                    texto.match(/Ramo\s*:\s*(.*)$/im);
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
  const matchNome = alvo.match(/Nome:\s*([^\n\r]+?)(?=\s*CNPJ:|\s*CPF:|\s*$)/i) ||
                    alvo.match(/Segurado:\s*([^\n\r]+?)(?=\s*CPF|\s*CNPJ|\s*$)/i) ||
                    alvo.match(/Prezado\(a\)\s+([^\n\r]+)/i);
  if (matchNome) nome = matchNome[1].trim();

  let cnpj = '';
  const matchCnpj = alvo.match(/CPF\/CNPJ:\s*([\d\.\/\-]+)/i) ||
                    alvo.match(/CNPJ:\s*([\d\.\/\-]+)/i) ||
                    alvo.match(/\b(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\b/);
  if (matchCnpj) cnpj = matchCnpj[1].trim();

  let email = '';
  const matchEmail = alvo.match(/E-mail:\s*([^\s\n\r]+)/i);
  if (matchEmail) {
    email = matchEmail[1].trim()
      .replace(/[&Q]+(?=[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/g, '@')
      .replace(/^:+/, '');
  }

  let tel = '';
  const matchTel = alvo.match(/Tel(?:efone)?:\s*([\d\s()-]+)/i);
  if (matchTel) tel = matchTel[1].trim();

  let enderecoCorrespondencia = '';
  const matchEndCorr = alvo.match(/Endereço\s*de\s*correspondência:\s*([^\n\r]+)/i) ||
                        alvo.match(/Endereço\s*:\s*([^\n\r]+)/i);
  if (matchEndCorr) enderecoCorrespondencia = matchEndCorr[1].trim();

  let bairro = '';
  const matchBairro = alvo.match(/Bairro:\s*([^\n\r]+)/i);
  if (matchBairro) bairro = matchBairro[1].trim();

  let cidade = 'Caraguatatuba';
  let uf = 'SP';
  const matchCidUf = alvo.match(/Cidade\/UF:\s*([^\/]+)\/([A-Za-zÀ-ÿ\s]{2,20})/i) ||
                     alvo.match(/Cidade:\s*([^\n\r]+?)\s+UF:\s*([A-Z]{2})/i);
  if (matchCidUf) {
    cidade = matchCidUf[1].trim();
    uf = matchCidUf[2].trim().toUpperCase();
    if (uf.includes('SÃO PAULO') || uf.includes('SAO PAULO')) uf = 'SP';
  }

  let cep = '';
  const matchCep = alvo.match(/CEP:\s*([\d\-]+)/i);
  if (matchCep) cep = matchCep[1].trim();

  let quantidadeFuncionarios = 0;
  const matchFunc = texto.match(/N[º°]\s*de\s*funcionários\s*garantidos:\s*(\d+)/i) ||
                    texto.match(/Funcionários\s*Registrados:\s*(\d+)/i) ||
                    texto.match(/Capital\s+Global\s+(\d+)\s+Nao/i);
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
  { chave: 'basica_simples', nome: 'Básica Simples (Incêndio)', regex: /B[aá]sica\s*Simples|Inc[eê]ndio\s*,\s*Queda|Inc\.?\s*\/\s*Raio\s*\/\s*Explosao/i, franquiaRegex: /Inc[eê]ndio|Queda\s*de\s*Raio/i },
  { chave: 'danos_eletricos', nome: 'Danos Elétricos', regex: /Danos\s*El[eé]tricos/i, franquiaRegex: /Danos\s*El[eé]tricos/i },
  { chave: 'desmoronamento', nome: 'Desmoronamento', regex: /Desmoronamento/i, franquiaRegex: /Desmoronamento/i },
  { chave: 'impacto_veiculos', nome: 'Impacto de Veículos', regex: /Impacto\s*de\s*Ve[ií]culos/i, franquiaRegex: /Impacto\s*de\s*Ve[ií]culos/i },
  { chave: 'incendio_bens', nome: 'Incêndio de Bens de Condôminos', regex: /Inc[eê]ndio\s*(?:de)?\s*Bens/i, franquiaRegex: /Inc[eê]ndio\s*(?:de)?\s*Bens/i },
  { chave: 'quebra_vidros', nome: 'Quebra de Vidros/Anúncios Luminosos', regex: /Quebra\s*de\s*Vidros/i, franquiaRegex: /Quebra\s*de\s*Vidros/i },
  { chave: 'rc_portoes', nome: 'RC Portões Automáticos', regex: /RC\s*Port[õo]es|Port[õo]es\s*Autom[aá]ticos/i, franquiaRegex: /Port[õo]es/i },
  { chave: 'rc_danos_morais', nome: 'RC Danos Morais', regex: /RC\s*Danos\s*Morais/i, franquiaRegex: /Danos\s*Morais/i },
  { chave: 'rc_guarda_veiculos', nome: 'RC Guarda Veículos - Compreensiva', regex: /Guarda\s*Ve[ií]culos/i, franquiaRegex: /Guarda\s*Ve[ií]culos/i },
  { chave: 'rc_empregador', nome: 'RC Empregador', regex: /RC\s*Empregador/i, franquiaRegex: /Empregador/i },
  { chave: 'rc_condominio', nome: 'RC Condomínio', regex: /RC\s*Condom[ií]nio|Respons\.?\s*Civil\s*Condominio/i, franquiaRegex: /RC\s*Condom[ií]nio|Respons\.?\s*Civil\s*Condominio/i },
  { chave: 'rc_sindico', nome: 'RC Síndico', regex: /RC\s*S[ií]ndico|\+\s*Sindico/i, franquiaRegex: /S[ií]ndico/i },
  { chave: 'roubo_bens', nome: 'Roubo de Bens de Condôminos', regex: /Roubo\s*(?:de)?\s*Bens/i, franquiaRegex: /Roubo/i },
  { chave: 'ruptura_tanques', nome: 'Ruptura de Tanques e Tubulações', regex: /Ruptura\s*de\s*Tanques|Vazamento\s*de\s*Tanques/i, franquiaRegex: /Tanques|Tubula[çc][õo]es/i },
  { chave: 'vendaval', nome: 'Vendaval / Ciclone / Tornado / Granizo', regex: /Vendaval/i, franquiaRegex: /Vendaval/i },
  { chave: 'vg_funcionarios', nome: 'VG Funcionários Morte, IPA e IPDF', regex: /VG\s*Funcion[aá]rios|Vida\s*em\s*Grupo|Plano\s*de\s*Vida|Capital\s*Global/i, franquiaRegex: /Vida/i },
  { chave: 'assistencia_24h', nome: 'Assistência 24h', regex: /Assist[eê]ncia\s*24h|Assist\.\s*24\s*Horas/i, franquiaRegex: /Assist[eê]ncia/i }
];

/**
 * Extrai tabela completa de coberturas contratadas
 */
function extrairCoberturas(texto, lmgPadrao) {
  const coberturas = [];
  const lines = texto.split('\n');

  // Encontrar trecho de franquias se existir (HDI tem bloco separado "Franquias Obrigatórias")
  const idxFranquias = texto.search(/Franquias\s*(?:Obrigat[oó]rias)?/i);
  const secaoFranquias = idxFranquias !== -1 ? texto.slice(idxFranquias, idxFranquias + 2000) : '';

  for (const item of COBERTURAS_CATALOGO) {
    const rawLine = lines.find((l) => item.regex.test(l));
    if (!rawLine) continue;

    let line = rawLine.replace(/^[&\"Eêz3\s—–\.\*]+/, '').trim();
    const nameMatch = line.match(item.regex);
    let rest = line;
    if (nameMatch) {
      rest = line.slice(nameMatch.index + nameMatch[0].length).trim();
    }

    let limite = null;
    let preco = null;
    let pct = null;
    let franquiaRs = null;
    let semFranquia = /sem\s*franquia/i.test(line);

    // Caso 1: Linha Allianz com R$ explícitos
    if (rest.includes('R$')) {
      const match2RDollar = rest.match(/R\$\s*([\d\.,]+)[\s\S]*?R\$\s*([\d\.,]+)(.*)$/i);
      if (match2RDollar) {
        limite = parseMoedaBR(match2RDollar[1]);
        preco = parseMoedaBR(match2RDollar[2]);
        const restoAposPreco = match2RDollar[3].trim();
        if (/sem\s*franquia/i.test(restoAposPreco)) {
          semFranquia = true;
        } else {
          const tokensFranquia = restoAposPreco.split(/\s+/).filter((t) => t !== '-');
          if (tokensFranquia.length >= 2) {
            pct = parseInt(tokensFranquia[0].replace(/\D/g, ''), 10) || null;
            franquiaRs = parseMoedaBR(tokensFranquia[1]);
          } else if (tokensFranquia.length === 1) {
            if (tokensFranquia[0].includes(',') || tokensFranquia[0].includes('.')) {
              franquiaRs = parseMoedaBR(tokensFranquia[0]);
            } else {
              pct = parseInt(tokensFranquia[0].replace(/\D/g, ''), 10) || null;
            }
          }
        }
      } else {
        const match1RDollar = rest.match(/R\$\s*([\d\.,]+)(.*)$/i);
        if (match1RDollar) {
          preco = parseMoedaBR(match1RDollar[1]);
          if (/sem\s*franquia/i.test(match1RDollar[2])) semFranquia = true;
        }
      }
    } else {
      // Caso 2: Linha HDI sem "R$" nos números das coberturas
      const valoresEncontrados = [...rest.matchAll(/([\d]{1,3}(?:\.[\d]{3})*,\d{2}|\d+,\d{2})/g)].map(m => parseMoedaBR(m[1]));
      if (valoresEncontrados.length >= 2) {
        limite = valoresEncontrados[0];
        preco = valoresEncontrados[1];
      } else if (valoresEncontrados.length === 1) {
        preco = valoresEncontrados[0];
      }
    }

    // Se temos seção de franquias separada (como na HDI), buscar franquia correspondente
    if (secaoFranquias && item.franquiaRegex) {
      const matchIdx = secaoFranquias.search(item.franquiaRegex);
      if (matchIdx !== -1) {
        const trechoFranq = secaoFranquias.slice(matchIdx, matchIdx + 250);
        if (/sem\s*franquia/i.test(trechoFranq.slice(0, 80))) {
          semFranquia = true;
          pct = null;
          franquiaRs = null;
        } else {
          const matchPct = trechoFranq.match(/(\d+)%/);
          if (matchPct) pct = parseInt(matchPct[1], 10);

          const matchMin = trechoFranq.match(/(?:m[ií]nimo\s*de\s*R?\$?|R\$)\s*([\d\.,]+)/i);
          if (matchMin) franquiaRs = parseMoedaBR(matchMin[1]);
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

  // Fallback padrão se nenhuma cobertura catalogada foi encontrada
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

/**
 * Extração com IA (Google Gemini 1.5/2.0 Flash - Gratuita) se a chave estiver configurada
 */
async function extrairViaGeminiIA(texto) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const prompt = `Você é um extrator especialista de apólices de seguro de condomínio brasileiras.
Analise o texto da apólice abaixo e retorne APENAS um JSON válido no seguinte formato:
{
  "seguradora": string,
  "corretora": string,
  "numero_apolice": string,
  "tipo_seguro": string,
  "produto_ramo": string,
  "modalidade": string,
  "condicoes_gerais": string,
  "limite_maximo_garantia": number,
  "versao_tabela": string,
  "valor_de_novo": boolean,
  "vigencia_inicio": "YYYY-MM-DD",
  "vigencia_fim": "YYYY-MM-DD",
  "idade_condominio": string,
  "quantidade_andares": string,
  "quantidade_elevadores": number,
  "tem_elevador": boolean,
  "quantidade_blocos": number,
  "categoria_risco": string,
  "endereco_local_segurado": string,
  "cnpj": string,
  "condominio_nome": string,
  "email": string,
  "telefone": string,
  "endereco_correspondencia": string,
  "bairro": string,
  "cidade": string,
  "uf": string,
  "cep": string,
  "quantidade_funcionarios": number,
  "coberturas": [
    {
      "tipo": string,
      "nome": string,
      "nome_personalizado": string,
      "limite": number,
      "limite_indenizacao": number,
      "valor_segurado": number,
      "preco": number,
      "preco_cobertura": number,
      "franquia_pct": number,
      "franquia_percentual": number,
      "franquia_rs": number,
      "franquia_reais": number,
      "sem_franquia": 1
    }
  ]
}

Texto da Apólice:
${texto.slice(0, 15000)}`;

    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.1 }
      })
    });

    if (!resp.ok) return null;
    const data = await resp.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return null;

    const parsed = JSON.parse(rawText);
    return { ...parsed, sucesso: true, motor: 'Gemini IA (Gratuito)' };
  } catch (e) {
    console.warn('[apoliceParser] Extração via Gemini IA falhou, usando parser local:', e.message);
    return null;
  }
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
        const { buffers, totalPages } = await renderPdfPagesToPng(pdfBuffer, 6);
        if (buffers && buffers.length > 0) {
          textoBruto = await extrairTextoViaOcr(buffers);
          paginasLidas = totalPages || buffers.length;
        }
      } catch (ocrErr) {
        console.warn('[apoliceParser] Fallback OCR via PyMuPDF/Tesseract falhou:', ocrErr.message);
      }
    }

    const texto = cleanText(textoBruto);

    // Tentativa 1: IA (Se chave gratuita Gemini configurada)
    const resultadoIA = await extrairViaGeminiIA(texto);
    if (resultadoIA && resultadoIA.numero_apolice) {
      return { ...resultadoIA, paginasLidas };
    }

    // Tentativa 2: Extrator Nativo Multi-Seguradoras (Local, sem custos)
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
      paginasLidas: paginasLidas || 1,
      motor: 'Nativo Multi-Seguradoras'
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

