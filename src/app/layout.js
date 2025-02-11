import './globals.css';
import { Inter } from 'next/font/google';
import { ClientProviders } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'GraphQL Profile',
  description: 'School profile using GraphQL',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
