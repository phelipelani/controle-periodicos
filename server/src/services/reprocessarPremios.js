const fs = require('fs');
const path = require('path');
const db = require('../db');
const { extrairPremios } = require('../services/apoliceParser');
const pdfParse = require('pdf-parse');

async function getPdfText(buf) {
  try {
    if (typeof pdfParse === 'function') {
      const data = await pdfParse(buf);
      return data.text || '';
    } else if (pdfParse?.PDFParse) {
      const parser = new pdfParse.PDFParse({ data: buf });
      const textResult = await parser.getText();
      const txt = textResult.text || (textResult.pages ? textResult.pages.map(p => p.text).join('\n') : '');
      try { await parser.destroy(); } catch (e) {}
      return txt;
    }
  } catch (e) {
    console.warn('Erro lendo PDF:', e.message);
  }
  return '';
}

async function reprocessarTodasApolices() {
  console.log('[Reprocessar] Iniciando varredura das apólices salvas...');
  const docs = db.prepare(`
    SELECT sd.*, s.id AS seguro_id, s.condominio_id, c.nome AS condominio_nome, s.premio_liquido
    FROM seguro_documentos sd
    JOIN seguros s ON s.id = sd.seguro_id
    JOIN condominios c ON c.id = s.condominio_id
    WHERE sd.tipo = 'Apólice'
    ORDER BY sd.id DESC
  `).all();

  console.log(`[Reprocessar] Encontrados ${docs.length} documentos de apólice cadastrados.`);

  let atualizados = 0;
  const updateSeguro = db.prepare(`
    UPDATE seguros
    SET premio_liquido = COALESCE(?, premio_liquido),
        premio_total = COALESCE(?, premio_total),
        atualizado_em = datetime('now')
    WHERE id = ?
  `);

  for (const doc of docs) {
    if (!doc.caminho || !fs.existsSync(doc.caminho)) {
      console.log(`[Pular] Arquivo não encontrado no disco: ${doc.caminho}`);
      continue;
    }

    try {
      const buf = fs.readFileSync(doc.caminho);
      const text = await getPdfText(buf);
      if (!text) continue;

      const { premioLiquido, premioTotal } = extrairPremios(text);

      if (premioLiquido) {
        updateSeguro.run(premioLiquido, premioTotal || null, doc.seguro_id);
        atualizados++;
        console.log(`✅ [Cód ${String(doc.condominio_id).padStart(3, '0')}] ${doc.condominio_nome}: Prêmio Líquido = R$ ${premioLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (Doc: ${doc.nome_arquivo})`);
      } else {
        console.log(`ℹ️ [Cód ${String(doc.condominio_id).padStart(3, '0')}] ${doc.condominio_nome}: Sem prêmio extraído automaticamente do arquivo ${doc.nome_arquivo}`);
      }
    } catch (err) {
      console.error(`❌ Erro no doc ${doc.id}:`, err.message);
    }
  }

  console.log(`\n🎉 Concluído! ${atualizados} seguros atualizados com o valor do prêmio líquido com sucesso.`);
  return { total: docs.length, atualizados };
}

if (require.main === module) {
  reprocessarTodasApolices().then(() => process.exit(0)).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { reprocessarTodasApolices };
