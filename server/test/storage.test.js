const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const storageService = require('../src/services/storage/storage.service');

async function runTests() {
  console.log('===============================================================');
  console.log('       SUITE DE TESTES - STORAGE SERVICE & ONEDRIVE GRAPH      ');
  console.log('===============================================================');

  let passed = 0;
  let total = 0;

  function assert(condition, testName) {
    total++;
    if (condition) {
      console.log(`✅ [PASSOU] Teste ${total}: ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FALHOU] Teste ${total}: ${testName}`);
    }
  }

  // Teste 1: Upload de PDF (em memória)
  console.log('\n--- 1. Upload de PDF ---');
  const pdfBuffer = Buffer.from('%PDF-1.4 Relatorio Teste Periodicos IMCosta', 'utf-8');
  const uploadPdfRes = await storageService.upload({
    buffer: pdfBuffer,
    originalname: 'apolice_teste.pdf',
    mimetype: 'application/pdf',
    modulo: 'SEGUROS',
    ano: 2026,
    codigoCondominio: 1
  });
  assert(uploadPdfRes && uploadPdfRes.path.includes('SEGUROS/2026/001/apolice_teste.pdf'), 'Upload de PDF e path lógico');
  assert(uploadPdfRes.mimeType === 'application/pdf', 'MIME type correto para PDF');

  // Teste 2: Upload de Imagem
  console.log('\n--- 2. Upload de Imagem ---');
  const imgBuffer = Buffer.from('Fake PNG binary content 123456', 'utf-8');
  const uploadImgRes = await storageService.upload({
    buffer: imgBuffer,
    originalname: 'foto_fachada.png',
    mimetype: 'image/png',
    modulo: 'IMAGENS',
    customFilename: 'condominio-teste-123.png'
  });
  assert(uploadImgRes && uploadImgRes.path === 'IMAGENS/condominio-teste-123.png', 'Upload de imagem em pasta IMAGENS');

  // Teste 3: Upload com caracteres especiais, acentos e espaços
  console.log('\n--- 3. Sanitização de Nomes de Arquivos ---');
  const sanitizedName = storageService.sanitizeFilename('../../../Recibo Dedetização - Bloco A & B (Final).pdf');
  assert(!sanitizedName.includes('..') && !sanitizedName.includes('/') && !sanitizedName.includes('\\') && sanitizedName.endsWith('.pdf'), `Nome sanitizado corretamente: ${sanitizedName}`);

  const specialBuffer = Buffer.from('Comprovante com caracteres especiais', 'utf-8');
  const uploadSpecialRes = await storageService.upload({
    buffer: specialBuffer,
    originalname: 'Recibo Dedetização Bloco A.pdf',
    mimetype: 'application/pdf',
    modulo: 'DEDETIZAÇÃO',
    ano: 2026,
    codigoCondominio: 42
  });
  assert(uploadSpecialRes && uploadSpecialRes.path.includes('DEDETIZAÇÃO/2026/042/'), 'Upload para pasta de condomínio formatada (042)');

  // Teste 4: Upload para pasta que ainda não existia
  console.log('\n--- 4. Upload para Nova Subpasta ---');
  const newFolderUpload = await storageService.upload({
    buffer: Buffer.from('AVCB laudo novo', 'utf-8'),
    originalname: 'laudo_bombeiros.pdf',
    mimetype: 'application/pdf',
    modulo: 'AVCB',
    ano: 2027,
    codigoCondominio: 99
  });
  assert(newFolderUpload && newFolderUpload.path === 'AVCB/2027/099/laudo_bombeiros.pdf', 'Criação e roteamento de nova pasta AVCB/2027/099');

  // Teste 5: Segundo upload para a mesma pasta
  console.log('\n--- 5. Segundo Upload para a Mesma Pasta ---');
  const secondUpload = await storageService.upload({
    buffer: Buffer.from('AVCB laudo 2', 'utf-8'),
    originalname: 'laudo_complementar.pdf',
    mimetype: 'application/pdf',
    modulo: 'AVCB',
    ano: 2027,
    codigoCondominio: 99
  });
  assert(secondUpload && secondUpload.path === 'AVCB/2027/099/laudo_complementar.pdf', 'Segundo upload para a mesma pasta sem conflito');

  // Teste 6: Download / Leitura do Arquivo (getFile)
  console.log('\n--- 6. Leitura e Download de Arquivo ---');
  const fileRead = await storageService.getFile(uploadPdfRes.path);
  assert(fileRead && fileRead.buffer && fileRead.buffer.toString() === '%PDF-1.4 Relatorio Teste Periodicos IMCosta', 'Conteúdo do arquivo recuperado intacto');
  assert(fileRead.mimeType === 'application/pdf', 'MIME type preservado na leitura');

  // Teste 7: Exclusão do Arquivo (deleteFile)
  console.log('\n--- 7. Exclusão de Arquivo ---');
  const deleteRes = await storageService.deleteFile(secondUpload.path);
  assert(deleteRes && deleteRes.ok && deleteRes.deletado, 'Arquivo excluído com sucesso');

  // Teste 8: Diagnóstico de Conexão e Fallback
  console.log('\n--- 8. Status e Diagnóstico de Conexão ---');
  const diag = await storageService.testConnection();
  assert(diag && typeof diag.ok === 'boolean', `Diagnóstico de storage retornado: ${JSON.stringify(diag)}`);

  // Teste 9: Retrocompatibilidade com Arquivos Legados
  console.log('\n--- 9. Retrocompatibilidade com Arquivos Legados ---');
  const testLocalPath = path.join(process.env.DB_DIR || 'C:/controle-periodicos-data', 'teste_legado.txt');
  fs.writeFileSync(testLocalPath, 'Conteudo Legado');
  const legacyRead = await storageService.getFile(testLocalPath);
  assert(legacyRead && legacyRead.buffer.toString() === 'Conteudo Legado', 'Leitura de arquivo legado via caminho absoluto');
  fs.unlinkSync(testLocalPath);

  // Teste 10: Isolamento total de OneDrive Desktop
  console.log('\n--- 10. Desacoplamento Total de Caminhos Físicos C:\\Users ---');
  assert(!uploadPdfRes.path.startsWith('C:\\') && !uploadPdfRes.path.includes('OneDrive - IMCosta'), `Path do banco é puramente lógico: ${uploadPdfRes.path}`);

  console.log('\n===============================================================');
  console.log(`RESULTADO FINAL: ${passed}/${total} TESTES PASSARAM COM SUCESSO!`);
  console.log('===============================================================');
}

runTests().catch(console.error);
