/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Hr,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to Detail Hub by gravedetail.net</Preview>
    <Body style={main}>
      <Container style={outerContainer}>
        <Container style={card}>
          <Heading style={h1}>DETAIL HUB</Heading>
          <Text style={subtitle}>by gravedetail.net</Text>
          <Hr style={hr} />
          <Heading as="h2" style={h2}>You've been invited</Heading>
          <Text style={text}>
            You've been invited to join your personal Detail Hub — your
            dedicated portal for monument care updates, service history,
            and photo records.
          </Text>
          <Text style={text}>
            Click the button below to accept the invitation and set up
            your account.
          </Text>
          <Button style={button} href={confirmationUrl}>
            Accept Invitation
          </Button>
          <Text style={smallText}>
            If you weren't expecting this invitation, you can safely ignore
            this email.
          </Text>
          <Hr style={hr} />
          <Text style={footer}>
            Grave Detail · Cleaning &amp; Preservation
          </Text>
          <Text style={contactFooter}>
            📞{' '}
            <Link href="tel:+15735455759" style={link}>(573) 545-5759</Link>
            {' · '}
            ✉️{' '}
            <Link href="mailto:info@gravedetail.net" style={link}>info@gravedetail.net</Link>
          </Text>
          <Text style={copyright}>
            © {new Date().getFullYear()} Grave Detail. All rights reserved.
          </Text>
        </Container>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#141414', fontFamily: "'Cormorant Garamond', Georgia, 'Times New Roman', serif" }
const outerContainer = { padding: '40px 16px', maxWidth: '560px', margin: '0 auto' }
const card = { backgroundColor: '#2C2C2C', borderRadius: '8px', padding: '40px 30px' }
const h1 = { fontSize: '28px', fontWeight: '700' as const, color: '#E8E4DF', margin: '0 0 4px', textAlign: 'center' as const, letterSpacing: '3px', textTransform: 'uppercase' as const }
const subtitle = { fontSize: '13px', color: '#C9976B', textAlign: 'center' as const, letterSpacing: '2px', margin: '0 0 24px', fontWeight: '400' as const }
const h2 = { fontSize: '20px', fontWeight: '600' as const, color: '#E8E4DF', margin: '24px 0 16px' }
const text = { fontSize: '15px', color: '#E8E4DF', lineHeight: '1.6', margin: '0 0 16px' }
const smallText = { fontSize: '13px', color: '#6B6B6B', lineHeight: '1.5', margin: '24px 0 0' }
const button = { backgroundColor: '#C9976B', color: '#141414', fontSize: '14px', fontWeight: '700' as const, borderRadius: '6px', padding: '14px 28px', textDecoration: 'none', textTransform: 'uppercase' as const, letterSpacing: '1px', display: 'block' as const, textAlign: 'center' as const }
const link = { color: '#C9976B', textDecoration: 'none' }
const hr = { borderColor: '#6B6B6B', margin: '24px 0', opacity: 0.3 }
const footer = { fontSize: '11px', color: '#6B6B6B', textAlign: 'center' as const, letterSpacing: '1.5px', textTransform: 'uppercase' as const, margin: '0 0 8px' }
const contactFooter = { fontSize: '12px', color: '#6B6B6B', textAlign: 'center' as const, margin: '0 0 8px' }
const copyright = { fontSize: '11px', color: '#6B6B6B', textAlign: 'center' as const, margin: '0', opacity: 0.6 }
