import { IcoDedetizacao, IcoExtintor, IcoReservatorio, IcoSeguro, IcoAvcb, IcoSpda } from './icons';

// Metadados visuais por chave de serviço (ícone + cor de destaque).
// "Limpeza" não entra: não é monitorada pela administradora.
export const SERVICO_META = {
  dedetizacao: { Icone: IcoDedetizacao, cor: '#d4202a' },
  extintor: { Icone: IcoExtintor, cor: '#ef4444' },
  reservatorio: { Icone: IcoReservatorio, cor: '#0ea5e9' },
  avcb: { Icone: IcoAvcb, cor: '#d97706' },
  seguro: { Icone: IcoSeguro, cor: '#16a34a' },
  spda: { Icone: IcoSpda, cor: '#8b5cf6' },
};

export function metaServico(chave) {
  return SERVICO_META[chave] || { Icone: IcoSeguro, cor: '#64748b' };
}
