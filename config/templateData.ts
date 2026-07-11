import { ChannelContent, TemplateId } from '../services/template.service';

export const TEMPLATE_CONTENT_REGISTRY: Record<TemplateId, ChannelContent> = {
  'email-verification': {
    emailSubject: 'Verify your email address for Project Nova',
    emailText:
      'Your Project Nova verification code is {{verificationCode}}. If you did not request this, you can ignore this email. [[email]]',
    emailHtml:
      '<p>Your Project Nova verification code is <strong>{{ verificationCode }}</strong>.</p>' +
      '<p>If you did not request this, you can ignore this email. [[ email ]]</p>',
  },
  'phone-verification': {
    smsContent: 'Your Project Nova verification code is {{verificationCode}}.',
  },
};
