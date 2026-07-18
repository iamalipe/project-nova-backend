import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { db } from '../../../services/prisma.service';
import { cacheDel } from '../../../services/cache.service';
import {
  getUserProfileInputSchema,
  updateUserProfileInputSchema,
  userProfileOutputSchema,
} from '../mcp.schema';

export const registerUserTools = (server: McpServer, userId: string) => {
  // 1. get_user_profile
  server.registerTool(
    'get_user_profile',
    {
      title: 'Get User Profile',
      description: 'Retrieves the profile details of the connected user.',
      inputSchema: getUserProfileInputSchema,
      outputSchema: userProfileOutputSchema,
    },
    async () => {
      try {
        const user = await db.user.findUnique({
          where: { id: userId },
          omit: { password: true },
        });
        if (!user) {
          throw new Error('User not found');
        }
        return {
          content: [{ type: 'text', text: JSON.stringify(user) }],
          structuredContent: user,
          isError: false,
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: err.message || 'Failed to retrieve profile' }],
          isError: true,
        };
      }
    }
  );

  // 2. update_user_profile
  server.registerTool(
    'update_user_profile',
    {
      title: 'Update User Profile',
      description: 'Updates the profile fields (firstName, lastName, salary, countryId, stateId, address, zip) of the connected user.',
      inputSchema: updateUserProfileInputSchema,
      outputSchema: userProfileOutputSchema,
    },
    async (input: any) => {
      try {
        const dataToUpdate: any = {};
        if (input.firstName !== undefined) dataToUpdate.firstName = input.firstName;
        if (input.lastName !== undefined) dataToUpdate.lastName = input.lastName;
        if (input.salary !== undefined) dataToUpdate.salary = input.salary;
        if (input.countryId !== undefined) dataToUpdate.countryId = input.countryId;
        if (input.stateId !== undefined) dataToUpdate.stateId = input.stateId;
        if (input.address !== undefined) dataToUpdate.address = input.address;
        if (input.zip !== undefined) dataToUpdate.zip = input.zip;

        const updatedUser = await db.user.update({
          where: { id: userId },
          data: dataToUpdate,
          omit: { password: true },
        });

        // Invalidate caching to align with auth controller
        await cacheDel([`jwt-auth-middleware-user:${userId}`, `user:${userId}`]);

        return {
          content: [{ type: 'text', text: JSON.stringify(updatedUser) }],
          structuredContent: updatedUser,
          isError: false,
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: err.message || 'Failed to update profile' }],
          isError: true,
        };
      }
    }
  );
};
