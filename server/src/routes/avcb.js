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

function calcularStatusAvcb(dataValidade) {
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
// adm/avcb/[ano]/[codigo_condominio]/[arquivo]
function getStoragePathAvcb(ano, codigoCondominio) {
  const dataDir = process.env.DB_DIR || path.join(__dirname, '../../data');
  const dir = path.join(dataDir, 'adm', 'avcb', String(ano), String(codigoCondominio).padStart(3, '0'));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

const storageAvcb = multer.diskStorage({
  destination: function (req, file, cb) {
    try {
      const ano = req.body.ano || new Date().getFullYear();
      const codigoCondominio = req.body.codigo_condominio || String(req.params.condominioId || '1').padStart(3, '0');
      const dir = getStoragePathAvcb(ano, codigoCondominio);
      cb(null, dir);
    } catch (err) {
      cb(err, null);
    }
  },
  filename: function (req, file, cb) {
    const ano = req.body.ano || new Date().getFullYear();
    const tipo = (req.body.tipo || 'avcb').toLowerCase().replace(/\s+/g, '_');
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now().toString().slice(-4);
    cb(null, `${tipo}_${ano}_${uniqueSuffix}${ext}`);
  }
});

const uploadAvcb = multer({ storage: storageAvcb, limits: { fileSize: 25 * 1024 * 1024 } });

// ============================================================
// 1. GET /api/avcb - Listagem de todos os condomínios + KPIs
// ============================================================
router.get('/', (req, res) => {
  if (!podeAcessarServico(req.usuario, 'avcb')) {
    return res.status(403).json({ erro: 'Acesso negado ao módulo de AVCB.' });
  }

  const escopo = filtroEscopo(req.usuario, 'c.id', 'avcb');

  const servicoAvcb = db.prepare("SELECT id FROM servicos WHERE chave = 'avcb'").get();
  const servicoId = servicoAvcb ? servicoAvcb.id : null;

  const condominios = db
    .prepare(`
      SELECT 
        c.id AS condominio_id,
        c.nome AS condominio_nome,
        c.endereco AS condominio_endereco,
        c.cnpj,
        c.gerente_id,
        g.nome AS gerente_nome,
        ar.id AS avcb_id,
        ar.numero_avcb,
        ar.orgao_emissor,
        ar.empresa_responsavel,
        ar.responsavel_tecnico,
        ar.data_emissao,
        COALESCE(ar.data_atualizacao, cs.ultima_realizacao) AS data_atualizacao,
        COALESCE(ar.data_validade, cs.data_vencimento) AS data_validade,
        ar.periodicidade_meses,
        COALESCE(ar.observacoes_tecnicas, cs.observacoes) AS observacoes_tecnicas,
        ar.atualizado_em,
        u_att.nome AS atualizado_por_nome
      FROM condominios c
      LEFT JOIN usuarios g ON g.id = c.gerente_id
      LEFT JOIN avcb_registros ar ON ar.condominio_id = c.id
      LEFT JOIN condominio_servicos cs ON cs.condominio_id = c.id AND cs.servico_id = ?
      LEFT JOIN usuarios u_att ON u_att.id = ar.atualizado_por
      WHERE ${escopo.sql}
      ORDER BY c.id ASC
    `)
    .all(servicoId, ...escopo.params);

  // Buscar contagem de documentos por condomínio
  const docCounts = db
    .prepare(`
      SELECT condominio_id, COUNT(*) AS total_docs
      FROM avcb_documentos
      GROUP BY condominio_id
    `)
    .all();

  const docCountMap = {};
  for (const d of docCounts) {
    docCountMap[d.condominio_id] = d.total_docs;
  }

  const lista = condominios.map((c) => {
    const { status, diasRestantes } = calcularStatusAvcb(c.data_validade);

    return {
      id: c.condominio_id,
      condominioId: c.condominio_id,
      avcbId: c.avcb_id || null,
      codigo: String(c.condominio_id).padStart(3, '0'),
      condominio: c.condominio_nome,
      endereco: c.condominio_endereco,
      cnpj: c.cnpj || '',
      gerenteId: c.gerente_id,
      gerente: c.gerente_nome || 'Sem gerente',
      numeroAvcb: c.numero_avcb || '',
      orgaoEmissor: c.orgao_emissor || 'Corpo de Bombeiros da PMESP',
      empresaResponsavel: c.empresa_responsavel || '',
      responsavelTecnico: c.responsavel_tecnico || '',
      dataEmissao: c.data_emissao || null,
      dataAtualizacao: c.data_atualizacao || null,
      dataValidade: c.data_validade || null,
      periodicidadeMeses: c.periodicidade_meses || 12,
      observacoesTecnicas: c.observacoes_tecnicas || '',
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
// 2. GET /api/avcb/:condominioId - Ficha completa do AVCB
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

  const avcb = db
    .prepare(`
      SELECT 
        ar.*, u.nome AS atualizado_por_nome
      FROM avcb_registros ar
      LEFT JOIN usuarios u ON u.id = ar.atualizado_por
      WHERE ar.condominio_id = ?
    `)
    .get(condominioId);

  let documentos = [];
  if (avcb) {
    documentos = db
      .prepare(`
        SELECT ad.*, u.nome AS uploaded_by_nome
        FROM avcb_documentos ad
        LEFT JOIN usuarios u ON u.id = ad.uploaded_by
        WHERE ad.condominio_id = ?
        ORDER BY ad.criado_em DESC
      `)
      .all(condominioId);
  }

  const auditoria = db
    .prepare(`
      SELECT 
        id, usuario_nome, papel, acao, campo, valor_anterior, valor_novo, detalhes, criado_em
      FROM auditoria
      WHERE (entidade = 'avcb' AND entidade_id = ?) 
         OR (entidade = 'condominios' AND entidade_id = ?)
      ORDER BY id DESC
      LIMIT 100
    `)
    .all(avcb?.id || 0, condominioId);

  const { status, diasRestantes } = calcularStatusAvcb(avcb?.data_validade);

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
    avcb: avcb
      ? {
          id: avcb.id,
          condominioId: avcb.condominio_id,
          numeroAvcb: avcb.numero_avcb || '',
          orgaoEmissor: avcb.orgao_emissor || 'Corpo de Bombeiros da PMESP',
          empresaResponsavel: avcb.empresa_responsavel || '',
          responsavelTecnico: avcb.responsavel_tecnico || '',
          dataEmissao: avcb.data_emissao || null,
          dataAtualizacao: avcb.data_atualizacao || null,
          dataValidade: avcb.data_validade || null,
          periodicidadeMeses: avcb.periodicidade_meses || 12,
          observacoesTecnicas: avcb.observacoes_tecnicas || '',
          status,
          diasRestantes,
          atualizadoEm: avcb.atualizado_em || null,
          atualizadoPor: avcb.atualizado_por_nome || null
        }
      : null,
    documentos,
    auditoria
  });
});

// ============================================================
// 3. POST /api/avcb - Criar ou Atualizar Registro de AVCB
// ============================================================
router.post('/', (req, res) => {
  const {
    condominio_id,
    gerente_id,
    numero_avcb,
    orgao_emissor,
    empresa_responsavel,
    responsavel_tecnico,
    data_emissao,
    data_atualizacao,
    data_validade,
    periodicidade_meses,
    observacoes_tecnicas
  } = req.body || {};

  if (!condominio_id) {
    return res.status(400).json({ erro: 'Condomínio é obrigatório.' });
  }

  const cid = Number(condominio_id);
  if (!podeAcessarCondominio(req.usuario, cid)) {
    return res.status(403).json({ erro: 'Acesso negado a este condomínio.' });
  }

  const { status } = calcularStatusAvcb(data_validade);

  // Buscar registro anterior para auditoria
  const anterior = db.prepare('SELECT * FROM avcb_registros WHERE condominio_id = ?').get(cid);

  let avcbId;
  const agora = new Date().toISOString();

  if (anterior) {
    avcbId = anterior.id;
    db.prepare(`
      UPDATE avcb_registros SET
        gerente_id = ?,
        numero_avcb = ?,
        orgao_emissor = ?,
        empresa_responsavel = ?,
        responsavel_tecnico = ?,
        data_emissao = ?,
        data_atualizacao = ?,
        data_validade = ?,
        periodicidade_meses = ?,
        observacoes_tecnicas = ?,
        status = ?,
        atualizado_em = ?,
        atualizado_por = ?
      WHERE id = ?
    `).run(
      gerente_id ? Number(gerente_id) : null,
      numero_avcb || null,
      orgao_emissor || 'Corpo de Bombeiros da PMESP',
      empresa_responsavel || null,
      responsavel_tecnico || null,
      data_emissao || null,
      data_atualizacao || null,
      data_validade || null,
      Number(periodicidade_meses) || 12,
      observacoes_tecnicas || null,
      status,
      agora,
      req.usuario.id,
      avcbId
    );

    // Auditoria de alterações de campos
    registrarAuditoriaDetalhada(
      req.usuario,
      'UPDATE',
      'avcb',
      avcbId,
      anterior,
      {
        numero_avcb,
        orgao_emissor,
        empresa_responsavel,
        responsavel_tecnico,
        data_emissao,
        data_atualizacao,
        data_validade,
        observacoes_tecnicas
      },
      req.ip
    );
  } else {
    const result = db.prepare(`
      INSERT INTO avcb_registros (
        condominio_id, gerente_id, numero_avcb, orgao_emissor, empresa_responsavel,
        responsavel_tecnico, data_emissao, data_atualizacao, data_validade, periodicidade_meses,
        observacoes_tecnicas, status, criado_em, atualizado_em, atualizado_por
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      cid,
      gerente_id ? Number(gerente_id) : null,
      numero_avcb || null,
      orgao_emissor || 'Corpo de Bombeiros da PMESP',
      empresa_responsavel || null,
      responsavel_tecnico || null,
      data_emissao || null,
      data_atualizacao || null,
      data_validade || null,
      Number(periodicidade_meses) || 12,
      observacoes_tecnicas || null,
      status,
      agora,
      agora,
      req.usuario.id
    );

    avcbId = result.lastInsertRowid;

    db.prepare(`
      INSERT INTO auditoria (
        usuario_id, usuario_nome, papel, acao, entidade, entidade_id, detalhes, ip
      ) VALUES (?, ?, ?, 'INSERT', 'avcb', ?, 'Registro de AVCB cadastrado', ?)
    `).run(req.usuario.id, req.usuario.nome, req.usuario.papel, avcbId, req.ip);
  }

  // Sincronizar com condominio_servicos para manter consistência global
  const servicoAvcb = db.prepare("SELECT id FROM servicos WHERE chave = 'avcb'").get();
  if (servicoAvcb) {
    db.prepare(`
      INSERT INTO condominio_servicos (condominio_id, servico_id, ultima_realizacao, data_vencimento, observacoes)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(condominio_id, servico_id) DO UPDATE SET
        ultima_realizacao = excluded.ultima_realizacao,
        data_vencimento = excluded.data_vencimento,
        observacoes = excluded.observacoes
    `).run(cid, servicoAvcb.id, data_atualizacao || null, data_validade || null, observacoes_tecnicas || null);
  }

  res.json({ sucesso: true, avcbId, status });
});

// ============================================================
// 4. POST /api/avcb/:condominioId/documentos - Upload Documento
// ============================================================
router.post('/:condominioId/documentos', uploadAvcb.single('documento'), (req, res) => {
  const condominioId = Number(req.params.condominioId);
  if (!podeAcessarCondominio(req.usuario, condominioId)) {
    return res.status(403).json({ erro: 'Acesso negado a este condomínio.' });
  }

  if (!req.file) {
    return res.status(400).json({ erro: 'Nenhum arquivo enviado.' });
  }

  const avcb = db.prepare('SELECT id FROM avcb_registros WHERE condominio_id = ?').get(condominioId);
  const ano = Number(req.body.ano) || new Date().getFullYear();
  const tipo = req.body.tipo || 'AVCB';

  const dataDir = process.env.DB_DIR || path.join(__dirname, '../../data');
  const caminhoRelativo = path.relative(dataDir, req.file.path).replace(/\\/g, '/');

  const result = db.prepare(`
    INSERT INTO avcb_documentos (
      avcb_id, condominio_id, nome_arquivo, tipo_arquivo, tamanho, ano, caminho, url, uploaded_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    avcb ? avcb.id : null,
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
    ) VALUES (?, ?, ?, 'UPLOAD_DOC', 'avcb', ?, 'documento', ?, ?, ?)
  `).run(
    req.usuario.id,
    req.usuario.nome,
    req.usuario.papel,
    avcb?.id || condominioId,
    req.file.originalname,
    `Documento "${req.file.originalname}" (${tipo}) anexado ao AVCB`,
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
// 5. DELETE /api/avcb/documentos/:docId - Excluir Documento
// ============================================================
router.delete('/documentos/:docId', (req, res) => {
  const docId = Number(req.params.docId);
  const doc = db.prepare('SELECT * FROM avcb_documentos WHERE id = ?').get(docId);

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

  db.prepare('DELETE FROM avcb_documentos WHERE id = ?').run(docId);

  db.prepare(`
    INSERT INTO auditoria (
      usuario_id, usuario_nome, papel, acao, entidade, entidade_id, campo, valor_anterior, detalhes, ip
    ) VALUES (?, ?, ?, 'DELETE_DOC', 'avcb', ?, 'documento', ?, ?, ?)
  `).run(
    req.usuario.id,
    req.usuario.nome,
    req.usuario.papel,
    doc.avcb_id || doc.condominio_id,
    doc.nome_arquivo,
    `Documento "${doc.nome_arquivo}" removido do AVCB`,
    req.ip
  );

  res.json({ sucesso: true, mensagem: 'Documento excluído com sucesso.' });
});

// ============================================================
// 6. DELETE /api/avcb/:id - Limpar registro de AVCB
// ============================================================
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const cond = db.prepare('SELECT id, nome FROM condominios WHERE id = ?').get(id);
  if (!cond) return res.status(404).json({ erro: 'Condomínio não encontrado.' });

  if (!podeAcessarCondominio(req.usuario, id)) {
    return res.status(403).json({ erro: 'Acesso negado.' });
  }

  db.prepare('DELETE FROM avcb_registros WHERE condominio_id = ?').run(id);

  const servicoAvcb = db.prepare("SELECT id FROM servicos WHERE chave = 'avcb'").get();
  if (servicoAvcb) {
    db.prepare(`
      UPDATE condominio_servicos 
      SET ultima_realizacao = NULL, data_vencimento = NULL, observacoes = NULL
      WHERE condominio_id = ? AND servico_id = ?
    `).run(id, servicoAvcb.id);
  }

  db.prepare(`
    INSERT INTO auditoria (
      usuario_id, usuario_nome, papel, acao, entidade, entidade_id, detalhes, ip
    ) VALUES (?, ?, ?, 'DELETE', 'avcb', ?, ?, ?)
  `).run(
    req.usuario.id,
    req.usuario.nome,
    req.usuario.papel,
    id,
    `Registro de AVCB limpo para o condomínio ${cond.nome}`,
    req.ip
  );

  res.json({ sucesso: true, mensagem: 'Registro de AVCB removido com sucesso.' });
});

module.exports = router;
