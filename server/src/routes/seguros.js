const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../db');
const { exigirAdmin } = require('../auth');
const {
  ehAdmin,
  ehCorretora,
  podeEditarDadosCadastrais,
  podeAcessarCondominio,
  podeAcessarServico,
  filtroEscopo,
  registrarAuditoriaDetalhada
} = require('../acesso');

const router = express.Router();

function calcularStatusSeguro(dataValidade) {
  if (!dataValidade) return { status: 'sem_registro', diasRestantes: null };
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const [y, m, d] = dataValidade.split('-').map(Number);
  const dataAlvo = new Date(y, m - 1, d);
  dataAlvo.setHours(0, 0, 0, 0);

  const diffMs = dataAlvo.getTime() - hoje.getTime();
  const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diasRestantes < 0) return { status: 'vencido', diasRestantes };
  if (diasRestantes <= 30) return { status: 'a_vencer', diasRestantes };
  return { status: 'ativo', diasRestantes };
}

// Configuração de armazenamento organizado em nuvem/disco:
// adm/seguros/[ano]/[codigo_condominio]/[arquivo]
function getStoragePathSeguros(ano, codigoCondominio) {
  const dataDir = process.env.DB_DIR || path.join(__dirname, '../../data');
  const dir = path.join(dataDir, 'adm', 'seguros', String(ano), String(codigoCondominio).padStart(3, '0'));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

const storageSeguros = multer.diskStorage({
  destination: function (req, file, cb) {
    try {
      const ano = req.body.ano || new Date().getFullYear();
      const codigoCondominio = req.body.codigo_condominio || String(req.params.condominioId).padStart(3, '0');
      const dir = getStoragePathSeguros(ano, codigoCondominio);
      cb(null, dir);
    } catch (err) {
      cb(err, null);
    }
  },
  filename: function (req, file, cb) {
    const ano = req.body.ano || new Date().getFullYear();
    const tipo = (req.body.tipo || 'documento').toLowerCase().replace(/\s+/g, '_');
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now().toString().slice(-4);
    cb(null, `${tipo}_${ano}_${uniqueSuffix}${ext}`);
  }
});

const uploadSeguros = multer({ storage: storageSeguros, limits: { fileSize: 25 * 1024 * 1024 } });
const uploadMemoria = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } });
const { extrairDadosApolicePDF } = require('../services/apoliceParser');

// ============================================================
// 0. POST /api/seguros/extrair-pdf - Leitura e parsing de apólice em PDF
// ============================================================
router.post('/extrair-pdf', uploadMemoria.single('apolice_pdf'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ erro: 'Nenhum arquivo PDF fornecido para extração.' });
    }

    const resultado = await extrairDadosApolicePDF(req.file.buffer);
    res.json(resultado);
  } catch (err) {
    console.error('[POST /extrair-pdf] Erro ao processar:', err);
    res.status(500).json({ erro: err.message || 'Erro ao extrair informações da apólice.' });
  }
});

