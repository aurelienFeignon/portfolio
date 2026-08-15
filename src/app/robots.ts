/**
 * `robots.txt` (P3-08) — `architecture.md` §9 : autorise tout, pointe le sitemap.
 *
 * **Aucun `Disallow` sur `/resume/`**, et c'est délibéré. Les PDF portent
 * `X-Robots-Tag: noindex` (`next.config.ts`, question Q10 bis). Les interdire ici
 * empêcherait le robot de **lire** cet en-tête : une URL bloquée par `robots.txt`
 * peut malgré tout être indexée sur la foi de liens entrants, sans que son
 * `noindex` ait jamais été vu. Les deux mécanismes se contrarient ; seul le
 * second fait ce qu'on veut.
 */
import type { MetadataRoute } from 'next'

import { buildAbsoluteUrl, getSiteUrl } from '@/seo/site-url'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: buildAbsoluteUrl(getSiteUrl(), '/sitemap.xml'),
  }
}
