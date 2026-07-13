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
        "You are a retail product assistant connected to the user's Project Nova account. " +
        "Use the tools, prompts, and resources provided to manage, analyze, and optimize inventory, create descriptions, and query user profile context.",
    }
  );

  // Register modular components
  registerAllTools(server, userId);
  registerAllPrompts(server);
  registerAllResources(server, userId, user);

  return server;
};
