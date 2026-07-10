import { createMiddleware } from 'hono/factory';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

import { s3Upload } from '../services/s3.services';

// Ensure temp folder exists
const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

export type MimeTypes =
  | 'image/jpeg'
  | 'image/png'
  | 'image/gif'
  | 'image/webp'
  | 'video/mp4'
  | 'video/mpeg'
  | 'video/quicktime'
  | 'video/x-msvideo'
  | 'video/x-ms-wmv'
  | 'audio/mpeg'
  | 'audio/mp4'
  | 'audio/x-ms-wma'
  | 'audio/x-wav';

export type ValidateMulterType = {
  validateFiles: {
    fieldName: string;
    isArray: boolean;
    fileSize: number;
    allowedMimeTypes: MimeTypes[];
    s3Upload?: boolean;
    s3Folder?: string;
    s3Type?: 'private' | 'public';
  }[];
};

export const validateMulter = (params?: ValidateMulterType) => {
  const validateFiles = params?.validateFiles || [];

  return createMiddleware(async (c, next) => {
    if (validateFiles.length === 0) {
      return await next();
    }

    // Only process if it's a multipart request
    const contentType = c.req.header('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return await next();
    }

    // Hono's native Web Standard form data parser
    const formData = await c.req.formData();
    const parsedFiles: Record<string, any> = {};

    for (const config of validateFiles) {
      // Get all entries for this field name
      const entries = formData.getAll(config.fieldName);

      // Filter out any text fields that happen to share the same name
      const uploadedFiles = entries.filter(
        (entry): entry is File => entry instanceof File,
      );

      const validFiles = [];

      for (const file of uploadedFiles) {
        // 1. Validate Size
        if (file.size > config.fileSize) {
          throw new AppError(
            `File too large. Max size is ${config.fileSize} bytes`,
            {
              path: config.fieldName,
              status: 400,
            },
          );
        }

        // 2. Validate MimeType
        if (
          config.allowedMimeTypes.length > 0 &&
          !config.allowedMimeTypes.includes(
            file.type.toLowerCase() as MimeTypes,
          )
        ) {
          throw new AppError('Invalid file type', {
            path: config.fieldName,
            status: 400,
          });
        }

        // 3. Save to disk (Mimicking Multer's behavior for backwards compatibility)
        const uniqueSuffix = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
        const tempPath = path.join(TEMP_DIR, uniqueSuffix);

        // Convert Web File to Node Buffer and save
        const arrayBuffer = await file.arrayBuffer();
        await fsp.writeFile(tempPath, Buffer.from(arrayBuffer));

        // Create an object that perfectly matches what Multer used to output
        const fileObj: any = {
          fieldname: config.fieldName,
          originalname: file.name,
          mimetype: file.type,
          size: file.size,
          path: tempPath,
          filename: uniqueSuffix,
        };

        // 4. S3 Upload Logic
        if (config.s3Upload) {
          const s3Url = await s3Upload({
            fileName: fileObj.filename,
            folder: config.s3Folder || 'uploads',
            path: fileObj.path, // Still passes the local path correctly
            type: config.s3Type || 'private',
          });
          fileObj.s3Url = s3Url;
        }

        validFiles.push(fileObj);
      }

      // 5. Structure the output based on `isArray`
      if (config.isArray) {
        parsedFiles[config.fieldName] = validFiles;
      } else {
        parsedFiles[config.fieldName] = validFiles[0] || null;
      }
    }

    // Pass the perfectly structured files down to the controller using Hono Context
    c.set('uploadedFiles', parsedFiles);

    await next();
  });
};
