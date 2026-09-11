const express = require('express');
const db = require('../db');
const { statusVencimento } = require('../vencimentos');
const { promoteAgendamentos } = require('../jobs');
const { filtroEscopo } = require('../acesso');

const router = express.Router();

const CORES_SERVICO = {
  dedetizacao: '#d4202a',
  extintor: '#ef4444',
  reservatorio: '#0ea5e9',
  seguro: '#16a34a',
  avcb: '#d97706',
  spda: '#8b5cf6'
};

router.get('/', (req, res) => {
  promoteAgendamentos();

  const escopo = filtroEscopo(req.usuario, 'c.id');

  // 1. Buscar todos os condomínios no escopo
  const condominiosRows = db
    .prepare(`
      SELECT c.id, c.nome, c.endereco, c.gerente_id, g.nome AS gerente_nome
      FROM condominios c
      LEFT JOIN usuarios g ON g.id = c.gerente_id
      WHERE ${escopo.sql}
      ORDER BY c.id ASC
    `)
    .all(...escopo.params);

  const condominios = condominiosRows.map((c) => ({
    id: c.id,
    codigo: String(c.id).padStart(3, '0'),
    nome: c.nome,
    endereco: c.endereco || '',
    gerente_id: c.gerente_id,
    gerente_nome: c.gerente_nome || 'Sem gerente'
  }));

  // 2. Buscar catálogo de serviços
  const servicosRows = db.prepare('SELECT * FROM servicos ORDER BY ordem, nome').all();
  const tiposServico = servicosRows.map((s) => ({
    id: s.chave,
    chave: s.chave,
    nome: s.nome,
    cor: CORES_SERVICO[s.chave] || '#64748b'
  }));

  // 3. Cruzar cada condomínio com cada serviço (dados reais)
  const rows = db
    .prepare(`
      SELECT 
        c.id AS condominio_id, c.nome AS condominio_nome,
        s.id AS servico_id, s.nome AS servico_nome, s.chave AS servico_chave,
        s.alerta_dias_antes, cs.data_vencimento, cs.ultima_realizacao,
        h.empresa AS ultima_empresa
      FROM condominios c
      CROSS JOIN servicos s
      LEFT JOIN condominio_servicos cs
        ON cs.condominio_id = c.id AND cs.servico_id = s.id
      LEFT JOIN historico h
        ON h.id = (
          SELECT MAX(id) FROM historico 
          WHERE condominio_servico_id = cs.id
        )
      WHERE ${escopo.sql}
      ORDER BY c.nome, s.ordem
    `)
    .all(...escopo.params);

  const servicos = rows.map((r) => {
    const { status, diasRestantes } = statusVencimento(r.data_vencimento, r.alerta_dias_antes);
    return {
      id: `${r.condominio_id}-${r.servico_chave}`,
      condominioId: r.condominio_id,
      condominioNome: r.condominio_nome,
      codigoCondominio: String(r.condominio_id).padStart(3, '0'),
      servicoId: r.servico_chave,
      servicoNome: r.servico_nome,
      servicoChave: r.servico_chave,
      dataValidade: r.data_vencimento || null,
      ultimaRealizacao: r.ultima_realizacao || null,
      statusCalc: status,
      diasRestantes: diasRestantes,
      empresa: r.ultima_empresa || '-'
    };
  });

  // 4. Buscar histórico de atividades reais recentes
  const historicoRows = db
    .prepare(`
      SELECT 
        h.id, h.data_realizacao, h.empresa, h.origem, h.observacao, h.criado_em,
        c.nome AS condominio_nome, s.nome AS servico_nome, s.chave AS servico_chave,
        u.nome AS usuario_nome
      FROM historico h
      JOIN condominio_servicos cs ON cs.id = h.condominio_servico_id
      JOIN condominios c ON c.id = cs.condominio_id
      JOIN servicos s ON s.id = cs.servico_id
      LEFT JOIN usuarios u ON u.id = h.registrado_por
      WHERE ${escopo.sql}
      ORDER BY h.id DESC
      LIMIT 10
    `)
    .all(...escopo.params);

  const atividades = historicoRows.map((h) => {
    let horaFormatada = 'Recente';
    if (h.criado_em) {
      const dt = new Date(h.criado_em);
      horaFormatada = `${dt.toLocaleDateString('pt-BR')} ${dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }

    return {
      id: h.id,
      descricao: `${h.servico_nome} em ${h.condominio_nome}${h.empresa ? ` (${h.empresa})` : ''}`,
      servicoNome: h.servico_nome,
      hora: horaFormatada,
      usuarioNome: h.usuario_nome || 'Sistema'
    };
  });

  // Se houver poucas atividades no histórico, complementar com logs de auditoria
  if (atividades.length < 5) {
    const auditoriaRows = db
      .prepare(`
        SELECT a.id, a.usuario_nome, a.acao, a.entidade, a.detalhes, a.criado_em
        FROM auditoria a
        ORDER BY a.id DESC
        LIMIT 10
      `)
      .all();

    for (const a of auditoriaRows) {
      if (atividades.length >= 10) break;
      let horaFormatada = 'Recente';
      if (a.criado_em) {
        const dt = new Date(a.criado_em);
        horaFormatada = `${dt.toLocaleDateString('pt-BR')} ${dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
      }
      atividades.push({
        id: `aud-${a.id}`,
        descricao: `${a.acao} - ${a.detalhes || a.entidade}`,
        servicoNome: a.entidade || 'Sistema',
        hora: horaFormatada,
        usuarioNome: a.usuario_nome || 'Sistema'
      });
    }
  }

  // 5. Contadores agregados
  const vencidos = servicos.filter((i) => i.statusCalc === 'vencido');
  const aVencer = servicos.filter((i) => i.statusCalc === 'a_vencer');
  const emDia = servicos.filter((i) => i.statusCalc === 'em_dia');
  const semRegistro = servicos.filter((i) => i.statusCalc === 'sem_registro');

  res.json({
    condominios,
    tiposServico,
    servicos,
    atividades,
    contadores: {
      totalCondominios: condominios.length,
      vencidos: vencidos.length,
      aVencer: aVencer.length,
      emDia: emDia.length,
      semRegistro: semRegistro.length,
      totalServicos: servicos.length
    }
  });
});

module.exports = router;

