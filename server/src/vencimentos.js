// Utilitários de data e cálculo de vencimento/status dos serviços.
// Datas são strings ISO 'YYYY-MM-DD'.

function hojeISO() {
  const d = new Date();
  return toISO(d);
}

function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
}

function parseISO(s) {
  if (!s) return null;
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Soma meses preservando fim de mês (ex: 31/01 + 1 mês -> 28/02).
function addMeses(iso, meses) {
  const d = parseISO(iso);
  if (!d || !meses) return null;
  const dia = d.getDate();
  const alvo = new Date(d.getFullYear(), d.getMonth() + meses, 1);
  const ultimoDia = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
  alvo.setDate(Math.min(dia, ultimoDia));
  return toISO(alvo);
}

function diffDias(isoA, isoB) {
  const a = parseISO(isoA);
  const b = parseISO(isoB);
  if (!a || !b) return null;
  return Math.round((a - b) / 86400000);
}

// Calcula a data de vencimento de um serviço periódico a partir da última realização.
function calcularVencimentoPeriodico(ultimaRealizacao, periodicidadeMeses) {
  if (!ultimaRealizacao || !periodicidadeMeses) return null;
  return addMeses(ultimaRealizacao, periodicidadeMeses);
}

// Status com base na data de vencimento e nos dias de alerta configurados.
function statusVencimento(dataVencimento, alertaDiasAntes = 30) {
  if (!dataVencimento) return { status: 'sem_registro', diasRestantes: null };
  const dias = diffDias(dataVencimento, hojeISO());
  if (dias < 0) return { status: 'vencido', diasRestantes: dias };
  if (dias <= alertaDiasAntes) return { status: 'a_vencer', diasRestantes: dias };
  return { status: 'em_dia', diasRestantes: dias };
}

module.exports = {
  hojeISO,
  toISO,
  parseISO,
  addMeses,
  diffDias,
  calcularVencimentoPeriodico,
  statusVencimento,
};
