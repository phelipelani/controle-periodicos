import { useEffect, useState } from 'react';
import { api } from '../api';

export default function ConfigServicos() {
  const [servicos, setServicos] = useState([]);
  const [erro, setErro] = useState('');
  const [salvo, setSalvo] = useState('');

  function carregar() {
    api.get('/servicos').then(setServicos).catch((e) => setErro(e.message));
  }
  useEffect(carregar, []);

  function alterar(id, campo, valor) {
    setServicos((prev) => prev.map((s) => (s.id === id ? { ...s, [campo]: valor } : s)));
  }

  async function salvar(s) {
    setErro('');
    try {
      await api.put(`/servicos/${s.id}`, {
        nome: s.nome,
        periodicidade_meses: s.periodicidade_meses ? Number(s.periodicidade_meses) : null,
        alerta_dias_antes: Number(s.alerta_dias_antes),
      });
      setSalvo(s.id);
      setTimeout(() => setSalvo(''), 1500);
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <div>
      <h1>Configuração de serviços</h1>
      <p className="sub">Ajuste a periodicidade e a antecedência do alerta de cada serviço</p>

      {erro && <div className="erro">{erro}</div>}

      <table>
        <thead>
          <tr>
            <th>Serviço</th>
            <th>Tipo</th>
            <th>Periodicidade (meses)</th>
            <th>Alerta (dias antes)</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {servicos.map((s) => (
            <tr key={s.id}>
              <td><strong>{s.nome}</strong></td>
              <td style={{ color: 'var(--muted)' }}>
                {s.tipo_controle === 'validade' ? 'Data de validade' : 'Periódico'}
              </td>
              <td>
                <input
                  type="number"
                  min="1"
                  style={{ maxWidth: 110 }}
                  value={s.periodicidade_meses || ''}
                  disabled={s.tipo_controle === 'validade'}
                  onChange={(e) => alterar(s.id, 'periodicidade_meses', e.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  min="0"
                  style={{ maxWidth: 110 }}
                  value={s.alerta_dias_antes}
                  onChange={(e) => alterar(s.id, 'alerta_dias_antes', e.target.value)}
                />
              </td>
              <td>
                <button onClick={() => salvar(s)}>{salvo === s.id ? 'Salvo ✓' : 'Salvar'}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
