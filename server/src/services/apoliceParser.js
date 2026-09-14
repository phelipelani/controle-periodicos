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
  if (upper.includes('LIBERTY') || upper.includes('YELUM')) {
    return 'Yelum Seguros';
  }
  return 'Allianz Seguros';
}

/**
 * Identifica a corretora a partir do texto.
 * Regra: Se a apólice contiver SETOR SEGUROS / SETOR CORRETORA, é 'Setor Seguros'.
 * Qualquer outro corretor (Ítalo, Direto, etc.) é classificado como 'Síndico'.
 */
function identificarCorretora(texto) {
  const upper = texto.toUpperCase();
  
  // Procura por seção de corretor no texto
  const idxCorretor = upper.search(/(?:CORRETOR|CORRETORA|INTERMEDI[AÁ]RIO|DADOS\s+DO\s+CORRETOR)/i);
  if (idxCorretor !== -1) {
    const trechoCorretor = upper.slice(idxCorretor, idxCorretor + 400);
    if (trechoCorretor.includes('SETOR') || trechoCorretor.includes('SETOR SEGUROS') || trechoCorretor.includes('SETOR CORRETORA')) {
      return 'Setor Seguros';
    }
    return 'Síndico';
  }

  // Busca global por Setor Seguros
  if (upper.includes('SETOR SEGUROS') || upper.includes('SETOR CORRETORA') || upper.includes('SETOR CONSULTORIA')) {
    return 'Setor Seguros';
  }

  // Padrão para terceiros / outros corretores
  return 'Síndico';
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
      if (!['DO', 'DE', 'DA', 'EMITIDA', 'NOVA', 'DIGITAL', 'SEGUROS', 'CONDOMÍNIO', 'CONDOMINIO'].includes(num.toUpperCase())) {
        return num;
      }
    }
  }
  return '';
}

/**
 * Extrai as datas de vigência (início e fim)
 * Suporta formatos:
 * - "Vigência: das 24H de 17/12/2025 às 24H de 17/12/2026"
 * - "Vigência: 17/12/2025 a 17/12/2026"
 * - "Início da vigência: 17/12/2025 Término: 17/12/2026"
 */
function extrairVigencia(texto) {
  let inicio = null;
  let fim = null;

  // 1. Linha de vigência com 2 datas (ex: "Vigência: das 24H de 17/12/2025 às 24H de 17/12/2026")
  const regexLinhaVigencia = /(?:Vig[eê]ncia|Per[ií]odo\s*de\s*Vig[eê]ncia)[^\n\r]*?(\d{2})[\/\.](\d{2})[\/\.](\d{4})[^\n\r]*?(\d{2})[\/\.](\d{2})[\/\.](\d{4})/i;
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
    const trecho = texto.slice(idxVig, idxVig + 250);
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
function extrairCNPJ(texto) {
  // Se houver seção de Segurado, buscar o CNPJ dessa seção
  const idxSegurado = texto.search(/(?:SEGURADO|DADOS\s+DO\s+SEGURADO|ESTIPULANTE|TOMADOR)/i);
  if (idxSegurado !== -1) {
    const trecho = texto.slice(idxSegurado, idxSegurado + 300);
    const m = trecho.match(/\b(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\b/);
    if (m) return m[1];
  }

  const cnpjRegex = /\b(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\b/;
  const match = texto.match(cnpjRegex);
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
    /Limite\s*M[aá]ximo\s*de\s*Garantia\s*(?:da\s*Ap[oó]lice)?\s*[:.]?\s*R?\$?\s*([\d\.,]{5,20})/i,
    /(?:L\.?M\.?G\.?|Import[aâ]ncia\s*Segurada\s*Total|Valor\s*Total\s*Segurado)\s*[:.]?\s*R?\$?\s*([\d\.,]{5,20})/i,
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
  const match = texto.match(/Quantidade\s*de\s*Andares\s*:\s*([^\n\r]+)/i);
  if (match) {
    return match[1].trim();
  }
  return '6 a 10 Andares';
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

async function extrairDadosApolicePDF(pdfBuffer) {
  try {
    let textoBruto = '';
    let paginasLidas = 1;

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
    } else {
      throw new Error('Módulo de leitura de PDF indisponível.');
    }

    const texto = cleanText(textoBruto);

    const seguradora = identificarSeguradora(texto);
    const corretora = identificarCorretora(texto);
    const numeroApolice = extrairNumeroApolice(texto);
    const vigencia = extrairVigencia(texto);
    const cnpj = extrairCNPJ(texto);
    const endereco = extrairEndereco(texto);
    const lmg = extrairLMG(texto);
    const elevadores = extrairElevadores(texto);
    const andares = extrairAndares(texto);
    const blocos = extrairBlocos(texto);
    const idade = extrairIdadeCondominio(texto);
    const categoriaRisco = extrairCategoriaRisco(texto);
    const tipoSeguro = extrairTipoSeguro(texto, seguradora);
    const { produto: produtoRamo, modalidade } = extrairProdutoModalidade(texto);
    const condicoesGerais = extrairCondicoesGerais(texto);
    const versaoTabela = extrairVersaoTabela(texto);
    const valorDeNovo = extrairValorDeNovo(texto);
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
      cnpj: cnpj || null,
      endereco_local_segurado: endereco || null,
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
  extrairCoberturas
};
