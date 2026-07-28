import { Hr, Section, Text } from 'react-email'
import { emailBranding, type EmailBranding } from '@/lib/email/branding'
import { EmailLayout } from './layout'

interface Props {
  branding?:   EmailBranding
  inviteeName: string
  hostName:    string
  eventName:   string
  when:        string
  bookingUrl:  string
}

const text1  = '#171717'
const text2  = '#4B5563'

export function FollowUpEmail({ branding = emailBranding, inviteeName, hostName, eventName, when }: Props) {
  return (
    <EmailLayout preview={`Thanks for meeting with ${hostName} — ${eventName}`} productName={branding.appName} logoUrl={branding.logoUrl}>
      <Section style={{ padding: '32px 40px' }}>
        <Text style={{ fontSize: 22, fontWeight: 700, color: branding.brandColor, margin: '0 0 8px' }}>
          Thanks for the meeting!
        </Text>
        <Text style={{ fontSize: 15, color: text1, margin: '0 0 16px' }}>
          Hi {inviteeName},
        </Text>
        <Text style={{ fontSize: 15, color: text2, margin: '0 0 16px', lineHeight: '1.6' }}>
          Just a quick note from {hostName} to say thanks for joining <strong>{eventName}</strong> on {when}. Hope it was helpful!
        </Text>
        <Text style={{ fontSize: 15, color: text2, margin: '0 0 24px', lineHeight: '1.6' }}>
          If you'd like to schedule another meeting, you can use the same booking link anytime.
        </Text>
        <Hr style={{ borderColor: '#D1FAE5', margin: '24px 0' }} />
        <Text style={{ fontSize: 13, color: text2, margin: 0 }}>
          This email was sent by {hostName} via {branding.appName}.
        </Text>
      </Section>
    </EmailLayout>
  )
}
