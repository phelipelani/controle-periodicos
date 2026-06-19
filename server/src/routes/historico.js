const express = require('express');
const db = require('../db');
const { filtroEscopo } = require('../acesso');

const router = express.Router();

// Histórico de realizações. Filtros opcionais: condominio, servico.
// Gerente só vê o histórico dos seus condomínios.
router.get('/', (req, res) => {
  const { condominio, servico } = req.query;
  const escopo = filtroEscopo(req.usuario, 'cs.condominio_id');
  const where = [escopo.sql];
  const params = [...escopo.params];
  if (condominio) { where.push('cs.condominio_id = ?'); params.push(Number(condominio)); }
  if (servico) { where.push('cs.servico_id = ?'); params.push(Number(servico)); }
  const sql = `
    SELECT h.*, cs.condominio_id, cs.servico_id,
           c.nome AS condominio_nome, s.nome AS servico_nome, s.chave AS servico_chave,
           usr.nome AS registrado_por_nome
    FROM historico h
    JOIN condominio_servicos cs ON cs.id = h.condominio_servico_id
    JOIN condominios c ON c.id = cs.condominio_id
    JOIN servicos s ON s.id = cs.servico_id
    LEFT JOIN usuarios usr ON usr.id = h.registrado_por
    WHERE ${where.join(' AND ')}
    ORDER BY h.data_realizacao DESC, h.id DESC
    LIMIT 200
  `;
  res.json(db.prepare(sql).all(...params));
});

module.exports = router;
