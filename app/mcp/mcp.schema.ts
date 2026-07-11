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
