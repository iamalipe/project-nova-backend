import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export const registerInventoryResources = (
  server: McpServer,
  userId: string,
  user: any,
) => {
  // 2. user://profile
  server.registerResource(
    'user-profile',
    'user://profile',
    {
      title: 'User Session Profile',
      description:
        'Provides the profile information of the currently authenticated user session.',
      mimeType: 'application/json',
    },
    async (uri) => {
      // Exclude password if present in the user object
      const { password, ...safeUser } = user;

      return {
        contents: [
          {
            uri: uri.toString(),
            text: JSON.stringify(safeUser, null, 2),
            mimeType: 'application/json',
          },
        ],
      };
    },
  );
};
