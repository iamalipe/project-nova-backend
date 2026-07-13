import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import productService from '../../product/product.service';
import {
  createProductInputSchema,
  createProductsInputSchema,
  updateProductInputSchema,
  deleteProductInputSchema,
  deleteProductsInputSchema,
  getProductInputSchema,
  listProductsInputSchema,
  productOutputSchema,
  bulkCreateOutputSchema,
  bulkDeleteOutputSchema,
  listProductsOutputSchema,
} from '../mcp.schema';

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

export const registerProductTools = (server: McpServer, userId: string) => {
  // 1. create_product
  server.registerTool(
    'create_product',
    {
      title: 'Create Product',
      description: "Creates a single new product in the user's catalog.",
      inputSchema: createProductInputSchema,
      outputSchema: productOutputSchema,
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
      outputSchema: bulkCreateOutputSchema,
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
      outputSchema: productOutputSchema,
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
      outputSchema: productOutputSchema,
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
      outputSchema: bulkDeleteOutputSchema,
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
      outputSchema: productOutputSchema,
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
      outputSchema: listProductsOutputSchema,
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
};
