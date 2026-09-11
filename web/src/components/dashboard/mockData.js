// mockData.js
// Mock estruturado de Condomínios e Serviços para preencher o Dashboard dinamicamente.

export const tiposServico = [
  { id: 'seguro', nome: 'Seguros', cor: '#D71920' },
  { id: 'extintores', nome: 'Extintores', cor: '#2563EB' }, 
  { id: 'dedetizacao', nome: 'Dedetização', cor: '#16A34A' },
  { id: 'reservatorios', nome: 'Reservatórios', cor: '#0284C7' },
  { id: 'avcb', nome: 'AVCB', cor: '#475569' },
  { id: 'spda', nome: 'SPDA', cor: '#8B5CF6' }
];

export const calcularStatus = (dataValidade) => {
  if (!dataValidade) return 'sem_registro';
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const val = new Date(dataValidade);
  const [y, m, d] = dataValidade.split('-');
  const dataReal = new Date(y, m - 1, d);
  
  const diffTime = dataReal - hoje;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return { status: 'vencido', diasRestantes: diffDays };
  if (diffDays <= 30) return { status: 'a_vencer', diasRestantes: diffDays };
  return { status: 'em_dia', diasRestantes: diffDays };
};

export const gerarMockDashboard = () => {
  const condominios = [];
  const servicosInstanciados = [];
  const atividades = [];
  const hoje = new Date();

  for (let i = 1; i <= 124; i++) {
    const cod = String(i).padStart(3, '0');
    condominios.push({ 
      id: i, 
      codigo: cod, 
      nome: i === 1 ? 'Edifício Barão de Bocaina' : 
            i === 2 ? 'Residencial San Rafael' : 
            i === 3 ? 'Conjunto Jardim do Sol' : 
            i === 4 ? 'Residencial Azul Marinho' :
            i === 5 ? 'Residencial Vista Mar' : 
            `Condomínio Exemplo ${i}` 
    });
  }

  condominios.forEach((cond) => {
    tiposServico.forEach((tipo) => {
      // 14% sem registro
      if (Math.random() < 0.14) {
        return; 
      }

      const rand = Math.random();
      let statusAlvo = 'em_dia';
      if (rand < 0.08) statusAlvo = 'vencido';
      else if (rand < 0.20) statusAlvo = 'a_vencer';

      let dtValidade = new Date();
      if (statusAlvo === 'vencido') {
        dtValidade.setDate(dtValidade.getDate() - Math.floor(Math.random() * 60) - 1);
      } else if (statusAlvo === 'a_vencer') {
        dtValidade.setDate(dtValidade.getDate() + Math.floor(Math.random() * 29));
      } else {
        dtValidade.setDate(dtValidade.getDate() + Math.floor(Math.random() * 300) + 31);
      }

      servicosInstanciados.push({
        id: `${cond.id}-${tipo.id}`,
        condominioId: cond.id,
        condominioNome: cond.nome,
        codigoCondominio: cond.codigo,
        servicoId: tipo.id,
        servicoNome: tipo.nome,
        dataValidade: dtValidade.toISOString().split('T')[0],
      });
    });
  });

  const nomesAcoes = ['cadastrado', 'renovado', 'atualizado'];
  for (let i = 0; i < 6; i++) {
    const acao = nomesAcoes[Math.floor(Math.random() * nomesAcoes.length)];
    const srv = tiposServico[Math.floor(Math.random() * tiposServico.length)];
    atividades.push({
      id: i,
      descricao: `${srv.nome} do Condomínio ${Math.floor(Math.random() * 100)+1} ${acao}`,
      servicoNome: srv.nome,
      hora: `Hoje, 0${8+i}:${Math.floor(Math.random()*50)+10}`
    });
  }

  const servicosComStatus = servicosInstanciados.map(s => {
    const calc = calcularStatus(s.dataValidade);
    return {
      ...s,
      statusCalc: calc.status,
      diasRestantes: calc.diasRestantes
    };
  });

  return { condominios, servicos: servicosComStatus, atividades };
};
