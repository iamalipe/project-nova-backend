import { TEMPLATE_CONTENT_REGISTRY } from '../config/templateData';

interface EmailVerificationData {
  verificationCode: string; // required — the OTP the user must enter
  email?: string; // optional — sendEmail's toEmail already carries the real address; this only personalizes the body text
}

interface PhoneVerificationData {
  verificationCode: string; // required — the OTP the user must enter
  phoneNumber?: string; // optional — same rationale as `email` above
}

type TemplateDataMap = {
  'email-verification': EmailVerificationData;
  'phone-verification': PhoneVerificationData;
};

export type TemplateId = keyof TemplateDataMap;
export type { TemplateDataMap };

export interface RenderedTemplateContent {
  emailSubject?: string;
  emailText?: string;
  emailHtml?: string;
  smsContent?: string;
  pushContent?: string; // no push service exists yet; reserved for future use
}

export type ChannelContent = RenderedTemplateContent;

const PLACEHOLDER_PATTERN =
  /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}|\[\[\s*([a-zA-Z0-9_]+)\s*\]\]/g;

function interpolate(
  raw: string,
  data: Record<string, string | undefined>,
): string {
  return raw.replace(
    PLACEHOLDER_PATTERN,
    (_match: string, curlyKey?: string, squareKey?: string): string => {
      const key = curlyKey ?? squareKey ?? '';
      return data[key] ?? '';
    },
  );
}

export async function renderContentTemplate<TId extends TemplateId>(
  templateId: TId,
  dynamicData: TemplateDataMap[TId],
): Promise<RenderedTemplateContent> {
  const raw = TEMPLATE_CONTENT_REGISTRY[templateId];
  const data = dynamicData as unknown as Record<string, string | undefined>;

  return {
    emailSubject: raw.emailSubject
      ? interpolate(raw.emailSubject, data)
      : undefined,
    emailText: raw.emailText ? interpolate(raw.emailText, data) : undefined,
    emailHtml: raw.emailHtml ? interpolate(raw.emailHtml, data) : undefined,
    smsContent: raw.smsContent ? interpolate(raw.smsContent, data) : undefined,
    pushContent: raw.pushContent
      ? interpolate(raw.pushContent, data)
      : undefined,
  };
}
