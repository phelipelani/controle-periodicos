const pdfParse = require('pdf-parse');

/**
 * Normaliza textos para busca
 */
function cleanText(text) {
  if (!text) return '';
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
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
  return 'Allianz Seguros'; // Padrão
}

/**
 * Identifica o número da apólice
 */
function extrairNumeroApolice(texto) {
  const regexes = [
    /(?:Ap[oó]lice|AP[OÓ]LICE)\s*(?:n[º°.]?|número)?\s*[:.]?\s*([0-9A-Za-z.\-\/]{6,30})/i,
    /(?:Proposta|PROPOSTA)\s*(?:n[º°.]?|número)?\s*[:.]?\s*([0-9A-Za-z.\-\/]{6,30})/i,
    /(?:N[º°]\s*da\s*Ap[oó]lice)\s*[:.]?\s*([0-9A-Za-z.\-\/]{6,30})/i,
    /(?:Certificado)\s*(?:n[º°.]?|número)?\s*[:.]?\s*([0-9A-Za-z.\-\/]{6,30})/i
  ];

  for (const reg of regexes) {
    const match = texto.match(reg);
    if (match && match[1]) {
      const num = match[1].trim();
      if (!['DO', 'DE', 'DA', 'EMITIDA', 'NOVA', 'DIGITAL', 'SEGUROS'].includes(num.toUpperCase())) {
        return num;
      }
    }
  }
  return '';
}

/**
 * Extrai as datas de vigência (início e fim)
 */
