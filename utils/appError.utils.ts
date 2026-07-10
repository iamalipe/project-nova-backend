global.AppError = class AppError extends Error {
  options?: { path?: string; status?: number };

  constructor(message: string, options?: { path?: string; status?: number }) {
    super(message);
    this.options = options;
    this.name = 'AppError';
  }
};
