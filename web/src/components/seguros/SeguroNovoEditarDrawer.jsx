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
  const [coberturas, setCoberturas] = useState([]);

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
          setQtdApartamentos(condLocal.quantidadeApartamentos ?? condLocal.quantidade_apartamentos ?? 0);
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
                setQtdApartamentos(c.quantidadeApartamentos ?? c.quantidade_apartamentos ?? 0);
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

              if (res.coberturas && Array.isArray(res.coberturas)) {
                setCoberturas(res.coberturas);
              } else {
                setCoberturas([]);
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
        setQuantidadeAndares('2 a 5 Andares');
        setQuantidadeElevadores(1);
        setQuantidadeBlocos(1);
        setCategoriaRisco('Apenas Residencial');
        setTipoSeguro('Novo Seguro');
        setProdutoRamo('16 - Condomínio');
        setModalidade('Simples');
        setCondicoesGerais('04/2025');
        setLimiteMaximoGarantia(5000000);
        setVersaoTabela('34');
        setValorDeNovo(true);
        setVigenciaInicio('');
        setVigenciaFim('');
        setCoberturaPorUnidade(300000);
        setCoberturas([]);
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
      setQtdApartamentos(condLocal.quantidadeApartamentos ?? condLocal.quantidade_apartamentos ?? 0);
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
        setQtdApartamentos(c.quantidadeApartamentos ?? c.quantidade_apartamentos ?? 0);
        setTipoCondominio(c.tipo || 'Vertical');
        setTemElevador(c.temElevador !== false);
        setTemPortaoAutomatico(c.temPortaoAutomatico !== false);
        setQtdFuncionarios(c.quantidadeFuncionarios || 0);
        setGerenteId(String(c.gerenteId || ''));
        setIdadeCondominio(c.idadeCondominio || 'Acima de 30 anos');
        setQuantidadeAndares(c.quantidadeAndares || '2 a 5 Andares');
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

        if (res.coberturas && Array.isArray(res.coberturas)) {
          setCoberturas(res.coberturas);
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

      const resText = await res.text();
      let data = {};
      try {
        data = JSON.parse(resText);
      } catch (jsonErr) {
        throw new Error(resText || `Erro no servidor (${res.status}): Não foi possível processar a apólice.`);
      }

      if (!res.ok || data.erro) {
        throw new Error(data.erro || 'Falha ao extrair dados do PDF.');
      }

      // Dados do Seguro / Apólice
      if (data.seguradora) setSeguradora(data.seguradora);
      if (data.corretora) setCorretora(data.corretora);
      if (data.numero_apolice) setNumeroApolice(data.numero_apolice);
      if (data.tipo_seguro) setTipoSeguro(data.tipo_seguro);
      if (data.produto_ramo) setProdutoRamo(data.produto_ramo);
      if (data.modalidade) setModalidade(data.modalidade);
      if (data.limite_maximo_garantia) setLimiteMaximoGarantia(data.limite_maximo_garantia);
      if (data.vigencia_inicio) setVigenciaInicio(data.vigencia_inicio);
      if (data.vigencia_fim) setVigenciaFim(data.vigencia_fim);
      if (data.idade_condominio) setIdadeCondominio(data.idade_condominio);
      if (data.quantidade_andares) setQuantidadeAndares(data.quantidade_andares);
      if (data.quantidade_elevadores !== undefined) {
        setQuantidadeElevadores(data.quantidade_elevadores);
        setTemElevador(data.quantidade_elevadores > 0);
      }
      if (data.quantidade_blocos !== undefined) setQuantidadeBlocos(data.quantidade_blocos);
      if (data.categoria_risco) setCategoriaRisco(data.categoria_risco);
      if (data.condicoes_gerais) setCondicoesGerais(data.condicoes_gerais);
      if (data.versao_tabela) setVersaoTabela(data.versao_tabela);
      if (data.valor_de_novo !== undefined) setValorDeNovo(data.valor_de_novo);
      if (data.endereco_local_segurado) setEnderecoLocalSegurado(data.endereco_local_segurado);

      // Dados Cadastrais do Condomínio extraídos do PDF
      if (data.cnpj) setCnpj(data.cnpj);
      if (data.email) setEmail(data.email);
      if (data.telefone) setTelefone(data.telefone);
      if (data.endereco_correspondencia) setEnderecoCorrespondencia(data.endereco_correspondencia);
      if (data.bairro) setBairro(data.bairro);
      if (data.cep) setCep(data.cep);
      if (data.cidade) setCidade(data.cidade);
      if (data.uf) setUf(data.uf);
      if (data.quantidade_funcionarios !== undefined) setQtdFuncionarios(data.quantidade_funcionarios);

      // Auto-selecionar condomínio se ainda não selecionado
      if (!condominioId && (data.cnpj || data.nome_condominio)) {
        const limpa = (s) => (s || '').replace(/\D/g, '');
        const matched = todosCondominios.find((c) =>
          (data.cnpj && limpa(c.cnpj) && limpa(c.cnpj) === limpa(data.cnpj)) ||
          (data.nome_condominio && (c.condominio || c.nome || '').toLowerCase().includes(data.nome_condominio.toLowerCase()))
        );
        if (matched) {
          setCondominioId(String(matched.id || matched.condominioId));
        }
      }

      // Coberturas extraídas do PDF
      if (Array.isArray(data.coberturas) && data.coberturas.length > 0) {
        setCoberturas(data.coberturas);
        const cobBasica = data.coberturas.find(
          (c) => c.tipo === 'basica_simples' || (c.nome_personalizado && c.nome_personalizado.toLowerCase().includes('básica'))
        );
        const apts = Number(qtdApartamentos) || 10;
        if (cobBasica && cobBasica.valor_segurado && apts > 0) {
          setCoberturaPorUnidade(Math.round(cobBasica.valor_segurado / apts));
        }
      }

      const vigStr = data.vigencia_inicio
        ? `${data.vigencia_inicio.split('-').reverse().join('/')} até ${data.vigencia_fim ? data.vigencia_fim.split('-').reverse().join('/') : '—'}`
        : 'Detectada';

      const qtdCobs = Array.isArray(data.coberturas) ? data.coberturas.length : 0;
      setSucessoExtracao(`Apólice analisada com sucesso (${data.paginasLidas || 1} pág.)! Seguradora: ${data.seguradora || 'Detectada'}, Corretora: ${data.corretora || 'Detectada'}, Vigência: ${vigStr}, ${qtdCobs} coberturas extraídas.`);
    } catch (err) {
      setErro(err.message || 'Erro ao processar arquivo PDF da apólice.');
    } finally {
      setExtraindoPDF(false);
      setArrastando(false);
    }
  };

  const handleUpdateCobertura = (idx, field, value) => {
    setCoberturas((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const handleRemoverCobertura = (idx) => {
    setCoberturas((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAdicionarCobertura = () => {
    setCoberturas((prev) => [
      ...prev,
      {
        tipo: 'outra',
        nome_personalizado: 'Nova Cobertura',
        valor_segurado: 50000,
        preco_cobertura: 0,
        franquia_percentual: 10,
        franquia_reais: 1000,
        sem_franquia: 0
      }
    ]);
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

  const totalPrecoCoberturas = (coberturas || []).reduce((acc, c) => {
    const val = Number(c.preco_cobertura ?? c.premio ?? c.preco ?? 0);
    return acc + (isNaN(val) ? 0 : val);
  }, 0);

  const totalLmiCoberturas = (coberturas || []).reduce((acc, c) => {
    const val = Number(c.valor_segurado ?? c.valor_total_calculado ?? c.limite ?? 0);
    return acc + (isNaN(val) ? 0 : val);
  }, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!condominioId) {
      setErro('Selecione um condomínio.');
      return;
    }

    setSalvando(true);
    setErro('');

    let finalCoberturas = [];
    if (coberturas && coberturas.length > 0) {
      finalCoberturas = coberturas.map((c) => {
        const isBasica = c.tipo === 'basica_simples' || (c.nome_personalizado && c.nome_personalizado.toLowerCase().includes('básica'));
        if (isBasica) {
          const valorCalc = (Number(coberturaPorUnidade) || 0) * (Number(qtdApartamentos) || 0) || c.valor_segurado || c.valor_total_calculado || 0;
          return {
            ...c,
            valor_por_imovel: Number(coberturaPorUnidade) || c.valor_por_imovel || 0,
            quantidade_imoveis: Number(qtdApartamentos) || c.quantidade_imoveis || 0,
            valor_total_calculado: valorCalc,
            valor_segurado: valorCalc
          };
        }
        return c;
      });
    } else {
      finalCoberturas = [
        {
          tipo: 'basica_simples',
          nome_personalizado: 'Básica Simples (Incêndio)',
          valor_por_imovel: Number(coberturaPorUnidade) || 0,
          quantidade_imoveis: Number(qtdApartamentos) || 0,
          valor_total_calculado: totalIncendioCalculado,
          valor_segurado: totalIncendioCalculado,
          preco_cobertura: 338.40,
          sem_franquia: 1
        }
      ];
    }

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
      coberturas: finalCoberturas
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
          <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)' }}>
            {seguroEditando
              ? `Editar Seguro — ${codigoCondominioSelecionado ? `[${codigoCondominioSelecionado}] ` : ''}${nomeCondominioSelecionado}`
              : 'Novo Registro de Seguro'}
          </h2>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
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
            <div style={{ background: 'var(--danger-soft)', color: 'var(--danger-text)', border: '1px solid var(--danger)', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>
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

              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '4px' }}>
                Dados da Apólice & Risco
              </div>

              <div className="seg-filter-group">
                <label>Condomínio *</label>
                {seguroEditando ? (
                  <div style={{ padding: '10px 12px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border)', borderRadius: '8px', fontWeight: 700, color: 'var(--text-primary)', fontSize: '14px' }}>
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
                  <input
                    type="text"
                    list="lista-corretoras"
                    className="seg-input"
                    placeholder="Ex: CARAGUA SEG CORRETORA, Setor Seguros..."
                    value={corretora}
                    onChange={(e) => setCorretora(e.target.value)}
                    required
                  />
                  <datalist id="lista-corretoras">
                    <option value="Setor Seguros" />
                    <option value="Síndico" />
                    <option value="CARAGUA SEG CORRETORA DE SEGUROS LTDA" />
                  </datalist>
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
              <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', marginTop: '6px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IcoUpload /> Anexar Arquivo da Apólice (PDF Oficial)
                </div>
                <input
                  type="file"
                  className="seg-input"
                  style={{ width: '100%', background: 'var(--bg-surface)' }}
                  onChange={(e) => setArquivoApolice(e.target.files[0] || null)}
                />
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  O arquivo será salvo automaticamente na estrutura oficial: <code>CONDOMÍNIOS/SEGUROS/[ano]/[codigo_condominio]/</code>
                </div>
              </div>
            </div>
          )}

          {/* 2. DOCUMENTOS & BOLETOS */}
          {abaAtiva === 'documentos' && (
            <div className="seg-card-section">
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                📂 Anexar Apólice, Boletos e Propostas
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                Estrutura de nuvem: <code style={{ background: 'var(--bg-surface-elevated)', padding: '2px 5px', borderRadius: '4px', color: 'var(--primary)' }}>CONDOMÍNIOS/SEGUROS/{vigenciaFim ? vigenciaFim.split('-')[0] : '2026'}/{String(condominioId || '001').padStart(3, '0')}/</code>
              </p>

              {/* Upload Apólice */}
              <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                  📄 1. Arquivo da Apólice (PDF Principal)
                </label>
                <input
                  type="file"
                  className="seg-input"
                  style={{ width: '100%', background: 'var(--bg-surface)' }}
                  onChange={(e) => setArquivoApolice(e.target.files[0] || null)}
                />
                {arquivoApolice && (
                  <div style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 600, marginTop: '4px' }}>
                    ✓ Arquivo selecionado: {arquivoApolice.name} ({(arquivoApolice.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>

              {/* Upload Boletos */}
              <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                  💳 2. Boletos / Comprovantes de Parcelas (Múltiplos arquivos)
                </label>
                <input
                  type="file"
                  multiple
                  className="seg-input"
                  style={{ width: '100%', background: 'var(--bg-surface)' }}
                  onChange={(e) => setArquivosBoletos(Array.from(e.target.files || []))}
                />
                {arquivosBoletos.length > 0 && (
                  <div style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 600, marginTop: '4px' }}>
                    ✓ {arquivosBoletos.length} boleto(s) selecionado(s) para upload
                  </div>
                )}
              </div>

              {/* Documentos já existentes */}
              {documentosExistentes.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Documentos já cadastrados neste seguro ({documentosExistentes.length}):
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {documentosExistentes.map((doc) => (
                      <div
                        key={doc.id}
                        style={{
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px'
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{doc.nome_arquivo}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>({doc.tipo})</span>
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
                            style={{ color: 'var(--danger)', width: '28px', height: '28px' }}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    🛡️ Configuração de Coberturas & Valores
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {coberturas.length > 0 ? `${coberturas.length} coberturas cadastradas na apólice` : 'Nenhuma cobertura adicionada'}
                  </div>
                </div>
                <button
                  type="button"
                  className="seg-btn-primary"
                  style={{ padding: '6px 14px', fontSize: '12px', boxShadow: 'none' }}
                  onClick={handleAdicionarCobertura}
                >
                  + Adicionar Cobertura
                </button>
              </div>

              {/* Stats & Multiplier Summary Bar */}
              <div className="seg-cov-stats-grid">
                <div className="seg-cov-stat-card">
                  <span className="seg-cov-stat-label">Cobertura por Unidade</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    <input
                      type="number"
                      step="1000"
                      className="seg-cell-input text-right"
                      style={{ fontWeight: 700, fontSize: '14px', maxWidth: '140px' }}
                      value={coberturaPorUnidade}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        setCoberturaPorUnidade(val);
                        setCoberturas((prev) =>
                          prev.map((c) => {
                            if (c.tipo === 'basica_simples' || (c.nome_personalizado && c.nome_personalizado.toLowerCase().includes('básica'))) {
                              const apts = Number(qtdApartamentos) || 0;
                              return {
                                ...c,
                                valor_por_imovel: val,
                                quantidade_imoveis: apts,
                                valor_segurado: val * apts,
                                valor_total_calculado: val * apts
                              };
                            }
                            return c;
                          })
                        );
                      }}
                      required
                    />
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    × {qtdApartamentos} unidades cadastradas
                  </span>
                </div>

                <div className="seg-cov-stat-card highlight">
                  <span className="seg-cov-stat-label">Total Cobertura Básica (Incêndio)</span>
                  <span className="seg-cov-stat-value">
                    {totalIncendioCalculado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {coberturaPorUnidade ? `R$ ${Number(coberturaPorUnidade).toLocaleString('pt-BR')} × ${qtdApartamentos} aptos` : 'Multiplicação automática'}
                  </span>
                </div>

                <div className="seg-cov-stat-card">
                  <span className="seg-cov-stat-label">Total Prêmio / Coberturas</span>
                  <span className="seg-cov-stat-value" style={{ color: 'var(--primary)' }}>
                    {totalPrecoCoberturas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Soma de {coberturas.length} coberturas
                  </span>
                </div>
              </div>

              {/* Tabela de Todas as Coberturas */}
              {coberturas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', background: 'var(--bg-surface-elevated)', borderRadius: '10px', border: '1px dashed var(--border)' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>📋</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>Nenhuma cobertura adicionada</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', marginBottom: '14px' }}>
                    Faça o upload do PDF da apólice na Aba 1 para extrair automaticamente todas as coberturas ou adicione manualmente.
                  </div>
                  <button
                    type="button"
                    className="seg-btn-outline"
                    onClick={handleAdicionarCobertura}
                  >
                    + Adicionar Cobertura Manualmente
                  </button>
                </div>
              ) : (
                <div className="seg-cov-table-wrap">
                  <table className="seg-cov-table">
                    <thead>
                      <tr>
                        <th style={{ minWidth: '220px' }}>COBERTURA</th>
                        <th style={{ textAlign: 'right', minWidth: '140px' }}>LMI (R$)</th>
                        <th style={{ textAlign: 'right', minWidth: '120px' }}>Preço (R$)</th>
                        <th style={{ textAlign: 'center', minWidth: '80px' }}>Franquia %</th>
                        <th style={{ textAlign: 'right', minWidth: '130px' }}>Franquia R$</th>
                        <th style={{ textAlign: 'center', width: '40px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {coberturas.map((cob, idx) => {
                        const isBasica = cob.tipo === 'basica_simples' || (cob.nome_personalizado && cob.nome_personalizado.toLowerCase().includes('básica'));
                        const nomeCob = cob.nome_personalizado || cob.nome || cob.tipo || '';
                        return (
                          <tr key={idx} className={isBasica ? 'is-basica' : ''}>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <input
                                  type="text"
                                  className={`seg-cell-input ${isBasica ? 'is-basica-name' : ''}`}
                                  value={nomeCob}
                                  placeholder="Nome da cobertura"
                                  onChange={(e) => handleUpdateCobertura(idx, 'nome_personalizado', e.target.value)}
                                />
                                {isBasica && (
                                  <span className="seg-badge-pill success" style={{ alignSelf: 'flex-start' }}>
                                    ✓ Cobertura Básica Principal
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <input
                                type="number"
                                step="1000"
                                className={`seg-cell-input text-right ${isBasica ? 'is-basica-val' : ''}`}
                                value={cob.valor_segurado ?? cob.valor_total_calculado ?? cob.limite ?? 0}
                                onChange={(e) => {
                                  const v = Number(e.target.value) || 0;
                                  handleUpdateCobertura(idx, 'valor_segurado', v);
                                  handleUpdateCobertura(idx, 'valor_total_calculado', v);
                                }}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.01"
                                className="seg-cell-input text-right"
                                placeholder="0,00"
                                value={cob.preco_cobertura ?? cob.premio ?? cob.preco ?? ''}
                                onChange={(e) => handleUpdateCobertura(idx, 'preco_cobertura', e.target.value !== '' ? parseFloat(e.target.value) : null)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="1"
                                className="seg-cell-input text-center"
                                placeholder="—"
                                value={cob.franquia_percentual ?? cob.franquia_pct ?? ''}
                                onChange={(e) => handleUpdateCobertura(idx, 'franquia_percentual', e.target.value !== '' ? Number(e.target.value) : null)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.01"
                                className="seg-cell-input text-right"
                                placeholder={cob.sem_franquia ? 'Sem Franquia' : '—'}
                                value={cob.franquia_reais ?? cob.franquia_rs ?? ''}
                                onChange={(e) => handleUpdateCobertura(idx, 'franquia_reais', e.target.value !== '' ? Number(e.target.value) : null)}
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                className="seg-btn-icon"
                                style={{ color: 'var(--danger)', width: '28px', height: '28px', fontSize: '15px' }}
                                onClick={() => handleRemoverCobertura(idx)}
                                title="Remover cobertura"
                              >
                                &times;
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 4. DADOS DO CONDOMÍNIO (PRINT 1) */}
          {abaAtiva === 'condominio' && (
            <div className="seg-card-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Informações Cadastrais do Condomínio
                </div>
                {!podeEditarCadastrais && (
                  <span style={{ fontSize: '11px', background: 'var(--warning-soft)', color: 'var(--warning-text)', border: '1px solid var(--warning)', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
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
