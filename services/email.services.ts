import { EMAIL_ENABLE } from '../config/default';
import { logger } from '../utils/logger';
import { recordTempLog } from './tempLog.service';
import {
  renderContentTemplate,
  TemplateDataMap,
  TemplateId,
} from './template.service';

export const sendEmail = async ({
  subject,
  toEmail,
  textContent,
  htmlContent,
}: {
  subject: string;
  toEmail: string;
  textContent: string;
  htmlContent: string;
  templateId?: string;
  s3FileUrl?: string;
  dynamicData?: { [key: string]: string };
}) => {
  try {
    if (!toEmail) return null;

    if (!EMAIL_ENABLE) {
      recordTempLog({
        channel: 'email',
        to: toEmail,
        subject,
        content: textContent || htmlContent || '',
        html: htmlContent,
      });
      return null;
    }

    // sgMail.setApiKey(SENDGRID_API_KEY);
    // const msg: any = {
    //   to: toEmail, // Change to your recipient
    //   from: SENDGRID_EMAIL_FROM,
    //   subject: subject,
    //   text: textContent,
    //   html: htmlContent,
    //   dynamicTemplateData: dynamicData,
    //   templateId: templateId,
    // };
    // // Download and attach file from S3 if URL is provided
    // if (s3FileUrl) {
    //   try {
    //     // Fetch the file from S3
    //     const response = await fetch(s3FileUrl);
    //     if (!response.ok) {
    //       throw new Error(`Failed to download file: ${response.statusText}`);
    //     }

    //     // Get the file buffer
    //     const arrayBuffer = await response.arrayBuffer();
    //     const buffer = Buffer.from(arrayBuffer);

    //     // Convert to base64
    //     const base64File = buffer.toString('base64');

    //     // Extract filename from URL
    //     const urlParts = s3FileUrl.split('/');
    //     const filename = urlParts[urlParts.length - 1].split('?')[0]; // Remove query params if any

    //     // Determine content type (you can expand this based on your needs)
    //     const getContentType = (filename: string): string => {
    //       const ext = filename.split('.').pop()?.toLowerCase();
    //       const contentTypes: { [key: string]: string } = {
    //         pdf: 'application/pdf',
    //         jpg: 'image/jpeg',
    //         jpeg: 'image/jpeg',
    //         png: 'image/png',
    //         gif: 'image/gif',
    //         doc: 'application/msword',
    //         docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    //         xls: 'application/vnd.ms-excel',
    //         xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    //         txt: 'text/plain',
    //         csv: 'text/csv',
    //         zip: 'application/zip',
    //       };
    //       return contentTypes[ext || ''] || 'application/octet-stream';
    //     };

    //     // Add attachment to message
    //     msg.attachments = [
    //       {
    //         content: base64File,
    //         filename: filename,
    //         type: getContentType(filename),
    //         disposition: 'attachment',
    //       },
    //     ];
    //   } catch (fileError: any) {
    //     console.error('Error downloading/attaching file:', fileError.message);
    //     // Continue sending email without attachment
    //   }
    // }
    // const data = await sgMail.send(msg);
    // return data;
  } catch (err: any) {
    logger.error(err?.message || 'Something wrong in sendEmail');
    return null;
  }
};

export async function sendEmailWithTemplate<TId extends TemplateId>({
  templateId,
  dynamicData,
  toEmail,
  s3FileUrl,
}: {
  templateId: TId;
  dynamicData: TemplateDataMap[TId];
  toEmail: string;
  s3FileUrl?: string;
}) {
  try {
    const renderContent = await renderContentTemplate(templateId, dynamicData);

    const res = await sendEmail({
      htmlContent: renderContent.emailHtml || '',
      textContent: renderContent.emailText || '',
      subject: renderContent.emailSubject || '',
      toEmail: toEmail,
      s3FileUrl: s3FileUrl,
    });
    return res;
  } catch (err: any) {
    logger.error(err?.message || 'Something wrong in sendEmailWithTemplate');
  }
}