function extrairVigencia(texto) {
  let inicio = null;
  let fim = null;

  const vigenciaRangeRegex = /(?:Vig[eê]ncia|VIG[EÊ]NCIA|Per[ií]odo\s*de\s*Vig[eê]ncia)[^\d\n\r]*(\d{2})[\/\.](\d{2})[\/\.](\d{4})[^\d\n\r]*(\d{2})[\/\.](\d{2})[\/\.](\d{4})/i;
  const matchRange = texto.match(vigenciaRangeRegex);
  if (matchRange) {
    inicio = formatarDataISO(matchRange[1], matchRange[2], matchRange[3]);
    fim = formatarDataISO(matchRange[4], matchRange[5], matchRange[6]);
    return { inicio, fim };
  }

  const inicioRegex = /(?:In[ií]cio\s*(?:da|de)?\s*Vig[eê]ncia|Das\s*24h00?\s*(?:de|do\s*dia)?)\s*[:.]?\s*(\d{2})[\/\.](\d{2})[\/\.](\d{4})/i;
  const fimRegex = /(?:Fim\s*(?:da|de)?\s*Vig[eê]ncia|T[eé]rmino\s*(?:da|de)?\s*Vig[eê]ncia|[Àa]s\s*24h00?\s*(?:de|do\s*dia)?|Validade)\s*[:.]?\s*(\d{2})[\/\.](\d{2})[\/\.](\d{4})/i;

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
function extrairCNPJ(texto) {
  const cnpjRegex = /\b(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\b/;
  const match = texto.match(cnpjRegex);
  return match ? match[1] : '';
}

/**
 * Extrai endereço do local segurado
 */
function extrairEndereco(texto) {
  const regexes = [
    /(?:Local\s*do\s*Risco|Endere[çc]o\s*do\s*Local\s*Segurado|Endere[çc]o\s*do\s*Risco|Local\s*Segurado)\s*[:.]?\s*([^\n\r]{10,120})/i,
    /(?:Endere[çc]o|Logradouro)\s*[:.]?\s*([^\n\r]{10,120})/i
  ];

  for (const reg of regexes) {
    const match = texto.match(reg);
    if (match && match[1]) {
      const end = match[1].trim().replace(/\s+/g, ' ');
      if (end.length > 5 && !end.toUpperCase().includes('CNPJ') && !end.toUpperCase().includes('APÓLICE')) {
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
    /(?:Limite\s*M[aá]ximo\s*de\s*Garantia|L\.?M\.?G\.?|Import[aâ]ncia\s*Segurada\s*Total|Valor\s*Total\s*Segurado)\s*[:.]?\s*R?\$?\s*([\d\.,]{5,20})/i,
    /(?:B[aá]sica\s*[-–]\s*Inc[eê]ndio|Inc[eê]ndio[^\n\r]*Explos[aã]o)[^\d\n\r]*R?\$?\s*([\d\.,]{5,20})/i
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
 * Extrai tabela de coberturas contratadas
 */
function extrairCoberturas(texto, lmgPadrao) {
  const coberturasPadrao = [
    {
      tipo: 'incendio',
      nome: 'Incêndio, Queda de Raio e Explosão',
      keywords: ['INCENDIO', 'INCÊNDIO', 'RAIO', 'EXPLOSAO', 'EXPLOSÃO', 'BASICA', 'BÁSICA'],
      valorDefault: lmgPadrao || 5000000
    },
    {
      tipo: 'danos_eletricos',
      nome: 'Danos Elétricos',
      keywords: ['DANOS ELETRICOS', 'DANOS ELÉTRICOS', 'ELETRICO', 'ELÉTRICO'],
      valorDefault: 100000
    },
    {
      tipo: 'vendaval',
      nome: 'Vendaval, Furação, Ciclone, Tornado e Granizo',
      keywords: ['VENDAVAL', 'GRANIZO', 'FURACAO', 'FURACÃO', 'TORNADO'],
      valorDefault: 100000
    },
    {
      tipo: 'rc_condominio',
      nome: 'Responsabilidade Civil Condomínio',
      keywords: ['RESPONSABILIDADE CIVIL CONDOMINIO', 'RESPONSABILIDADE CIVIL DO CONDOMINIO', 'RC CONDOMINIO', 'RC CONDOMÍNIO'],
      valorDefault: 200000
    },
    {
      tipo: 'rc_sindico',
      nome: 'Responsabilidade Civil Síndico',
      keywords: ['RC SINDICO', 'RC SÍNDICO', 'RESPONSABILIDADE CIVIL SINDICO', 'RESPONSABILIDADE CIVIL DO SINDICO'],
      valorDefault: 50000
    },
    {
      tipo: 'rc_portoes',
      nome: 'Responsabilidade Civil Portões',
      keywords: ['RC PORTOES', 'RC PORTÕES', 'PORTOES AUTOMATICOS', 'PORTÕES AUTOMÁTICOS'],
      valorDefault: 30000
    },
    {
      tipo: 'quebra_vidros',
      nome: 'Quebra de Vidros e Espelhos',
      keywords: ['QUEBRA DE VIDROS', 'VIDROS', 'ANUNCIOS LUMINOSOS'],
      valorDefault: 10000
    },
    {
      tipo: 'impacto_veiculos',
      nome: 'Impacto de Veículos Terrestres',
      keywords: ['IMPACTO DE VEICULOS', 'IMPACTO DE VEÍCULOS'],
      valorDefault: 50000
    },
    {
      tipo: 'perda_aluguel',
      nome: 'Perda ou Pagamento de Aluguel',
      keywords: ['PERDA DE ALUGUEL', 'PAGAMENTO DE ALUGUEL', 'PERDA/PAGAMENTO ALUGUEL'],
      valorDefault: 50000
    },
    {
      tipo: 'desmoronamento',
      nome: 'Desmoronamento',
      keywords: ['DESMORONAMENTO'],
      valorDefault: 100000
    },
    {
      tipo: 'alagamento',
      nome: 'Alagamento e Inundação',
      keywords: ['ALAGAMENTO', 'INUNDACAO', 'INUNDAÇÃO'],
      valorDefault: 50000
    },
    {
      tipo: 'vida_funcionarios',
      nome: 'Vida em Grupo / Acidentes Pessoais Funcionários',
      keywords: ['VIDA EM GRUPO', 'FUNCIONARIOS', 'EMPREGADOS', 'ACIDENTES PESSOAIS'],
      valorDefault: 50000
    }
  ];

  const upper = texto.toUpperCase();
  const coberturasDetectadas = [];

  for (const cob of coberturasPadrao) {
    let encontrada = false;
    for (const kw of cob.keywords) {
      if (upper.includes(kw)) {
        encontrada = true;
        break;
      }
    }

    if (encontrada || cob.tipo === 'incendio') {
      let valorSegurado = cob.valorDefault;
      
      for (const kw of cob.keywords) {
        const regexCob = new RegExp(`${kw}[^\\n\\r]*?R?\\$?\\s*([\\d\\.,]{4,15})`, 'i');
        const matchVal = texto.match(regexCob);
        if (matchVal && matchVal[1]) {
          const v = parseMoedaBR(matchVal[1]);
          if (v && v > 1000) {
            valorSegurado = v;
            break;
          }
        }
      }

      coberturasDetectadas.push({
        tipo: cob.tipo,
        nome_personalizado: cob.nome,
        valor_segurado: valorSegurado,
        valor_total_calculado: valorSegurado,
        preco_cobertura: null,
        franquia_percentual: cob.tipo.startsWith('rc') || cob.tipo === 'danos_eletricos' ? 10 : 0,
        franquia_reais: cob.tipo.startsWith('rc') || cob.tipo === 'danos_eletricos' ? 1000 : 0,
        sem_franquia: cob.tipo === 'incendio' ? 1 : 0
      });
    }
  }

  return coberturasDetectadas;
}

/**
 * Função principal para processar o buffer do PDF da apólice
 */
async function extrairDadosApolicePDF(pdfBuffer) {
  try {
    const data = await pdfParse(pdfBuffer);
    const textoBruto = data.text || '';
    const texto = cleanText(textoBruto);

    const seguradora = identificarSeguradora(texto);
    const numeroApolice = extrairNumeroApolice(texto);
    const vigencia = extrairVigencia(texto);
    const cnpj = extrairCNPJ(texto);
    const endereco = extrairEndereco(texto);
    const lmg = extrairLMG(texto);
    const coberturas = extrairCoberturas(texto, lmg);

    return {
      sucesso: true,
      seguradora,
      corretora: 'Setor Seguros',
      numero_apolice: numeroApolice,
      tipo_seguro: `Renovação ${seguradora.split(' ')[0]}`,
      produto_ramo: '16 - Condomínio',
      modalidade: 'Simples',
      limite_maximo_garantia: lmg,
      vigencia_inicio: vigencia.inicio || null,
      vigencia_fim: vigencia.fim || null,
      cnpj: cnpj || null,
      endereco_local_segurado: endereco || null,
      coberturas,
      paginasLidas: data.numpages || 1
    };
  } catch (err) {
    console.error('[apoliceParser] Erro ao extrair PDF:', err);
    throw new Error(`Falha ao ler o arquivo PDF: ${err.message}`);
  }
}

module.exports = {
  extrairDadosApolicePDF
};
