import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import productService from '../product/product.service';
import {
  createProductInputSchema,
  createProductsInputSchema,
  updateProductInputSchema,
  deleteProductInputSchema,
  deleteProductsInputSchema,
  getProductInputSchema,
  listProductsInputSchema,
} from './mcp.schema';

const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

const WRITE_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
};

export const buildMcpServer = (user: any) => {
  const userId = user.id;

  const server = new McpServer(
    {
      name: 'project-nova-mcp',
      title: 'Project Nova Product Management MCP Server',
      version: '1.0.0',
      description:
        'Project Nova MCP Server exposes tools to list, create, update, and delete retail products on the connected user\'s account.',
      websiteUrl: 'https://nova.abhiseck.dev/',
    },
    {
      instructions:
        'You are a retail product assistant connected to the user\'s Project Nova account. ' +
        'Use these tools to search, list, retrieve, create, update, and delete products in the user\'s inventory. ' +
        'Ensure that details like name, description, category, and price are carefully captured when performing additions or updates.',
    }
  );

  // 1. create_product
  server.registerTool(
    'create_product',
    {
      title: 'Create Product',
      description: 'Creates a single new product in the user\'s catalog.',
      inputSchema: createProductInputSchema,
      annotations: { title: 'Create Product', ...WRITE_ANNOTATIONS },
    },
    async (input: any) => {
      try {
        const result = await productService.createOne(
          {
            name: input.name,
            description: input.description,
            category: input.category,
            price: input.price,
            userId: userId,
          },
          userId
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          structuredContent: result,
          isError: false,
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: err.message || 'Failed to create product' }],
          isError: true,
        };
      }
    }
  );

  // 2. create_products
  server.registerTool(
    'create_products',
    {
      title: 'Create Products (Bulk)',
      description: 'Creates multiple products in bulk.',
      inputSchema: createProductsInputSchema,
      annotations: { title: 'Create Products (Bulk)', ...WRITE_ANNOTATIONS },
    },
    async (input: any) => {
      try {
        const data = input.products.map((p: any) => ({
          name: p.name,
          description: p.description,
          category: p.category,
          price: p.price,
          userId: userId,
        }));
        const result = await productService.createMany(data, userId);
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          structuredContent: result,
          isError: false,
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: err.message || 'Failed to bulk create products' }],
          isError: true,
        };
      }
    }
  );

  // 3. update_product
  server.registerTool(
    'update_product',
    {
      title: 'Update Product',
      description: 'Updates fields of an existing product using its unique ID.',
      inputSchema: updateProductInputSchema,
      annotations: { title: 'Update Product', ...WRITE_ANNOTATIONS },
    },
    async (input: any) => {
      try {
        const { id, ...updateFields } = input;
        const result = await productService.updateOne(id, updateFields, userId);
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          structuredContent: result,
          isError: false,
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: err.message || 'Failed to update product' }],
          isError: true,
        };
      }
    }
  );

  // 4. delete_product
  server.registerTool(
    'delete_product',
    {
      title: 'Delete Product',
      description: 'Deletes a product from the database by its unique ID.',
      inputSchema: deleteProductInputSchema,
      annotations: { title: 'Delete Product', ...WRITE_ANNOTATIONS },
    },
    async (input: any) => {
      try {
        const result = await productService.deleteOne(input.id, userId);
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          structuredContent: result,
          isError: false,
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: err.message || 'Failed to delete product' }],
          isError: true,
        };
      }
    }
  );

  // 5. delete_products
  server.registerTool(
    'delete_products',
    {
      title: 'Delete Products (Bulk)',
      description: 'Deletes multiple products by their unique IDs in bulk.',
      inputSchema: deleteProductsInputSchema,
      annotations: { title: 'Delete Products (Bulk)', ...WRITE_ANNOTATIONS },
    },
    async (input: any) => {
      try {
        const result = await productService.deleteMany(input.ids, userId);
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          structuredContent: result,
          isError: false,
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: err.message || 'Failed to delete products' }],
          isError: true,
        };
      }
    }
  );

  // 6. get_product
  server.registerTool(
    'get_product',
    {
      title: 'Get Product',
      description: 'Retrieves details of a single product using its unique ID.',
      inputSchema: getProductInputSchema,
      annotations: { title: 'Get Product', ...READ_ONLY_ANNOTATIONS },
    },
    async (input: any) => {
      try {
        const result = await productService.getOne(input.id, userId);
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          structuredContent: result,
          isError: false,
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: err.message || 'Failed to retrieve product' }],
          isError: true,
        };
      }
    }
  );

  // 7. list_products
  server.registerTool(
    'list_products',
    {
      title: 'List Products',
      description: 'Retrieves a list of products with optional search, sorting, and pagination.',
      inputSchema: listProductsInputSchema,
      annotations: { title: 'List Products', ...READ_ONLY_ANNOTATIONS },
    },
    async (input: any) => {
      try {
        const result = await productService.getAll({
          limit: input.limit || 10,
          page: input.page || 1,
          orderBy: input.orderBy || 'createdAt',
          order: input.order || 'desc',
          userId: userId,
          search: input.search,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          structuredContent: result,
          isError: false,
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: err.message || 'Failed to list products' }],
          isError: true,
        };
      }
    }
  );

  return server;
};
