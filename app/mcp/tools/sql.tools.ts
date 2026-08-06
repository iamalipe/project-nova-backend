import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { db } from '../../../services/prisma.service';
import {
  executeRawSqlQueryInputSchema,
  executeRawSqlQueryOutputSchema,
  getDatabaseSchemaInputSchema,
  getDatabaseSchemaOutputSchema,
} from '../mcp.schema';

/**
 * Strips single-line and multi-line SQL comments.
 */
const stripSqlComments = (sql: string): string => {
  return sql
    .replace(/--.*$/gm, '') // Remove single-line comments (-- ...)
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments (/* ... */)
    .trim();
};

/**
 * Safely converts BigInt, Decimal, Date, and Buffer values for JSON serialization.
 */
const sanitizeRowValue = (val: any): any => {
  if (val === null || val === undefined) return val;
  if (typeof val === 'bigint') return Number(val);
  if (typeof val === 'object') {
    if (val instanceof Date) return val.toISOString();
    // Decimal objects from Prisma/pg
    if (typeof val.toNumber === 'function') return val.toNumber();
    if (typeof val.toString === 'function' && val.constructor?.name === 'Decimal') {
      return Number(val.toString());
    }
    if (Array.isArray(val)) return val.map(sanitizeRowValue);
    const sanitizedObj: Record<string, any> = {};
    for (const key of Object.keys(val)) {
      sanitizedObj[key] = sanitizeRowValue(val[key]);
    }
    return sanitizedObj;
  }
  return val;
};

/**
 * Validates whether an incoming SQL string is strictly a read-only query.
 */
const validateReadOnlySqlQuery = (rawQuery: string): string => {
  const clean = stripSqlComments(rawQuery);

  if (!clean) {
    throw new Error('Query string cannot be empty.');
  }

  // Ensure query does not contain multiple statements separated by semicolons
  const statements = clean
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (statements.length > 1) {
    throw new Error('Multiple SQL statements separated by semicolons are not allowed.');
  }

  const queryToValidate = statements[0];

  // Must start with read-only operations: SELECT, WITH, EXPLAIN, SHOW
  const startPattern = /^(SELECT|WITH|EXPLAIN|SHOW)\b/i;
  if (!startPattern.test(queryToValidate)) {
    throw new Error(
      'Execution rejected: Only fetch/read queries starting with SELECT, WITH, EXPLAIN, or SHOW are permitted.'
    );
  }

  // Forbidden DDL / DML write keywords
  const forbiddenKeywords = [
    'INSERT',
    'UPDATE',
    'DELETE',
    'DROP',
    'CREATE',
    'ALTER',
    'TRUNCATE',
    'GRANT',
    'REVOKE',
    'EXECUTE',
    'CALL',
    'REPLACE',
    'MERGE',
    'COPY',
    'VACUUM',
    'REINDEX',
    'COMMENT',
    'SET',
    'RESET',
    'COMMIT',
    'ROLLBACK',
    'SAVEPOINT',
    'LOCK',
    'INTO',
    'UPSERT',
  ];

  const forbiddenPattern = new RegExp(`\\b(${forbiddenKeywords.join('|')})\\b`, 'i');
  const match = queryToValidate.match(forbiddenPattern);
  if (match) {
    throw new Error(
      `Execution rejected: Forbidden operation "${match[0].toUpperCase()}" detected. Only read/fetch queries (SELECT) are permitted. Write, create, update, delete, and alter operations are strictly prohibited.`
    );
  }

  return queryToValidate;
};

export const registerSqlTools = (server: McpServer) => {
  // 1. execute_raw_sql_query
  server.registerTool(
    'execute_raw_sql_query',
    {
      title: 'Execute Read-Only Raw SQL Query',
      description:
        'Executes a raw SQL SELECT/read-only query on PostgreSQL and returns the results. ONLY read operations (SELECT, EXPLAIN, WITH...SELECT) are allowed. Modifying operations (INSERT, UPDATE, DELETE, DROP, CREATE, ALTER, etc.) are strictly forbidden.',
      inputSchema: executeRawSqlQueryInputSchema,
      outputSchema: executeRawSqlQueryOutputSchema,
    },
    async (input: { query: string }) => {
      try {
        const validatedQuery = validateReadOnlySqlQuery(input.query);

        // Execute inside a read-only PostgreSQL transaction for engine-level safety
        const rawRows = (await db.$transaction(async (tx) => {
          await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY;');
          return await tx.$queryRawUnsafe(validatedQuery);
        })) as any[];

        const rows = Array.isArray(rawRows)
          ? rawRows.map((row) => sanitizeRowValue(row))
          : [];

        const structuredResult = {
          rowCount: rows.length,
          rows,
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(structuredResult, null, 2),
            },
          ],
          structuredContent: structuredResult,
          isError: false,
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: 'text',
              text: `SQL Query Execution Failed: ${err.message || 'Unknown database error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // 2. get_database_schema
  server.registerTool(
    'get_database_schema',
    {
      title: 'Get Database Schema & Table Formats',
      description:
        'Retrieves database table formats (table names, columns, data types, nullability, primary keys, foreign keys) so the AI knows exact table structures for crafting accurate SQL queries.',
      inputSchema: getDatabaseSchemaInputSchema,
      outputSchema: getDatabaseSchemaOutputSchema,
    },
    async (input: { tableName?: string }) => {
      try {
        const tableNameFilter = input.tableName ? input.tableName.trim() : null;

        let columnsQuery = `
          SELECT 
            table_name, 
            column_name, 
            data_type, 
            is_nullable, 
            column_default
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name != '_prisma_migrations'
        `;

        if (tableNameFilter) {
          columnsQuery += ` AND table_name = '${tableNameFilter.replace(/'/g, "''")}'`;
        }

        columnsQuery += ` ORDER BY table_name, ordinal_position;`;

        const columnsRaw = (await db.$queryRawUnsafe(columnsQuery)) as any[];

        // Primary keys
        let pkQuery = `
          SELECT
            kcu.table_name,
            kcu.column_name
          FROM information_schema.table_constraints tco
          JOIN information_schema.key_column_usage kcu
            ON tco.constraint_schema = kcu.constraint_schema
            AND tco.constraint_name = kcu.constraint_name
          WHERE tco.constraint_schema = 'public'
            AND tco.constraint_type = 'PRIMARY KEY'
        `;

        if (tableNameFilter) {
          pkQuery += ` AND kcu.table_name = '${tableNameFilter.replace(/'/g, "''")}'`;
        }

        const pkRaw = (await db.$queryRawUnsafe(pkQuery)) as any[];

        // Foreign keys
        let fkQuery = `
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
        `;

        if (tableNameFilter) {
          fkQuery += ` AND kcu.table_name = '${tableNameFilter.replace(/'/g, "''")}'`;
        }

        const fkRaw = (await db.$queryRawUnsafe(fkQuery)) as any[];

        // Group by table
        const tableMap = new Map<string, any>();

        for (const col of columnsRaw) {
          const tName = col.table_name;
          if (!tableMap.has(tName)) {
            tableMap.set(tName, {
              tableName: tName,
              columns: [],
              primaryKeyColumns: [],
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
          if (tbl && !tbl.primaryKeyColumns.includes(pk.column_name)) {
            tbl.primaryKeyColumns.push(pk.column_name);
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

        const tables = Array.from(tableMap.values());
        const structuredResult = { tables };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(structuredResult, null, 2),
            },
          ],
          structuredContent: structuredResult,
          isError: false,
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to retrieve database schema: ${err.message || 'Unknown database error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
};
