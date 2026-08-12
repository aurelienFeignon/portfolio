import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Sortie autonome : Next produit un serveur avec ses seules dépendances
  // réellement utilisées. C'est ce qui permet à l'étage `runner` de ne contenir
  // ni `node_modules` complet, ni gestionnaire de paquets (ADR-0008).
  output: 'standalone',

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
