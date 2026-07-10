import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import fs from 'fs';
import {
  AWS_ACCESS_KEY_ID,
  AWS_REGION,
  AWS_S3_BUCKET_NAME,
  AWS_SECRET_ACCESS_KEY,
} from '../config/default';

const awsS3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

type S3UploadProps = {
  path: string;
  fileName: string;
  folder: string;
  type: 'private' | 'public';
};
export const s3Upload = async ({
  fileName,
  folder,
  path,
  type,
}: S3UploadProps) => {
  const readStream = fs.createReadStream(path);

  try {
    const command = new PutObjectCommand({
      Bucket: AWS_S3_BUCKET_NAME,
      Key: `${folder}/${fileName}`,
      Body: readStream,
      ACL: type === 'private' ? 'bucket-owner-full-control' : 'public-read', // Private access
      // ContentType: req.file.mimetype,
    });

    await awsS3.send(command);
    // Clean up the local file
    await fs.promises.unlink(path);

    // Return the S3 URL of the uploaded file
    const s3Url = `https://${AWS_S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${folder}/${fileName}`;
    return s3Url;
  } catch (error) {
    // Ensure readStream is closed if an error occurs
    readStream.destroy();
    await fs.promises.unlink(path).catch(() => {
      console.error('Failed to delete file:', path);
    });
    throw error;
  }
};

export const s3Get = async (key: string) => {
  const command = new GetObjectCommand({
    Bucket: AWS_S3_BUCKET_NAME,
    Key: key,
  });
  return await awsS3.send(command);
};