// ============================================================
// 1. GET /api/seguros - Listagem operacional + KPIs + Filtros
// ============================================================
router.get('/', (req, res) => {
  if (!podeAcessarServico(req.usuario, 'seguro')) {
    return res.status(403).json({ erro: 'Acesso negado ao módulo de Seguros.' });
  }

  const escopo = filtroEscopo(req.usuario, 'c.id', 'seguro');

  const condominios = db
    .prepare(`
      SELECT 
        c.id AS condominio_id,
        c.nome AS condominio_nome,
        c.endereco AS condominio_endereco,
        c.cnpj,
        c.quantidade_apartamentos,
        c.tipo AS condominio_tipo,
        c.tem_elevador,
        c.tem_portao_automatico,
        c.quantidade_funcionarios,
        c.gerente_id,
        g.nome AS gerente_nome,
        s.id AS seguro_id,
        s.seguradora,
        s.corretora,
        s.numero_apolice,
        s.data_renovacao,
        s.data_validade,
        s.status AS seguro_status_db,
        s.observacoes,
        s.atualizado_em,
        u_att.nome AS atualizado_por_nome
      FROM condominios c
      LEFT JOIN usuarios g ON g.id = c.gerente_id
      LEFT JOIN seguros s ON s.condominio_id = c.id
      LEFT JOIN usuarios u_att ON u_att.id = s.atualizado_por
      WHERE ${escopo.sql}
      ORDER BY c.id ASC
    `)
    .all(...escopo.params);

  // Buscar último documento de apólice por condomínio
  const docsApolice = db
    .prepare(`
      SELECT sd.seguro_id, sd.nome_arquivo, sd.caminho, sd.tamanho, sd.criado_em
      FROM seguro_documentos sd
      WHERE sd.tipo = 'Apólice' OR sd.tipo = 'apolice'
      ORDER BY sd.id DESC
    `)
    .all();

  const apolicePorSeguro = {};
  for (const doc of docsApolice) {
    if (!apolicePorSeguro[doc.seguro_id]) {
      apolicePorSeguro[doc.seguro_id] = doc;
    }
  }

  // Buscar contagem e último sinistro
  const sinistros = db
    .prepare(`
      SELECT ss.seguro_id, ss.id, ss.data, ss.cobertura_acionada, ss.status, ss.valor_reclamado, ss.descricao
      FROM seguro_sinistros ss
      ORDER BY ss.data DESC, ss.id DESC
    `)
    .all();

  const sinistroRecentePorSeguro = {};
  const qtdSinistrosPorSeguro = {};
  for (const sin of sinistros) {
    if (!sinistroRecentePorSeguro[sin.seguro_id]) {
      sinistroRecentePorSeguro[sin.seguro_id] = sin;
    }
    qtdSinistrosPorSeguro[sin.seguro_id] = (qtdSinistrosPorSeguro[sin.seguro_id] || 0) + 1;
  }

  // Buscar listas de seguradoras e corretoras distintas para preenchimento de filtros
  const seguradorasSet = new Set();
  const corretorasSet = new Set();

  const lista = condominios.map((c) => {
    if (c.seguradora) seguradorasSet.add(c.seguradora);
    if (c.corretora) corretorasSet.add(c.corretora);

    const { status, diasRestantes } = calcularStatusSeguro(c.data_validade);

    return {
      id: c.condominio_id,
      condominioId: c.condominio_id,
      seguroId: c.seguro_id || null,
      codigo: String(c.condominio_id).padStart(3, '0'),
      condominio: c.condominio_nome,
      endereco: c.condominio_endereco,
      cnpj: c.cnpj || '',
      quantidadeApartamentos: c.quantidade_apartamentos || 0,
      tipo: c.condominio_tipo || 'Vertical',
      temElevador: c.tem_elevador === 1 || c.tem_elevador === null,
      temPortaoAutomatico: c.tem_portao_automatico === 1 || c.tem_portao_automatico === null,
      quantidadeFuncionarios: c.quantidade_funcionarios || 0,
      gerenteId: c.gerente_id,
      gerente: c.gerente_nome || 'Sem gerente',
      seguradora: c.seguradora || '—',
      corretora: c.corretora || '—',
      numeroApolice: c.numero_apolice || '—',
      dataRenovacao: c.data_renovacao || null,
      dataValidade: c.data_validade || null,
      status,
      diasRestantes,
      observacoes: c.observacoes || '',
      atualizadoEm: c.atualizado_em || null,
      atualizadoPor: c.atualizado_por_nome || 'Administração',
      documentoApolice: apolicePorSeguro[c.seguro_id] || null,
      ultimoSinistro: sinistroRecentePorSeguro[c.seguro_id] || null,
      totalSinistros: qtdSinistrosPorSeguro[c.seguro_id] || 0
    };
  });

  // KPIs
  const total = lista.length;
  const ativos = lista.filter((s) => s.status === 'ativo').length;
  const aVencer = lista.filter((s) => s.status === 'a_vencer').length;
  const vencidos = lista.filter((s) => s.status === 'vencido').length;
  const semRegistro = lista.filter((s) => s.status === 'sem_registro').length;

  const percentualAtivos = total > 0 ? ((ativos / total) * 100).toFixed(1).replace('.', ',') : '0,0';

  const kpis = {
    totalCondominios: total,
    segurosAtivos: ativos,
    percentualAtivos: `${percentualAtivos}% dos condomínios`,
    proximosVencer: aVencer,
    segurosVencidos: vencidos,
    semRegistro
  };

  res.json({
    seguros: lista,
    kpis,
    seguradoras: Array.from(seguradorasSet).sort(),
    corretoras: Array.from(corretorasSet).sort()
  });
});

