import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import Providers from './providers';
import { Toaster } from '@/components/ui/toaster';
import { NetworkCheck } from '@/components/network-check';
import { PageMainLayout } from '@/components/page/main-layout';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'Silk-Auth',
  description: 'Slik Authentication Demo',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <NetworkCheck>
            <PageMainLayout>{children}</PageMainLayout>
          </NetworkCheck>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
