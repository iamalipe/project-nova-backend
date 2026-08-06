import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { db } from '../../../services/prisma.service';

export const registerDatabaseResources = (server: McpServer) => {
  // 1. schema://database
  server.registerResource(
    'database-schema',
    'schema://database',
    {
      title: 'PostgreSQL Database Schema & Table Formats',
      description:
        'Provides full table structures, column definitions, data types, and relational foreign key linkages across the database.',
      mimeType: 'application/json',
    },
    async (uri) => {
      try {
        const columnsRaw = (await db.$queryRawUnsafe(`
          SELECT 
            table_name, 
            column_name, 
            data_type, 
            is_nullable, 
            column_default
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name != '_prisma_migrations'
          ORDER BY table_name, ordinal_position;
        `)) as any[];

        const pkRaw = (await db.$queryRawUnsafe(`
          SELECT
            kcu.table_name,
            kcu.column_name
          FROM information_schema.table_constraints tco
          JOIN information_schema.key_column_usage kcu
            ON tco.constraint_schema = kcu.constraint_schema
            AND tco.constraint_name = kcu.constraint_name
          WHERE tco.constraint_schema = 'public'
            AND tco.constraint_type = 'PRIMARY KEY'
        `)) as any[];

        const fkRaw = (await db.$queryRawUnsafe(`
          SELECT
            kcu.table_name,
            kcu.column_name,
            rel_kcu.table_name AS foreign_table_name,
            rel_kcu.column_name AS foreign_column_name
          FROM information_schema.table_constraints tco
          JOIN information_schema.key_column_usage kcu
            ON tco.constraint_schema = kcu.constraint_schema
            AND tco.constraint_name = kcu.constraint_name
          JOIN information_schema.referential_constraints rco
            ON tco.constraint_schema = rco.constraint_schema
            AND tco.constraint_name = rco.constraint_name
          JOIN information_schema.key_column_usage rel_kcu
            ON rco.unique_constraint_schema = rel_kcu.constraint_schema
            AND rco.unique_constraint_name = rel_kcu.constraint_name
            AND kcu.ordinal_position = rel_kcu.ordinal_position
          WHERE tco.constraint_schema = 'public'
            AND tco.constraint_type = 'FOREIGN KEY'
        `)) as any[];

        const tableMap = new Map<string, any>();

        for (const col of columnsRaw) {
          const tName = col.table_name;
          if (!tableMap.has(tName)) {
            tableMap.set(tName, {
              tableName: tName,
              columns: [],
              primaryKeys: [],
              foreignKeys: [],
            });
          }

          tableMap.get(tName).columns.push({
            columnName: col.column_name,
            dataType: col.data_type,
            isNullable: col.is_nullable === 'YES',
            columnDefault: col.column_default || null,
          });
        }

        for (const pk of pkRaw) {
          const tbl = tableMap.get(pk.table_name);
          if (tbl && !tbl.primaryKeys.includes(pk.column_name)) {
            tbl.primaryKeys.push(pk.column_name);
          }
        }

        for (const fk of fkRaw) {
          const tbl = tableMap.get(fk.table_name);
          if (tbl) {
            tbl.foreignKeys.push({
              columnName: fk.column_name,
              foreignTableName: fk.foreign_table_name,
              foreignColumnName: fk.foreign_column_name,
            });
          }
        }

        const schemaData = {
          database: 'Project Nova Retail Database (PostgreSQL)',
          tableCount: tableMap.size,
          tables: Array.from(tableMap.values()),
        };

        return {
          contents: [
            {
              uri: uri.toString(),
              text: JSON.stringify(schemaData, null, 2),
              mimeType: 'application/json',
            },
          ],
        };
      } catch (err: any) {
        return {
          contents: [
            {
              uri: uri.toString(),
              text: JSON.stringify({ error: err.message || 'Failed to fetch schema' }),
              mimeType: 'application/json',
            },
          ],
        };
      }
    }
  );
};
