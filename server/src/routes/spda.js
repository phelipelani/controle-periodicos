const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../db');
const {
  ehAdmin,
  podeAcessarCondominio,
  podeAcessarServico,
  filtroEscopo,
  registrarAuditoriaDetalhada
} = require('../acesso');

const router = express.Router();

function calcularStatusSpda(dataValidade) {
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
  return { status: 'em_dia', diasRestantes };
}

// Configuração de armazenamento organizado em nuvem/disco:
// adm/spda/[ano]/[codigo_condominio]/[arquivo]
function getStoragePathSpda(ano, codigoCondominio) {
  const dataDir = process.env.DB_DIR || path.join(__dirname, '../../data');
  const dir = path.join(dataDir, 'adm', 'spda', String(ano), String(codigoCondominio).padStart(3, '0'));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

const storageSpda = multer.diskStorage({
  destination: function (req, file, cb) {
    try {
      const ano = req.body.ano || new Date().getFullYear();
      const codigoCondominio = req.body.codigo_condominio || String(req.params.condominioId || '1').padStart(3, '0');
      const dir = getStoragePathSpda(ano, codigoCondominio);
      cb(null, dir);
    } catch (err) {
      cb(err, null);
    }
  },
  filename: function (req, file, cb) {
    const ano = req.body.ano || new Date().getFullYear();
    const tipo = (req.body.tipo || 'laudo_spda').toLowerCase().replace(/\s+/g, '_');
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now().toString().slice(-4);
    cb(null, `${tipo}_${ano}_${uniqueSuffix}${ext}`);
  }
});

const uploadSpda = multer({ storage: storageSpda, limits: { fileSize: 25 * 1024 * 1024 } });

// ============================================================
// 1. GET /api/spda - Listagem de todos os condomínios + KPIs
// ============================================================
router.get('/', (req, res) => {
  if (!podeAcessarServico(req.usuario, 'spda')) {
    return res.status(403).json({ erro: 'Acesso negado ao módulo de SPDA.' });
  }

  const escopo = filtroEscopo(req.usuario, 'c.id', 'spda');

  const servicoSpda = db.prepare("SELECT id FROM servicos WHERE chave = 'spda'").get();
  const servicoId = servicoSpda ? servicoSpda.id : null;

  const condominios = db
    .prepare(`
      SELECT 
        c.id AS condominio_id,
        c.nome AS condominio_nome,
        c.endereco AS condominio_endereco,
        c.cnpj,
        c.gerente_id,
        g.nome AS gerente_nome,
        sr.id AS spda_id,
        COALESCE(sr.data_atualizacao, cs.ultima_realizacao) AS data_atualizacao,
        COALESCE(sr.data_validade, cs.data_vencimento) AS data_validade,
        sr.periodicidade_meses,
        sr.descricao,
        COALESCE(sr.observacoes, cs.observacoes) AS observacoes,
        sr.empresa_executora,
        sr.responsavel_tecnico,
        sr.art_rrt,
        sr.atualizado_em,
        u_att.nome AS atualizado_por_nome
      FROM condominios c
      LEFT JOIN usuarios g ON g.id = c.gerente_id
      LEFT JOIN spda_registros sr ON sr.condominio_id = c.id
      LEFT JOIN condominio_servicos cs ON cs.condominio_id = c.id AND cs.servico_id = ?
      LEFT JOIN usuarios u_att ON u_att.id = sr.atualizado_por
      WHERE ${escopo.sql}
      ORDER BY c.id ASC
    `)
    .all(servicoId, ...escopo.params);

  // Buscar contagem de documentos por condomínio
  const docCounts = db
    .prepare(`
      SELECT condominio_id, COUNT(*) AS total_docs
      FROM spda_documentos
      GROUP BY condominio_id
    `)
    .all();

  const docCountMap = {};
  for (const d of docCounts) {
    docCountMap[d.condominio_id] = d.total_docs;
  }

  const lista = condominios.map((c) => {
    const { status, diasRestantes } = calcularStatusSpda(c.data_validade);

    return {
      id: c.condominio_id,
      condominioId: c.condominio_id,
      spdaId: c.spda_id || null,
      codigo: String(c.condominio_id).padStart(3, '0'),
      condominio: c.condominio_nome,
      endereco: c.condominio_endereco,
      cnpj: c.cnpj || '',
      gerenteId: c.gerente_id,
      gerente: c.gerente_nome || 'Sem gerente',
      dataAtualizacao: c.data_atualizacao || null,
      dataValidade: c.data_validade || null,
      periodicidadeMeses: c.periodicidade_meses || 12,
      descricao: c.descricao || '',
      observacoes: c.observacoes || '',
      empresaExecutora: c.empresa_executora || '',
      responsavelTecnico: c.responsavel_tecnico || '',
      artRrt: c.art_rrt || '',
      totalDocumentos: docCountMap[c.condominio_id] || 0,
      atualizadoEm: c.atualizado_em || null,
      atualizadoPor: c.atualizado_por_nome || null,
      status,
      diasRestantes
    };
  });

  // KPIs
  const total = lista.length;
  const emDia = lista.filter((s) => s.status === 'em_dia').length;
  const aVencer = lista.filter((s) => s.status === 'a_vencer').length;
  const vencidos = lista.filter((s) => s.status === 'vencido').length;
  const semRegistro = lista.filter((s) => s.status === 'sem_registro').length;

  const percentualEmDia = total > 0 ? ((emDia / total) * 100).toFixed(1).replace('.', ',') : '0,0';

  const kpis = {
    totalCondominios: total,
    emDia,
    percentualEmDia: `${percentualEmDia}% dos condomínios`,
    aVencer,
    vencidos,
    semRegistro
  };

  res.json({
    registros: lista,
    kpis
  });
});

// ============================================================
// 2. GET /api/spda/:condominioId - Ficha completa do SPDA
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
        c.gerente_id, g.nome AS gerente_nome
      FROM condominios c
      LEFT JOIN usuarios g ON g.id = c.gerente_id
      WHERE c.id = ?
    `)
    .get(condominioId);

  if (!cond) {
    return res.status(404).json({ erro: 'Condomínio não encontrado.' });
  }

  const spda = db
    .prepare(`
      SELECT 
        sr.*, u.nome AS atualizado_por_nome
      FROM spda_registros sr
      LEFT JOIN usuarios u ON u.id = sr.atualizado_por
      WHERE sr.condominio_id = ?
    `)
    .get(condominioId);

  let documentos = [];
  if (spda) {
    documentos = db
      .prepare(`
        SELECT sd.*, u.nome AS uploaded_by_nome
        FROM spda_documentos sd
        LEFT JOIN usuarios u ON u.id = sd.uploaded_by
        WHERE sd.condominio_id = ?
        ORDER BY sd.criado_em DESC
      `)
      .all(condominioId);
  }

  const auditoria = db
    .prepare(`
      SELECT 
        id, usuario_nome, papel, acao, campo, valor_anterior, valor_novo, detalhes, criado_em
      FROM auditoria
      WHERE (entidade = 'spda' AND entidade_id = ?) 
         OR (entidade = 'condominios' AND entidade_id = ?)
      ORDER BY id DESC
      LIMIT 100
    `)
    .all(spda?.id || 0, condominioId);

  const { status, diasRestantes } = calcularStatusSpda(spda?.data_validade);

  res.json({
    condominio: {
      id: cond.id,
      codigo: String(cond.id).padStart(3, '0'),
      nome: cond.nome,
      endereco: cond.endereco,
      cnpj: cond.cnpj || '',
      email: cond.email || '',
      telefone: cond.telefone || '',
      gerenteId: cond.gerente_id,
      gerente: cond.gerente_nome || 'Sem gerente'
    },
    spda: spda
      ? {
          id: spda.id,
          condominioId: spda.condominio_id,
          dataAtualizacao: spda.data_atualizacao || null,
          dataValidade: spda.data_validade || null,
          periodicidadeMeses: spda.periodicidade_meses || 12,
          descricao: spda.descricao || '',
          observacoes: spda.observacoes || '',
          empresaExecutora: spda.empresa_executora || '',
          responsavelTecnico: spda.responsavel_tecnico || '',
          artRrt: spda.art_rrt || '',
          status,
          diasRestantes,
          atualizadoEm: spda.atualizado_em || null,
          atualizadoPor: spda.atualizado_por_nome || null
        }
      : null,
    documentos,
    auditoria
  });
});

// ============================================================
// 3. POST /api/spda - Criar ou Atualizar Registro de SPDA
// ============================================================
router.post('/', (req, res) => {
  const {
    condominio_id,
    gerente_id,
    data_atualizacao,
    data_validade,
    periodicidade_meses,
    descricao,
    observacoes,
    empresa_executora,
    responsavel_tecnico,
    art_rrt
  } = req.body || {};

  if (!condominio_id) {
    return res.status(400).json({ erro: 'Condomínio é obrigatório.' });
  }

  const cid = Number(condominio_id);
  if (!podeAcessarCondominio(req.usuario, cid)) {
    return res.status(403).json({ erro: 'Acesso negado a este condomínio.' });
  }

  const { status } = calcularStatusSpda(data_validade);

  // Buscar registro anterior para auditoria
  const anterior = db.prepare('SELECT * FROM spda_registros WHERE condominio_id = ?').get(cid);

  let spdaId;
  const agora = new Date().toISOString();

  if (anterior) {
    spdaId = anterior.id;
    db.prepare(`
      UPDATE spda_registros SET
        gerente_id = ?,
        data_atualizacao = ?,
        data_validade = ?,
        periodicidade_meses = ?,
        descricao = ?,
        observacoes = ?,
        empresa_executora = ?,
        responsavel_tecnico = ?,
        art_rrt = ?,
        status = ?,
        atualizado_em = ?,
        atualizado_por = ?
      WHERE id = ?
    `).run(
      gerente_id ? Number(gerente_id) : null,
      data_atualizacao || null,
      data_validade || null,
      Number(periodicidade_meses) || 12,
      descricao || null,
      observacoes || null,
      empresa_executora || null,
      responsavel_tecnico || null,
      art_rrt || null,
      status,
      agora,
      req.usuario.id,
      spdaId
    );

    // Auditoria de alterações de campos
    registrarAuditoriaDetalhada(
      req.usuario,
      'UPDATE',
      'spda',
      spdaId,
      anterior,
      {
        data_atualizacao,
        data_validade,
        descricao,
        observacoes,
        empresa_executora,
        responsavel_tecnico,
        art_rrt
      },
      req.ip
    );
  } else {
    const result = db.prepare(`
      INSERT INTO spda_registros (
        condominio_id, gerente_id, data_atualizacao, data_validade, periodicidade_meses,
        descricao, observacoes, empresa_executora, responsavel_tecnico, art_rrt,
        status, criado_em, atualizado_em, atualizado_por
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      cid,
      gerente_id ? Number(gerente_id) : null,
      data_atualizacao || null,
      data_validade || null,
      Number(periodicidade_meses) || 12,
      descricao || null,
      observacoes || null,
      empresa_executora || null,
      responsavel_tecnico || null,
      art_rrt || null,
      status,
      agora,
      agora,
      req.usuario.id
    );

    spdaId = result.lastInsertRowid;

    db.prepare(`
      INSERT INTO auditoria (
        usuario_id, usuario_nome, papel, acao, entidade, entidade_id, detalhes, ip
      ) VALUES (?, ?, ?, 'INSERT', 'spda', ?, 'Registro de SPDA cadastrado', ?)
    `).run(req.usuario.id, req.usuario.nome, req.usuario.papel, spdaId, req.ip);
  }

  // Sincronizar com condominio_servicos para manter consistência global
  const servicoSpda = db.prepare("SELECT id FROM servicos WHERE chave = 'spda'").get();
  if (servicoSpda) {
    db.prepare(`
      INSERT INTO condominio_servicos (condominio_id, servico_id, ultima_realizacao, data_vencimento, observacoes)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(condominio_id, servico_id) DO UPDATE SET
        ultima_realizacao = excluded.ultima_realizacao,
        data_vencimento = excluded.data_vencimento,
        observacoes = excluded.observacoes
    `).run(cid, servicoSpda.id, data_atualizacao || null, data_validade || null, observacoes || null);
  }

  res.json({ sucesso: true, spdaId, status });
});

