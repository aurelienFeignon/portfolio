/**
 * Démarrage du serveur (P10-07) : dire, **avant toute visite**, comment l'envoi du CV est
 * configuré.
 *
 * Next appelle `register()` une fois par processus serveur. Il **décrit** le plan d'assemblage
 * sans rien construire (son bundle est distinct de celui des actions) ; la ligne nomme l'expéditeur
 * retenu, les variables et les PDF en défaut — jamais leurs valeurs — : une configuration
 * manquante sur le VPS se lit dans `docker logs` dès le déploiement, au lieu d'être découverte par
 * le premier visiteur. Le serveur démarre quoi qu'il en soit : un envoi indisponible ne doit pas
 * couper le reste du site.
 *
 * L'import est **dynamique** et réservé au runtime Node : le runtime Edge (le proxy) n'a ni
 * `node:crypto` ni `node:fs`.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { describeResumePlan, planResume } = await import('./features/resume/runtime')
  console.error(describeResumePlan(planResume(process.env)))
}
