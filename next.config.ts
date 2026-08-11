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
}

export default nextConfig
