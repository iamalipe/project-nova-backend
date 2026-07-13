import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerInventoryResources } from './inventory.resources';

export const registerAllResources = (server: McpServer, userId: string, user: any) => {
  registerInventoryResources(server, userId, user);
};
