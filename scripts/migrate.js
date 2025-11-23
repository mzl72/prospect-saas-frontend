// Script para rodar migration via Node.js (contorna problema WSL)
const { execSync } = require('child_process');

try {
  console.log('🔄 Gerando Prisma Client...');
  execSync('npx prisma generate', { stdio: 'inherit' });

  console.log('\n🔄 Aplicando migrations...');
  execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });

  console.log('\n✅ Migrations aplicadas com sucesso!');
} catch (error) {
  console.error('❌ Erro:', error.message);
  process.exit(1);
}
