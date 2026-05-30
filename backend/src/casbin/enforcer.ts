import { newEnforcer, type Enforcer } from 'casbin';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let enforcerInstance: Enforcer | null = null;

export async function initEnforcer(): Promise<Enforcer> {
  const modelPath = path.resolve(__dirname, 'model.conf');
  const policyPath = path.resolve(__dirname, 'policy.csv');
  enforcerInstance = await newEnforcer(modelPath, policyPath);
  const policies = await enforcerInstance.getPolicy();
  console.log('[casbin] Enforcer initialized —', policies?.length ?? 0, 'policies loaded');
  return enforcerInstance;
}

export function getEnforcer(): Enforcer {
  if (!enforcerInstance) throw new Error('Casbin enforcer not initialized — call initEnforcer() first');
  return enforcerInstance;
}
