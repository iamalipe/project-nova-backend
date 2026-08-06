import { z } from 'zod';

export const getUserProfileInputSchema = z.object({}).describe('Input schema for getting the logged-in user profile (no arguments required)');

export const updateUserProfileInputSchema = z.object({
  firstName: z.string().min(2).max(255).optional().describe('The updated first name of the user'),
  lastName: z.string().min(2).max(255).optional().describe('The updated last name of the user'),
  salary: z.number().positive().optional().nullable().describe('The updated salary of the user'),
  countryId: z.string().uuid().optional().nullable().describe('The updated country UUID of the user'),
  stateId: z.string().uuid().optional().nullable().describe('The updated state UUID of the user'),
  address: z.string().optional().nullable().describe('The updated address of the user'),
  zip: z.string().optional().nullable().describe('The updated ZIP code of the user'),
}).describe('Input schema for updating user profile fields');

export const userProfileOutputSchema = z.object({
  id: z.string().uuid().describe('The unique user UUID'),
  email: z.string().describe('The user email address'),
  firstName: z.string().describe('First name of the user'),
  lastName: z.string().nullable().describe('Last name of the user'),
  profileImage: z.string().nullable().describe('URL to the profile image'),
  role: z.string().describe('The role assigned to the user'),
  salary: z.any().nullable().optional().describe('The salary of the user'),
  countryId: z.string().uuid().nullable().optional().describe('The country UUID of the user'),
  stateId: z.string().uuid().nullable().optional().describe('The state UUID of the user'),
  address: z.string().nullable().optional().describe('The address of the user'),
  zip: z.string().nullable().optional().describe('The ZIP code of the user'),
  createdAt: z.string().describe('ISO timestamp of user creation'),
  updatedAt: z.string().describe('ISO timestamp of user last update'),
}).describe('The user profile details');

export const executeRawSqlQueryInputSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe(
      'The raw SQL SELECT/read query to execute against the PostgreSQL database. Only fetch/read operations are allowed (SELECT, EXPLAIN, WITH...SELECT). Multi-statements and write operations (DELETE, CREATE, UPDATE, INSERT, DROP, ALTER, etc.) are strictly forbidden.'
    ),
}).describe('Input schema for running read-only raw SQL queries');

export const executeRawSqlQueryOutputSchema = z.object({
  rowCount: z.number().describe('Total number of rows returned by the query'),
  rows: z.array(z.record(z.string(), z.any())).describe('Array of row objects returned by the SQL query'),
}).describe('Output schema for raw SQL query execution results');

export const getDatabaseSchemaInputSchema = z.object({
  tableName: z
    .string()
    .optional()
    .describe('Optional name of a specific table to inspect (e.g. "User", "Product", "Category", "Store", "Sell")'),
}).describe('Input schema for inspecting database table formats and schemas');

export const getDatabaseSchemaOutputSchema = z.object({
  tables: z.array(
    z.object({
      tableName: z.string(),
      columns: z.array(
        z.object({
          columnName: z.string(),
          dataType: z.string(),
          isNullable: z.boolean(),
          columnDefault: z.string().nullable().optional(),
        })
      ),
      primaryKeyColumns: z.array(z.string()).optional(),
      foreignKeys: z
        .array(
          z.object({
            columnName: z.string(),
            foreignTableName: z.string(),
            foreignColumnName: z.string(),
          })
        )
        .optional(),
    })
  ).describe('List of database table definitions with column types and key relations'),
}).describe('Output schema containing table formats and schemas');

