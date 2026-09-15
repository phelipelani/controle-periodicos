const db = require('./db');
const { hojeISO } = require('./vencimentos');
const { registrarServico } = require('./estado');

// A promoção de agendamentos agora é feita manualmente pelo usuário ou empresa
// através do botão 'Confirmar Realização' na tela de Agendamentos.
function promoteAgendamentos() {
  return 0;
}

module.exports = { promoteAgendamentos };
