import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { db } from '../../../services/prisma.service';

export const registerInventoryResources = (server: McpServer, userId: string, user: any) => {
  // 1. inventory://summary
  server.registerResource(
    'inventory-summary',
    'inventory://summary',
    {
      title: 'Inventory Summary',
      description: 'Provides a real-time markdown summary of the connected user\'s product inventory (total count, average price, category distribution).',
      mimeType: 'text/markdown',
    },
    async (uri) => {
      try {
        const totalCount = await db.product.count({
          where: { userId },
        });

        const aggregation = await db.product.aggregate({
          where: { userId },
          _avg: { price: true },
        });

        const categoryGroups = await db.product.groupBy({
          by: ['category'],
          where: { userId },
          _count: { id: true },
        });

        const avgPrice = aggregation._avg.price ? Number(aggregation._avg.price) : 0;
        const categoryMarkdown = categoryGroups.length > 0
          ? categoryGroups.map((g: any) => `* **${g.category}:** ${g._count.id} products`).join('\n')
          : '* No categories found.';

        const content = `# Project Nova Inventory Catalog Summary

* **Total Products:** ${totalCount}
* **Average Product Price:** $${avgPrice.toFixed(2)}

### Category Breakdown
${categoryMarkdown}

*Generated dynamically on: ${new Date().toLocaleString()}*`;

        return {
          contents: [
            {
              uri: uri.toString(),
              text: content,
              mimeType: 'text/markdown',
            },
          ],
        };
      } catch (err: any) {
        return {
          contents: [
            {
              uri: uri.toString(),
              text: `Failed to compile inventory summary: ${err.message || 'Unknown error'}`,
              mimeType: 'text/plain',
            },
          ],
        };
      }
    }
  );

  // 2. user://profile
  server.registerResource(
    'user-profile',
    'user://profile',
    {
      title: 'User Session Profile',
      description: 'Provides the profile information of the currently authenticated user session.',
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
    }
  );
};
