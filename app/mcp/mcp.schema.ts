import { z } from 'zod';

export const getUserProfileInputSchema = z.object({}).describe('Input schema for getting the logged-in user profile (no arguments required)');

export const updateUserProfileInputSchema = z.object({
  firstName: z.string().min(2).max(255).optional().describe('The updated first name of the user'),
  lastName: z.string().min(2).max(255).optional().describe('The updated last name of the user'),
}).describe('Input schema for updating user profile fields');

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
