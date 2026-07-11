import { SMS_ENABLE } from '../config/default';
import { logger } from '../utils/logger';
import { recordTempLog } from './tempLog.service';
import {
  renderContentTemplate,
  TemplateDataMap,
  TemplateId,
} from './template.service';

export const sendSMS = async ({
  to,
  content,
}: {
  to: string;
  content: string;
}) => {
  try {
    if (!to) return null;
    if (!content) return null;
    if (content === 'N/A') return null;

    if (!SMS_ENABLE) {
      recordTempLog({ channel: 'sms', to, content });
      return null;
    }

    // const client = new Twilio(TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET, {
    //   accountSid: TWILIO_ACCOUNT_SID,
    // });

    // const message = await client.messages.create({
    //   body: content,
    //   from: TWILIO_NUMBER,
    //   to: to,
    // });
    // return message;
  } catch (err: any) {
    logger.error(err?.message || 'Something wrong in sendSMS');
    return null;
  }
};

export async function sendSMSWithTemplate<TId extends TemplateId>({
  templateId,
  dynamicData,
  to,
}: {
  templateId: TId;
  dynamicData: TemplateDataMap[TId];
  to: string;
}) {
  try {
    const renderContent = await renderContentTemplate(templateId, dynamicData);

    const res = await sendSMS({
      content: renderContent.smsContent || '',
      to: to,
    });
    return res;
  } catch (err: any) {
    logger.error(err?.message || 'Something wrong in sendSMSWithTemplate');
    console.log(err);
  }
}
