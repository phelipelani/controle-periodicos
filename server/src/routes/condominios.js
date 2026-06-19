const express = require('express');
const db = require('../db');
const { statusVencimento } = require('../vencimentos');
const { registrarServico, periodicidadeEfetiva } = require('../estado');
const { exigirAdmin } = require('../auth');
const { filtroEscopo, podeAcessarCondominio } = require('../acesso');

const router = express.Router();

const PRIORIDADE_STATUS = { vencido: 0, a_vencer: 1, sem_registro: 2, em_dia: 3 };

// Monta a lista de serviços de um condomínio (todos do catálogo) com status calculado.
function servicosDoCondominio(condominioId) {
  const rows = db
    .prepare(`
      SELECT s.id AS servico_id, s.chave, s.nome, s.tipo_controle,
             s.periodicidade_meses, s.alerta_dias_antes, s.ordem,
             cs.id AS condominio_servico_id, cs.ultima_realizacao, cs.data_vencimento,
             cs.periodicidade_meses_override, cs.observacoes
      FROM servicos s
      LEFT JOIN condominio_servicos cs
        ON cs.servico_id = s.id AND cs.condominio_id = ?
      ORDER BY s.ordem, s.nome
    `)
    .all(condominioId);

  return rows.map((r) => {
    const { status, diasRestantes } = statusVencimento(r.data_vencimento, r.alerta_dias_antes);
    return {
      servico_id: r.servico_id,
      chave: r.chave,
      nome: r.nome,
      tipo_controle: r.tipo_controle,
      periodicidade_meses: periodicidadeEfetiva(
        { periodicidade_meses_override: r.periodicidade_meses_override },
        { periodicidade_meses: r.periodicidade_meses }
      ),
      alerta_dias_antes: r.alerta_dias_antes,
      ultima_realizacao: r.ultima_realizacao,
      data_vencimento: r.data_vencimento,
      observacoes: r.observacoes,
      status,
      diasRestantes,
    };
  });
}

function statusGeral(servicos) {
  let pior = 'em_dia';
  for (const s of servicos) {
    if (PRIORIDADE_STATUS[s.status] < PRIORIDADE_STATUS[pior]) pior = s.status;
  }
  return pior;
}

router.get('/', (req, res) => {
  const escopo = filtroEscopo(req.usuario, 'c.id');
  const condominios = db
    .prepare(`
      SELECT c.*, g.nome AS gerente_nome
      FROM condominios c
      LEFT JOIN usuarios g ON g.id = c.gerente_id
      WHERE ${escopo.sql}
      ORDER BY c.nome
    `)
    .all(...escopo.params);

  const resultado = condominios.map((c) => {
    const servicos = servicosDoCondominio(c.id);
    return {
      ...c,
      statusGeral: statusGeral(servicos),
      vencidos: servicos.filter((s) => s.status === 'vencido').length,
      aVencer: servicos.filter((s) => s.status === 'a_vencer').length,
    };
  });
  res.json(resultado);
});

router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!podeAcessarCondominio(req.usuario, id)) {
    return res.status(403).json({ erro: 'Você não tem acesso a este condomínio' });
  }
  const condominio = db
    .prepare(`
      SELECT c.*, g.nome AS gerente_nome
      FROM condominios c LEFT JOIN usuarios g ON g.id = c.gerente_id
      WHERE c.id = ?
    `)
    .get(id);
  if (!condominio) return res.status(404).json({ erro: 'Condomínio não encontrado' });
  res.json({ ...condominio, servicos: servicosDoCondominio(id) });
});

// Cadastro/edição/remoção de condomínio: apenas admin (define o gerente).
router.post('/', exigirAdmin, (req, res) => {
  const { nome, endereco, observacoes, gerente_id } = req.body || {};
  if (!nome) return res.status(400).json({ erro: 'Nome do condomínio é obrigatório' });
  const info = db
    .prepare('INSERT INTO condominios (nome, endereco, observacoes, gerente_id) VALUES (?, ?, ?, ?)')
    .run(nome, endereco || null, observacoes || null, gerente_id || null);
  res.status(201).json(db.prepare('SELECT * FROM condominios WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', exigirAdmin, (req, res) => {
  const id = Number(req.params.id);
  const condominio = db.prepare('SELECT * FROM condominios WHERE id = ?').get(id);
  if (!condominio) return res.status(404).json({ erro: 'Condomínio não encontrado' });
  const { nome, endereco, observacoes, gerente_id } = req.body || {};
  db.prepare(
    'UPDATE condominios SET nome = ?, endereco = ?, observacoes = ?, gerente_id = ? WHERE id = ?'
  ).run(
    nome ?? condominio.nome,
    endereco === undefined ? condominio.endereco : endereco,
    observacoes === undefined ? condominio.observacoes : observacoes,
    gerente_id === undefined ? condominio.gerente_id : (gerente_id || null),
    id
  );
  res.json(db.prepare('SELECT * FROM condominios WHERE id = ?').get(id));
});

router.delete('/:id', exigirAdmin, (req, res) => {
  db.prepare('DELETE FROM condominios WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// Registrar realização (periódico) ou data de validade (AVCB/seguro) de um serviço.
router.put('/:id/servicos/:servicoId', (req, res) => {
  const condominioId = Number(req.params.id);
  const servicoId = Number(req.params.servicoId);
  const { data, empresa, observacao } = req.body || {};
  if (!data) return res.status(400).json({ erro: 'Data é obrigatória' });
  if (!podeAcessarCondominio(req.usuario, condominioId)) {
    return res.status(403).json({ erro: 'Você não tem acesso a este condomínio' });
  }

  const condominio = db.prepare('SELECT id FROM condominios WHERE id = ?').get(condominioId);
  if (!condominio) return res.status(404).json({ erro: 'Condomínio não encontrado' });

  try {
    registrarServico({
      condominioId,
      servicoId,
      data,
      registradoPor: req.usuario.id,
      origem: 'manual',
      empresa: empresa || null,
      observacao: observacao || null,
    });
  } catch (e) {
    return res.status(400).json({ erro: e.message });
  }
  res.json({ ...condominio, servicos: servicosDoCondominio(condominioId) });
});

module.exports = { router, servicosDoCondominio, statusGeral };
