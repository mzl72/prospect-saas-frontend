#!/bin/bash
set -e

# Script para criar os bancos de dados necessários no PostgreSQL
# Este script é executado automaticamente quando o container do PostgreSQL é criado

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Criar banco para N8N
    CREATE DATABASE n8n;
    GRANT ALL PRIVILEGES ON DATABASE n8n TO $POSTGRES_USER;

    -- Criar banco para Evolution API
    CREATE DATABASE evolution;
    GRANT ALL PRIVILEGES ON DATABASE evolution TO $POSTGRES_USER;

    -- Criar banco shadow para Prisma migrations (dev only)
    CREATE DATABASE prospect_db_shadow;
    GRANT ALL PRIVILEGES ON DATABASE prospect_db_shadow TO $POSTGRES_USER;
EOSQL

echo "✅ Databases criados com sucesso: n8n, evolution, prospect_db_shadow"
