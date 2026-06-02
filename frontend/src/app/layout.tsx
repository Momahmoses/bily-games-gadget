import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'react-hot-toast';
import Providers from '@/components/shared/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Bily Games and Gadget | Premium Tech & Gaming Store',
    template: '%s | Bily Games and Gadget',
  },
  description:
    'Shop the latest smartphones, laptops, gaming consoles, accessories, and smart devices. Your one-stop premium tech marketplace in Nigeria.',
  keywords: ['gadgets', 'phones', 'laptops', 'gaming', 'electronics', 'Nigeria', 'tech store'],
  authors: [{ name: 'Bily Games and Gadget' }],
  creator: 'Bily Games and Gadget',
  openGraph: {
    type: 'website',
    locale: 'en_NG',
    url: 'https://bilygamesgadget.com',
    siteName: 'Bily Games and Gadget',
    title: 'Bily Games and Gadget | Premium Tech & Gaming Store',
    description: 'Shop the latest smartphones, laptops, gaming consoles, and accessories.',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Bily Games and Gadget' }],
  },
  twitter: { card: 'summary_large_image', title: 'Bily Games and Gadget', description: 'Premium Tech & Gaming Store' },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  viewport: { width: 'device-width', initialScale: 1 },
  themeColor: '#F59E0B',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable}`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <Providers>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: { background: '#1a1a2e', color: '#fff', borderRadius: '8px' },
                success: { iconTheme: { primary: '#F59E0B', secondary: '#000' } },
              }}
            />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
