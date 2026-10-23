import type { Metadata } from 'next';
import './globals.css';
import Chrome from './Chrome';

export const metadata: Metadata = {
  title: 'PatchBay - Your APIs change. Your code adapts.',
  description: 'Detects third-party API changes, finds affected code in your repositories, and prepares tested fixes your team can review.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Chrome>{children}</Chrome>
      </body>
    </html>
  );
}
