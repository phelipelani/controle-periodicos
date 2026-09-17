const db = require('./db');
const { hojeISO } = require('./vencimentos');
const { registrarServico } = require('./estado');

// A promoção de agendamentos agora é feita manualmente pelo usuário ou empresa
// através do botão 'Confirmar Realização' na tela de Agendamentos.
function promoteAgendamentos() {
  return 0;
}

/**
 * Notificação Única de 1 Dia Antes:
 * Verifica agendamentos de dedetização programados para amanhã que ainda não foram notificados.
 */
function verificarNotificacoesDedetizacao() {
  try {
    const amanhaDate = new Date();
    amanhaDate.setDate(amanhaDate.getDate() + 1);
    const amanhaISO = amanhaDate.toISOString().split('T')[0];

    const agendamentosAmanha = db.prepare(`
      SELECT 
        a.id, a.data_agendada, a.periodo, a.empresa, a.valor_area_comum,
        c.id AS condominio_id, c.nome AS condominio_nome, printf('%03d', c.id) AS codigo_condominio,
        g.id AS gerente_id, g.nome AS gerente_nome, g.email AS gerente_email,
        (SELECT COUNT(*) FROM agendamento_adesoes WHERE agendamento_id = a.id) AS total_adesoes,
        (SELECT COALESCE(SUM(valor), 0) FROM agendamento_adesoes WHERE agendamento_id = a.id) AS valor_adesoes
      FROM agendamentos a
      JOIN condominios c ON c.id = a.condominio_id
      JOIN servicos s ON s.id = a.servico_id
      LEFT JOIN usuarios g ON g.id = c.gerente_id
      WHERE s.chave = 'dedetizacao'
        AND a.status = 'agendado'
        AND a.data_agendada = ?
        AND (a.notificacao_enviada IS NULL OR a.notificacao_enviada = 0)
    `).all(amanhaISO);

    for (const ag of agendamentosAmanha) {
      console.log(`\n🔔 [ALERTA 1 DIA ANTES - DEDETIZAÇÃO]`);
      console.log(`  • Condomínio: [${ag.codigo_condominio}] ${ag.condominio_nome}`);
      console.log(`  • Data da Dedetização: Amanhã (${ag.data_agendada}) - Período: ${ag.periodo || 'Comercial'}`);
      console.log(`  • Empresa: ${ag.empresa || 'Não informada'}`);
      console.log(`  • Gerente Responsável: ${ag.gerente_nome || 'Geral'} (${ag.gerente_email || '-'})`);
      console.log(`  • Total de Unidades Aderidas: ${ag.total_adesoes} unidades (R$ ${ag.valor_adesoes})`);
      console.log(`  • Lembrete: Acesse o sistema para imprimir a lista de unidades para o técnico.`);

      // Registrar auditoria do aviso
      try {
        db.prepare(`
          INSERT INTO auditoria (usuario_id, usuario_nome, papel, acao, entidade, entidade_id, detalhes)
          VALUES (?, ?, 'sistema', 'notificacao_dedetizacao_1dia', 'agendamentos', ?, ?)
        `).run(
          ag.gerente_id || null,
          ag.gerente_nome || 'Sistema',
          ag.id,
          `Dedetização agendada para amanhã (${ag.data_agendada}) no condomínio [${ag.codigo_condominio}] ${ag.condominio_nome}. Total de ${ag.total_adesoes} unidades confirmadas.`
        );
      } catch (e) {}

      // Marcar como notificado
      db.prepare('UPDATE agendamentos SET notificacao_enviada = 1 WHERE id = ?').run(ag.id);
    }

    return agendamentosAmanha.length;
  } catch (err) {
    console.error('[jobs] Erro ao verificar notificações de dedetização:', err);
    return 0;
  }
}

module.exports = { promoteAgendamentos, verificarNotificacoesDedetizacao };
