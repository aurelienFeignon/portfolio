/**
 * L'image de partage, une par langue (P4-08).
 *
 * **Elle est générée au build**, comme tout le reste : le site est intégralement
 * statique, et cette route l'est aussi. Le conteneur de production ne calcule
 * donc aucune image — il sert un PNG gravé, au même titre que le HTML.
 *
 * **Une image par locale, et pas une par page.** Le fichier est au niveau de
 * `[locale]`, donc Next l'attache à toutes les pages en dessous. Une image par
 * entité serait plus riche, mais elle rendrait chaque partage dépendant du
 * contenu du jour ; et ce qu'un partage doit dire en premier — de qui est ce
 * site — est le même partout. Le titre de la page, lui, voyage déjà dans
 * `og:title`.
 *
 * ⚠️ **Les couleurs viennent de `src/ui/brand-palette.ts`**, seule copie
 * TypeScript de `globals.css` : `ImageResponse` rend hors du navigateur, sans
 * variables CSS. Elles y sont écrites **une fois pour les deux images**, et un
 * test les confronte aux tokens.
 */
import { ImageResponse } from 'next/og'

import { LOCALES } from '@/i18n/locales'
import { getMessages } from '@/i18n/messages'
import { BRAND } from '@/ui/brand-palette'

import { readLocale } from './locale-param'

/**
 * ⛔ **Sans ceci, l'image est calculée à chaque requête.** Le gate de rendu
 * statique l'a refusée au premier build : une route de métadonnée n'hérite pas
 * du `generateStaticParams` de son segment parent. Elle aurait fonctionné — elle
 * ne lit pas `content/` — mais elle aurait fait rendre un PNG de 1200×630 par
 * visite sur un VPS à 2 vCPU, pour une image qui ne change qu'au déploiement.
 */
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export const dynamicParams = false

/** 1200×630 : le format que `summary_large_image` et OpenGraph attendent. */
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OpenGraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const { site } = getMessages(await readLocale(params))

  return new ImageResponse(
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        background: BRAND.background,
        padding: '80px',
      }}
    >
      <div style={{ height: '10px', width: '160px', background: BRAND.accent }} />
      <div style={{ marginTop: '48px', fontSize: '84px', color: BRAND.text }}>{site.name}</div>
      <div style={{ marginTop: '32px', fontSize: '36px', color: BRAND.textMuted }}>
        {site.description}
      </div>
    </div>,
    size,
  )
}
