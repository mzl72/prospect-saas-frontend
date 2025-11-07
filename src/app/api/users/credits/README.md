# credits - Consulta de Créditos do Usuário

**route.ts**: API GET simples que retorna saldo de créditos do usuário. Usa ensureDemoUser() que garante existência do DEMO_USER_ID e retorna dados. Dynamic rendering forçado. Nota: PUT foi removido (código morto), débito de créditos acontece diretamente em POST /api/campaigns durante criação da campanha.
