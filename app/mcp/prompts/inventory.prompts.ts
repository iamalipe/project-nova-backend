import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export const registerInventoryPrompts = (server: McpServer) => {
  // 1. analyze_inventory
  server.registerPrompt(
    'analyze_inventory',
    {
      title: 'Analyze Inventory Catalog',
      description: 'Generates a prompt for auditing the user\'s product catalog for description quality, categorization, and pricing strategy.',
      argsSchema: {
        category: z.string().optional().describe('Analyze only products matching this specific category (optional)'),
        detailed: z.string().optional().describe('Set to "true" to request a deep item-by-item audit (optional)'),
      },
    },
    async (args) => {
      const category = args.category;
      const isDetailed = args.detailed === 'true';

      return {
        description: 'Inventory optimization and health analysis query',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please perform an inventory quality analysis on my Project Nova product catalog.${
                category ? ` Focus only on the category "${category}".` : ''
              } Run the following checks:
1. Identify any products with missing or very short descriptions (under 20 characters).
2. Check for pricing consistency across similar items.
3. Suggest 3 key marketing ideas or bundles to improve sales.
${isDetailed ? 'Please provide a detailed, item-by-item report of all identified issues.' : 'Provide a high-level summary of findings.'}
Format your response as a professional retail markdown report.`,
            },
          },
        ],
      };
    }
  );

  // 2. draft_seo_descriptions
  server.registerPrompt(
    'draft_seo_descriptions',
    {
      title: 'Draft SEO Product Descriptions',
      description: 'Generates a structured prompt to draft high-converting, SEO-optimized descriptions for retail products.',
      argsSchema: {
        productName: z.string().describe('The name of the product'),
        category: z.string().describe('The category classification'),
        keywords: z.string().optional().describe('Comma-separated target SEO keywords (optional)'),
      },
    },
    async (args) => {
      const { productName, category, keywords } = args;

      return {
        description: 'SEO marketing copy generation template',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please draft a highly compelling, search-engine-optimized (SEO) retail product listing for the following item:
- **Product Name:** ${productName}
- **Category:** ${category}
${keywords ? `- **Target Keywords:** ${keywords}` : ''}

Requirements:
1. Write a catchy marketing tagline (1 sentence).
2. Write a detailed product description highlighting features and benefits (100-200 words).
3. List 5 key bullet points for product features.
4. Output meta title and description (under 160 characters) for google search indexing.`,
            },
          },
        ],
      };
    }
  );
};