// ============================================================
// 2. GET /api/seguros/:condominioId - Ficha completa do seguro
// ============================================================
router.get('/:condominioId', (req, res) => {
  const condominioId = Number(req.params.condominioId);
  if (!podeAcessarCondominio(req.usuario, condominioId)) {
    return res.status(403).json({ erro: 'Acesso negado a este condomínio.' });
  }

  const cond = db
    .prepare(`
      SELECT 
        c.id, c.nome, c.endereco, c.cnpj, c.email, c.telefone,
        c.endereco_correspondencia, c.bairro, c.cep, c.cidade, c.uf,
        c.quantidade_apartamentos, c.tipo, c.tem_elevador, c.tem_portao_automatico,
        c.quantidade_funcionarios, c.quantidade_andares, c.quantidade_blocos, c.idade_condominio,
        c.gerente_id, g.nome AS gerente_nome
      FROM condominios c
      LEFT JOIN usuarios g ON g.id = c.gerente_id
      WHERE c.id = ?
    `)
    .get(condominioId);

  if (!cond) {
    return res.status(404).json({ erro: 'Condomínio não encontrado.' });
  }

  const seguro = db
    .prepare(`
      SELECT 
        s.*, u.nome AS atualizado_por_nome
      FROM seguros s
      LEFT JOIN usuarios u ON u.id = s.atualizado_por
      WHERE s.condominio_id = ?
    `)
    .get(condominioId);

  let coberturas = [];
  let sinistros = [];
  let documentos = [];

  if (seguro) {
    coberturas = db
      .prepare('SELECT * FROM seguro_coberturas WHERE seguro_id = ? ORDER BY id ASC')
      .all(seguro.id);

    sinistros = db
      .prepare(`
        SELECT ss.*, u.nome AS registrado_por_nome
        FROM seguro_sinistros ss
        LEFT JOIN usuarios u ON u.id = ss.registrado_por
        WHERE ss.seguro_id = ?
        ORDER BY ss.data DESC, ss.id DESC
      `)
      .all(seguro.id);

    documentos = db
      .prepare(`
        SELECT sd.*, u.nome AS uploaded_by_nome
        FROM seguro_documentos sd
        LEFT JOIN usuarios u ON u.id = sd.uploaded_by
        WHERE sd.seguro_id = ?
        ORDER BY sd.criado_em DESC
      `)
      .all(seguro.id);
  }

  // Buscar logs de auditoria detalhados deste seguro/condomínio
  const auditoria = db
    .prepare(`
      SELECT 
        id, usuario_nome, papel, acao, campo, valor_anterior, valor_novo, detalhes, criado_em
      FROM auditoria
      WHERE (entidade = 'seguros' AND entidade_id = ?) 
         OR (entidade = 'condominios' AND entidade_id = ?)
      ORDER BY id DESC
      LIMIT 100
    `)
    .all(seguro?.id || 0, condominioId);

  const { status, diasRestantes } = calcularStatusSeguro(seguro?.data_validade || seguro?.vigencia_fim);

  res.json({
    condominio: {
      id: cond.id,
      codigo: String(cond.id).padStart(3, '0'),
      nome: cond.nome,
      endereco: cond.endereco,
      cnpj: cond.cnpj || '',
      email: cond.email || '',
      telefone: cond.telefone || '',
      enderecoCorrespondencia: cond.endereco_correspondencia || cond.endereco || '',
      bairro: cond.bairro || '',
      cep: cond.cep || '',
      cidade: cond.cidade || 'Caraguatatuba',
      uf: cond.uf || 'SP',
      quantidadeApartamentos: cond.quantidade_apartamentos || 0,
      tipo: cond.tipo || 'Vertical',
      temElevador: cond.tem_elevador === 1 || cond.tem_elevador === null,
      temPortaoAutomatico: cond.tem_portao_automatico === 1 || cond.tem_portao_automatico === null,
      quantidadeFuncionarios: cond.quantidade_funcionarios || 0,
      quantidadeAndares: cond.quantidade_andares || '6 a 10 Andares',
      quantidadeBlocos: cond.quantidade_blocos || 1,
      idadeCondominio: cond.idade_condominio || 'Acima de 30 anos',
      gerenteId: cond.gerente_id,
      gerente: cond.gerente_nome || 'Sem gerente'
    },
    apolice: seguro
      ? {
          id: seguro.id,
          seguradora: seguro.seguradora || '',
          corretora: seguro.corretora || '',
          numeroApolice: seguro.numero_apolice || '',
          dataRenovacao: seguro.data_renovacao || null,
          dataValidade: seguro.data_validade || null,
          enderecoLocalSegurado: seguro.endereco_local_segurado || cond.endereco || '',
          idadeCondominio: seguro.idade_condominio || cond.idade_condominio || 'Acima de 30 anos',
          quantidadeAndares: seguro.quantidade_andares || cond.quantidade_andares || '6 a 10 Andares',
          quantidadeElevadores: seguro.quantidade_elevadores != null ? seguro.quantidade_elevadores : (cond.tem_elevador ? 1 : 0),
          quantidadeBlocos: seguro.quantidade_blocos != null ? seguro.quantidade_blocos : (cond.quantidade_blocos || 1),
          categoriaRisco: seguro.categoria_risco || 'Apenas Residencial',
          tipoSeguro: seguro.tipo_seguro || `Renovação ${seguro.seguradora || 'Allianz'}`,
          produtoRamo: seguro.produto_ramo || '16 - Condomínio',
          modalidade: seguro.modalidade || 'Simples',
          condicoesGerais: seguro.condicoes_gerais || '04/2025',
          limiteMaximoGarantia: seguro.limite_maximo_garantia || 5220000,
          versaoTabela: seguro.versao_tabela || '34',
          valorDeNovo: seguro.valor_de_novo === 1 || seguro.valor_de_novo === null,
          vigenciaInicio: seguro.vigencia_inicio || seguro.data_renovacao || null,
          vigenciaFim: seguro.vigencia_fim || seguro.data_validade || null,
          coberturaPorUnidade: seguro.cobertura_por_unidade || 300000,
          status,
          diasRestantes,
          observacoes: seguro.observacoes || '',
          atualizadoEm: seguro.atualizado_em,
          atualizadoPor: seguro.atualizado_por_nome || 'Administração'
        }
      : {
          id: null,
          seguradora: '',
          corretora: '',
          numeroApolice: '',
          dataRenovacao: null,
          dataValidade: null,
          enderecoLocalSegurado: cond.endereco || '',
          idadeCondominio: 'Acima de 30 anos',
          quantidadeAndares: '6 a 10 Andares',
          quantidadeElevadores: 1,
          quantidadeBlocos: 1,
          categoriaRisco: 'Apenas Residencial',
          tipoSeguro: 'Renovação',
          produtoRamo: '16 - Condomínio',
          modalidade: 'Simples',
          condicoesGerais: '04/2025',
          limiteMaximoGarantia: 5220000,
          versaoTabela: '34',
          valorDeNovo: true,
          vigenciaInicio: null,
          vigenciaFim: null,
          coberturaPorUnidade: 300000,
          status: 'sem_registro',
          diasRestantes: null,
          observacoes: '',
          atualizadoEm: null,
          atualizadoPor: '—'
        },
    coberturas,
    sinistros,
    documentos,
    auditoria
  });
});

