import './globals.css';
import type { Metadata, Viewport } from 'next';

export const viewport: Viewport = { width:'device-width', initialScale:1, viewportFit:'cover' };

export const metadata: Metadata = {
  title: 'ELITE - Recrutement',
  description: 'Candidature unique ELITE - postes opérationnels, digitaux et orientés résultats.'
};

export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){
  return <html lang="fr"><body>{children}</body></html>;
}
