# unsubscribe - Opt-out de Leads (LGPD/CAN-SPAM)

**route.ts**: Endpoint GET de opt-out via token. Recebe query param `token`, busca lead por optOutToken, valida se já opted out, atualiza status para OPTED_OUT + timestamp optedOutAt. Retorna páginas HTML estilizadas (gradient purple, cards centralizados) para cada cenário: token inválido (400), lead não encontrado (404), já descadastrado anteriormente (200), sucesso (200 com mensagem de confirmação). Usa escapeHtml para prevenir XSS no nome da empresa. Dynamic rendering forçado.
