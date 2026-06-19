const db = require('./db');
const { hojeISO } = require('./vencimentos');
const { registrarServico } = require('./estado');

// Promove agendamentos cuja data JÁ PASSOU (data_agendada < hoje): marca como
// realizado, atualiza o serviço do condomínio (recalculando o vencimento) e grava
// no histórico. O agendamento do próprio dia NÃO é promovido — fica em aberto para
// edição (confirmar apartamentos/empresa) e só sobe ao histórico no dia seguinte.
// Roda no boot, diariamente (cron) e de forma preguiçosa nas rotas de leitura.
function promoteAgendamentos() {
  const hoje = hojeISO();
  const pendentes = db
    .prepare("SELECT * FROM agendamentos WHERE status = 'agendado' AND data_agendada < ?")
    .all(hoje);

  if (pendentes.length === 0) return 0;

  const processarUm = db.transaction((ag) => {
    registrarServico({
      condominioId: ag.condominio_id,
      servicoId: ag.servico_id,
      data: ag.data_agendada,
      registradoPor: ag.criado_por,
      origem: 'agendamento',
      empresa: ag.empresa,
      observacao: ag.observacao,
    });
    db.prepare(
      "UPDATE agendamentos SET status = 'realizado', processado_em = datetime('now') WHERE id = ?"
    ).run(ag.id);
  });

  for (const ag of pendentes) processarUm(ag);
  console.log(`[jobs] ${pendentes.length} agendamento(s) promovido(s) para realizado.`);
  return pendentes.length;
}

module.exports = { promoteAgendamentos };
