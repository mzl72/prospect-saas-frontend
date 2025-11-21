#!/bin/bash
set -e

# Cria databases separados para cada serviço
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Database para Evolution API
    CREATE DATABASE evolution;
    GRANT ALL PRIVILEGES ON DATABASE evolution TO $POSTGRES_USER;

    -- Database para N8N
    CREATE DATABASE n8n;
    GRANT ALL PRIVILEGES ON DATABASE n8n TO $POSTGRES_USER;

    -- Database principal (prospect_db) já existe
    GRANT ALL PRIVILEGES ON DATABASE $POSTGRES_DB TO $POSTGRES_USER;
EOSQL

echo "✅ Databases criados com sucesso: prospect_db, evolution, n8n"
