/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Link,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Grave Detail"

const SignupConfirmationEmail = () => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You're on the list — Grave Detail is launching soon</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Grave Detail</Heading>
        <Text style={subtitle}>Cleaning &amp; Preservation</Text>
        <Hr style={hr} />
        <Heading as="h2" style={h2}>You're on the list!</Heading>
        <Text style={text}>
          Thank you for signing up to be notified when Grave Detail launches.
          We're preparing something special — professional monument cleaning
          and preservation services you can trust.
        </Text>
        <Text style={text}>
          We'll send you an email as soon as we go live. In the meantime,
          feel free to reach out if you have any questions.
        </Text>
        <Text style={contactText}>
          📞 <Link href="tel:+15735455759" style={link}>(573) 545-5759</Link>
          {' · '}
          ✉️ <Link href="mailto:info@gravedetail.net" style={link}>info@gravedetail.net</Link>
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          CCUS Certified · Fully Insured · Owner-Operated
        </Text>
        <Text style={footerSmall}>
          © {new Date().getFullYear()} Grave Detail. All rights reserved.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SignupConfirmationEmail,
  subject: "You're on the list — Grave Detail is launching soon",
  displayName: 'Coming Soon signup confirmation',
  previewData: {},
} satisfies TemplateEntry

// Brand: dark bg feel but white email body per rules, bronze accents
const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
}
const container = {
  padding: '40px 30px',
  maxWidth: '520px',
  margin: '0 auto',
}
const h1 = {
  fontSize: '28px',
  fontWeight: '700' as const,
  color: '#1a1a1a',
  margin: '0 0 4px',
  textAlign: 'center' as const,
  letterSpacing: '2px',
  textTransform: 'uppercase' as const,
}
const subtitle = {
  fontSize: '13px',
  color: '#b8875a',
  textAlign: 'center' as const,
  letterSpacing: '3px',
  textTransform: 'uppercase' as const,
  margin: '0 0 24px',
  fontWeight: '400' as const,
}
const h2 = {
  fontSize: '20px',
  fontWeight: '600' as const,
  color: '#1a1a1a',
  margin: '24px 0 16px',
}
const text = {
  fontSize: '15px',
  color: '#55575d',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const contactText = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.6',
  margin: '0 0 16px',
  textAlign: 'center' as const,
}
const link = {
  color: '#b8875a',
  textDecoration: 'none',
}
const hr = {
  borderColor: '#e5e1dc',
  margin: '24px 0',
}
const footer = {
  fontSize: '11px',
  color: '#999999',
  textAlign: 'center' as const,
  letterSpacing: '1.5px',
  textTransform: 'uppercase' as const,
  margin: '0 0 8px',
}
const footerSmall = {
  fontSize: '11px',
  color: '#bbbbbb',
  textAlign: 'center' as const,
  margin: '0',
}
