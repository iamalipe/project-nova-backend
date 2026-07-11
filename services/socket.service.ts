import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { CORS_OPTIONS } from '../config/default';
import {
  AuthenticatedSocket,
  socketAuthenticate,
} from '../middlewares/authenticateSocket.middleware';
import { logger } from '../utils/logger';

export let io: Server | null = null;

// Registry to store custom event listeners registered from other modules
const eventListeners: Map<
  string,
  Array<(socket: AuthenticatedSocket, ...args: any[]) => void>
> = new Map();

/**
 * Register a listener for a specific incoming socket event from anywhere in the application.
 */
export const registerSocketListener = (
  event: string,
  handler: (socket: AuthenticatedSocket, ...args: any[]) => void,
) => {
  if (!eventListeners.has(event)) {
    eventListeners.set(event, []);
  }
  eventListeners.get(event)!.push(handler);
};

export const initSocket = (httpServer: HttpServer) => {
  io = new Server(httpServer, {
    cors: CORS_OPTIONS,
  });

  io.use(socketAuthenticate);

  io.on('connection', (socket: AuthenticatedSocket) => {
    const user = socket.user;
    if (user) {
      socket.join(`user:${user.id}`);
    }

    logger.info(
      `🔌 [CONNECTED] User ID: ${user?.id} | Email: ${user?.email || 'N/A'} | Socket ID: ${socket.id}`,
    );

    // Bind all registered event listeners dynamically to this socket connection
    for (const [event, handlers] of eventListeners.entries()) {
      socket.on(event, (...args: any[]) => {
        handlers.forEach((handler) => {
          try {
            handler(socket, ...args);
          } catch (err) {
            logger.error(
              `[Socket] Error executing listener for event ${event}:`,
              err,
            );
          }
        });
      });
    }

    socket.on('disconnect', (reason) => {
      logger.info(
        `❌ [DISCONNECTED] User ID: ${user?.id} | Socket ID: ${socket.id} | Reason: ${reason}`,
      );
    });
  });

  return io;
};

/**
 * Emit an event to a specific user's room.
 * Can be imported and called from anywhere.
 */
export const socketSendToUser = (
  userId: string,
  event: string,
  data: any,
): boolean => {
  if (!io) {
    logger.warn(
      '[Socket] Attempted to send message before Socket.io initialization.',
    );
    return false;
  }
  io.to(`user:${userId}`).emit(event, data);
  return true;
};

/**
 * Broadcast an event to all connected clients.
 * Can be imported and called from anywhere.
 */
export const socketSendToAll = (event: string, data: any): boolean => {
  if (!io) {
    logger.warn(
      '[Socket] Attempted to broadcast message before Socket.io initialization.',
    );
    return false;
  }
  io.emit(event, data);
  return true;
};
