import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ELITE - Candidature logistique micro-importation',
  description: 'Programme logistique ELITE - Chine vers hub international puis Algérie.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body>{children}</body></html>;
}
