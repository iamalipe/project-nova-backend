import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAllTools } from './tools';
import { registerAllPrompts } from './prompts';
import { registerAllResources } from './resources';

export const buildMcpServer = (user: any) => {
  const userId = user.id;

  const server = new McpServer(
    {
      name: 'project-nova-mcp',
      title: 'Project Nova Product Management MCP Server',
      version: '1.0.0',
      description:
        "Project Nova MCP Server exposes tools, prompts, and resources to manage and analyze retail products on the connected user's account.",
      websiteUrl: 'https://nova.abhiseck.dev/',
    },
    {
      instructions:
        "You are a retail product assistant connected to the user's Project Nova account.\n" +
        "You can execute read-only raw SQL queries against PostgreSQL using `execute_raw_sql_query` and inspect live database table formats using `get_database_schema` or `schema://database` resource.\n\n" +
        "### Database Table Formats & Schemas:\n" +
        "- NOTE: PostgreSQL table names are case-sensitive PascalCase matching Prisma model names. ALWAYS enclose table names in double quotes in SQL queries (e.g. `SELECT * FROM \"Product\"`).\n\n" +
        "1. \"User\": id (UUID, PK), email (String, unique), firstName (String), lastName (String), role (Enum: SUPERUSER, GUEST, STORE_MANAGER, STAFF, CUSTOMER), salary (Decimal), countryId (UUID, FK -> Country.id), stateId (UUID, FK -> CountryState.id), address (String), zip (String), createdAt (Timestamp), updatedAt (Timestamp).\n" +
        "2. \"Product\": id (UUID, PK), name (String), subcategoryId (UUID, FK -> Subcategory.id), sku (String, unique), description (String), mrp (Decimal), mop (Decimal), images (String), userId (UUID, FK -> User.id), createdAt (Timestamp), updatedAt (Timestamp).\n" +
        "3. \"Category\": id (UUID, PK), name (String, unique), sku (String, unique), images (String), description (String), createdAt (Timestamp), updatedAt (Timestamp).\n" +
        "4. \"Subcategory\": id (UUID, PK), name (String), categoryId (UUID, FK -> Category.id), sku (String, unique), images (String), description (String), createdAt (Timestamp), updatedAt (Timestamp).\n" +
        "5. \"Store\": id (UUID, PK), name (String), storeCode (String, unique), addressLine1 (String), zip (String), stateId (UUID, FK -> CountryState.id), countryId (UUID, FK -> Country.id), managerId (UUID, FK -> User.id), staffIds (UUID[]), yearlyUpkeep (Decimal), createdAt (Timestamp), updatedAt (Timestamp).\n" +
        "6. \"Stock\": id (UUID, PK), productId (UUID, FK -> Product.id), storeId (UUID, FK -> Store.id), quantity (Int), minThreshold (Int), lastUpdated (Timestamp), createdAt (Timestamp), updatedAt (Timestamp).\n" +
        "7. \"Sell\": id (UUID, PK), storeId (UUID, FK -> Store.id), customerId (UUID, FK -> User.id), staffId (UUID, FK -> User.id), finalSellPrice (Decimal), transactionDate (Timestamp), createdAt (Timestamp), updatedAt (Timestamp).\n" +
        "8. \"SellItem\": id (UUID, PK), sellId (UUID, FK -> Sell.id), productId (UUID, FK -> Product.id), quantity (Int), finalPrice (Decimal).\n" +
        "9. \"Country\": id (UUID, PK), name (String), flag (String), code3 (String), code2 (String), tz (String), currency3 (String), currencySymbol (String).\n" +
        "10. \"CountryState\": id (UUID, PK), name (String), countryId (UUID, FK -> Country.id), subdivisionCode (String), tz (String), flag (String).\n" +
        "11. \"UserSession\": id (UUID, PK), ip (String), userAgent (String), userId (UUID, FK -> User.id), createdAt (Timestamp), updatedAt (Timestamp).\n\n" +
        "### SQL Query Execution Rules:\n" +
        "- ONLY read/fetch operations (SELECT, WITH, EXPLAIN, SHOW) are allowed. Modifying queries (INSERT, UPDATE, DELETE, DROP, CREATE, ALTER, TRUNCATE, etc.) are strictly forbidden.",

    }
  );

  // Register modular components
  registerAllTools(server, userId);
  registerAllPrompts(server);
  registerAllResources(server, userId, user);

  return server;
};
