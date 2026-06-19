const express = require('express');
const db = require('../db');
const { statusVencimento } = require('../vencimentos');
const { promoteAgendamentos } = require('../jobs');
const { filtroEscopo } = require('../acesso');

const router = express.Router();

router.get('/', (req, res) => {
  promoteAgendamentos();

  const escopo = filtroEscopo(req.usuario, 'c.id');
  // Junta cada condomínio com cada serviço (todos do catálogo).
  const rows = db
    .prepare(`
      SELECT c.id AS condominio_id, c.nome AS condominio_nome,
             s.id AS servico_id, s.nome AS servico_nome, s.chave AS servico_chave,
             s.alerta_dias_antes, cs.data_vencimento, cs.ultima_realizacao
      FROM condominios c
      CROSS JOIN servicos s
      LEFT JOIN condominio_servicos cs
        ON cs.condominio_id = c.id AND cs.servico_id = s.id
      WHERE ${escopo.sql}
      ORDER BY c.nome, s.ordem
    `)
    .all(...escopo.params);

  const itens = rows.map((r) => {
    const { status, diasRestantes } = statusVencimento(r.data_vencimento, r.alerta_dias_antes);
    return {
      condominio_id: r.condominio_id,
      condominio_nome: r.condominio_nome,
      servico_id: r.servico_id,
      servico_nome: r.servico_nome,
      servico_chave: r.servico_chave,
      data_vencimento: r.data_vencimento,
      ultima_realizacao: r.ultima_realizacao,
      status,
      diasRestantes,
    };
  });

  const vencidos = itens.filter((i) => i.status === 'vencido');
  const aVencer = itens.filter((i) => i.status === 'a_vencer');
  const semRegistro = itens.filter((i) => i.status === 'sem_registro');

  // Ordena por urgência.
  vencidos.sort((a, b) => a.diasRestantes - b.diasRestantes);
  aVencer.sort((a, b) => a.diasRestantes - b.diasRestantes);

  const totalCondominios = db
    .prepare(`SELECT COUNT(*) AS n FROM condominios c WHERE ${escopo.sql}`)
    .get(...escopo.params).n;

  res.json({
    contadores: {
      condominios: totalCondominios,
      vencidos: vencidos.length,
      aVencer: aVencer.length,
      semRegistro: semRegistro.length,
      emDia: itens.filter((i) => i.status === 'em_dia').length,
    },
    vencidos,
    aVencer,
  });
});

module.exports = router;
