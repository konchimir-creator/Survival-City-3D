import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Survival City 3D',
  description: 'Браузерная 3D survival/economic RPG от третьего лица',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
