import { z } from 'zod';

export const createProductInputSchema = z.object({
  name: z.string().min(2).max(255).describe('The name of the product'),
  description: z.string().min(2).max(2000).describe('A detailed description of the product'),
  category: z.string().min(2).max(255).describe('The category classification of the product'),
  price: z.number().gt(0).describe('The price of the product (must be greater than 0)'),
});

export const createProductsInputSchema = z.object({
  products: z.array(
    z.object({
      name: z.string().min(2).max(255).describe('The name of the product'),
      description: z.string().min(2).max(2000).describe('A detailed description of the product'),
      category: z.string().min(2).max(255).describe('The category classification of the product'),
      price: z.number().gt(0).describe('The price of the product (must be greater than 0)'),
    })
  ).min(1).describe('An array of product objects to be created in bulk'),
});

export const updateProductInputSchema = z.object({
  id: z.string().uuid().describe('The unique UUID of the product to update'),
  name: z.string().min(2).max(255).optional().describe('The updated name of the product'),
  description: z.string().min(2).max(2000).optional().describe('The updated detailed description of the product'),
  category: z.string().min(2).max(255).optional().describe('The updated category classification of the product'),
  price: z.number().gt(0).optional().describe('The updated price of the product'),
});

export const deleteProductInputSchema = z.object({
  id: z.string().uuid().describe('The unique UUID of the product to delete'),
});

export const deleteProductsInputSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).describe('An array of product UUIDs to delete in bulk'),
});

export const getProductInputSchema = z.object({
  id: z.string().uuid().describe('The unique UUID of the product to retrieve'),
});

export const listProductsInputSchema = z.object({
  order: z.enum(['asc', 'desc']).optional().default('desc').describe('Sort direction: "asc" or "desc" (default: "desc")'),
  orderBy: z.string().optional().default('createdAt').describe('Field to sort by (e.g. "createdAt", "price", "name")'),
  page: z.number().int().min(0).optional().default(1).describe('Page number. 0 disables pagination (default: 1)'),
  limit: z.number().int().min(1).max(100).optional().default(10).describe('Page size limit (default: 10)'),
  search: z.string().optional().describe('Text search query to filter by name, description, or category'),
});

export const getUserProfileInputSchema = z.object({}).describe('Input schema for getting the logged-in user profile (no arguments required)');

export const updateUserProfileInputSchema = z.object({
  firstName: z.string().min(2).max(255).optional().describe('The updated first name of the user'),
  lastName: z.string().min(2).max(255).optional().describe('The updated last name of the user'),
}).describe('Input schema for updating user profile fields');

// --- OUTPUT SCHEMAS ---

export const productOutputSchema = z.object({
  id: z.string().uuid().describe('The unique UUID of the product'),
  name: z.string().describe('The name of the product'),
  description: z.string().describe('A detailed description of the product'),
  category: z.string().describe('The category classification of the product'),
  price: z.number().describe('The price of the product'),
  userId: z.string().uuid().describe('The owner user UUID of the product'),
  createdAt: z.string().describe('ISO timestamp of creation'),
  updatedAt: z.string().describe('ISO timestamp of last update'),
}).describe('The schema of a product object');

export const bulkCreateOutputSchema = z.object({
  count: z.number().int().describe('The number of products created'),
}).describe('The schema of a bulk product creation result');

export const bulkDeleteOutputSchema = z.object({
  count: z.number().int().describe('The number of products deleted'),
}).describe('The schema of a bulk product deletion result');

export const listProductsOutputSchema = z.object({
  data: z.array(productOutputSchema).describe('The list of products for the current page'),
  pagination: z.object({
    page: z.number().int().describe('Current page number'),
    limit: z.number().int().describe('Maximum number of items per page'),
    total: z.number().int().describe('Total number of matching products in the database'),
    current: z.number().int().describe('Number of items on the current page'),
  }).describe('Pagination metadata'),
  sort: z.object({
    order: z.enum(['asc', 'desc']).describe('Sorting order direction'),
    orderBy: z.string().describe('The field used to sort the products'),
  }).describe('Sorting metadata'),
}).describe('The schema of a paginated list products response');

export const userProfileOutputSchema = z.object({
  id: z.string().uuid().describe('The unique user UUID'),
  email: z.string().describe('The user email address'),
  firstName: z.string().describe('First name of the user'),
  lastName: z.string().nullable().describe('Last name of the user'),
  profileImage: z.string().nullable().describe('URL to the profile image'),
  role: z.string().describe('The role assigned to the user'),
  createdAt: z.string().describe('ISO timestamp of user creation'),
  updatedAt: z.string().describe('ISO timestamp of user last update'),
}).describe('The user profile details');

// --- COMPLETION SCHEMAS ---

export const completionInputSchema = z.object({
  prompt: z.string().min(1).describe('The text prompt to generate a completion for'),
  systemInstruction: z.string().optional().describe('Optional system context or persona guidelines'),
  temperature: z.number().min(0).max(2).optional().default(0.7).describe('Randomness control parameter'),
}).describe('Input schema for text completion tool');

export const completionOutputSchema = z.object({
  text: z.string().describe('The generated completion text response'),
  model: z.string().describe('The model name used for generation'),
  finishReason: z.string().describe('The finish reason (e.g. STOP)'),
}).describe('Output schema for text completion tool');


