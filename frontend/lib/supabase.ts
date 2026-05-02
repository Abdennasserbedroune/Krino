/**
 * DEPRECATED — do not import from this file.
 * Use `import { createClient } from '@/lib/supabase/client'` instead.
 * This file is kept only to avoid breaking any remaining legacy imports
 * while the codebase is migrated. It re-exports createClient as a factory.
 */
export { createClient } from '@/lib/supabase/client';

// Legacy named export — calls createClient() lazily so it never runs at module scope on the server
import { createClient as _create } from '@/lib/supabase/client';
let _instance: ReturnType<typeof _create> | null = null;
export const supabase = new Proxy({} as ReturnType<typeof _create>, {
  get(_target, prop) {
    if (!_instance) _instance = _create();
    return (_instance as any)[prop];
  },
});
