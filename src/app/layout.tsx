import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/context/AppContext';

const inter = Inter({ subsets: ['latin', 'vietnamese'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'ShipLabel Manager',
  description: 'Premium shipping label management system',
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${inter.variable} font-sans`}>
      <body className="antialiased bg-gray-50 text-gray-800 selection:bg-blue-300 selection:text-blue-900">
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
