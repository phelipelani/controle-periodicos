const fs = require('fs');
const path = require('path');
const db = require('./src/db');
const bcrypt = require('bcryptjs');

function seedData() {
  const csvPath = 'C:\\Users\\lesco\\.gemini\\antigravity\\brain\\c6dfee16-a007-46c1-918a-9ad17b574d08\\scratch\\condominios.csv';
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  
  const lines = csvContent.split('\n').map(l => l.trim()).filter(l => l);
  lines.shift(); // remove header

  // 1. Limpar as tabelas de dados para começar zerado (mas mantém serviços e o admin)
  db.prepare('DELETE FROM historico').run();
  db.prepare('DELETE FROM agendamentos').run();
  db.prepare('DELETE FROM condominio_servicos').run();
  db.prepare('DELETE FROM condominios').run();
  // Remover usuários que não são admin para recriar os gerentes limpos
  db.prepare('DELETE FROM usuarios WHERE papel != ?').run('admin');

  console.log('Tabelas de dados limpas.');

  // Preparar statements
  const insertUser = db.prepare('INSERT INTO usuarios (nome, email, senha_hash, papel) VALUES (?, ?, ?, ?)');
  const findUser = db.prepare('SELECT id FROM usuarios WHERE nome = ?');
  const insertCondominio = db.prepare('INSERT INTO condominios (id, nome, gerente_id) VALUES (?, ?, ?)');

  const senhaPadrao = bcrypt.hashSync('123456', 10);

  // Mapear gerentes para IDs
  const gerentesMap = {};

  lines.forEach(line => {
    const [codigoStr, nome, gerenteNomeRaw] = line.split(';');
    if (!codigoStr) return;
    
    const id = parseInt(codigoStr, 10);
    const gerenteNome = gerenteNomeRaw ? gerenteNomeRaw.trim().toUpperCase() : null;
    
    let gerenteId = null;

    if (gerenteNome) {
      if (!gerentesMap[gerenteNome]) {
        // Tenta achar ou criar
        let user = findUser.get(gerenteNome);
        if (!user) {
          const info = insertUser.run(gerenteNome, `${gerenteNome.toLowerCase()}@imcosta.com.br`, senhaPadrao, 'gerente');
          user = { id: info.lastInsertRowid };
        }
        gerentesMap[gerenteNome] = user.id;
      }
      gerenteId = gerentesMap[gerenteNome];
    }

    insertCondominio.run(id, nome.trim(), gerenteId);
  });

  const totalCondominios = db.prepare('SELECT COUNT(*) as count FROM condominios').get().count;
  console.log(`Dados mockados removidos. Seed concluído: ${totalCondominios} condomínios inseridos com sucesso.`);
}

seedData();
