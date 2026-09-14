import React, { useState, useEffect } from 'react';
import { api, getToken } from '../../api';
import { IcoUpload, IcoEye, IcoDownload, IcoTrash, IcoCloud } from '../icons';

export default function SeguroNovoEditarDrawer({
  aberto,
  onFechar,
  seguroEditando,
  todosCondominios = [],
  gerentes = [],
  onSalvar,
  podeEditarCadastrais
}) {
  const [abaAtiva, setAbaAtiva] = useState('apolice'); // 'apolice' | 'coberturas' | 'condominio' | 'documentos'
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  // Form State - Condomínio
  const [condominioId, setCondominioId] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [enderecoCorrespondencia, setEnderecoCorrespondencia] = useState('');
  const [bairro, setBairro] = useState('');
  const [cep, setCep] = useState('');
  const [cidade, setCidade] = useState('Caraguatatuba');
  const [uf, setUf] = useState('SP');
  const [qtdApartamentos, setQtdApartamentos] = useState(10);
  const [tipoCondominio, setTipoCondominio] = useState('Vertical');
  const [temElevador, setTemElevador] = useState(true);
  const [temPortaoAutomatico, setTemPortaoAutomatico] = useState(true);
  const [qtdFuncionarios, setQtdFuncionarios] = useState(0);
  const [gerenteId, setGerenteId] = useState('');

  // Form State - Apólice
  const [seguradora, setSeguradora] = useState('Allianz');
  const [corretora, setCorretora] = useState('Setor Seguros');
  const [numeroApolice, setNumeroApolice] = useState('');
  const [enderecoLocalSegurado, setEnderecoLocalSegurado] = useState('');
  const [idadeCondominio, setIdadeCondominio] = useState('Acima de 30 anos');
  const [quantidadeAndares, setQuantidadeAndares] = useState('6 a 10 Andares');
  const [quantidadeElevadores, setQuantidadeElevadores] = useState(1);
  const [quantidadeBlocos, setQuantidadeBlocos] = useState(1);
  const [categoriaRisco, setCategoriaRisco] = useState('Apenas Residencial');
  const [tipoSeguro, setTipoSeguro] = useState('Renovação Allianz');
  const [produtoRamo, setProdutoRamo] = useState('16 - Condomínio');
  const [modalidade, setModalidade] = useState('Simples');
  const [condicoesGerais, setCondicoesGerais] = useState('04/2025');
  const [limiteMaximoGarantia, setLimiteMaximoGarantia] = useState(5220000);
  const [versaoTabela, setVersaoTabela] = useState('34');
  const [valorDeNovo, setValorDeNovo] = useState(true);
  const [vigenciaInicio, setVigenciaInicio] = useState('2025-06-05');
  const [vigenciaFim, setVigenciaFim] = useState('2026-06-05');
  const [observacoes, setObservacoes] = useState('');

  // Form State - Cobertura por Unidade
  const [coberturaPorUnidade, setCoberturaPorUnidade] = useState(300000);

  const [arquivoApolice, setArquivoApolice] = useState(null);
  const [arquivosBoletos, setArquivosBoletos] = useState([]);
  const [documentosExistentes, setDocumentosExistentes] = useState([]);
  const [extraindoPDF, setExtraindoPDF] = useState(false);
  const [sucessoExtracao, setSucessoExtracao] = useState('');

  useEffect(() => {
    if (aberto) {
      setErro('');
      setSucessoExtracao('');
      setExtraindoPDF(false);
      setAbaAtiva('apolice');
      setArquivoApolice(null);
      setArquivosBoletos([]);
      setDocumentosExistentes([]);

      if (seguroEditando) {
        const targetCid = String(
          (typeof seguroEditando.condominio === 'object' ? seguroEditando.condominio?.id : null) ||
          seguroEditando.condominioId ||
          seguroEditando.id ||
          ''
        );

        setCondominioId(targetCid);

        // Pré-preenchimento imediato a partir da lista
        const condLocal = todosCondominios.find((c) => String(c.id || c.condominioId) === String(targetCid));
        if (condLocal) {
          setCnpj(condLocal.cnpj || '');
          setEmail(condLocal.email || '');
          setTelefone(condLocal.telefone || '');
          setEnderecoCorrespondencia(condLocal.enderecoCorrespondencia || condLocal.endereco || '');
          setEnderecoLocalSegurado(condLocal.endereco || '');
          setBairro(condLocal.bairro || '');
          setCep(condLocal.cep || '');
          setCidade(condLocal.cidade || 'Caraguatatuba');
          setUf(condLocal.uf || 'SP');
          setQtdApartamentos(condLocal.quantidadeApartamentos || 10);
          setTipoCondominio(condLocal.tipo || 'Vertical');
          setTemElevador(condLocal.temElevador !== false);
          setTemPortaoAutomatico(condLocal.temPortaoAutomatico !== false);
          setQtdFuncionarios(condLocal.quantidadeFuncionarios || 0);
          setGerenteId(String(condLocal.gerenteId || ''));
          if (condLocal.seguradora && condLocal.seguradora !== '—') setSeguradora(condLocal.seguradora);
          if (condLocal.corretora && condLocal.corretora !== '—') setCorretora(condLocal.corretora);
          if (condLocal.numeroApolice && condLocal.numeroApolice !== '—') setNumeroApolice(condLocal.numeroApolice);
          if (condLocal.dataRenovacao) setVigenciaInicio(condLocal.dataRenovacao);
          if (condLocal.dataValidade) setVigenciaFim(condLocal.dataValidade);
          if (condLocal.observacoes) setObservacoes(condLocal.observacoes);
        }

        // Buscar dados completos e oficiais do condomínio e apólice no servidor
        if (targetCid) {
          api.get(`/seguros/${targetCid}`)
            .then((res) => {
              if (!res) return;
              if (res.condominio) {
                const c = res.condominio;
                setCnpj(c.cnpj || '');
                setEmail(c.email || '');
                setTelefone(c.telefone || '');
                setEnderecoCorrespondencia(c.enderecoCorrespondencia || c.endereco || '');
                setBairro(c.bairro || '');
                setCep(c.cep || '');
                setCidade(c.cidade || 'Caraguatatuba');
                setUf(c.uf || 'SP');
                setQtdApartamentos(c.quantidadeApartamentos || 10);
                setTipoCondominio(c.tipo || 'Vertical');
                setTemElevador(c.temElevador !== false);
                setTemPortaoAutomatico(c.temPortaoAutomatico !== false);
                setQtdFuncionarios(c.quantidadeFuncionarios || 0);
                setGerenteId(String(c.gerenteId || ''));
                setIdadeCondominio(c.idadeCondominio || 'Acima de 30 anos');
                setQuantidadeAndares(c.quantidadeAndares || '6 a 10 Andares');
                setQuantidadeElevadores(c.quantidadeElevadores != null ? c.quantidadeElevadores : 1);
                setQuantidadeBlocos(c.quantidadeBlocos != null ? c.quantidadeBlocos : 1);
                if (!res.apolice?.enderecoLocalSegurado) {
                  setEnderecoLocalSegurado(c.endereco || '');
                }
              }

              if (res.apolice) {
                const a = res.apolice;
                setSeguradora(a.seguradora || '');
                setCorretora(a.corretora || '');
                setNumeroApolice(a.numeroApolice || '');
                setEnderecoLocalSegurado(a.enderecoLocalSegurado || res.condominio?.endereco || '');
                setIdadeCondominio(a.idadeCondominio || res.condominio?.idadeCondominio || 'Acima de 30 anos');
                setQuantidadeAndares(a.quantidadeAndares || res.condominio?.quantidadeAndares || '6 a 10 Andares');
                setQuantidadeElevadores(a.quantidadeElevadores != null ? a.quantidadeElevadores : (res.condominio?.quantidadeElevadores != null ? res.condominio.quantidadeElevadores : 1));
                setQuantidadeBlocos(a.quantidadeBlocos != null ? a.quantidadeBlocos : (res.condominio?.quantidadeBlocos != null ? res.condominio.quantidadeBlocos : 1));
                setCategoriaRisco(a.categoriaRisco || 'Apenas Residencial');
                setTipoSeguro(a.tipoSeguro || 'Renovação');
                setProdutoRamo(a.produtoRamo || '16 - Condomínio');
                setModalidade(a.modalidade || 'Simples');
                setCondicoesGerais(a.condicoesGerais || '04/2025');
                setLimiteMaximoGarantia(a.limiteMaximoGarantia || 5220000);
                setVersaoTabela(a.versaoTabela || '34');
                setValorDeNovo(a.valorDeNovo !== false);
                setVigenciaInicio(a.vigenciaInicio || a.dataRenovacao || '');
                setVigenciaFim(a.vigenciaFim || a.dataValidade || '');
                setCoberturaPorUnidade(a.coberturaPorUnidade || 300000);
                setObservacoes(a.observacoes || '');
              } else {
                setSeguradora('');
                setCorretora('');
                setNumeroApolice('');
                setEnderecoLocalSegurado(res.condominio?.endereco || '');
                setVigenciaInicio('');
                setVigenciaFim('');
                setObservacoes('');
              }

              if (res.documentos) {
                setDocumentosExistentes(res.documentos);
              }
            })
            .catch((e) => console.error('Erro ao carregar dados do seguro:', e));
        }
      } else {
        // Modo Novo
        setCondominioId('');
        setCnpj('');
        setEmail('');
        setTelefone('');
        setEnderecoCorrespondencia('');
        setBairro('');
        setCep('');
        setCidade('Caraguatatuba');
        setUf('SP');
        setQtdApartamentos(10);
        setTipoCondominio('Vertical');
        setTemElevador(true);
        setTemPortaoAutomatico(true);
        setQtdFuncionarios(0);
        setGerenteId('');

        setSeguradora('');
        setCorretora('');
        setNumeroApolice('');
        setEnderecoLocalSegurado('');
        setIdadeCondominio('Acima de 30 anos');
        setQuantidadeAndares('6 a 10 Andares');
        setQuantidadeElevadores(1);
        setQuantidadeBlocos(1);
        setCategoriaRisco('Apenas Residencial');
        setTipoSeguro('Novo Seguro');
        setProdutoRamo('16 - Condomínio');
        setModalidade('Simples');
        setCondicoesGerais('04/2025');
        setLimiteMaximoGarantia(5220000);
        setVersaoTabela('34');
        setValorDeNovo(true);
        setVigenciaInicio('');
        setVigenciaFim('');
        setCoberturaPorUnidade(300000);
        setObservacoes('');
      }
    }
  }, [aberto, seguroEditando]);

  // Atualizar dados quando seleciona condomínio no modo novo
  const handleSelectCondominio = async (id) => {
    setCondominioId(id);
    if (!id) return;

    // Preenche imediatamente a partir da lista
    const condLocal = todosCondominios.find((c) => String(c.id || c.condominioId) === String(id));
    if (condLocal) {
      setCnpj(condLocal.cnpj || '');
      setEmail(condLocal.email || '');
      setTelefone(condLocal.telefone || '');
      setEnderecoCorrespondencia(condLocal.enderecoCorrespondencia || condLocal.endereco || '');
      setEnderecoLocalSegurado(condLocal.endereco || '');
      setBairro(condLocal.bairro || '');
      setCep(condLocal.cep || '');
      setCidade(condLocal.cidade || 'Caraguatatuba');
      setUf(condLocal.uf || 'SP');
      setQtdApartamentos(condLocal.quantidadeApartamentos || 10);
      setTipoCondominio(condLocal.tipo || 'Vertical');
      setTemElevador(condLocal.temElevador !== false);
      setTemPortaoAutomatico(condLocal.temPortaoAutomatico !== false);
      setQtdFuncionarios(condLocal.quantidadeFuncionarios || 0);
      setGerenteId(String(condLocal.gerenteId || ''));
    }

    try {
      const res = await api.get(`/seguros/${id}`);
      if (res?.condominio) {
        const c = res.condominio;
        setCnpj(c.cnpj || '');
        setEmail(c.email || '');
        setTelefone(c.telefone || '');
        setEnderecoCorrespondencia(c.enderecoCorrespondencia || c.endereco || '');
        setEnderecoLocalSegurado(c.endereco || '');
        setBairro(c.bairro || '');
        setCep(c.cep || '');
        setCidade(c.cidade || 'Caraguatatuba');
        setUf(c.uf || 'SP');
        setQtdApartamentos(c.quantidadeApartamentos || 10);
        setTipoCondominio(c.tipo || 'Vertical');
        setTemElevador(c.temElevador !== false);
        setTemPortaoAutomatico(c.temPortaoAutomatico !== false);
        setQtdFuncionarios(c.quantidadeFuncionarios || 0);
        setGerenteId(String(c.gerenteId || ''));
        setIdadeCondominio(c.idadeCondominio || 'Acima de 30 anos');
        setQuantidadeAndares(c.quantidadeAndares || '6 a 10 Andares');
        setQuantidadeElevadores(c.quantidadeElevadores != null ? c.quantidadeElevadores : 1);
        setQuantidadeBlocos(c.quantidadeBlocos != null ? c.quantidadeBlocos : 1);

        if (res.apolice) {
          const a = res.apolice;
          setSeguradora(a.seguradora || '');
          setCorretora(a.corretora || '');
          setNumeroApolice(a.numeroApolice || '');
          setEnderecoLocalSegurado(a.enderecoLocalSegurado || c.endereco || '');
          setVigenciaInicio(a.vigenciaInicio || a.dataRenovacao || '');
          setVigenciaFim(a.vigenciaFim || a.dataValidade || '');
          setCoberturaPorUnidade(a.coberturaPorUnidade || 300000);
          setObservacoes(a.observacoes || '');
        }

        if (res.documentos) {
          setDocumentosExistentes(res.documentos);
        }
      }
    } catch (e) {
      // Ignora erro de requisição em modo novo
    }
  };

  const [arrastando, setArrastando] = useState(false);

  const handleUploadExtrairPDF = async (inputOrEvent) => {
    let file = null;
    if (inputOrEvent instanceof File) {
      file = inputOrEvent;
    } else if (inputOrEvent?.target?.files?.[0]) {
      file = inputOrEvent.target.files[0];
    } else if (inputOrEvent?.dataTransfer?.files?.[0]) {
      file = inputOrEvent.dataTransfer.files[0];
    }

    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErro('Por favor, selecione ou arraste um arquivo em formato PDF.');
      return;
    }

    setExtraindoPDF(true);
    setArrastando(false);
    setErro('');
    setSucessoExtracao('');
    setArquivoApolice(file);

    try {
      const formData = new FormData();
      formData.append('apolice_pdf', file);

      const token = getToken() || '';
      const res = await fetch('/api/seguros/extrair-pdf', {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok || data.erro) {
        throw new Error(data.erro || 'Falha ao extrair dados do PDF.');
      }

      if (data.seguradora) setSeguradora(data.seguradora);
      if (data.corretora) setCorretora(data.corretora);
      if (data.numero_apolice) setNumeroApolice(data.numero_apolice);
      if (data.tipo_seguro) setTipoSeguro(data.tipo_seguro);
      if (data.produto_ramo) setProdutoRamo(data.produto_ramo);
      if (data.modalidade) setModalidade(data.modalidade);
      if (data.limite_maximo_garantia) setLimiteMaximoGarantia(data.limite_maximo_garantia);
      if (data.vigencia_inicio) setVigenciaInicio(data.vigencia_inicio);
      if (data.vigencia_fim) setVigenciaFim(data.vigencia_fim);
      if (data.endereco_local_segurado) setEnderecoLocalSegurado(data.endereco_local_segurado);
      if (data.cnpj) setCnpj(data.cnpj);

      setSucessoExtracao(`Apólice analisada com sucesso (${data.paginasLidas || 1} pág.)! Seguradora: ${data.seguradora || 'Detectada'}, Vigência: ${data.vigencia_inicio ? data.vigencia_inicio.split('-').reverse().join('/') : '—'} até ${data.vigencia_fim ? data.vigencia_fim.split('-').reverse().join('/') : '—'}.`);
    } catch (err) {
      setErro(err.message || 'Erro ao processar arquivo PDF da apólice.');
    } finally {
      setExtraindoPDF(false);
      setArrastando(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setArrastando(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setArrastando(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setArrastando(false);
    if (e.dataTransfer?.files?.[0]) {
      handleUploadExtrairPDF(e.dataTransfer.files[0]);
    }
  };

  const totalIncendioCalculado = Number(coberturaPorUnidade || 0) * Number(qtdApartamentos || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!condominioId) {
      setErro('Selecione um condomínio.');
      return;
    }

    setSalvando(true);
    setErro('');

    const payload = {
      condominio_id: Number(condominioId),
      condominio_dados: podeEditarCadastrais
        ? {
            cnpj,
            email,
            telefone,
            endereco_correspondencia: enderecoCorrespondencia,
            bairro,
            cep,
            cidade,
            uf,
            quantidade_apartamentos: Number(qtdApartamentos) || 0,
            tipo: tipoCondominio,
            tem_elevador: temElevador ? 1 : 0,
            tem_portao_automatico: temPortaoAutomatico ? 1 : 0,
            quantidade_funcionarios: Number(qtdFuncionarios) || 0,
            gerente_id: gerenteId ? Number(gerenteId) : null
          }
        : undefined,
      apolice_dados: {
        seguradora,
        corretora,
        numero_apolice: numeroApolice,
        endereco_local_segurado: enderecoLocalSegurado,
        idade_condominio: idadeCondominio,
        quantidade_andares: quantidadeAndares,
        quantidade_elevadores: Number(quantidadeElevadores) || 1,
        quantidade_blocos: Number(quantidadeBlocos) || 1,
        categoria_risco: categoriaRisco,
        tipo_seguro: tipoSeguro,
        produto_ramo: produtoRamo,
        modalidade,
        condicoes_gerais: condicoesGerais,
        limite_maximo_garantia: Number(limiteMaximoGarantia) || 5220000,
        versao_tabela: versaoTabela,
        valor_de_novo: valorDeNovo ? 1 : 0,
        vigencia_inicio: vigenciaInicio,
        vigencia_fim: vigenciaFim,
        data_renovacao: vigenciaInicio,
        data_validade: vigenciaFim,
        cobertura_por_unidade: Number(coberturaPorUnidade) || 300000,
        observacoes
      },
      coberturas: [
        {
          tipo: 'basica_simples',
          nome_personalizado: 'Básica Simples (Incêndio)',
          valor_por_imovel: Number(coberturaPorUnidade) || 0,
          quantidade_imoveis: Number(qtdApartamentos) || 0,
          valor_total_calculado: totalIncendioCalculado,
          preco_cobertura: 338.40,
          sem_franquia: 1
        },
        {
          tipo: 'danos_eletricos',
          nome_personalizado: 'Danos Elétricos',
          valor_segurado: 30000,
          preco_cobertura: 792.97,
          franquia_percentual: 20,
          franquia_reais: 4000
        },
        {
          tipo: 'desmoronamento',
          nome_personalizado: 'Desmoronamento',
          valor_segurado: 100000,
          preco_cobertura: 136.26,
          franquia_percentual: 20,
          franquia_reais: 3000
        },
        {
          tipo: 'impacto_veiculos',
          nome_personalizado: 'Impacto de Veículos',
          valor_segurado: 50000,
          preco_cobertura: 55.92,
          franquia_percentual: 15,
          franquia_reais: 1000
        },
        {
          tipo: 'incendio_bens',
          nome_personalizado: 'Incêndio de Bens de Condôminos',
          valor_segurado: 900000,
          preco_cobertura: 158.10,
          sem_franquia: 1
        },
        {
          tipo: 'perda_aluguel',
          nome_personalizado: 'Perda/Pagamento Aluguel p/Condôminos',
          valor_segurado: 50000,
          preco_cobertura: 11.94,
          sem_franquia: 1
        },
        {
          tipo: 'quebra_vidros',
          nome_personalizado: 'Quebra de Vidros/Anúncios Luminosos',
          valor_segurado: 5000,
          preco_cobertura: 73.74,
          franquia_percentual: 10,
          franquia_reais: 500
        }
      ]
    };

    try {
      await onSalvar(payload);

      const targetCondId = Number(condominioId);
      const anoUpload = vigenciaFim ? vigenciaFim.split('-')[0] : new Date().getFullYear();

      // Upload do arquivo da apólice caso selecionado
      if (arquivoApolice) {
        const formData = new FormData();
        formData.append('documento', arquivoApolice);
        formData.append('tipo', 'Apólice');
        formData.append('ano', String(anoUpload));
        formData.append('codigo_condominio', String(targetCondId).padStart(3, '0'));

        const token = getToken() || '';
        await fetch(`/api/seguros/${targetCondId}/documentos`, {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: formData
        });
      }

      // Upload de boletos caso selecionados
      if (arquivosBoletos && arquivosBoletos.length > 0) {
        const token = getToken() || '';
        for (const file of arquivosBoletos) {
          const formData = new FormData();
          formData.append('documento', file);
          formData.append('tipo', 'Boleto / Parcela');
          formData.append('ano', String(anoUpload));
          formData.append('codigo_condominio', String(targetCondId).padStart(3, '0'));

          await fetch(`/api/seguros/${targetCondId}/documentos`, {
            method: 'POST',
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: formData
          });
        }
      }

      onFechar();
    } catch (err) {
      setErro(err.message || 'Erro ao salvar seguro');
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluirDocExistente = async (docId, nome) => {
    if (!window.confirm(`Deseja remover o documento "${nome}"?`)) return;
    try {
      await api.del(`/seguros/documentos/${docId}`);
      setDocumentosExistentes((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      alert(err.message || 'Erro ao excluir documento');
    }
  };

  const condInfo = todosCondominios.find((c) => String(c.id || c.condominioId) === String(condominioId));
  const nomeCondominioSelecionado = condInfo?.condominio || condInfo?.nome || (typeof seguroEditando?.condominio === 'string' ? seguroEditando.condominio : seguroEditando?.condominio?.nome) || '';
  const codigoCondominioSelecionado = condInfo?.codigo || (condominioId ? String(condominioId).padStart(3, '0') : '');

  return (
    <div className={`seg-drawer ${aberto ? 'open' : ''}`}>
      <div className="seg-drawer-header">
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>
            {seguroEditando
              ? `Editar Seguro — ${codigoCondominioSelecionado ? `[${codigoCondominioSelecionado}] ` : ''}${nomeCondominioSelecionado}`
              : 'Novo Registro de Seguro'}
          </h2>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
            {seguroEditando
              ? `Atualizando informações do seguro e dados cadastrais do condomínio ${nomeCondominioSelecionado}`
              : 'Preencha as informações completas da apólice e anexe os documentos'}
          </div>
        </div>
        <button type="button" className="seg-drawer-close" onClick={onFechar}>
          &times;
        </button>
      </div>

      <div className="seg-drawer-tabs">
        <button
          type="button"
          className={`seg-drawer-tab ${abaAtiva === 'apolice' ? 'active' : ''}`}
          onClick={() => setAbaAtiva('apolice')}
        >
          1. Informações do Seguro
        </button>
        <button
          type="button"
          className={`seg-drawer-tab ${abaAtiva === 'documentos' ? 'active' : ''}`}
          onClick={() => setAbaAtiva('documentos')}
        >
          2. Documentos & Boletos {documentosExistentes.length > 0 ? `(${documentosExistentes.length})` : ''}
        </button>
        <button
          type="button"
          className={`seg-drawer-tab ${abaAtiva === 'coberturas' ? 'active' : ''}`}
          onClick={() => setAbaAtiva('coberturas')}
        >
          3. Coberturas & Valores
        </button>
        <button
          type="button"
          className={`seg-drawer-tab ${abaAtiva === 'condominio' ? 'active' : ''}`}
          onClick={() => setAbaAtiva('condominio')}
        >
          4. Informações do Condomínio
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <div className="seg-drawer-body">
          {erro && (
            <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>
              {erro}
            </div>
          )}

          {/* 1. DADOS DO SEGURO */}
          {abaAtiva === 'apolice' && (
            <div className="seg-card-section">
              {/* SMART PDF EXTRACTION BANNER */}
              <div
                className={`seg-smart-upload-banner ${arrastando ? 'dragging' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  border: arrastando ? '2px dashed #D71920' : undefined,
                  background: arrastando ? 'rgba(215, 25, 32, 0.12)' : undefined,
                  transform: arrastando ? 'scale(1.01)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #D71920 0%, #b9151b 100%)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      boxShadow: '0 2px 6px rgba(215, 25, 32, 0.3)',
                      flexShrink: 0
                    }}>
                      ⚡
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--seg-title-color, #0f172a)' }}>
                        {arrastando ? 'Solte o arquivo PDF aqui!' : 'Preenchimento Automático via Apólice (PDF)'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--seg-muted-color, #64748b)' }}>
                        Arraste ou anexe o PDF da apólice para extrair seguradora, número, vigência e coberturas em 1 clique.
                      </div>
                    </div>
                  </div>

                  <label style={{
                    background: extraindoPDF ? '#94a3b8' : '#D71920',
                    color: '#ffffff',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: extraindoPDF ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 5px rgba(215, 25, 32, 0.25)',
                    userSelect: 'none'
                  }}>
                    {extraindoPDF ? (
                      <>
                        <span style={{ width: '14px', height: '14px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'segSpin 0.8s linear infinite' }}></span>
                        Lendo Apólice...
                      </>
                    ) : (
                      <>
                        <span>📄</span> Subir Apólice PDF
                      </>
                    )}
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handleUploadExtrairPDF}
                      disabled={extraindoPDF}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>

                {sucessoExtracao && (
                  <div style={{
                    background: '#ecfdf5',
                    border: '1px solid #10b981',
                    color: '#065f46',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span>✅</span> {sucessoExtracao}
                  </div>
                )}
              </div>

              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '4px' }}>
                Dados da Apólice & Risco
              </div>

              <div className="seg-filter-group">
                <label>Condomínio *</label>
                {seguroEditando ? (
                  <div style={{ padding: '10px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>
                    {codigoCondominioSelecionado ? `[${codigoCondominioSelecionado}] ` : ''}{nomeCondominioSelecionado || 'Condomínio selecionado'}
                  </div>
                ) : (
                  <select
                    className="seg-input"
                    value={condominioId}
                    onChange={(e) => handleSelectCondominio(e.target.value)}
                    required
                  >
                    <option value="">Selecione o condomínio...</option>
                    {todosCondominios.map((c) => (
                      <option key={c.id || c.condominioId} value={c.id || c.condominioId}>
                        {String(c.codigo || c.id || c.condominioId).padStart(3, '0')} - {c.condominio || c.nome}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="seg-filter-group">
                  <label>Seguradora *</label>
                  <input
                    type="text"
                    className="seg-input"
                    placeholder="Ex: Allianz, Tokio Marine..."
                    value={seguradora}
                    onChange={(e) => setSeguradora(e.target.value)}
                    required
                  />
                </div>
                <div className="seg-filter-group">
                  <label>Corretora *</label>
                  <select
                    className="seg-input"
                    value={corretora || 'Setor Seguros'}
                    onChange={(e) => setCorretora(e.target.value)}
                    required
                  >
                    <option value="Setor Seguros">Setor Seguros</option>
                    <option value="Síndico">Síndico</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="seg-filter-group">
                  <label>Número da Apólice</label>
                  <input
                    type="text"
                    className="seg-input"
                    placeholder="Ex: AP-1772"
                    value={numeroApolice}
                    onChange={(e) => setNumeroApolice(e.target.value)}
                  />
                </div>
                <div className="seg-filter-group">
                  <label>Tipo de Seguro</label>
                  <input
                    type="text"
                    className="seg-input"
                    placeholder="Ex: Renovação Allianz"
                    value={tipoSeguro}
                    onChange={(e) => setTipoSeguro(e.target.value)}
                  />
                </div>
              </div>

              <div className="seg-filter-group">
                <label>Endereço do Local Segurado</label>
                <input
                  type="text"
                  className="seg-input"
                  placeholder="Rua, Número, Bairro, Cidade/UF..."
                  value={enderecoLocalSegurado}
                  onChange={(e) => setEnderecoLocalSegurado(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="seg-filter-group">
                  <label>Vigência Início (das 24H de) *</label>
                  <input
                    type="date"
                    className="seg-input"
                    value={vigenciaInicio}
                    onChange={(e) => setVigenciaInicio(e.target.value)}
                    required
                  />
                </div>
                <div className="seg-filter-group">
                  <label>Vigência Fim (às 24H de) *</label>
                  <input
                    type="date"
                    className="seg-input"
                    value={vigenciaFim}
                    onChange={(e) => setVigenciaFim(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div className="seg-filter-group">
                  <label>Idade Condomínio</label>
                  <input
                    type="text"
                    className="seg-input"
                    placeholder="Acima de 30 anos"
                    value={idadeCondominio}
                    onChange={(e) => setIdadeCondominio(e.target.value)}
                  />
                </div>
                <div className="seg-filter-group">
                  <label>Qtd. Andares</label>
                  <input
                    type="text"
                    className="seg-input"
                    placeholder="6 a 10 Andares"
                    value={quantidadeAndares}
                    onChange={(e) => setQuantidadeAndares(e.target.value)}
                  />
                </div>
                <div className="seg-filter-group">
                  <label>Qtd. Elevadores</label>
                  <input
                    type="number"
                    className="seg-input"
                    value={quantidadeElevadores}
                    onChange={(e) => setQuantidadeElevadores(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div className="seg-filter-group">
                  <label>Categoria de Risco</label>
                  <input
                    type="text"
                    className="seg-input"
                    value={categoriaRisco}
                    onChange={(e) => setCategoriaRisco(e.target.value)}
                  />
                </div>
                <div className="seg-filter-group">
                  <label>Limite Máx. Garantia (R$)</label>
                  <input
                    type="number"
                    className="seg-input"
                    value={limiteMaximoGarantia}
                    onChange={(e) => setLimiteMaximoGarantia(e.target.value)}
                  />
                </div>
                <div className="seg-filter-group">
                  <label>Valor de Novo?</label>
                  <select
                    className="seg-input"
                    value={valorDeNovo ? '1' : '0'}
                    onChange={(e) => setValorDeNovo(e.target.value === '1')}
                  >
                    <option value="1">Sim</option>
                    <option value="0">Não</option>
                  </select>
                </div>
              </div>

              {/* Anexo Rápido de Apólice */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginTop: '6px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IcoUpload /> Anexar Arquivo da Apólice (PDF Oficial)
                </div>
                <input
                  type="file"
                  className="seg-input"
                  style={{ width: '100%', background: '#ffffff' }}
                  onChange={(e) => setArquivoApolice(e.target.files[0] || null)}
                />
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  O arquivo será salvo automaticamente na estrutura oficial: <code>adm/seguros/[ano]/[codigo_condominio]/</code>
                </div>
              </div>
            </div>
          )}

          {/* 2. DOCUMENTOS & BOLETOS */}
          {abaAtiva === 'documentos' && (
            <div className="seg-card-section">
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                📂 Anexar Apólice, Boletos e Propostas
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                Estrutura de nuvem: <code style={{ background: '#f1f5f9', padding: '2px 5px', borderRadius: '4px', color: '#0369a1' }}>adm/seguros/{vigenciaFim ? vigenciaFim.split('-')[0] : '2026'}/{String(condominioId || '001').padStart(3, '0')}/</code>
              </p>

              {/* Upload Apólice */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                  📄 1. Arquivo da Apólice (PDF Principal)
                </label>
                <input
                  type="file"
                  className="seg-input"
                  style={{ width: '100%', background: '#ffffff' }}
                  onChange={(e) => setArquivoApolice(e.target.files[0] || null)}
                />
                {arquivoApolice && (
                  <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600, marginTop: '4px' }}>
                    ✓ Arquivo selecionado: {arquivoApolice.name} ({(arquivoApolice.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>

              {/* Upload Boletos */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                  💳 2. Boletos / Comprovantes de Parcelas (Múltiplos arquivos)
                </label>
                <input
                  type="file"
                  multiple
                  className="seg-input"
                  style={{ width: '100%', background: '#ffffff' }}
                  onChange={(e) => setArquivosBoletos(Array.from(e.target.files || []))}
                />
                {arquivosBoletos.length > 0 && (
                  <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600, marginTop: '4px' }}>
                    ✓ {arquivosBoletos.length} boleto(s) selecionado(s) para upload
                  </div>
                )}
              </div>

              {/* Documentos já existentes */}
              {documentosExistentes.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Documentos já cadastrados neste seguro ({documentosExistentes.length}):
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {documentosExistentes.map((doc) => (
                      <div
                        key={doc.id}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px'
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a' }}>{doc.nome_arquivo}</span>
                          <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '8px' }}>({doc.tipo})</span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <a
                            href={`/api/upload/preview?path=${encodeURIComponent(doc.caminho)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="seg-btn-outline"
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                          >
                            <IcoEye /> Ver
                          </a>
                          <button
                            type="button"
                            className="seg-btn-icon"
                            style={{ color: '#dc2626', width: '28px', height: '28px' }}
                            onClick={() => handleExcluirDocExistente(doc.id, doc.nome_arquivo)}
                          >
                            <IcoTrash />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. COBERTURAS COM MULTIPLICAÇÃO AUTOMÁTICA */}
          {abaAtiva === 'coberturas' && (
            <div className="seg-card-section">
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Configuração de Cobertura por Unidade
              </div>

              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="seg-filter-group">
                    <label>Cobertura por Unidade / Imóvel (R$) *</label>
                    <input
                      type="number"
                      step="1000"
                      className="seg-input"
                      value={coberturaPorUnidade}
                      onChange={(e) => setCoberturaPorUnidade(e.target.value)}
                      required
                    />
                    <span style={{ fontSize: '12px', color: '#0284c7', fontWeight: 600, marginTop: '2px' }}>
                      {Number(coberturaPorUnidade || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} por imóvel
                    </span>
                  </div>

                  <div className="seg-filter-group">
                    <label>Qtd. de Unidades / Apartamentos</label>
                    <input
                      type="number"
                      className="seg-input"
                      value={qtdApartamentos}
                      onChange={(e) => setQtdApartamentos(e.target.value)}
                      disabled={!podeEditarCadastrais}
                    />
                  </div>
                </div>

                <div className="seg-coverage-total-calc" style={{ background: '#ffffff', border: '1px solid #e0f2fe' }}>
                  <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700, textTransform: 'uppercase' }}>
                    Soma Automática — Cobertura Básica / Incêndio:
                  </span>
                  <span style={{ fontSize: '20px', fontWeight: 700, color: '#16a34a', marginTop: '2px' }}>
                    {totalIncendioCalculado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    Multiplicação: R$ {Number(coberturaPorUnidade || 0).toLocaleString('pt-BR')} × {qtdApartamentos} unidades
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 4. DADOS DO CONDOMÍNIO (PRINT 1) */}
          {abaAtiva === 'condominio' && (
            <div className="seg-card-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Informações Cadastrais do Condomínio
                </div>
                {!podeEditarCadastrais && (
                  <span style={{ fontSize: '11px', background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                    🔒 Somente Leitura para Corretora
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="seg-filter-group">
                  <label>CNPJ</label>
                  <input
                    type="text"
                    className="seg-input"
                    placeholder="01.514.808/0001-50"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    disabled={!podeEditarCadastrais}
                  />
                </div>
                <div className="seg-filter-group">
                  <label>E-mail</label>
                  <input
                    type="email"
                    className="seg-input"
                    placeholder="rodrigo@setorlitoral.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={!podeEditarCadastrais}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="seg-filter-group">
                  <label>Telefone</label>
                  <input
                    type="text"
                    className="seg-input"
                    placeholder="981234000"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    disabled={!podeEditarCadastrais}
                  />
                </div>
                <div className="seg-filter-group">
                  <label>CEP</label>
                  <input
                    type="text"
                    className="seg-input"
                    placeholder="11662-500"
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    disabled={!podeEditarCadastrais}
                  />
                </div>
              </div>

              <div className="seg-filter-group">
                <label>Endereço de Correspondência</label>
                <input
                  type="text"
                  className="seg-input"
                  placeholder="R. ANA FRANCISCA FACHINI, 220, IMCOSTA"
                  value={enderecoCorrespondencia}
                  onChange={(e) => setEnderecoCorrespondencia(e.target.value)}
                  disabled={!podeEditarCadastrais}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="seg-filter-group">
                  <label>Bairro</label>
                  <input
                    type="text"
                    className="seg-input"
                    placeholder="MARTIM DE SÁ"
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    disabled={!podeEditarCadastrais}
                  />
                </div>
                <div className="seg-filter-group">
                  <label>Cidade</label>
                  <input
                    type="text"
                    className="seg-input"
                    placeholder="CARAGUATATUBA"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    disabled={!podeEditarCadastrais}
                  />
                </div>
                <div className="seg-filter-group">
                  <label>UF</label>
                  <input
                    type="text"
                    className="seg-input"
                    placeholder="SP"
                    value={uf}
                    onChange={(e) => setUf(e.target.value)}
                    disabled={!podeEditarCadastrais}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="seg-filter-group">
                  <label>Gerente Responsável</label>
                  <select
                    className="seg-input"
                    value={gerenteId}
                    onChange={(e) => setGerenteId(e.target.value)}
                    disabled={!podeEditarCadastrais}
                  >
                    <option value="">Selecione o gerente...</option>
                    {gerentes.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="seg-filter-group">
                  <label>Tipo de Condomínio</label>
                  <select
                    className="seg-input"
                    value={tipoCondominio}
                    onChange={(e) => setTipoCondominio(e.target.value)}
                    disabled={!podeEditarCadastrais}
                  >
                    <option value="Vertical">Vertical</option>
                    <option value="Horizontal">Horizontal</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="seg-drawer-footer">
          <button type="button" className="seg-btn-cancel" onClick={onFechar} disabled={salvando}>
            Cancelar
          </button>
          <button type="submit" className="seg-btn-primary" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar Seguro'}
          </button>
        </div>
      </form>
    </div>
  );
}
