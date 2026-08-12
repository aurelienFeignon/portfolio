/**
 * Frontmatter d'un projet — `architecture.md` §3.4 (P2-02).
 *
 * `strictObject` : une clé inconnue est une **erreur**, pas un champ ignoré.
 * C'est ce qui attrape `feature: true` écrit pour `featured: true` — la faute la
 * plus coûteuse du lot, puisqu'elle ne casse rien et produit simplement un site
 * faux.
 */
import { z } from 'zod'

import {
  PERIOD_ORDER_ERROR,
  isPeriodOrdered,
  isoDateSchema,
  nonEmptyTextSchema,
  slugSchema,
  technologiesSchema,
} from './common'

export const projectFrontmatterSchema = z
  .strictObject({
    /** Doit correspondre au nom du fichier ; la divergence est vérifiée au chargement (P2-04). */
    slug: slugSchema,
    title: nonEmptyTextSchema,
    /**
     * Sert aussi de `meta description` (`architecture.md` §9). Les bornes ne sont
     * pas décoratives : un résumé vide est un défaut de référencement livré en
     * production, et au-delà de 300 caractères ce n'est plus un résumé.
     */
    summary: nonEmptyTextSchema.min(20, 'est trop court pour servir de description').max(300),
    type: z.enum(['personal', 'professional', 'open-source']),
    /**
     * Absent vaut « non mis en avant ». Un défaut sûr, qui ne ment pas : oublier
     * ce champ ne peut pas faire remonter un projet par accident.
     */
    featured: z.boolean().default(false),
    technologies: technologiesSchema,
    startedAt: isoDateSchema,
    /** Absent ⇒ projet toujours en cours (dérivation en P2-06). */
    endedAt: isoDateSchema.optional(),
    links: z
      .strictObject({
        repository: z.url('doit être une URL absolue').optional(),
        demo: z.url('doit être une URL absolue').optional(),
      })
      .optional(),
    /**
     * Les dimensions sont obligatoires avec l'image : c'est ce qui permet de
     * réserver la place et de ne pas provoquer de décalage de mise en page
     * (budget CLS ≤ 0,05, `performance-budget.md` §2).
     */
    cover: z
      .strictObject({
        src: z.string().startsWith('/', 'doit être un chemin absolu servi par le site'),
        alt: nonEmptyTextSchema,
        width: z.int().positive(),
        height: z.int().positive(),
      })
      .optional(),
  })
  .refine(isPeriodOrdered, PERIOD_ORDER_ERROR)
