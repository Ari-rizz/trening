import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'IronGrid - Treningsapp',
  description: 'Progressiv overload treningslogg og sporingsapp',
  manifest: '/manifest.json',
  themeColor: '#0a0a0a',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'IronGrid',
  },
  formatDetection: { telephone: false },
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
} as any;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="no" className="dark">
      <head>
        <link rel="apple-touch-icon" href="/561FDBE9-8BBB-49EC-8502-9C434E74EE5E.PNG" />
        <link rel="icon" type="image/png" href="/561FDBE9-8BBB-49EC-8502-9C434E74EE5E.PNG" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-black text-white`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
