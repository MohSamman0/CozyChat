import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import Providers from './providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const poppins = Poppins({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: 'CozyChat - Warm & Cozy Text-Based Chat Platform',
  description: 'Connect with strangers for anonymous text conversations in a beautifully designed, warm and cozy interface.',
  keywords: ['chat', 'anonymous', 'text', 'realtime', 'cozy'],
  authors: [{ name: 'CozyChat Team' }],
  icons: {
    icon: { url: '/favicon.svg', type: 'image/svg+xml' },
    apple: { url: '/favicon.svg', type: 'image/svg+xml' },
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f49532',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body className="font-sans antialiased transition-colors duration-200 ease-out">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
