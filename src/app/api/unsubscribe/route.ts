/**
 * Página de Unsubscribe (Opt-out)
 * Lead clica no link do email e é removido da lista
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-db';
import { LeadStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * Sanitiza string para prevenir XSS quando inserida em HTML
 * Escapa caracteres especiais que podem executar scripts
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Token Inválido</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
              text-align: center;
              max-width: 500px;
            }
            h1 { color: #e53e3e; margin-bottom: 20px; }
            p { color: #4a5568; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>❌ Token Inválido</h1>
            <p>O link de descadastro está incompleto ou inválido.</p>
            <p>Por favor, use o link completo que foi enviado no email.</p>
          </div>
        </body>
      </html>
      `,
      {
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  }

  try {
    // Buscar lead pelo token de opt-out
    const lead = await prisma.lead.findUnique({
      where: { optOutToken: token },
    });

    if (!lead) {
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html lang="pt-BR">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Lead Não Encontrado</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              }
              .container {
                background: white;
                padding: 40px;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                text-align: center;
                max-width: 500px;
              }
              h1 { color: #e53e3e; margin-bottom: 20px; }
              p { color: #4a5568; line-height: 1.6; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>❌ Registro Não Encontrado</h1>
              <p>Não encontramos nenhum registro associado a este token.</p>
              <p>O cadastro pode já ter sido removido anteriormente.</p>
            </div>
          </body>
        </html>
        `,
        {
          status: 404,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        }
      );
    }

    // Verificar se já está opted out
    if (lead.optedOutAt) {
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html lang="pt-BR">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Já Descadastrado</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              }
              .container {
                background: white;
                padding: 40px;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                text-align: center;
                max-width: 500px;
              }
              h1 { color: #48bb78; margin-bottom: 20px; }
              p { color: #4a5568; line-height: 1.6; }
              .company { font-weight: 600; color: #2d3748; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>✓ Já Descadastrado</h1>
              <p>O email de <span class="company">${escapeHtml(lead.nomeEmpresa || 'sua empresa')}</span> já foi removido da nossa lista anteriormente.</p>
              <p>Você não receberá mais mensagens nossas.</p>
            </div>
          </body>
        </html>
        `,
        {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        }
      );
    }

    // Marcar como opted out
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: LeadStatus.OPTED_OUT,
        optedOutAt: new Date(),
      },
    });

    console.log(`[Unsubscribe] ✅ Lead "${lead.nomeEmpresa}" opted out`);

    // Página de sucesso
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Descadastrado com Sucesso</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
              text-align: center;
              max-width: 500px;
            }
            h1 {
              color: #48bb78;
              margin-bottom: 20px;
              font-size: 32px;
            }
            p {
              color: #4a5568;
              line-height: 1.6;
              margin-bottom: 15px;
            }
            .company {
              font-weight: 600;
              color: #2d3748;
              background: #edf2f7;
              padding: 4px 8px;
              border-radius: 4px;
            }
            .info {
              background: #f7fafc;
              border-left: 4px solid #4299e1;
              padding: 15px;
              margin-top: 20px;
              text-align: left;
              border-radius: 4px;
            }
            .info strong { color: #2d3748; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>✓ Descadastrado com Sucesso</h1>
            <p>O email de <span class="company">${escapeHtml(lead.nomeEmpresa || 'sua empresa')}</span> foi removido da nossa lista.</p>
            <p>Você não receberá mais mensagens nossas.</p>

            <div class="info">
              <strong>📧 Mudou de ideia?</strong><br>
              Se desejar voltar a receber nossas mensagens no futuro, entre em contato conosco.
            </div>
          </div>
        </body>
      </html>
      `,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  } catch (error) {
    console.error('[Unsubscribe] Error:', error);

    return new NextResponse(
      `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Erro no Servidor</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
              text-align: center;
              max-width: 500px;
            }
            h1 { color: #e53e3e; margin-bottom: 20px; }
            p { color: #4a5568; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>❌ Erro no Servidor</h1>
            <p>Ocorreu um erro ao processar sua solicitação.</p>
            <p>Por favor, tente novamente mais tarde ou entre em contato conosco.</p>
          </div>
        </body>
      </html>
      `,
      {
        status: 500,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  }
}