// ============================================================
// 3. POST /api/seguros - Salvar / Atualizar seguro com permissões e auditoria
// ============================================================
router.post('/', (req, res) => {
  const {
    condominio_id,
    condominio_dados = {},
    apolice_dados = {},
    coberturas = []
  } = req.body || {};

  if (!condominio_id) {
    return res.status(400).json({ erro: 'Condomínio é obrigatório.' });
  }

  const condId = Number(condominio_id);
  if (!podeAcessarCondominio(req.usuario, condId)) {
    return res.status(403).json({ erro: 'Acesso negado a este condomínio.' });
  }

  const ehUsuarioCorretora = ehCorretora(req.usuario);
  const podeEditarCadastrais = podeEditarDadosCadastrais(req.usuario);

  const alteracoesAuditoria = [];

  const salvarTransacao = db.transaction(() => {
    // 1. Atualizar dados cadastrais do condomínio se o usuário tiver permissão
    if (podeEditarCadastrais && Object.keys(condominio_dados).length > 0) {
      const condAtual = db.prepare('SELECT * FROM condominios WHERE id = ?').get(condId);

      if (condAtual) {
        // Log de campos cadastrais
        const camposCadastrais = [
          { key: 'cnpj', label: 'CNPJ' },
          { key: 'email', label: 'E-mail' },
          { key: 'telefone', label: 'Telefone' },
          { key: 'endereco_correspondencia', label: 'Endereço de correspondência' },
          { key: 'bairro', label: 'Bairro' },
          { key: 'cep', label: 'CEP' },
          { key: 'cidade', label: 'Cidade' },
          { key: 'uf', label: 'UF' },
          { key: 'quantidade_apartamentos', label: 'Qtd. apartamentos' },
          { key: 'tipo', label: 'Tipo de condomínio' },
          { key: 'tem_elevador', label: 'Elevador' },
          { key: 'tem_portao_automatico', label: 'Portão automático' },
          { key: 'quantidade_funcionarios', label: 'Qtd. funcionários' },
          { key: 'gerente_id', label: 'Gerente responsável' }
        ];

        for (const f of camposCadastrais) {
          if (condominio_dados[f.key] !== undefined && String(condominio_dados[f.key]) !== String(condAtual[f.key])) {
            alteracoesAuditoria.push({
              campo: f.label,
              anterior: condAtual[f.key] ?? 'Não informado',
              novo: condominio_dados[f.key] ?? 'Não informado'
            });
          }
        }

        db.prepare(`
          UPDATE condominios
          SET cnpj = COALESCE(?, cnpj),
              email = COALESCE(?, email),
              telefone = COALESCE(?, telefone),
              endereco_correspondencia = COALESCE(?, endereco_correspondencia),
              bairro = COALESCE(?, bairro),
              cep = COALESCE(?, cep),
              cidade = COALESCE(?, cidade),
              uf = COALESCE(?, uf),
              quantidade_apartamentos = COALESCE(?, quantidade_apartamentos),
              tipo = COALESCE(?, tipo),
              tem_elevador = COALESCE(?, tem_elevador),
              tem_portao_automatico = COALESCE(?, tem_portao_automatico),
              quantidade_funcionarios = COALESCE(?, quantidade_funcionarios),
              quantidade_andares = COALESCE(?, quantidade_andares),
              quantidade_blocos = COALESCE(?, quantidade_blocos),
              idade_condominio = COALESCE(?, idade_condominio),
              gerente_id = COALESCE(?, gerente_id)
          WHERE id = ?
        `).run(
          condominio_dados.cnpj !== undefined ? condominio_dados.cnpj : null,
          condominio_dados.email !== undefined ? condominio_dados.email : null,
          condominio_dados.telefone !== undefined ? condominio_dados.telefone : null,
          condominio_dados.endereco_correspondencia !== undefined ? condominio_dados.endereco_correspondencia : null,
          condominio_dados.bairro !== undefined ? condominio_dados.bairro : null,
          condominio_dados.cep !== undefined ? condominio_dados.cep : null,
          condominio_dados.cidade !== undefined ? condominio_dados.cidade : null,
          condominio_dados.uf !== undefined ? condominio_dados.uf : null,
          condominio_dados.quantidade_apartamentos !== undefined ? Number(condominio_dados.quantidade_apartamentos) : null,
          condominio_dados.tipo !== undefined ? condominio_dados.tipo : null,
          condominio_dados.tem_elevador !== undefined ? (condominio_dados.tem_elevador ? 1 : 0) : null,
          condominio_dados.tem_portao_automatico !== undefined ? (condominio_dados.tem_portao_automatico ? 1 : 0) : null,
          condominio_dados.quantidade_funcionarios !== undefined ? Number(condominio_dados.quantidade_funcionarios) : null,
          condominio_dados.quantidade_andares !== undefined ? condominio_dados.quantidade_andares : null,
          condominio_dados.quantidade_blocos !== undefined ? Number(condominio_dados.quantidade_blocos) : null,
          condominio_dados.idade_condominio !== undefined ? condominio_dados.idade_condominio : null,
          condominio_dados.gerente_id !== undefined ? Number(condominio_dados.gerente_id) : null,
          condId
        );
      }
    }

    // 2. Salvar ou atualizar tabela `seguros`
    const seguroAtual = db.prepare('SELECT * FROM seguros WHERE condominio_id = ?').get(condId);
    let seguroId;

    const {
      seguradora,
      corretora,
      numero_apolice,
      data_renovacao,
      data_validade,
      endereco_local_segurado,
      idade_condominio,
      quantidade_andares,
      quantidade_elevadores,
      quantidade_blocos,
      categoria_risco,
      tipo_seguro,
      produto_ramo,
      modalidade,
      condicoes_gerais,
      limite_maximo_garantia,
      versao_tabela,
      valor_de_novo,
      vigencia_inicio,
      vigencia_fim,
      cobertura_por_unidade,
      observacoes
    } = apolice_dados;

    const dtValidadeFinal = data_validade || vigencia_fim;
    const { status: statusCalculado } = calcularStatusSeguro(dtValidadeFinal);

    if (seguroAtual) {
      seguroId = seguroAtual.id;

      // Log de alterações de apólice
      const camposApolice = [
        { key: 'seguradora', label: 'Seguradora', val: seguradora },
        { key: 'corretora', label: 'Corretora', val: corretora },
        { key: 'numero_apolice', label: 'Nº da apólice', val: numero_apolice },
        { key: 'data_renovacao', label: 'Data de renovação', val: data_renovacao },
        { key: 'data_validade', label: 'Data de validade', val: dtValidadeFinal },
        { key: 'cobertura_por_unidade', label: 'Cobertura por unidade', val: cobertura_por_unidade }
      ];

      for (const item of camposApolice) {
        if (item.val !== undefined && String(item.val || '') !== String(seguroAtual[item.key] || '')) {
          alteracoesAuditoria.push({
            campo: item.label,
            anterior: seguroAtual[item.key] || '—',
            novo: item.val || '—'
          });
        }
      }

      db.prepare(`
        UPDATE seguros
        SET seguradora = ?,
            corretora = ?,
            numero_apolice = ?,
            data_renovacao = ?,
            data_validade = ?,
            endereco_local_segurado = ?,
            idade_condominio = ?,
            quantidade_andares = ?,
            quantidade_elevadores = ?,
            quantidade_blocos = ?,
            categoria_risco = ?,
            tipo_seguro = ?,
            produto_ramo = ?,
            modalidade = ?,
            condicoes_gerais = ?,
            limite_maximo_garantia = ?,
            versao_tabela = ?,
            valor_de_novo = ?,
            vigencia_inicio = ?,
            vigencia_fim = ?,
            cobertura_por_unidade = ?,
            status = ?,
            observacoes = ?,
            atualizado_em = datetime('now'),
            atualizado_por = ?
        WHERE id = ?
      `).run(
        seguradora || null,
        corretora || null,
        numero_apolice || null,
        data_renovacao || null,
        dtValidadeFinal || null,
        endereco_local_segurado || null,
        idade_condominio || null,
        quantidade_andares || null,
        quantidade_elevadores != null ? Number(quantidade_elevadores) : null,
        quantidade_blocos != null ? Number(quantidade_blocos) : null,
        categoria_risco || null,
        tipo_seguro || null,
        produto_ramo || null,
        modalidade || null,
        condicoes_gerais || null,
        limite_maximo_garantia != null ? Number(limite_maximo_garantia) : null,
        versao_tabela || null,
        valor_de_novo ? 1 : 0,
        vigencia_inicio || data_renovacao || null,
        vigencia_fim || dtValidadeFinal || null,
        cobertura_por_unidade != null ? Number(cobertura_por_unidade) : null,
        statusCalculado,
        observacoes || null,
        req.usuario.id,
        seguroId
      );
    } else {
      const info = db.prepare(`
        INSERT INTO seguros (
          condominio_id, seguradora, corretora, numero_apolice,
          data_renovacao, data_validade, endereco_local_segurado,
          idade_condominio, quantidade_andares, quantidade_elevadores,
          quantidade_blocos, categoria_risco, tipo_seguro, produto_ramo,
          modalidade, condicoes_gerais, limite_maximo_garantia,
          versao_tabela, valor_de_novo, vigencia_inicio, vigencia_fim,
          cobertura_por_unidade, status, observacoes, criado_em, atualizado_em, atualizado_por
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?)
      `).run(
        condId,
        seguradora || null,
        corretora || null,
        numero_apolice || null,
        data_renovacao || null,
        dtValidadeFinal || null,
        endereco_local_segurado || null,
        idade_condominio || null,
        quantidade_andares || null,
        quantidade_elevadores != null ? Number(quantidade_elevadores) : null,
        quantidade_blocos != null ? Number(quantidade_blocos) : null,
        categoria_risco || null,
        tipo_seguro || null,
        produto_ramo || null,
        modalidade || null,
        condicoes_gerais || null,
        limite_maximo_garantia != null ? Number(limite_maximo_garantia) : null,
        versao_tabela || null,
        valor_de_novo ? 1 : 0,
        vigencia_inicio || data_renovacao || null,
        vigencia_fim || dtValidadeFinal || null,
        cobertura_por_unidade != null ? Number(cobertura_por_unidade) : null,
        statusCalculado,
        observacoes || null,
        req.usuario.id
      );
      seguroId = info.lastInsertRowid;

      alteracoesAuditoria.push({
        campo: 'Criação do Seguro',
        anterior: 'Sem apólice',
        novo: `Apólice ${numero_apolice || 'Sem número'} (${seguradora || 'Sem seguradora'})`
      });
    }

    // 3. Atualizar coberturas
    if (Array.isArray(coberturas) && coberturas.length > 0) {
      db.prepare('DELETE FROM seguro_coberturas WHERE seguro_id = ?').run(seguroId);

      const insertCob = db.prepare(`
        INSERT INTO seguro_coberturas (
          seguro_id, tipo, nome_personalizado, valor_por_imovel,
          quantidade_imoveis, valor_segurado, valor_total_calculado,
          preco_cobertura, franquia_percentual, franquia_reais, sem_franquia, criado_em
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);

      for (const cob of coberturas) {
        if (!cob.tipo) continue;

        let totalCalculado = 0;
        const valorPorImovel = cob.valor_por_imovel != null ? Number(cob.valor_por_imovel) : null;
        const qtdImoveis = cob.quantidade_imoveis != null ? Number(cob.quantidade_imoveis) : null;
        const valorSegurado = cob.valor_segurado != null ? Number(cob.valor_segurado) : null;

        if (valorPorImovel && qtdImoveis) {
          totalCalculado = valorPorImovel * qtdImoveis;
        } else if (valorSegurado) {
          totalCalculado = valorSegurado;
        } else if (cob.valor_total_calculado) {
          totalCalculado = Number(cob.valor_total_calculado);
        }

        insertCob.run(
          seguroId,
          cob.tipo,
          cob.nome_personalizado || null,
          valorPorImovel,
          qtdImoveis,
          valorSegurado,
          totalCalculado,
          cob.preco_cobertura != null ? Number(cob.preco_cobertura) : null,
          cob.franquia_percentual != null ? Number(cob.franquia_percentual) : null,
          cob.franquia_reais != null ? Number(cob.franquia_reais) : null,
          cob.sem_franquia ? 1 : 0
        );
      }
    }

    // 4. Sincronizar com condominio_servicos para a chave 'seguro'
    const servicoSeguro = db.prepare("SELECT id FROM servicos WHERE chave = 'seguro'").get();
    if (servicoSeguro) {
      const csExistente = db.prepare(`
        SELECT id FROM condominio_servicos WHERE condominio_id = ? AND servico_id = ?
      `).get(condId, servicoSeguro.id);

      if (csExistente) {
        db.prepare(`
          UPDATE condominio_servicos
          SET ultima_realizacao = ?,
              data_vencimento = ?,
              observacoes = ?
          WHERE id = ?
        `).run(
          data_renovacao || null,
          dtValidadeFinal || null,
          observacoes || null,
          csExistente.id
        );
      } else {
        db.prepare(`
          INSERT INTO condominio_servicos (
            condominio_id, servico_id, ultima_realizacao, data_vencimento, observacoes
          ) VALUES (?, ?, ?, ?, ?)
        `).run(
          condId,
          servicoSeguro.id,
          data_renovacao || null,
          dtValidadeFinal || null,
          observacoes || null
        );
      }
    }

    return seguroId;
  });

  try {
    const id = salvarTransacao();
    if (alteracoesAuditoria.length > 0) {
      registrarAuditoriaDetalhada(req, 'seguros', id, 'EDITAR_SEGURO', alteracoesAuditoria);
    }
    res.json({ ok: true, id });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao salvar seguro: ' + err.message });
  }
});

// ============================================================
// 4. POST /api/seguros/:condominioId/renovar - Renovar apólice
// ============================================================
router.post('/:condominioId/renovar', (req, res) => {
  const condId = Number(req.params.condominioId);
  if (!podeAcessarCondominio(req.usuario, condId)) {
    return res.status(403).json({ erro: 'Acesso negado a este condomínio.' });
  }

  const { nova_apolice, nova_data_renovacao, nova_data_validade, seguradora, corretora } = req.body || {};

  try {
    const seguroAtual = db.prepare('SELECT * FROM seguros WHERE condominio_id = ?').get(condId);
    if (!seguroAtual) {
      return res.status(404).json({ erro: 'Nenhum seguro encontrado para renovar.' });
    }

    const { status: novoStatus } = calcularStatusSeguro(nova_data_validade);

    db.prepare(`
      UPDATE seguros
      SET numero_apolice = COALESCE(?, numero_apolice),
          data_renovacao = COALESCE(?, data_renovacao),
          data_validade = COALESCE(?, data_validade),
          seguradora = COALESCE(?, seguradora),
          corretora = COALESCE(?, corretora),
          status = ?,
          atualizado_em = datetime('now'),
          atualizado_por = ?
      WHERE id = ?
    `).run(
      nova_apolice || null,
      nova_data_renovacao || null,
      nova_data_validade || null,
      seguradora || null,
      corretora || null,
      novoStatus,
      req.usuario.id,
      seguroAtual.id
    );

    // Sincronizar com condominio_servicos e histórico
    const servicoSeguro = db.prepare("SELECT id FROM servicos WHERE chave = 'seguro'").get();
    if (servicoSeguro) {
      const cs = db.prepare('SELECT id FROM condominio_servicos WHERE condominio_id = ? AND servico_id = ?').get(condId, servicoSeguro.id);
      if (cs) {
        db.prepare(`
          UPDATE condominio_servicos SET ultima_realizacao = ?, data_vencimento = ? WHERE id = ?
        `).run(nova_data_renovacao || null, nova_data_validade || null, cs.id);

        if (nova_data_renovacao) {
          db.prepare(`
            INSERT INTO historico (
              condominio_servico_id, data_realizacao, data_vencimento,
              empresa, registrado_por, origem, observacao
            ) VALUES (?, ?, ?, ?, ?, 'renovacao', ?)
          `).run(
            cs.id,
            nova_data_renovacao,
            nova_data_validade || null,
            corretora || seguroAtual.corretora || null,
            req.usuario.id,
            `Renovação da Apólice: ${nova_apolice || seguroAtual.numero_apolice}`
          );
        }
      }
    }

    registrarAuditoriaDetalhada(req, 'seguros', seguroAtual.id, 'RENOVAR_SEGURO', [
      {
        campo: 'Renovação da Apólice',
        anterior: `${seguroAtual.numero_apolice} (Validade: ${seguroAtual.data_validade})`,
        novo: `${nova_apolice || seguroAtual.numero_apolice} (Validade: ${nova_data_validade})`
      }
    ]);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao renovar seguro: ' + err.message });
  }
});

// ============================================================
// 5. Sinistros: POST e DELETE
// ============================================================
router.post('/:condominioId/sinistros', (req, res) => {
  const condId = Number(req.params.condominioId);
  if (!podeAcessarCondominio(req.usuario, condId)) {
    return res.status(403).json({ erro: 'Acesso negado a este condomínio.' });
  }

  const { id, data, cobertura_acionada, descricao, valor_reclamado, status, observacoes } = req.body || {};

  try {
    let seguro = db.prepare('SELECT id FROM seguros WHERE condominio_id = ?').get(condId);
    if (!seguro) {
      // Criar registro preliminar de seguro se não existir
      const info = db.prepare(`
        INSERT INTO seguros (condominio_id, criado_em, atualizado_em, atualizado_por)
        VALUES (?, datetime('now'), datetime('now'), ?)
      `).run(condId, req.usuario.id);
      seguro = { id: info.lastInsertRowid };
    }

    let sinistroId = id;
    if (id) {
      db.prepare(`
        UPDATE seguro_sinistros
        SET data = ?,
            cobertura_acionada = ?,
            descricao = ?,
            valor_reclamado = ?,
            status = ?,
            observacoes = ?,
            atualizado_em = datetime('now')
        WHERE id = ?
      `).run(
        data,
        cobertura_acionada || null,
        descricao || null,
        valor_reclamado != null ? Number(valor_reclamado) : null,
        status || 'Aberto',
        observacoes || null,
        id
      );

      registrarAuditoriaDetalhada(req, 'seguro_sinistros', id, 'EDITAR_SINISTRO', [
        { campo: 'Status Sinistro', anterior: 'Atualizado', novo: status || 'Aberto' }
      ]);
    } else {
      const info = db.prepare(`
        INSERT INTO seguro_sinistros (
          seguro_id, condominio_id, data, cobertura_acionada, descricao,
          valor_reclamado, status, observacoes, criado_em, atualizado_em, registrado_por
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?)
      `).run(
        seguro.id,
        condId,
        data,
        cobertura_acionada || null,
        descricao || null,
        valor_reclamado != null ? Number(valor_reclamado) : null,
        status || 'Aberto',
        observacoes || null,
        req.usuario.id
      );
      sinistroId = info.lastInsertRowid;

      registrarAuditoriaDetalhada(req, 'seguro_sinistros', sinistroId, 'CRIAR_SINISTRO', [
        { campo: 'Novo Sinistro', anterior: '—', novo: `${cobertura_acionada || 'Sinistro'} - R$ ${valor_reclamado || 0}` }
      ]);
    }

    res.json({ ok: true, id: sinistroId });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao salvar sinistro: ' + err.message });
  }
});

router.delete('/sinistros/:sinistroId', (req, res) => {
  const sinId = Number(req.params.sinistroId);
  try {
    const sinistro = db.prepare('SELECT * FROM seguro_sinistros WHERE id = ?').get(sinId);
    if (!sinistro) return res.status(404).json({ erro: 'Sinistro não encontrado' });

    if (!podeAcessarCondominio(req.usuario, sinistro.condominio_id)) {
      return res.status(403).json({ erro: 'Acesso negado.' });
    }

    db.prepare('DELETE FROM seguro_sinistros WHERE id = ?').run(sinId);
    registrarAuditoriaDetalhada(req, 'seguro_sinistros', sinId, 'EXCLUIR_SINISTRO', [
      { campo: 'Exclusão de Sinistro', anterior: sinistro.descricao, novo: 'Removido' }
    ]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao excluir sinistro: ' + err.message });
  }
});

// ============================================================
// 6. Documentos: Upload organizado por ano/código e DELETE
// ============================================================
router.post('/:condominioId/documentos', uploadSeguros.single('documento'), (req, res) => {
  const condId = Number(req.params.condominioId);
  if (!podeAcessarCondominio(req.usuario, condId)) {
    return res.status(403).json({ erro: 'Acesso negado a este condomínio.' });
  }

  if (!req.file) {
    return res.status(400).json({ erro: 'Nenhum arquivo enviado.' });
  }

  const { tipo = 'Apólice', sinistro_id, ano = new Date().getFullYear() } = req.body || {};

  try {
    let seguro = db.prepare('SELECT id FROM seguros WHERE condominio_id = ?').get(condId);
    if (!seguro) {
      const info = db.prepare(`
        INSERT INTO seguros (condominio_id, criado_em, atualizado_em, atualizado_por)
        VALUES (?, datetime('now'), datetime('now'), ?)
      `).run(condId, req.usuario.id);
      seguro = { id: info.lastInsertRowid };
    }

    const infoDoc = db.prepare(`
      INSERT INTO seguro_documentos (
        seguro_id, sinistro_id, nome_arquivo, tipo, tamanho, ano, caminho, url, uploaded_by, criado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      seguro.id,
      sinistro_id ? Number(sinistro_id) : null,
      req.file.originalname,
      tipo,
      req.file.size,
      Number(ano),
      req.file.path,
      `/api/upload/preview?path=${encodeURIComponent(req.file.path)}`,
      req.usuario.id
    );

    registrarAuditoriaDetalhada(req, 'seguro_documentos', infoDoc.lastInsertRowid, 'UPLOAD_DOCUMENTO', [
      { campo: 'Upload de Documento', anterior: '—', novo: `${tipo}: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)} KB)` }
    ]);

    res.json({
      ok: true,
      id: infoDoc.lastInsertRowid,
      nome_arquivo: req.file.originalname,
      caminho: req.file.path,
      url: `/api/upload/preview?path=${encodeURIComponent(req.file.path)}`
    });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao registrar documento: ' + err.message });
  }
});

router.delete('/documentos/:documentoId', (req, res) => {
  const docId = Number(req.params.documentoId);
  try {
    const doc = db.prepare('SELECT * FROM seguro_documentos WHERE id = ?').get(docId);
    if (!doc) return res.status(404).json({ erro: 'Documento não encontrado' });

    db.prepare('DELETE FROM seguro_documentos WHERE id = ?').run(docId);

    try {
      if (fs.existsSync(doc.caminho)) {
        fs.unlinkSync(doc.caminho);
      }
    } catch (e) {}

    registrarAuditoriaDetalhada(req, 'seguro_documentos', docId, 'EXCLUIR_DOCUMENTO', [
      { campo: 'Exclusão de Documento', anterior: doc.nome_arquivo, novo: 'Removido' }
    ]);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao excluir documento: ' + err.message });
  }
});

// ============================================================
// 7. DELETE /api/seguros/:condominioId - Limpar dados de seguro (Admin only)
// ============================================================
router.delete('/:condominioId', exigirAdmin, (req, res) => {
  const condId = Number(req.params.condominioId);
  try {
    db.prepare('DELETE FROM seguros WHERE condominio_id = ?').run(condId);

    const servicoSeguro = db.prepare("SELECT id FROM servicos WHERE chave = 'seguro'").get();
    if (servicoSeguro) {
      db.prepare(`
        UPDATE condominio_servicos
        SET ultima_realizacao = NULL, data_vencimento = NULL, observacoes = NULL
        WHERE condominio_id = ? AND servico_id = ?
      `).run(condId, servicoSeguro.id);
    }

    registrarAuditoriaDetalhada(req, 'seguros', condId, 'EXCLUIR_SEGURO', [
      { campo: 'Limpeza de Seguro', anterior: 'Apólice ativa', novo: 'Limpo' }
    ]);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao limpar dados de seguro: ' + err.message });
  }
});

module.exports = router;
