import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerProductTools } from './product.tools';
import { registerUserTools } from './user.tools';

export const registerAllTools = (server: McpServer, userId: string) => {
  registerProductTools(server, userId);
  registerUserTools(server, userId);
};
