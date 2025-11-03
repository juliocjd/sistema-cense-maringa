// Script para gerar hash de senha para o primeiro admin
// Uso: node criar-admin-hash.js

const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Digite a senha para o admin: ', (senha) => {
  if (senha.length < 6) {
    console.log('\n❌ A senha deve ter no mínimo 6 caracteres');
    rl.close();
    return;
  }

  const hash = bcrypt.hashSync(senha, 10);
  
  console.log('\n✅ Hash gerado com sucesso!\n');
  console.log('Cole este SQL no seu banco de dados PostgreSQL:\n');
  console.log('----------------------------------------');
  console.log(`INSERT INTO operadores (id, nome_completo, email, senha_hash, funcao_role, status)
VALUES (
  gen_random_uuid(),
  'Administrador do Sistema',
  'admin@cense.pr.gov.br',
  '${hash}',
  'ADMIN',
  'ATIVO'
);`);
  console.log('----------------------------------------\n');
  console.log('📧 Email: admin@cense.pr.gov.br');
  console.log('🔑 Senha:', senha);
  console.log('\n⚠️  Troque a senha após o primeiro login!\n');
  
  rl.close();
});
