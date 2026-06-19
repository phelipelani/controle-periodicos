// Helpers de formatação e rótulos de status.

export function formatarData(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export const ROTULO_STATUS = {
  vencido: 'Vencido',
  a_vencer: 'A vencer',
  em_dia: 'Em dia',
  sem_registro: 'Sem registro',
};

export function textoDias(status, dias) {
  if (dias == null) return '';
  if (status === 'vencido') return `há ${Math.abs(dias)} dia(s)`;
  if (dias === 0) return 'vence hoje';
  return `em ${dias} dia(s)`;
}
