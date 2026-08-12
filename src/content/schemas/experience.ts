/**
 * Frontmatter d'une expérience professionnelle — `architecture.md` §3.4 (P2-02).
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

export const experienceFrontmatterSchema = z
  .strictObject({
    slug: slugSchema,
    company: nonEmptyTextSchema,
    role: nonEmptyTextSchema,
    location: nonEmptyTextSchema.optional(),
    startedAt: isoDateSchema,
    /** Absent ⇒ poste en cours. C'est la dérivation attendue par P2-06, pas un oubli toléré. */
    endedAt: isoDateSchema.optional(),
    technologies: technologiesSchema,
    /**
     * Au moins un fait marquant. Une expérience sans réalisation citée n'apporte
     * rien à un recruteur : l'exiger ici est un garde-fou éditorial, pas une
     * contrainte technique.
     */
    highlights: z.array(nonEmptyTextSchema).min(1, 'doit citer au moins une réalisation'),
  })
  .refine(isPeriodOrdered, PERIOD_ORDER_ERROR)
