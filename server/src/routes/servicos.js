const express = require('express');
const db = require('../db');
const { exigirAdmin } = require('../auth');

const router = express.Router();

// Catálogo de serviços (qualquer usuário autenticado pode ler).
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM servicos ORDER BY ordem, nome').all();
  res.json(rows);
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
