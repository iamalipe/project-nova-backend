import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  bulkCreateOutputSchema,
  bulkDeleteOutputSchema,
  createManySchema,
  createManySchemaType,
  createSchema,
  createSchemaType,
  deleteManySchema,
  deleteManySchemaType,
  deleteSchema,
  deleteSchemaType,
  getAllSchema,
  getAllSchemaType,
  getSchema,
  getSchemaType,
  listOutputSchema,
  singleOutputSchema,
  updateSchema,
  updateSchemaType,
} from '../../product/product.schema';
import productService from '../../product/product.service';

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
      inputSchema: createSchema,
      outputSchema: singleOutputSchema,
      annotations: { title: 'Create Product', ...WRITE_ANNOTATIONS },
    },
    async (input: createSchemaType) => {
      try {
        const result = await productService.createOne(
          {
            ...input.body,
            userId: userId,
          },
          userId,
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          structuredContent: result,
          isError: false,
        };
      } catch (err: any) {
        return {
          content: [
            { type: 'text', text: err.message || 'Failed to create product' },
          ],
          isError: true,
        };
      }
    },
  );

  // 2. create_products
  server.registerTool(
    'create_products',
    {
      title: 'Create Products (Bulk)',
      description: 'Creates multiple products in bulk.',
      inputSchema: createManySchema,
      outputSchema: bulkCreateOutputSchema,
      annotations: { title: 'Create Products (Bulk)', ...WRITE_ANNOTATIONS },
    },
    async (input: createManySchemaType) => {
      try {
        const data = input.body.map((p) => ({
          ...p,
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
          content: [
            {
              type: 'text',
              text: err.message || 'Failed to bulk create products',
            },
          ],
          isError: true,
        };
      }
    },
  );

  // 3. update_product
  server.registerTool(
    'update_product',
    {
      title: 'Update Product',
      description: 'Updates fields of an existing product using its unique ID.',
      inputSchema: updateSchema,
      outputSchema: singleOutputSchema,
      annotations: { title: 'Update Product', ...WRITE_ANNOTATIONS },
    },
    async (input: updateSchemaType) => {
      try {
        const result = await productService.updateOne(
          input.params.id,
          input.body,
          userId,
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          structuredContent: result,
          isError: false,
        };
      } catch (err: any) {
        return {
          content: [
            { type: 'text', text: err.message || 'Failed to update product' },
          ],
          isError: true,
        };
      }
    },
  );

  // 4. delete_product
  server.registerTool(
    'delete_product',
    {
      title: 'Delete Product',
      description: 'Deletes a product from the database by its unique ID.',
      inputSchema: deleteSchema,
      outputSchema: singleOutputSchema,
      annotations: { title: 'Delete Product', ...WRITE_ANNOTATIONS },
    },
    async (input: deleteSchemaType) => {
      try {
        const result = await productService.deleteOne(input.params.id, userId);
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          structuredContent: result,
          isError: false,
        };
      } catch (err: any) {
        return {
          content: [
            { type: 'text', text: err.message || 'Failed to delete product' },
          ],
          isError: true,
        };
      }
    },
  );

  // 5. delete_products
  server.registerTool(
    'delete_products',
    {
      title: 'Delete Products (Bulk)',
      description: 'Deletes multiple products by their unique IDs in bulk.',
      inputSchema: deleteManySchema,
      outputSchema: bulkDeleteOutputSchema,
      annotations: { title: 'Delete Products (Bulk)', ...WRITE_ANNOTATIONS },
    },
    async (input: deleteManySchemaType) => {
      try {
        const result = await productService.deleteMany(input.body.ids, userId);
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          structuredContent: result,
          isError: false,
        };
      } catch (err: any) {
        return {
          content: [
            { type: 'text', text: err.message || 'Failed to delete products' },
          ],
          isError: true,
        };
      }
    },
  );

  // 6. get_product
  server.registerTool(
    'get_product',
    {
      title: 'Get Product',
      description: 'Retrieves details of a single product using its unique ID.',
      inputSchema: getSchema,
      outputSchema: singleOutputSchema,
      annotations: { title: 'Get Product', ...READ_ONLY_ANNOTATIONS },
    },
    async (input: getSchemaType) => {
      try {
        const result = await productService.getOne(input.params.id, userId);
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          structuredContent: result,
          isError: false,
        };
      } catch (err: any) {
        return {
          content: [
            { type: 'text', text: err.message || 'Failed to retrieve product' },
          ],
          isError: true,
        };
      }
    },
  );

  // 7. list_products
  server.registerTool(
    'list_products',
    {
      title: 'List Products',
      description:
        'Retrieves a list of products with optional search, sorting, and pagination.',
      inputSchema: getAllSchema,
      outputSchema: listOutputSchema,
      annotations: { title: 'List Products', ...READ_ONLY_ANNOTATIONS },
    },
    async (input: getAllSchemaType) => {
      try {
        const result = await productService.getAll({
          limit: input.query.limit,
          page: input.query.page,
          orderBy: input.query.orderBy,
          order: input.query.order,
          userId: userId,
          search: input.query.search,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          structuredContent: result,
          isError: false,
        };
      } catch (err: any) {
        return {
          content: [
            { type: 'text', text: err.message || 'Failed to list products' },
          ],
          isError: true,
        };
      }
    },
  );
};
