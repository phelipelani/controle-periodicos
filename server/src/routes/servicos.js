const express = require('express');
const db = require('../db');
const { exigirAdmin } = require('../auth');
const { statusVencimento } = require('../vencimentos');
const { filtroEscopo } = require('../acesso');

const router = express.Router();

// Catálogo de serviços (qualquer usuário autenticado pode ler).
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM servicos ORDER BY ordem, nome').all();
  res.json(rows);
});

// Situação de um serviço em todos os condomínios (do escopo do usuário).
// Usado nas páginas por serviço (Extintores, Reservatórios, Seguros, AVCB...).
router.get('/:chave/condominios', (req, res) => {
  const servico = db.prepare('SELECT * FROM servicos WHERE chave = ?').get(req.params.chave);
  if (!servico) return res.status(404).json({ erro: 'Serviço não encontrado' });

  const escopo = filtroEscopo(req.usuario, 'c.id');
  const rows = db
    .prepare(`
      SELECT c.id AS condominio_id, c.nome AS condominio_nome, g.nome AS gerente_nome,
             cs.ultima_realizacao, cs.data_vencimento
      FROM condominios c
      LEFT JOIN usuarios g ON g.id = c.gerente_id
      LEFT JOIN condominio_servicos cs ON cs.condominio_id = c.id AND cs.servico_id = ?
      WHERE ${escopo.sql}
      ORDER BY c.nome
    `)
    .all(servico.id, ...escopo.params);

  const itens = rows.map((r) => {
    const { status, diasRestantes } = statusVencimento(r.data_vencimento, servico.alerta_dias_antes);
    return { ...r, status, diasRestantes };
  });

  res.json({ servico, itens });
});

// Editar configuração de um serviço (periodicidade / dias de alerta) — só admin.
router.put('/:id', exigirAdmin, (req, res) => {
  const id = Number(req.params.id);
  const servico = db.prepare('SELECT * FROM servicos WHERE id = ?').get(id);
  if (!servico) return res.status(404).json({ erro: 'Serviço não encontrado' });

  const { nome, periodicidade_meses, alerta_dias_antes } = req.body || {};
  db.prepare(
    'UPDATE servicos SET nome = ?, periodicidade_meses = ?, alerta_dias_antes = ? WHERE id = ?'
  ).run(
    nome ?? servico.nome,
    periodicidade_meses === undefined ? servico.periodicidade_meses : (periodicidade_meses || null),
    alerta_dias_antes === undefined ? servico.alerta_dias_antes : Number(alerta_dias_antes),
    id
  );
  res.json(db.prepare('SELECT * FROM servicos WHERE id = ?').get(id));
});

module.exports = router;
