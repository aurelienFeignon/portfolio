import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /**
   * ⛔ **Émises parce qu'un gate le demande, pas par confort.** Depuis que le
   * chunk 3D existe (P5-04), Lighthouse fait échouer `valid-source-maps` : son
   * audit signale tout gros JavaScript de première partie servi **sans** carte
   * de sources, et 864 Ko franchissent son seuil là où l'applicatif seul ne
   * l'atteignait pas. Le dépôt juge « bonnes pratiques » sur ses AUDITS et non
   * sur son score (P4-13), précisément pour ne pas pouvoir excuser un constat.
   *
   * ⭐ Le coût n'est pas payé par les visiteurs : une carte n'est téléchargée
   * que par un navigateur dont les outils de développement sont ouverts. Elle
   * pèse en revanche dans l'image, et ce poids est mesuré ci-dessous.
   */
  productionBrowserSourceMaps: true,

  // Sortie autonome : Next produit un serveur avec ses seules dépendances
  // réellement utilisées. C'est ce qui permet à l'étage `runner` de ne contenir
  // ni `node_modules` complet, ni gestionnaire de paquets (ADR-0008).
  output: 'standalone',

  /*
   * ⭐⭐ **Le plancher sous le mécanisme de 404** (P4-10, constat écarté de
   * P4-07 §13.10, instruit ici).
   *
   * La 404 du site est `[locale]/404/page.tsx`, atteinte par réécriture du
   * proxy. Ce drapeau ajoute `src/app/global-not-found.tsx` **sous** elle, pour
   * les voies où le proxy n'a pas la main — son matcher exclut `_next/`.
   *
   * ⛔ **Mesuré avant/après, et le défaut était réel** : sans lui,
   * `/_next/inexistant` répond `<html>` **sans `lang`** — la violation
   * WCAG 3.1.1 que P4-07 avait supprimée par la porte principale, encore ouverte
   * par celle-ci. Avec lui : `<html lang="fr">`.
   *
   * ⚠️ **Expérimental sur Next 16.3**, et vérifié tel : le build l'annonce
   * (`Experiments (use with caution) : ✓ globalNotFound`) plutôt que de
   * l'ignorer en silence. Le déclencheur de réexamen est sa stabilisation — ou
   * son retrait, qui ferait réapparaître le défaut ci-dessus **sans rien casser
   * d'autre**, d'où le parcours qui le garde.
   */
  experimental: { globalNotFound: true },

  // Le service `e2e` atteint le serveur de développement par le nom d'hôte
  // Docker `web`, et non `localhost`. Sans cette autorisation, Next 16 refuse la
  // connexion HMR en 403 — ce qui se manifeste par des erreurs console qui
  // n'existent qu'en développement, et masqueraient de vraies erreurs.
  // N'a aucun effet en production.
  allowedDevOrigins: ['web'],

  /**
   * Le CV n'est pas une page de résultat de recherche.
   *
   * Servi à une URL stable, un PDF est indexé et peut ressortir seul, détaché du
   * site qui lui donne son contexte — un document personnel qui circule pour son
   * propre compte. Il reste accessible par lien et par e-mail (CF-07) ; il ne
   * devient simplement pas un résultat.
   *
   * L'en-tête est posé **par l'application** et non par Caddy : il suit l'image
   * de production, donc il est déployé par la CI et vérifiable en local, là où un
   * réglage de reverse proxy dépendrait d'une copie manuelle sur le serveur.
   *
   * Décision de l'utilisateur, 2026-08-12 (`phase-0-questions.md` Q10 bis).
   */
  async headers() {
    return [
      {
        source: '/resume/:file*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex' }],
      },
    ]
  },
}

export default nextConfig
