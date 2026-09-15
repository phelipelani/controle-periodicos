import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import {
  IcoCondominio,
  IcoCheck,
  IcoRelogio,
  IcoVencido,
  IcoDoc,
  IcoEdit,
  IcoAlertTriangle,
  IcoSeguro,
  IcoDownload,
  IcoUpload,
  IcoTrash,
  IcoCloud,
  IcoEye
} from '../icons';

function formatarData(dataStr) {
  if (!dataStr) return '—';
  const parts = dataStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dataStr;
}

function formatarMoeda(val) {
  if (val === null || val === undefined || val === '') return '—';
  const num = Number(val);
  if (isNaN(num)) return '—';
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarTamanho(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function renderBadge(status) {
  switch (status) {
    case 'ativo':
      return <span className="seg-badge ativo">Em dia</span>;
    case 'a_vencer':
      return <span className="seg-badge a_vencer">A vencer</span>;
    case 'vencido':
      return <span className="seg-badge vencido">Vencido</span>;
    default:
      return <span className="seg-badge sem_registro">Sem registro</span>;
  }
}

function renderTipoBadge(tipo) {
  const t = (tipo || '').toLowerCase();
  if (t.includes('apolice')) {
    return <span style={{ background: 'var(--danger-soft)', color: 'var(--danger-text)', border: '1px solid var(--danger)', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Apólice</span>;
  }
  if (t.includes('boleto') || t.includes('parcela')) {
    return <span style={{ background: 'var(--warning-soft)', color: 'var(--warning-text)', border: '1px solid var(--warning)', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Boleto / Parcela</span>;
  }
  if (t.includes('proposta')) {
    return <span style={{ background: 'var(--primary-soft)', color: 'var(--primary)', border: '1px solid var(--primary-glow)', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Proposta</span>;
  }
  if (t.includes('endosso')) {
    return <span style={{ background: 'var(--warning-soft)', color: 'var(--warning-text)', border: '1px solid var(--warning)', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Endosso</span>;
  }
  if (t.includes('sinistro')) {
    return <span style={{ background: 'var(--danger-soft)', color: 'var(--danger-text)', border: '1px solid var(--danger)', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Sinistro</span>;
  }
  return <span style={{ background: 'var(--neutral-badge-bg)', color: 'var(--neutral-badge-text)', border: '1px solid var(--border)', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>{tipo || 'Documento'}</span>;
}

// Coberturas padrão caso não venham do backend para exibição completa
const COBERTURAS_PADRAO_EXIBICAO = [
  { tipo: 'basica_simples', nome: 'Básica Simples (Incêndio)', limite: 4320000, preco: 338.40, franquia_pct: null, franquia_rs: null, sem_franquia: true },
  { tipo: 'danos_eletricos', nome: 'Danos Elétricos', limite: 30000, preco: 792.97, franquia_pct: 20, franquia_rs: 4000, sem_franquia: false },
  { tipo: 'desmoronamento', nome: 'Desmoronamento', limite: 100000, preco: 136.26, franquia_pct: 20, franquia_rs: 3000, sem_franquia: false },
  { tipo: 'impacto_veiculos', nome: 'Impacto de Veículos', limite: 50000, preco: 55.92, franquia_pct: 15, franquia_rs: 1000, sem_franquia: false },
  { tipo: 'incendio_bens', nome: 'Incêndio de Bens de Condôminos', limite: 900000, preco: 158.10, franquia_pct: null, franquia_rs: null, sem_franquia: true },
  { tipo: 'perda_aluguel', nome: 'Perda/Pagamento Aluguel p/Condôminos', limite: 50000, preco: 11.94, franquia_pct: null, franquia_rs: null, sem_franquia: true },
  { tipo: 'quebra_vidros', nome: 'Quebra de Vidros/Anúncios Luminosos', limite: 5000, preco: 73.74, franquia_pct: 10, franquia_rs: 500, sem_franquia: false }
];

export default function SeguroFichaDrawer({
  aberto,
  condominioId,
  onFechar,
  onEditar,
  onNotificar,
  podeEditarCadastrais
}) {
  const [abaAtiva, setAbaAtiva] = useState('ficha'); // 'ficha' | 'sinistros'
  const [ficha, setFicha] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  // Estados para novo sinistro
  const [mostrarNovoSinistro, setMostrarNovoSinistro] = useState(false);
  const [novoSinistro, setNovoSinistro] = useState({
    data: new Date().toISOString().split('T')[0],
    cobertura_acionada: 'Danos Elétricos',
    descricao: '',
    valor_reclamado: '',
    status: 'Em andamento',
    observacoes: ''
  });
  const [salvandoSinistro, setSalvandoSinistro] = useState(false);

  // Estados para upload de documentos (Apólice, Boletos, Propostas, Endossos)
  const [mostrarUploadDoc, setMostrarUploadDoc] = useState(false);
  const [arquivoDoc, setArquivoDoc] = useState(null);
  const [tipoDoc, setTipoDoc] = useState('Apólice');
  const [anoDoc, setAnoDoc] = useState(new Date().getFullYear());
  const [enviandoDoc, setEnviandoDoc] = useState(false);

  const carregarFicha = () => {
    if (!condominioId) return;
    setCarregando(true);
    api.get(`/seguros/${condominioId}`)
      .then((res) => {
        setFicha(res);
        setErro('');
        if (res?.apolice?.vigenciaFim) {
          const anoVig = res.apolice.vigenciaFim.split('-')[0];
          if (anoVig) setAnoDoc(Number(anoVig));
        }
      })
      .catch((err) => {
        setErro(err.message || 'Erro ao carregar dados do seguro.');
      })
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    if (aberto && condominioId) {
      setAbaAtiva('ficha');
      setMostrarNovoSinistro(false);
      setMostrarUploadDoc(false);
      setArquivoDoc(null);
      carregarFicha();
    }
  }, [aberto, condominioId]);

  if (!aberto) return null;

  const cond = ficha?.condominio || {};
  const apolice = ficha?.apolice || {};
  const coberturasDb = ficha?.coberturas || [];
  const sinistros = ficha?.sinistros || [];
  const documentos = ficha?.documentos || [];
  const auditoria = ficha?.auditoria || [];

  const apolicesDocs = documentos.filter((d) => (d.tipo || '').toLowerCase().includes('apolice') || (d.tipo || '').toLowerCase().includes('apólice'));
  const boletosDocs = documentos.filter((d) => (d.tipo || '').toLowerCase().includes('boleto') || (d.tipo || '').toLowerCase().includes('parcela'));

  // Cálculo da cobertura por unidade
  const coberturaUnidade = apolice.coberturaPorUnidade || 300000;
  const qtdAptos = cond.quantidadeApartamentos ?? cond.quantidade_apartamentos ?? 10;
  const coberturaTotalCalculada = coberturaUnidade * qtdAptos;

  // Montar lista de coberturas mesclando db ou padrões
  const coberturasExibicao = coberturasDb.length > 0 ? coberturasDb : COBERTURAS_PADRAO_EXIBICAO;

  const handleSalvarSinistro = async (e) => {
    e.preventDefault();
    if (!novoSinistro.descricao) {
      alert('Informe a descrição do sinistro.');
      return;
    }

    setSalvandoSinistro(true);
    try {
      await api.post(`/seguros/${condominioId}/sinistros`, novoSinistro);
      onNotificar?.('Sinistro registrado com sucesso!');
      setMostrarNovoSinistro(false);
      setNovoSinistro({
        data: new Date().toISOString().split('T')[0],
        cobertura_acionada: 'Danos Elétricos',
        descricao: '',
        valor_reclamado: '',
        status: 'Em andamento',
        observacoes: ''
      });
      carregarFicha();
    } catch (err) {
      alert(err.message || 'Erro ao salvar sinistro');
    } finally {
      setSalvandoSinistro(false);
    }
  };

  const handleUploadDocumento = async (e) => {
    e.preventDefault();
    if (!arquivoDoc) {
      alert('Selecione um arquivo para anexar.');
      return;
    }

    setEnviandoDoc(true);
    const formData = new FormData();
    formData.append('documento', arquivoDoc);
    formData.append('tipo', tipoDoc);
    formData.append('ano', String(anoDoc || new Date().getFullYear()));
    formData.append('codigo_condominio', String(cond.codigo || cond.id || condominioId).padStart(3, '0'));

    try {
      const res = await fetch(`/api/seguros/${condominioId}/documentos`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.erro || 'Falha no upload do documento');
      }

      onNotificar?.(`Documento (${tipoDoc}) anexado com sucesso!`);
      setArquivoDoc(null);
      setMostrarUploadDoc(false);
      carregarFicha();
    } catch (err) {
      alert(err.message || 'Erro ao enviar documento.');
    } finally {
      setEnviandoDoc(false);
    }
  };

  const handleExcluirDocumento = async (docId, nome) => {
    if (!window.confirm(`Deseja remover o documento "${nome}"?`)) return;
    try {
      await api.del(`/seguros/documentos/${docId}`);
      onNotificar?.('Documento excluído com sucesso.');
      carregarFicha();
    } catch (err) {
      alert(err.message || 'Erro ao excluir documento.');
    }
  };

  return (
    <div className={`seg-drawer ${aberto ? 'open' : ''}`}>
      {/* Drawer Header */}
      <div className="seg-drawer-header">
        <div>
          <div className="seg-drawer-title-row">
            <div className="seg-drawer-icon">
              <IcoCondominio />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)' }}>{cond.nome || 'Condomínio'}</h2>
                <span className="seg-code-badge">Cód. {cond.codigo}</span>
                {renderBadge(apolice.status)}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>
                Última atualização: {apolice.atualizadoEm ? new Date(apolice.atualizadoEm).toLocaleString('pt-BR') : '—'} • Por: {apolice.atualizadoPor || 'Administração'}
              </div>
            </div>
          </div>
        </div>
        <button type="button" className="seg-drawer-close" onClick={onFechar}>
          &times;
        </button>
      </div>

      {/* Tabs Simplificadas: Apenas Ficha do Seguro e Sub-aba Sinistros */}
      <div className="seg-drawer-tabs">
        <button
          type="button"
          className={`seg-drawer-tab ${abaAtiva === 'ficha' ? 'active' : ''}`}
          onClick={() => setAbaAtiva('ficha')}
        >
          📄 Ficha do Seguro & Documentos
        </button>
        <button
          type="button"
          className={`seg-drawer-tab ${abaAtiva === 'sinistros' ? 'active' : ''}`}
          onClick={() => setAbaAtiva('sinistros')}
        >
          ⚠️ Sinistros ({sinistros.length})
        </button>
      </div>

      {/* Drawer Body */}
      <div className="seg-drawer-body">
        {carregando ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Carregando detalhes do seguro...
          </div>
        ) : erro ? (
          <div style={{ background: 'var(--danger-soft)', color: 'var(--danger-text)', padding: '12px', borderRadius: '8px', border: '1px solid var(--danger)' }}>
            {erro}
          </div>
        ) : (
          <>
            {/* ABA PRINCIPAL: SEÇÕES CONTÍNUAS */}
            {abaAtiva === 'ficha' && (
              <>
                {/* 1° INFOS DO CONDOMÍNIO */}
                <div className="seg-card-section">
                  <div className="seg-card-header">
                    <div className="seg-card-title" style={{ color: 'var(--primary)' }}>
                      <span style={{ fontSize: '18px' }}>👤</span> 1° SUAS INFORMAÇÕES (CONDOMÍNIO)
                    </div>
                    {podeEditarCadastrais && (
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => onEditar(ficha)}
                      >
                        <IcoEdit /> Editar
                      </button>
                    )}
                  </div>

                  <div className="seg-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                    <div className="seg-card-item">
                      <label>Nome:</label>
                      <span>{cond.nome || 'CONDOMINIO EDIFICIO SAN FRANCISCO'}</span>
                    </div>
                    <div className="seg-card-item">
                      <label>CNPJ:</label>
                      <span>{cond.cnpj || '01.514.808/0001-50'}</span>
                    </div>
                    <div className="seg-card-item">
                      <label>E-mail:</label>
                      <span>{cond.email || 'rodrigo@setorlitoral.com.br'}</span>
                    </div>
                    <div className="seg-card-item">
                      <label>Tel:</label>
                      <span>{cond.telefone || '981234000'}</span>
                    </div>
                    <div className="seg-card-item" style={{ gridColumn: 'span 2' }}>
                      <label>Endereço de correspondência:</label>
                      <span>{cond.enderecoCorrespondencia || cond.endereco || 'R. ANA FRANCISCA FACHINI, 220, IMCOSTA'}</span>
                    </div>
                    <div className="seg-card-item">
                      <label>Bairro:</label>
                      <span>{cond.bairro || 'MARTIM DE SÁ'}</span>
                    </div>
                    <div className="seg-card-item">
                      <label>CEP:</label>
                      <span>{cond.cep || '11662-500'}</span>
                    </div>
                    <div className="seg-card-item">
                      <label>Cidade/UF:</label>
                      <span>{cond.cidade || 'Caraguatatuba'}/{cond.uf || 'SP'}</span>
                    </div>
                    <div className="seg-card-item">
                      <label>Qtd. Apartamentos:</label>
                      <span>{cond.quantidadeApartamentos ?? cond.quantidade_apartamentos ?? 10}</span>
                    </div>
                    <div className="seg-card-item">
                      <label>Tipo:</label>
                      <span>{cond.tipo || 'Vertical'}</span>
                    </div>
                    <div className="seg-card-item">
                      <label>Tem Elevador?</label>
                      <span>{cond.temElevador !== false ? 'Sim' : 'Não'}</span>
                    </div>
                    <div className="seg-card-item">
                      <label>Portão Automático?</label>
                      <span>{cond.temPortaoAutomatico !== false ? 'Sim' : 'Não'}</span>
                    </div>
                    <div className="seg-card-item">
                      <label>Funcionários Registrados?</label>
                      <span>{cond.quantidadeFuncionarios ?? cond.quantidade_funcionarios ?? 0}</span>
                    </div>
                  </div>
                </div>

                {/* 2° INFOS DO SEGURO */}
                <div className="seg-card-section">
                  <div className="seg-card-header">
                    <div className="seg-card-title" style={{ color: 'var(--primary)' }}>
                      <span style={{ fontSize: '18px' }}>🏠</span> 2° INFORMAÇÕES DO SEGURO
                    </div>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => onEditar(ficha)}
                    >
                      <IcoEdit /> Editar
                    </button>
                  </div>

                  <div className="seg-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                    <div className="seg-card-item" style={{ gridColumn: 'span 2' }}>
                      <label>Endereço do local segurado:</label>
                      <span>{apolice.enderecoLocalSegurado || cond.endereco || 'R. ANA FRANCISCA FACHINI, 220, IMCOSTA'}</span>
                    </div>
                    <div className="seg-card-item">
                      <label>Idade do imóvel:</label>
                      <span>{apolice.idadeCondominio || 'Acima de 30 anos'}</span>
                    </div>
                    <div className="seg-card-item">
                      <label>Quantidade de andares:</label>
                      <span>{apolice.quantidadeAndares || '6 a 10 Andares'}</span>
                    </div>
                    <div className="seg-card-item">
                      <label>Quantidade de elevadores:</label>
                      <span>{apolice.quantidadeElevadores ?? 1}</span>
                    </div>
                    <div className="seg-card-item">
                      <label>Quantidade de blocos:</label>
                      <span>{apolice.quantidadeBlocos ?? 1}</span>
                    </div>
                    <div className="seg-card-item">
                      <label>Categoria do risco:</label>
                      <span>{apolice.categoriaRisco || 'Apenas Residencial'}</span>
                    </div>
                    <div className="seg-card-item">
                      <label>Tipo de seguro:</label>
                      <span>{apolice.tipoSeguro || 'Renovação Allianz'}</span>
                    </div>
                    <div className="seg-card-item">
                      <label>Seguradora:</label>
                      <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{apolice.seguradora || 'Allianz'}</span>
                    </div>
                    <div className="seg-card-item">
                      <label>Corretora:</label>
                      <span>{apolice.corretora || 'Setor Seguros'}</span>
                    </div>
                    <div className="seg-card-item">
                      <label>N° da Apólice:</label>
                      <span style={{ fontWeight: 700 }}>{apolice.numeroApolice || '000000000000000'}</span>
                    </div>
                    <div className="seg-card-item">
                      <label>Produto / Ramo:</label>
                      <span>{apolice.produtoRamo || '16 - Condomínio'}</span>
                    </div>
                    <div className="seg-card-item">
                      <label>Modalidade:</label>
                      <span>{apolice.modalidade || 'Simples'}</span>
                    </div>
                    <div className="seg-card-item">
                      <label>Condições gerais:</label>
                      <span>{apolice.condicoesGerais || '04/2025'}</span>
                    </div>
                    <div className="seg-card-item">
                      <label>Limite Máximo de Garantia:</label>
                      <span style={{ color: 'var(--success)', fontWeight: 700 }}>{formatarMoeda(apolice.limiteMaximoGarantia || 5220000)}</span>
                    </div>
                    <div className="seg-card-item">
                      <label>Versão da tabela:</label>
                      <span>{apolice.versaoTabela || '34'}</span>
                    </div>
                    <div className="seg-card-item" style={{ gridColumn: 'span 2' }}>
                      <label>Vigência da apólice:</label>
                      <span style={{ color: apolice.status === 'vencido' ? 'var(--danger)' : 'var(--text-primary)' }}>
                        {formatarData(apolice.vigenciaInicio || '2025-06-05')} até {formatarData(apolice.vigenciaFim || '2026-06-05')}
                      </span>
                    </div>
                    <div className="seg-card-item">
                      <label>Contratação a valor de novo?</label>
                      <span style={{ color: 'var(--success)' }}>{apolice.valorDeNovo ? 'Sim' : 'Não'}</span>
                    </div>
                    {apolice.observacoes && (
                      <div className="seg-card-item" style={{ gridColumn: 'span 2' }}>
                        <label>Observações:</label>
                        <span>{apolice.observacoes}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3° PRINCIPAIS INFOS DE COBERTURA */}
                <div className="seg-card-section">
                  <div className="seg-card-header">
                    <div className="seg-card-title" style={{ color: 'var(--primary)' }}>
                      <span style={{ fontSize: '18px' }}>🛡️</span> 3° PRINCIPAIS INFOS DE COBERTURA
                    </div>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => onEditar(ficha)}
                    >
                      <IcoEdit /> Editar
                    </button>
                  </div>

                  {/* Banner Destaque de Cobertura por Unidade */}
                  <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Cobertura por Unidade:</span>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                        {formatarMoeda(coberturaUnidade)}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Qtd. de Apartamentos:</span>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                        {qtdAptos} unidades
                      </div>
                    </div>
                    <div style={{ background: 'var(--bg-surface)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 700, textTransform: 'uppercase' }}>
                        COBERTURA TOTAL (INCÊNDIO)
                      </span>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--success)', marginTop: '2px' }}>
                        {formatarMoeda(coberturaTotalCalculada)}
                      </div>
                    </div>
                  </div>

                  {/* Tabela de Coberturas */}
                  <div style={{ overflowX: 'auto', marginTop: '6px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', borderBottom: '2px solid var(--border)' }}>
                          <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700 }}>COBERTURAS</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>Limite Máximo de Indenização</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>Preço por Cobertura</th>
                          <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, borderLeft: '1px solid var(--border)' }} colSpan="2">
                            Franquia
                          </th>
                        </tr>
                        <tr style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', fontSize: '11px', borderBottom: '1px solid var(--border)' }}>
                          <th colSpan="3"></th>
                          <th style={{ padding: '4px 8px', textAlign: 'center', width: '50px' }}>%</th>
                          <th style={{ padding: '4px 8px', textAlign: 'right', width: '100px' }}>R$</th>
                        </tr>
                      </thead>
                      <tbody>
                        {coberturasExibicao.map((cob, idx) => {
                          const isTotal = cob.nome?.toLowerCase().includes('incêndio') || cob.nome?.toLowerCase().includes('basica') || cob.nome?.toLowerCase().includes('básica');
                          return (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)', background: idx % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-surface-elevated)' }}>
                              <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {cob.nome} {isTotal && <span style={{ color: 'var(--success)', fontSize: '11px', fontWeight: 700 }}> (Cobertura Básica)</span>}
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: isTotal ? 'var(--success)' : 'var(--text-primary)' }}>
                                {formatarMoeda(cob.limite_indenizacao || cob.limite)}
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                                {cob.premio ? formatarMoeda(cob.premio) : '-'}
                              </td>
                              <td style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                {cob.franquia_percentual != null ? `${cob.franquia_percentual}%` : (cob.franquia_pct ? `${cob.franquia_pct}%` : '-')}
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                                {cob.sem_franquia ? 'Sem Franquia' : (cob.franquia_reais ? formatarMoeda(cob.franquia_reais) : (cob.franquia_rs ? formatarMoeda(cob.franquia_rs) : 'Sem Franquia'))}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 4° SEÇÃO: DOCUMENTOS & BOLETOS DA APÓLICE */}
                <div className="seg-card-section" style={{ border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div className="seg-card-header" style={{ flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div className="seg-card-title" style={{ color: 'var(--text-primary)', fontSize: '15px' }}>
                        <span style={{ fontSize: '18px' }}>📂</span> 4° DOCUMENTOS & BOLETOS DA APÓLICE ({documentos.length})
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Nuvem: <code style={{ background: 'var(--bg-surface-elevated)', padding: '2px 5px', borderRadius: '4px', color: 'var(--primary)' }}>CONDOMÍNIOS/SEGUROS/{anoDoc}/{String(cond.codigo || cond.id).padStart(3, '0')}/</code>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="seg-btn-primary"
                      style={{ padding: '7px 14px', fontSize: '12px' }}
                      onClick={() => setMostrarUploadDoc(!mostrarUploadDoc)}
                    >
                      <IcoUpload /> {mostrarUploadDoc ? 'Cancelar anexo' : '+ Anexar Apólice / Boleto'}
                    </button>
                  </div>

                  {/* Formulário de Upload de Documentos */}
                  {mostrarUploadDoc && (
                    <form onSubmit={handleUploadDocumento} style={{ background: 'var(--bg-surface-elevated)', border: '1px dashed var(--border)', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <IcoUpload /> Anexar Novo Arquivo ao Seguro
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Tipo de Documento *</label>
                          <select
                            className="seg-input"
                            style={{ width: '100%' }}
                            value={tipoDoc}
                            onChange={(e) => setTipoDoc(e.target.value)}
                            required
                          >
                            <option value="Apólice">Apólice (PDF Oficial)</option>
                            <option value="Boleto / Parcela">Boleto / Parcela</option>
                            <option value="Proposta">Proposta Comercial</option>
                            <option value="Endosso">Endosso</option>
                            <option value="Comprovante de Sinistro">Comprovante de Sinistro</option>
                            <option value="Outro">Outro Documento</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Ano de Referência</label>
                          <input
                            type="number"
                            className="seg-input"
                            style={{ width: '100%' }}
                            value={anoDoc}
                            onChange={(e) => setAnoDoc(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Arquivo (PDF, Imagem, Docx) *</label>
                        <input
                          type="file"
                          className="seg-input"
                          style={{ width: '100%', background: 'var(--bg-input)' }}
                          onChange={(e) => setArquivoDoc(e.target.files[0] || null)}
                          required
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                        <button type="button" className="seg-btn-cancel" onClick={() => setMostrarUploadDoc(false)}>
                          Cancelar
                        </button>
                        <button type="submit" className="seg-btn-primary" disabled={enviandoDoc || !arquivoDoc}>
                          {enviandoDoc ? 'Enviando arquivo...' : 'Salvar e Enviar para a Nuvem'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Lista de Documentos Anexados */}
                  {documentos.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 16px', background: 'var(--bg-surface-elevated)', borderRadius: '8px', border: '1px dashed var(--border)' }}>
                      <div style={{ fontSize: '28px', marginBottom: '6px' }}>📄</div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Nenhum documento ou boleto anexado a este condomínio ainda.
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', marginBottom: '12px' }}>
                        Anexe a apólice oficial em PDF e os boletos das parcelas do seguro.
                      </div>
                      <button
                        type="button"
                        className="seg-btn-primary"
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                        onClick={() => setMostrarUploadDoc(true)}
                      >
                        + Anexar Apólice ou Boleto Agora
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {documentos.map((doc) => {
                        const relativePath = doc.caminho ? doc.caminho.replace(/\\/g, '/').replace(/.*(adm\/seguros\/.*)/i, '$1') : `adm/seguros/${doc.ano || 2026}/${cond.codigo}/${doc.nome_arquivo}`;
                        const previewUrl = `/api/upload/preview?path=${encodeURIComponent(doc.caminho)}`;
                        const downloadUrl = `/api/upload/download?path=${encodeURIComponent(doc.caminho)}&nome=${encodeURIComponent(doc.nome_arquivo)}`;

                        return (
                          <div
                            key={doc.id}
                            style={{
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border)',
                              borderRadius: '8px',
                              padding: '12px 14px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '12px',
                              flexWrap: 'wrap'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '240px' }}>
                              <div
                                style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '8px',
                                  background: doc.nome_arquivo?.toLowerCase().endsWith('.pdf') ? 'var(--danger-soft)' : 'var(--bg-surface-elevated)',
                                  color: doc.nome_arquivo?.toLowerCase().endsWith('.pdf') ? 'var(--danger)' : 'var(--text-secondary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 700,
                                  fontSize: '11px',
                                  flexShrink: 0
                                }}
                              >
                                {doc.nome_arquivo?.split('.').pop()?.toUpperCase() || 'FILE'}
                              </div>

                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                                    {doc.nome_arquivo}
                                  </span>
                                  {renderTipoBadge(doc.tipo)}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  <span>{formatarTamanho(doc.tamanho)}</span> • <span>Ano {doc.ano || '—'}</span> • <span>Enviado em {doc.criado_em ? new Date(doc.criado_em).toLocaleDateString('pt-BR') : '—'} por {doc.uploaded_by_nome || 'Sistema'}</span>
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', fontFamily: 'monospace' }}>
                                  {relativePath}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <a
                                href={previewUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="seg-btn-outline"
                                title="Visualizar documento"
                              >
                                <IcoEye /> Visualizar
                              </a>

                              <a
                                href={downloadUrl}
                                download={doc.nome_arquivo}
                                className="seg-btn-outline"
                                title="Baixar arquivo para o computador"
                              >
                                <IcoDownload /> Baixar
                              </a>

                              <a
                                href={previewUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="seg-btn-cloud"
                                title="Abrir arquivo armazenado na nuvem"
                              >
                                <IcoCloud /> Abrir na nuvem
                              </a>

                              <button
                                type="button"
                                className="seg-btn-icon"
                                style={{ color: 'var(--danger)' }}
                                title="Excluir documento"
                                onClick={() => handleExcluirDocumento(doc.id, doc.nome_arquivo)}
                              >
                                <IcoTrash />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 5° HISTÓRICO DE AUDITORIA & ALTERAÇÕES */}
                <div className="seg-card-section">
                  <div className="seg-card-header">
                    <div className="seg-card-title" style={{ color: 'var(--primary)' }}>
                      <span style={{ fontSize: '18px' }}>📜</span> 5° HISTÓRICO DE AUDITORIA & ALTERAÇÕES
                    </div>
                  </div>

                  {auditoria.length === 0 ? (
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      Nenhum registro de alteração anterior.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {auditoria.map((log) => (
                        <div key={log.id} style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', fontSize: '13px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.usuario_nome || 'Usuário'} ({log.papel || 'perfil'})</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {log.criado_em ? new Date(log.criado_em).toLocaleString('pt-BR') : '—'}
                            </span>
                          </div>

                          <div style={{ color: 'var(--text-secondary)' }}>
                            {log.campo ? (
                              <>
                                Alterou <strong>{log.campo}</strong> de <code style={{ background: 'var(--danger-soft)', color: 'var(--danger-text)', padding: '2px 4px', borderRadius: '4px' }}>{log.valor_anterior || '—'}</code> para <code style={{ background: 'var(--success-soft)', color: 'var(--success-text)', padding: '2px 4px', borderRadius: '4px' }}>{log.valor_novo || '—'}</code>
                              </>
                            ) : (
                              <span>{log.acao}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* SUB-ABA: HISTÓRICO DE SINISTROS */}
            {abaAtiva === 'sinistros' && (
              <div className="seg-card-section">
                <div className="seg-card-header">
                  <div className="seg-card-title" style={{ color: 'var(--primary)' }}>
                    <IcoAlertTriangle /> Histórico e Acompanhamento de Sinistros
                  </div>
                  <button
                    type="button"
                    className="seg-btn-primary"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                    onClick={() => setMostrarNovoSinistro(!mostrarNovoSinistro)}
                  >
                    {mostrarNovoSinistro ? 'Cancelar' : '+ Registrar novo sinistro'}
                  </button>
                </div>

                {mostrarNovoSinistro && (
                  <form onSubmit={handleSalvarSinistro} style={{ background: 'var(--bg-surface-elevated)', padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>Novo Registro de Sinistro</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Data do Ocorrido *</label>
                        <input
                          type="date"
                          className="seg-input"
                          style={{ width: '100%' }}
                          value={novoSinistro.data}
                          onChange={(e) => setNovoSinistro({ ...novoSinistro, data: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Cobertura Acionada</label>
                        <select
                          className="seg-input"
                          style={{ width: '100%' }}
                          value={novoSinistro.cobertura_acionada}
                          onChange={(e) => setNovoSinistro({ ...novoSinistro, cobertura_acionada: e.target.value })}
                        >
                          <option value="Danos Elétricos">Danos Elétricos</option>
                          <option value="Básica Simples (Incêndio)">Básica Simples (Incêndio)</option>
                          <option value="Desmoronamento">Desmoronamento</option>
                          <option value="Impacto de Veículos">Impacto de Veículos</option>
                          <option value="Incêndio de Bens de Condôminos">Incêndio de Bens de Condôminos</option>
                          <option value="Perda/Pagamento Aluguel">Perda/Pagamento Aluguel</option>
                          <option value="Quebra de Vidros">Quebra de Vidros</option>
                          <option value="Outro">Outro</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Valor Reclamado (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Ex: 85000.00"
                          className="seg-input"
                          style={{ width: '100%' }}
                          value={novoSinistro.valor_reclamado}
                          onChange={(e) => setNovoSinistro({ ...novoSinistro, valor_reclamado: e.target.value })}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Status do Sinistro</label>
                        <select
                          className="seg-input"
                          style={{ width: '100%' }}
                          value={novoSinistro.status}
                          onChange={(e) => setNovoSinistro({ ...novoSinistro, status: e.target.value })}
                        >
                          <option value="Aberto">Aberto</option>
                          <option value="Em andamento">Em andamento</option>
                          <option value="Em análise">Em análise</option>
                          <option value="Aprovado">Aprovado</option>
                          <option value="Negado">Negado</option>
                          <option value="Encerrado">Encerrado</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Descrição dos Danos *</label>
                      <textarea
                        rows="3"
                        className="seg-input"
                        style={{ width: '100%', resize: 'vertical' }}
                        placeholder="Ex: Curto-circuito na casa de máquinas do elevador..."
                        value={novoSinistro.descricao}
                        onChange={(e) => setNovoSinistro({ ...novoSinistro, descricao: e.target.value })}
                        required
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button type="button" className="seg-btn-cancel" onClick={() => setMostrarNovoSinistro(false)}>Cancelar</button>
                      <button type="submit" className="seg-btn-primary" disabled={salvandoSinistro}>
                        {salvandoSinistro ? 'Salvando...' : 'Salvar Sinistro'}
                      </button>
                    </div>
                  </form>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {sinistros.length === 0 ? (
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      Nenhum histórico de sinistro cadastrado.
                    </div>
                  ) : (
                    sinistros.map((sin) => (
                      <div key={sin.id} style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>{sin.cobertura_acionada || 'Sinistro'}</span>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>• Ocorrido em {formatarData(sin.data)}</span>
                          </div>
                          <span style={{ background: 'var(--warning-soft)', color: 'var(--warning-text)', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                            {sin.status}
                          </span>
                        </div>

                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '8px 0' }}>
                          {sin.descricao}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                          <span>Valor Reclamado: <strong style={{ color: 'var(--danger)' }}>{formatarMoeda(sin.valor_reclamado)}</strong></span>
                          <span>Registrado por: {sin.registrado_por_nome || 'Sistema'}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Drawer Footer */}
      <div className="seg-drawer-footer">
        <button type="button" className="seg-btn-cancel" onClick={onFechar}>
          Fechar
        </button>
        <button
          type="button"
          className="seg-btn-primary"
          onClick={() => {
            onFechar();
            onEditar(ficha);
          }}
        >
          <IcoEdit /> Editar dados
        </button>
      </div>
    </div>
  );
}

