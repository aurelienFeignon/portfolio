import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

// Layout racine provisoire : le routage par locale (Phase 3) déplacera cette
// responsabilité vers `app/[locale]/layout.tsx`. `lang` est donc codé en dur ici,
// et ce sera le premier point à corriger en P3-02.
export const metadata: Metadata = {
  title: 'Portfolio — développeur Full-Stack',
  description:
    'Portfolio de développeur Full-Stack : expériences, projets et compétences, en français et en anglais.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>
        {/* Lien d'évitement : premier élément focusable de la page, il permet à
            un utilisateur au clavier de sauter la navigation. Il est visible dès
            qu'il reçoit le focus (voir globals.css). */}
        <a className="skip-link" href="#main">
          Aller au contenu principal
        </a>
        {children}
      </body>
    </html>
  )
}
