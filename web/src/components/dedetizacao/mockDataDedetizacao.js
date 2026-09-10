// mockDataDedetizacao.js

export const calcularStatusDedetizacao = (agendadoPara, executadoEm) => {
  if (!agendadoPara && !executadoEm) return 'Pendente';
  
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  if (executadoEm) {
    // Calculo de validade (6 meses após execução)
    const [d, m, y] = executadoEm.split('/');
    const validade = new Date(Number(y), Number(m) - 1 + 6, Number(d));
    
    // Se a validade já passou, está atrasado
    if (validade < hoje) {
      // Mas se tem um novo agendamento que é pra hoje ou futuro, pode ser Agendado ou Pendente
      if (agendadoPara) {
        const [ad, am, ay] = agendadoPara.split('/');
        const agdData = new Date(Number(ay), Number(am) - 1, Number(ad));
        if (agdData >= hoje) return 'Agendado';
        else return 'Pendente';
      }
      return 'Atrasado';
    }
    return 'Realizado';
  }

  if (agendadoPara) {
    const [ad, am, ay] = agendadoPara.split('/');
    const agdData = new Date(Number(ay), Number(am) - 1, Number(ad));
    
    // Se a data agendada já passou e não tem execução, está pendente
    if (agdData < hoje) return 'Pendente';
    
    return 'Agendado';
  }

  return 'Pendente';
};

export const calcularValidade = (executadoEm) => {
  if (!executadoEm) return null;
  const [d, m, y] = executadoEm.split('/');
  const validade = new Date(Number(y), Number(m) - 1 + 6, Number(d));
  return validade.toLocaleDateString('pt-BR');
};

export const mockDedetizacoes = [
  {
    id: 1,
    codigo: '024',
    condominio: 'Edifício Barão de Bocaina',
    empresa: 'DDD RIN',
    dataAgendada: '20/12/2026',
    periodoAgendado: 'Manhã',
    dataExecucao: '24/06/2026',
    temNota: true,
  },
  {
    id: 2,
    codigo: '079',
    condominio: 'Condomínio Residencial San Rafael',
    empresa: 'DDD RIN',
    dataAgendada: '22/12/2026',
    periodoAgendado: 'Manhã',
    dataExecucao: '29/06/2026',
    temNota: true,
  },
  {
    id: 3,
    codigo: '013',
    condominio: 'Condomínio Conjunto Jardim do Sol',
    empresa: 'DDD RIN',
    dataAgendada: '29/06/2026',
    periodoAgendado: 'Manhã',
    dataExecucao: null,
    temNota: false,
  },
  {
    id: 4,
    codigo: '045',
    condominio: 'Residencial Vista Mar',
    empresa: 'DDD RIN',
    dataAgendada: '05/07/2026',
    periodoAgendado: 'Tarde',
    dataExecucao: null,
    temNota: false,
  },
  {
    id: 5,
    codigo: '098',
    condominio: 'Residencial das Palmeiras',
    empresa: 'DDD RIN',
    dataAgendada: '18/05/2026', // passou
    periodoAgendado: 'Manhã',
    dataExecucao: '18/05/2026', 
    temNota: false,
  },
];

// O status no mock acima para o 5:
// executado em 18/05/2026. validade 18/11/2026. Se hoje < 18/11, deveria ser Realizado. Mas na imagem, o 098 é "Atrasado". 
// A imagem mostra: Data agendada 18/05/2026, Data execução 18/05/2026, Proxima 18/11/2026, e Status ATRASADO. 
// Isso implica que a data atual no screenshot é > 18/11/2026. 
// Para batermos certinho, as datas geradas dinamicamente farão esse trabalho, mas pros mocks vamos injetar o status manualmente pra refletir a imagem.

export const getMockDedetizacoes = () => {
  return mockDedetizacoes.map(d => {
    let statusCalc = calcularStatusDedetizacao(d.dataAgendada, d.dataExecucao);
    // Overrides para bater com a screenshot independente da data real atual:
    if (d.codigo === '013') statusCalc = 'Pendente';
    if (d.codigo === '045') statusCalc = 'Agendado';
    if (d.codigo === '098') statusCalc = 'Atrasado';

    return {
      ...d,
      status: statusCalc,
      validade: d.dataExecucao ? calcularValidade(d.dataExecucao) : null
    };
  });
};
