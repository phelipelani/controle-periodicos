import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import '../adesao.css';

// Ícones visuais de acordo com o nome da categoria
const getCategoryIcon = (nome = '') => {
  const n = nome.toLowerCase();
  if (n.includes('cobertura') || n.includes('duplex') || n.includes('triplex')) return '🏰';
  if (n.includes('loja') || n.includes('comercial') || n.includes('sala')) return '🏪';
  if (n.includes('casa') || n.includes('sobrado')) return '🏡';
  return '🏢';
};

export default function AdesaoDedetizacao() {
  const { token } = useParams();
  
  // Estado de Carregamento & Dados da API
  const [carregando, setCarregando] = useState(true);
  const [erroApi, setErroApi] = useState('');
  const [dadosAgendamento, setDadosAgendamento] = useState(null);

  // Estados do Fluxo (3 Etapas)
  // 1: Escolha do Tipo da Unidade | 2: Dados da Unidade e Método | 3: Confirmação
  const [etapaAtual, setEtapaAtual] = useState(1);

  // Form State
  const [tipoUnidadeSelecionada, setTipoUnidadeSelecionada] = useState('');
  const [metodoAplicacao, setMetodoAplicacao] = useState('Pulverização Líquida (Garantia 6 meses)');
  const [unidade, setUnidade] = useState('');
  const [bloco, setBloco] = useState('');
  const [nomeMorador, setNomeMorador] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [concordouTermos, setConcordouTermos] = useState(false);

  // Erros de Validação por Campo
  const [errosCampos, setErrosCampos] = useState({});

  // Modais
  const [modalMetodosAberto, setModalMetodosAberto] = useState(false);
  const [modalSegurancaAberto, setModalSegurancaAberto] = useState(false);

  // Estado de Envio
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(null);
  const [erroEnvio, setErroEnvio] = useState('');

  // Fechar modal com tecla ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setModalMetodosAberto(false);
        setModalSegurancaAberto(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Carregar dados públicos do agendamento
  useEffect(() => {
    async function carregarDados() {
      try {
        setCarregando(true);
        setErroApi('');
        const res = await fetch(`/api/agendamentos/adesao/${token}`, {
          headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.erro || 'Agendamento não encontrado.');
        
        setDadosAgendamento(json);

        // Define a primeira categoria como padrão
        if (json.tipos_unidades && json.tipos_unidades.length > 0) {
          setTipoUnidadeSelecionada(json.tipos_unidades[0].nome);
        }
      } catch (err) {
        setErroApi(err.message || 'Não foi possível carregar as informações do agendamento.');
      } finally {
        setCarregando(false);
      }
    }
    if (token) carregarDados();
  }, [token]);

  // Formatação de data brasileira
  const formatarData = (dataIso) => {
    if (!dataIso) return 'A definir';
    const [ano, mes, dia] = dataIso.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  // Lista de categorias/unidades dinâmicas do agendamento
  const listaTiposUnidades = dadosAgendamento?.tipos_unidades && dadosAgendamento.tipos_unidades.length > 0
    ? dadosAgendamento.tipos_unidades
    : [{ nome: 'Apartamento Padrão', valor: 80 }];

  // Objeto do tipo selecionado
  const tipoObjAtual = listaTiposUnidades.find(t => t.nome === tipoUnidadeSelecionada) || listaTiposUnidades[0];
  const valorAtual = Number(tipoObjAtual?.valor) || 80;

  // Navegação entre etapas com validação
  const avancarParaEtapa2 = () => {
    setEtapaAtual(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const avancarParaEtapa3 = () => {
    const novosErros = {};
    if (!unidade.trim()) {
      novosErros.unidade = 'Informe o número da sua unidade / apartamento.';
    }
    if (!nomeMorador.trim()) {
      novosErros.nomeMorador = 'Informe o nome do morador ou responsável.';
    }

    if (Object.keys(novosErros).length > 0) {
      setErrosCampos(novosErros);
      return;
    }

    setErrosCampos({});
    setEtapaAtual(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const voltarEtapa = (etapaDestino) => {
    setEtapaAtual(etapaDestino);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Envio Final da Adesão
  const handleConfirmarAdesao = async () => {
    if (!concordouTermos) {
      alert('Por favor, confirme que está ciente das orientações e valor marcando a caixa de aceite.');
      return;
    }

    try {
      setEnviando(true);
      setErroEnvio('');

      const payload = {
        unidade: unidade.trim(),
        bloco: bloco.trim() || null,
        nome_morador: nomeMorador.trim(),
        tipo_unidade: tipoObjAtual.nome,
        metodo: metodoAplicacao,
        valor: valorAtual,
        observacoes: observacoes.trim() || null
      };

      const res = await fetch(`/api/agendamentos/adesao/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.erro || 'Erro ao registrar sua adesão.');
      }

      setSucesso({
        unidade: unidade.trim(),
        bloco: bloco.trim(),
        nome: nomeMorador.trim(),
        tipoUnidade: tipoObjAtual.nome,
        metodo: metodoAplicacao,
        valor: valorAtual,
        dataPrevista: dadosAgendamento.data_agendada,
        periodo: dadosAgendamento.periodo
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setErroEnvio(err.message || 'Falha ao processar sua adesão. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  // -------------------------------------------------------------
  // ESTADO: CARREGANDO
  // -------------------------------------------------------------
  if (carregando) {
    return (
      <div className="adesao-page">
        <div className="adesao-container" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div className="adesao-spinner" style={{ width: '36px', height: '36px', borderColor: 'rgba(124,58,237,0.2)', borderTopColor: '#7C3AED' }}></div>
            <p style={{ marginTop: '16px', color: '#5B6880', fontSize: '16px', fontWeight: '600' }}>
              Carregando portal de adesão...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // ESTADO: ERRO OU TOKEN INVÁLIDO
  // -------------------------------------------------------------
  if (erroApi && !dadosAgendamento) {
    return (
      <div className="adesao-page">
        <div className="adesao-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div className="adesao-card" style={{ maxWidth: '480px', width: '100%', textAlign: 'center', padding: '36px 24px' }}>
            <img src="/logo_Imcosta_Oficial.png" alt="iMCOSTA" className="adesao-logo-img" style={{ marginBottom: '20px' }} />
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#FEF2F2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '26px' }}>
              ✕
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#172033', margin: '0 0 8px' }}>Link Indisponível</h2>
            <p style={{ color: '#5B6880', fontSize: '15px', lineHeight: '1.5', margin: '0 0 24px' }}>
              {erroApi}
            </p>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px', fontSize: '13.5px', color: '#475569', textAlign: 'left' }}>
              📌 <strong>Dica:</strong> Verifique se você acessou o link completo enviado no comunicado do seu condomínio ou entre em contato com a administração.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // ESTADO: AGENDAMENTO EXPIRADO
  // -------------------------------------------------------------
  if (dadosAgendamento?.expirado && !sucesso) {
    return (
      <div className="adesao-page">
        <div className="adesao-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div className="adesao-card" style={{ maxWidth: '520px', width: '100%', textAlign: 'center', padding: '36px 24px' }}>
            <img src="/logo_Imcosta_Oficial.png" alt="iMCOSTA" className="adesao-logo-img" style={{ marginBottom: '20px' }} />
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#FFF7E6', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '26px' }}>
              ⏱️
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#172033', margin: '0 0 8px' }}>Prazo de Adesão Encerrado</h2>
            <p style={{ color: '#5B6880', fontSize: '15px', lineHeight: '1.5', margin: '0 0 20px' }}>
              O período de adesões online para o <strong>{dadosAgendamento.condominio_nome}</strong> encerrou no dia <strong>{formatarData(dadosAgendamento.data_agendada)}</strong>.
            </p>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px', fontSize: '13.5px', color: '#475569', textAlign: 'left' }}>
              Caso ainda deseje verificar a possibilidade de atendimento, entre em contato diretamente com a portaria ou administração do condomínio.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // ESTADO: SUCESSO (ADESÃO CONFIRMADA)
  // -------------------------------------------------------------
  if (sucesso) {
    return (
      <div className="adesao-page">
        <div className="adesao-container">
          <div className="adesao-success-card">
            <img src="/logo_Imcosta_Oficial.png" alt="iMCOSTA" className="adesao-logo-img" style={{ marginBottom: '20px' }} />
            
            <div className="success-icon-badge">✓</div>
            <h2 className="success-title">Adesão confirmada!</h2>
            <p className="success-msg">
              Recebemos sua solicitação para a <strong>unidade {sucesso.unidade} {sucesso.bloco ? `(${sucesso.bloco})` : ''}</strong>.
            </p>

            {/* Resumo da Confirmação */}
            <div className="confirmation-summary-box" style={{ textAlign: 'left', margin: '20px 0' }}>
              <div className="conf-row">
                <span className="conf-label">Condomínio:</span>
                <span className="conf-val">{dadosAgendamento.condominio_nome}</span>
              </div>
              <div className="conf-row">
                <span className="conf-label">Unidade:</span>
                <span className="conf-val">{sucesso.unidade} {sucesso.bloco ? `(${sucesso.bloco})` : ''}</span>
              </div>
              <div className="conf-row">
                <span className="conf-label">Responsável:</span>
                <span className="conf-val">{sucesso.nome}</span>
              </div>
              <div className="conf-row">
                <span className="conf-label">Tipo do Imóvel:</span>
                <span className="conf-val" style={{ color: '#7C3AED' }}>{sucesso.tipoUnidade}</span>
              </div>
              <div className="conf-row">
                <span className="conf-label">Método Escolhido:</span>
                <span className="conf-val">{sucesso.metodo}</span>
              </div>
              <div className="conf-row">
                <span className="conf-label">Data Prevista:</span>
                <span className="conf-val">{formatarData(sucesso.dataPrevista)} ({sucesso.periodo || 'Manhã'})</span>
              </div>
              <div className="conf-row">
                <span className="conf-label">Valor a Pagar:</span>
                <span className="conf-val highlight">R$ {Number(sucesso.valor).toFixed(2).replace('.', ',')}</span>
              </div>
            </div>

            {/* Aviso de Cobrança */}
            <div className="adesao-billing-card" style={{ textAlign: 'left' }}>
              <span className="adesao-billing-icon">💳</span>
              <div>
                <strong>Forma de Cobrança:</strong> O valor será cobrado junto à taxa condominial do mês seguinte à dedetização.
              </div>
            </div>

            <div style={{ background: '#ECFDF3', border: '1px solid #A7F3D0', borderRadius: '10px', padding: '14px', fontSize: '13.5px', color: '#065F46', textAlign: 'left', marginBottom: '20px', lineHeight: '1.45' }}>
              ✓ <strong>A administração recebeu sua adesão.</strong> Você receberá a confirmação pelo canal definido pela administração. Na data agendada, certifique-se de que haverá alguém na unidade ou autorização prévia na portaria.
            </div>

            <button
              type="button"
              className="btn-primary-gradient"
              onClick={() => window.print()}
            >
              🖨️ Imprimir / Salvar Comprovante
            </button>
          </div>
        </div>

        <footer className="adesao-footer">
          iMCOSTA — Tecnologia e Gestão para condomínios.
        </footer>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDERIZAÇÃO PRINCIPAL DO PORTAL (FLUXO 3 ETAPAS)
  // -------------------------------------------------------------
  return (
    <div className="adesao-page">
      <div className="adesao-container">
        {/* Cabeçalho */}
        <header className="adesao-header">
          <div className="adesao-logo-wrap">
            <img src="/logo_Imcosta_Oficial.png" alt="iMCOSTA" className="adesao-logo-img" />
          </div>

          <div>
            <div className="adesao-header-badge">
              🛡️ Portal de Adesão
            </div>
            <h1 className="adesao-title">Adesão de Dedetização</h1>
            <p className="adesao-subtitle">{dadosAgendamento.condominio_nome}</p>
          </div>
        </header>

        {/* Informações do Agendamento (Somente leitura) */}
        <section className="adesao-meta-grid" aria-label="Informações do Agendamento">
          <div className="adesao-meta-chip">
            <span className="adesao-meta-label">📅 Data Prevista</span>
            <span className="adesao-meta-val">{formatarData(dadosAgendamento.data_agendada)}</span>
          </div>
          <div className="adesao-meta-chip">
            <span className="adesao-meta-label">🕐 Período</span>
            <span className="adesao-meta-val">{dadosAgendamento.periodo || 'Manhã'}</span>
          </div>
          <div className="adesao-meta-chip">
            <span className="adesao-meta-label">🏢 Empresa</span>
            <span className="adesao-meta-val">{dadosAgendamento.empresa || 'DDDRIN'}</span>
          </div>
        </section>

        {/* Indicador de Progresso em 3 Etapas */}
        <nav className="adesao-steps" aria-label="Progresso da Adesão">
          {/* Mobile indicator */}
          <div className="adesao-steps-mobile">
            <span className="adesao-steps-text">
              {etapaAtual === 1 && '1. Tipo do imóvel'}
              {etapaAtual === 2 && '2. Dados da unidade'}
              {etapaAtual === 3 && '3. Confirmação'}
            </span>
            <span className="adesao-steps-pill">{etapaAtual} de 3</span>
          </div>
          <div className="adesao-progress-bar">
            <div 
              className="adesao-progress-fill" 
              style={{ width: etapaAtual === 1 ? '33.33%' : etapaAtual === 2 ? '66.66%' : '100%' }}
            />
          </div>

          {/* Desktop indicator */}
          <div className="adesao-steps-desktop">
            <div className={`step-item ${etapaAtual === 1 ? 'active' : etapaAtual > 1 ? 'completed' : ''}`}>
              <span className="step-num">{etapaAtual > 1 ? '✓' : '1'}</span>
              <span>1. Tipo do imóvel</span>
            </div>
            <div style={{ flex: 1, height: '2px', background: etapaAtual > 1 ? '#7C3AED' : '#E2E8F0', margin: '0 10px' }} />
            <div className={`step-item ${etapaAtual === 2 ? 'active' : etapaAtual > 2 ? 'completed' : ''}`}>
              <span className="step-num">{etapaAtual > 2 ? '✓' : '2'}</span>
              <span>2. Dados da unidade</span>
            </div>
            <div style={{ flex: 1, height: '2px', background: etapaAtual > 2 ? '#7C3AED' : '#E2E8F0', margin: '0 10px' }} />
            <div className={`step-item ${etapaAtual === 3 ? 'active' : ''}`}>
              <span className="step-num">3</span>
              <span>3. Confirmação</span>
            </div>
          </div>
        </nav>

        {/* Layout Principal */}
        <div className="adesao-layout">
          {/* Coluna de Conteúdo Interativo */}
          <main className="adesao-main">
            {/* ETAPA 1: ESCOLHA DO TIPO DE UNIDADE (CARDS DINÂMICOS CONFORME O CADASTRO) */}
            {etapaAtual === 1 && (
              <div className="adesao-card">
                <div className="adesao-section-header">
                  <h2 className="adesao-section-title">Escolha o tipo da sua unidade</h2>
                  <p className="adesao-section-subtitle">Selecione a categoria correspondente ao seu imóvel no condomínio.</p>
                </div>

                <div className="service-cards-list">
                  {listaTiposUnidades.map((tipo, idx) => {
                    const isSelected = tipoUnidadeSelecionada === tipo.nome;
                    const preco = Number(tipo.valor) || 0;
                    const icon = getCategoryIcon(tipo.nome);

                    return (
                      <div
                        key={idx}
                        className={`service-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => setTipoUnidadeSelecionada(tipo.nome)}
                        role="radio"
                        aria-checked={isSelected}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === ' ' || e.key === 'Enter') {
                            setTipoUnidadeSelecionada(tipo.nome);
                          }
                        }}
                      >
                        <div className="service-card-top">
                          <div>
                            <div style={{ fontSize: '24px', marginBottom: '4px' }}>{icon}</div>
                            <h3 className="service-title">{tipo.nome}</h3>
                          </div>
                          <div className="service-price-box">
                            <span className="service-price-val">R$ {preco.toFixed(2).replace('.', ',')}</span>
                            <span className="service-price-sub">por unidade</span>
                          </div>
                        </div>

                        <p className="service-desc">
                          Dedetização interna completa para esta categoria de imóvel no condomínio.
                        </p>

                        <div className="service-benefits-list">
                          <div className="service-benefit-item">
                            <span className="service-benefit-check">✓</span>
                            <span>Tratamento em todos os cômodos e rodapés</span>
                          </div>
                          <div className="service-benefit-item">
                            <span className="service-benefit-check">✓</span>
                            <span>Opção de Pulverização (6 meses) ou Sem Odor (3 meses)</span>
                          </div>
                          <div className="service-benefit-item">
                            <span className="service-benefit-check">✓</span>
                            <span>Certificado oficial com garantia da empresa</span>
                          </div>
                        </div>

                        <div className="service-card-bottom">
                          <button
                            type="button"
                            className="service-btn-learn-more"
                            onClick={(e) => {
                              e.stopPropagation();
                              setModalMetodosAberto(true);
                            }}
                          >
                            Ver métodos e cuidados ↗
                          </button>

                          {isSelected ? (
                            <span className="service-selected-pill">
                              ✓ Selecionado
                            </span>
                          ) : (
                            <span style={{ fontSize: '13px', color: '#64748B', fontWeight: '600' }}>
                              Toque para selecionar
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="adesao-actions-row">
                  <button
                    type="button"
                    className="btn-primary-gradient"
                    onClick={avancarParaEtapa2}
                  >
                    Avançar para dados da unidade →
                  </button>
                </div>
              </div>
            )}

            {/* ETAPA 2: DADOS DA UNIDADE E MÉTODO DE APLICAÇÃO */}
            {etapaAtual === 2 && (
              <div className="adesao-card">
                <div className="adesao-section-header">
                  <h2 className="adesao-section-title">Dados da sua unidade</h2>
                  <p className="adesao-section-subtitle">Informe o número do seu imóvel e escolha o método de dedetização desejado.</p>
                </div>

                {/* Tag da Categoria Selecionada */}
                <div style={{ background: '#FAF7FF', border: '1.5px solid #E9D5FF', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '13.5px', color: '#6B21A8' }}>
                    Tipo selecionado: <strong>{tipoObjAtual.nome}</strong>
                  </div>
                  <strong style={{ color: '#7C3AED', fontSize: '15px' }}>R$ {valorAtual.toFixed(2).replace('.', ',')}</strong>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="input-unidade">
                      Unidade / Apartamento <span className="form-label-required">*</span>
                    </label>
                    <input
                      id="input-unidade"
                      type="text"
                      className={`form-input ${errosCampos.unidade ? 'error' : ''}`}
                      placeholder="Ex.: 102"
                      value={unidade}
                      onChange={(e) => {
                        setUnidade(e.target.value);
                        if (errosCampos.unidade) setErrosCampos({ ...errosCampos, unidade: null });
                      }}
                      required
                    />
                    {errosCampos.unidade && (
                      <span className="form-error-msg">⚠️ {errosCampos.unidade}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="input-bloco">
                      Bloco / Torre <span style={{ fontSize: '12px', color: '#8290A6', fontWeight: 'normal' }}>(opcional)</span>
                    </label>
                    <input
                      id="input-bloco"
                      type="text"
                      className="form-input"
                      placeholder="Ex.: Bloco A"
                      value={bloco}
                      onChange={(e) => setBloco(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="input-nome">
                    Nome do morador / responsável <span className="form-label-required">*</span>
                  </label>
                  <input
                    id="input-nome"
                    type="text"
                    className={`form-input ${errosCampos.nomeMorador ? 'error' : ''}`}
                    placeholder="Ex.: Maria"
                    value={nomeMorador}
                    onChange={(e) => {
                      setNomeMorador(e.target.value);
                      if (errosCampos.nomeMorador) setErrosCampos({ ...errosCampos, nomeMorador: null });
                    }}
                    required
                  />
                  <div className="form-help-text">
                    <span>Pode informar apenas o primeiro nome.</span>
                  </div>
                  {errosCampos.nomeMorador && (
                    <span className="form-error-msg">⚠️ {errosCampos.nomeMorador}</span>
                  )}
                </div>

                {/* Método de Aplicação Desejado */}
                <div className="form-group">
                  <label className="form-label" htmlFor="select-metodo">
                    Método de Aplicação Desejado <span className="form-label-required">*</span>
                  </label>
                  <select
                    id="select-metodo"
                    className="form-input"
                    value={metodoAplicacao}
                    onChange={(e) => setMetodoAplicacao(e.target.value)}
                    style={{ cursor: 'pointer', background: '#FFFFFF' }}
                  >
                    <option value="Pulverização Líquida (Garantia 6 meses)">
                      🧪 Pulverização Líquida (Garantia 6 meses — ausência 2h a 48h)
                    </option>
                    <option value="Aplicação sem Odor / Gel Inodoro (Garantia 3 meses)">
                      🌿 Aplicação sem Odor / Gel Inodoro (Garantia 3 meses — não precisa desocupar)
                    </option>
                    <option value="Pulverização e Gel Combinados">
                      🧪+🌿 Pulverização e Gel Combinados
                    </option>
                    <option value="A combinar com o técnico no local">
                      🤝 A combinar com o técnico no local
                    </option>
                  </select>
                  <div className="form-help-text">
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: '#7C3AED', fontWeight: '700', cursor: 'pointer', padding: '2px 0', textDecoration: 'underline' }}
                      onClick={() => setModalMetodosAberto(true)}
                    >
                      Dúvidas sobre os métodos? Veja os detalhes e cuidados ↗
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="input-obs">
                    Observações ou restrições <span style={{ fontSize: '12px', color: '#8290A6', fontWeight: 'normal' }}>(opcional)</span>
                  </label>
                  <textarea
                    id="input-obs"
                    className="form-textarea"
                    placeholder="Ex.: Tenho 2 gatos; estarei em casa após as 10h; criança pequena; alguma restrição de acesso..."
                    value={observacoes}
                    maxLength={300}
                    onChange={(e) => setObservacoes(e.target.value)}
                  />
                  <div className="form-help-text" style={{ justifyContent: 'flex-end' }}>
                    <span>{observacoes.length}/300 caracteres</span>
                  </div>
                </div>

                <div className="adesao-actions-row">
                  <button
                    type="button"
                    className="btn-secondary-outline"
                    onClick={() => voltarEtapa(1)}
                  >
                    ← Voltar
                  </button>
                  <button
                    type="button"
                    className="btn-primary-gradient"
                    onClick={avancarParaEtapa3}
                  >
                    Avançar para confirmação →
                  </button>
                </div>
              </div>
            )}

            {/* ETAPA 3: CONFIRMAÇÃO & ACEITE */}
            {etapaAtual === 3 && (
              <div className="adesao-card">
                <div className="adesao-section-header">
                  <h2 className="adesao-section-title">Confirme sua adesão</h2>
                  <p className="adesao-section-subtitle">Revise as informações antes de finalizar.</p>
                </div>

                {/* Resumo da solicitação */}
                <div className="confirmation-summary-box">
                  <div className="conf-row">
                    <span className="conf-label">Condomínio:</span>
                    <span className="conf-val">{dadosAgendamento.condominio_nome}</span>
                  </div>
                  <div className="conf-row">
                    <span className="conf-label">Unidade:</span>
                    <span className="conf-val">{unidade} {bloco ? `(${bloco})` : ''}</span>
                  </div>
                  <div className="conf-row">
                    <span className="conf-label">Responsável:</span>
                    <span className="conf-val">{nomeMorador}</span>
                  </div>
                  <div className="conf-row">
                    <span className="conf-label">Tipo do Imóvel:</span>
                    <span className="conf-val" style={{ color: '#7C3AED' }}>{tipoObjAtual.nome}</span>
                  </div>
                  <div className="conf-row">
                    <span className="conf-label">Método de Aplicação:</span>
                    <span className="conf-val">{metodoAplicacao}</span>
                  </div>
                  <div className="conf-row">
                    <span className="conf-label">Data Prevista:</span>
                    <span className="conf-val">{formatarData(dadosAgendamento.data_agendada)} ({dadosAgendamento.periodo || 'Manhã'})</span>
                  </div>
                  <div className="conf-row">
                    <span className="conf-label">Valor do Serviço:</span>
                    <span className="conf-val highlight">R$ {valorAtual.toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>

                {/* Aviso de Cobrança */}
                <div className="adesao-billing-card">
                  <span className="adesao-billing-icon">💳</span>
                  <div>
                    <strong>Forma de Cobrança:</strong> O valor será cobrado junto à taxa condominial do mês seguinte à dedetização.
                  </div>
                </div>

                {/* Card de Orientações de Segurança */}
                <div className="adesao-safety-card">
                  <div className="safety-header">
                    <span>⚠️</span> Orientações Importantes:
                  </div>
                  <ul className="safety-list">
                    <li>Mantenha alimentos protegidos e louças guardadas.</li>
                    <li>Mantenha crianças e animais em local seguro durante a aplicação.</li>
                    <li>Siga o período de afastamento do método escolhido (mínimo 2h a 48h para pulverização).</li>
                  </ul>
                  <button
                    type="button"
                    className="safety-link-modal"
                    onClick={() => setModalSegurancaAberto(true)}
                  >
                    Ver orientações completas de segurança →
                  </button>
                </div>

                {/* Checkbox de Aceite Obrigatório com Valor Dinâmico */}
                <label className={`adesao-checkbox-wrap ${concordouTermos ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    className="adesao-checkbox"
                    checked={concordouTermos}
                    onChange={(e) => setConcordouTermos(e.target.checked)}
                  />
                  <span className="adesao-checkbox-label">
                    Confirmo a adesão da minha unidade ({tipoObjAtual.nome}) e declaro estar ciente das orientações de segurança e do valor de <strong>R$ {valorAtual.toFixed(2).replace('.', ',')}</strong>, que será cobrado <strong>junto à taxa condominial do mês seguinte</strong>.
                  </span>
                </label>

                {erroEnvio && (
                  <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '12px 14px', borderRadius: '10px', fontSize: '13.5px', marginBottom: '16px' }}>
                    ⚠️ {erroEnvio}
                  </div>
                )}

                <div className="adesao-actions-row">
                  <button
                    type="button"
                    className="btn-secondary-outline"
                    onClick={() => voltarEtapa(2)}
                    disabled={enviando}
                  >
                    ← Voltar
                  </button>
                  <button
                    type="button"
                    className="btn-primary-gradient"
                    onClick={handleConfirmarAdesao}
                    disabled={!concordouTermos || enviando}
                  >
                    {enviando ? (
                      <>
                        <span className="adesao-spinner" /> Enviando adesão…
                      </>
                    ) : (
                      '✓ Confirmar adesão'
                    )}
                  </button>
                </div>
              </div>
            )}
          </main>

          {/* Sidebar Resumo Sticky (Desktop >= 1024px) */}
          <aside className="adesao-sidebar" aria-label="Resumo Lateral">
            <div className="sidebar-summary-card">
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#172033', margin: '0 0 14px', paddingBottom: '10px', borderBottom: '1px solid #E2E8F0' }}>
                Resumo da sua adesão
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13.5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#5B6880' }}>Condomínio:</span>
                  <strong style={{ color: '#172033', textAlign: 'right' }}>{dadosAgendamento.condominio_nome}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#5B6880' }}>Data prevista:</span>
                  <strong style={{ color: '#172033' }}>{formatarData(dadosAgendamento.data_agendada)} ({dadosAgendamento.periodo || 'Manhã'})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#5B6880' }}>Tipo da Unidade:</span>
                  <strong style={{ color: '#7C3AED' }}>{tipoObjAtual.nome}</strong>
                </div>
                {unidade && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#5B6880' }}>Unidade:</span>
                    <strong style={{ color: '#172033' }}>{unidade} {bloco ? `(${bloco})` : ''}</strong>
                  </div>
                )}
                {nomeMorador && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#5B6880' }}>Responsável:</span>
                    <strong style={{ color: '#172033' }}>{nomeMorador}</strong>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px dashed #E2E8F0' }}>
                  <span style={{ color: '#5B6880' }}>Valor total:</span>
                  <strong style={{ color: '#7C3AED', fontSize: '18px' }}>R$ {valorAtual.toFixed(2).replace('.', ',')}</strong>
                </div>
              </div>

              <div style={{ background: '#EFF6FF', borderRadius: '8px', padding: '10px 12px', fontSize: '12.5px', color: '#1E40AF', marginTop: '14px', lineHeight: '1.4' }}>
                💳 Cobrado na taxa condominial do mês seguinte.
              </div>

              {etapaAtual === 3 && (
                <button
                  type="button"
                  className="btn-primary-gradient"
                  style={{ marginTop: '16px' }}
                  onClick={handleConfirmarAdesao}
                  disabled={!concordouTermos || enviando}
                >
                  {enviando ? 'Enviando…' : '✓ Confirmar adesão'}
                </button>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* MODAL: MÉTODOS DE APLICAÇÃO E CUIDADOS */}
      {modalMetodosAberto && (
        <div className="adesao-modal-overlay" onClick={() => setModalMetodosAberto(false)} role="dialog" aria-modal="true">
          <div className="adesao-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Métodos de Aplicação e Cuidados</h3>
              <button type="button" className="modal-close-btn" onClick={() => setModalMetodosAberto(false)} aria-label="Fechar">
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* Método 1: Pulverização */}
              <div className="modal-detail-box" style={{ background: '#FEF2F2', borderColor: '#FECACA' }}>
                <div className="modal-detail-title" style={{ color: '#991B1B' }}>
                  🧪 1. PULVERIZAÇÃO LÍQUIDA (Cuidados Especiais)
                </div>
                <ul style={{ margin: '0', paddingLeft: '18px', fontSize: '13px', color: '#7F1D1D', lineHeight: '1.5' }}>
                  <li><strong>Permanecer ausente do local</strong> durante a aplicação e manter fechado por no mínimo <strong>2 horas</strong>.</li>
                  <li><strong>Alérgicos, problemas respiratórios, crianças, lactentes e pets:</strong> ausência obrigatória por no mínimo <strong>48 horas</strong>.</li>
                  <li><strong>Limpeza e higienização:</strong> poderão ser feitas normalmente após <strong>96 horas</strong>.</li>
                  <li><strong>Arejar o ambiente</strong> antes de usá-lo ao retornar.</li>
                  <li><strong>Utensílios expostos:</strong> cobrir com plástico ou lavar antes de usar.</li>
                  <li><strong>Garantia:</strong> 06 (seis) meses contra baratas.</li>
                </ul>
              </div>

              {/* Método 2: Sem Odor */}
              <div className="modal-detail-box" style={{ background: '#F0FDF4', borderColor: '#BBF7D0' }}>
                <div className="modal-detail-title" style={{ color: '#166534' }}>
                  🌿 2. APLICAÇÃO SEM ODOR (Sem desocupar o local)
                </div>
                <ul style={{ margin: '0', paddingLeft: '18px', fontSize: '13px', color: '#14532D', lineHeight: '1.5' }}>
                  <li>Desinsetização contra baratas através de <strong>gel-isca inodoro</strong> na cozinha, banheiros e armários.</li>
                  <li>Aplicação de inseticida líquido <strong>apenas nos ralos</strong>.</li>
                  <li><strong>Não necessita</strong> desocupar o imóvel nem afastar utensílios domésticos.</li>
                  <li><strong>Garantia:</strong> 03 (três) meses contra baratas.</li>
                </ul>
              </div>

              {/* Observações importantes */}
              <div className="modal-detail-box">
                <div className="modal-detail-title">⚠️ Observações Importantes</div>
                <ul style={{ margin: '0', paddingLeft: '18px', fontSize: '13px', color: '#5B6880', lineHeight: '1.5' }}>
                  <li>Optando por não realizar a dedetização dentro de sua residência, há risco de insetos fazerem ninhos em áreas não tratadas.</li>
                  <li>Após a dedetização, será emitido certificado com os dados de validade da empresa dedetizadora.</li>
                </ul>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-primary-gradient"
                onClick={() => setModalMetodosAberto(false)}
              >
                Entendido, fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ORIENTAÇÕES COMPLETAS DE SEGURANÇA */}
      {modalSegurancaAberto && (
        <div className="adesao-modal-overlay" onClick={() => setModalSegurancaAberto(false)} role="dialog" aria-modal="true">
          <div className="adesao-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Orientações de Segurança</h3>
              <button type="button" className="modal-close-btn" onClick={() => setModalSegurancaAberto(false)} aria-label="Fechar">
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-detail-box">
                <div className="modal-detail-title">🕒 Antes da Aplicação</div>
                <ul style={{ margin: '0', paddingLeft: '18px', fontSize: '13px', color: '#5B6880', lineHeight: '1.5' }}>
                  <li>Guarde alimentos, frutas e mantimentos em armários fechados ou geladeira.</li>
                  <li>Cubra bebedouros e comedouros de animais de estimação.</li>
                  <li>Afaste levemente móveis dos rodapés se desejar facilitar a aplicação.</li>
                </ul>
              </div>

              <div className="modal-detail-box">
                <div className="modal-detail-title">🚪 Durante a Aplicação</div>
                <ul style={{ margin: '0', paddingLeft: '18px', fontSize: '13px', color: '#5B6880', lineHeight: '1.5' }}>
                  <li>Apenas o técnico responsável deverá permanecer no local durante a pulverização.</li>
                  <li>Mantenha as janelas e portas fechadas durante o período de aplicação.</li>
                </ul>
              </div>

              <div className="modal-detail-box">
                <div className="modal-detail-title">🏠 Depois da Aplicação</div>
                <ul style={{ margin: '0', paddingLeft: '18px', fontSize: '13px', color: '#5B6880', lineHeight: '1.5' }}>
                  <li>Ao retornar ao imóvel, abra todas as janelas e portas para ventilar o local.</li>
                  <li><strong>Pulverização tradicional:</strong> aguarde no mínimo 2 horas para retornar (48 horas para gestantes, bebês, alérgicos e pets).</li>
                  <li><strong>Aplicação sem odor:</strong> não exige tempo de afastamento.</li>
                  <li>A limpeza do chão poderá ser feita normalmente após 96 horas com pano úmido.</li>
                </ul>
              </div>

              <div className="modal-detail-box">
                <div className="modal-detail-title">📜 Certificado e Garantia</div>
                <p className="modal-detail-text">
                  Após a conclusão do serviço no condomínio, a empresa dedetizadora emite certificado oficial com dados de registro na ANVISA e validade técnica.
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-primary-gradient"
                onClick={() => setModalSegurancaAberto(false)}
              >
                Entendido, fechar orientações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rodapé Simples e Acessível */}
      <footer className="adesao-footer">
        iMCOSTA — Tecnologia e Gestão para condomínios.
      </footer>
    </div>
  );
}