// ============================================================
// 4. POST /api/spda/:condominioId/documentos - Upload Documento
// ============================================================
router.post('/:condominioId/documentos', uploadSpda.single('documento'), (req, res) => {
  const condominioId = Number(req.params.condominioId);
  if (!podeAcessarCondominio(req.usuario, condominioId)) {
    return res.status(403).json({ erro: 'Acesso negado a este condomínio.' });
  }

  if (!req.file) {
    return res.status(400).json({ erro: 'Nenhum arquivo enviado.' });
  }

  const spda = db.prepare('SELECT id FROM spda_registros WHERE condominio_id = ?').get(condominioId);
  const ano = Number(req.body.ano) || new Date().getFullYear();
  const tipo = req.body.tipo || 'Laudo SPDA';

  const dataDir = process.env.DB_DIR || path.join(__dirname, '../../data');
  const caminhoRelativo = path.relative(dataDir, req.file.path).replace(/\\/g, '/');

  const result = db.prepare(`
    INSERT INTO spda_documentos (
      spda_id, condominio_id, nome_arquivo, tipo_arquivo, tamanho, ano, caminho, url, uploaded_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    spda ? spda.id : null,
    condominioId,
    req.file.originalname,
    tipo,
    req.file.size,
    ano,
    caminhoRelativo,
    `/api/upload/preview?path=${encodeURIComponent(caminhoRelativo)}`,
    req.usuario.id
  );

  db.prepare(`
    INSERT INTO auditoria (
      usuario_id, usuario_nome, papel, acao, entidade, entidade_id, campo, valor_novo, detalhes, ip
    ) VALUES (?, ?, ?, 'UPLOAD_DOC', 'spda', ?, 'documento', ?, ?, ?)
  `).run(
    req.usuario.id,
    req.usuario.nome,
    req.usuario.papel,
    spda?.id || condominioId,
    req.file.originalname,
    `Documento "${req.file.originalname}" (${tipo}) anexado ao SPDA`,
    req.ip
  );

  res.json({
    sucesso: true,
    documento: {
      id: result.lastInsertRowid,
      nome_arquivo: req.file.originalname,
      tipo_arquivo: tipo,
      tamanho: req.file.size,
      caminho: caminhoRelativo
    }
  });
});

// ============================================================
// 5. DELETE /api/spda/documentos/:docId - Excluir Documento
// ============================================================
router.delete('/documentos/:docId', (req, res) => {
  const docId = Number(req.params.docId);
  const doc = db.prepare('SELECT * FROM spda_documentos WHERE id = ?').get(docId);

  if (!doc) {
    return res.status(404).json({ erro: 'Documento não encontrado.' });
  }

  if (!podeAcessarCondominio(req.usuario, doc.condominio_id)) {
    return res.status(403).json({ erro: 'Acesso negado.' });
  }

  // Deletar arquivo físico se existir
  const dataDir = process.env.DB_DIR || path.join(__dirname, '../../data');
  const fullPath = path.join(dataDir, doc.caminho);
  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
    } catch (e) {
      console.error('Erro ao remover arquivo físico:', e);
    }
  }

  db.prepare('DELETE FROM spda_documentos WHERE id = ?').run(docId);

  db.prepare(`
    INSERT INTO auditoria (
      usuario_id, usuario_nome, papel, acao, entidade, entidade_id, campo, valor_anterior, detalhes, ip
    ) VALUES (?, ?, ?, 'DELETE_DOC', 'spda', ?, 'documento', ?, ?, ?)
  `).run(
    req.usuario.id,
    req.usuario.nome,
    req.usuario.papel,
    doc.spda_id || doc.condominio_id,
    doc.nome_arquivo,
    `Documento "${doc.nome_arquivo}" removido do SPDA`,
    req.ip
  );

  res.json({ sucesso: true, mensagem: 'Documento excluído com sucesso.' });
});

// ============================================================
// 6. DELETE /api/spda/:id - Limpar registro de SPDA
// ============================================================
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const cond = db.prepare('SELECT id, nome FROM condominios WHERE id = ?').get(id);
  if (!cond) return res.status(404).json({ erro: 'Condomínio não encontrado.' });

  if (!podeAcessarCondominio(req.usuario, id)) {
    return res.status(403).json({ erro: 'Acesso negado.' });
  }

  db.prepare('DELETE FROM spda_registros WHERE condominio_id = ?').run(id);

  const servicoSpda = db.prepare("SELECT id FROM servicos WHERE chave = 'spda'").get();
  if (servicoSpda) {
    db.prepare(`
      UPDATE condominio_servicos 
      SET ultima_realizacao = NULL, data_vencimento = NULL, observacoes = NULL
      WHERE condominio_id = ? AND servico_id = ?
    `).run(id, servicoSpda.id);
  }

  db.prepare(`
    INSERT INTO auditoria (
      usuario_id, usuario_nome, papel, acao, entidade, entidade_id, detalhes, ip
    ) VALUES (?, ?, ?, 'DELETE', 'spda', ?, ?, ?)
  `).run(
    req.usuario.id,
    req.usuario.nome,
    req.usuario.papel,
    id,
    `Registro de SPDA limpo para o condomínio ${cond.nome}`,
    req.ip
  );

  res.json({ sucesso: true, mensagem: 'Registro de SPDA removido com sucesso.' });
});

module.exports = router;
