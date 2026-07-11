import type { Context } from 'hono';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { buildMcpServer } from './mcp.server';

export const handleMcpPost = async (c: Context) => {
  const user = c.get('user');
  const server = buildMcpServer(user);
  
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  const { incoming, outgoing } = c.env as any;

  outgoing.on('close', () => {
    transport.close();
    server.close();
  });

  const body = await c.req.json().catch(() => ({}));

  await server.connect(transport);
  await transport.handleRequest(incoming, outgoing, body);

  return new Response(null, {
    headers: {
      'x-hono-already-sent': 'true',
    },
  });
};

export const methodNotAllowed = async (c: Context) => {
  return c.json(
    {
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed.' },
      id: null,
    },
    405
  );
};
