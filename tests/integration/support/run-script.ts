/**
 * Exécute un script de `scripts/` en sous-processus et rend son code de sortie
 * et sa sortie : les gates et la sonde sont éprouvés **par leur code de sortie**,
 * parce que c'est lui, et rien d'autre, qui fait échouer la CI ou déclenche
 * l'alerte.
 */
import { execFile } from 'node:child_process'
import { join } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)

export type ScriptResult = { code: number; output: string }

/** Chemin absolu d'un script de `scripts/`, résolu depuis la racine du dépôt. */
export function scriptPath(name: string): string {
  return join(process.cwd(), 'scripts', name)
}

export async function runScript(
  script: string,
  args: readonly string[],
  env?: NodeJS.ProcessEnv,
): Promise<ScriptResult> {
  try {
    const { stdout, stderr } = await run('node', [script, ...args], env ? { env } : {})
    return { code: 0, output: stdout + stderr }
  } catch (error) {
    const failure = error as { code?: number; stdout?: string; stderr?: string }
    return { code: failure.code ?? -1, output: (failure.stdout ?? '') + (failure.stderr ?? '') }
  }
}
