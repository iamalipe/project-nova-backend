import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerInventoryPrompts } from './inventory.prompts';

export const registerAllPrompts = (server: McpServer) => {
  registerInventoryPrompts(server);
};
