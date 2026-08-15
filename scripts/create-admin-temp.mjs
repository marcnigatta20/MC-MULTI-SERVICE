import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load .env.local if present and relevant env vars missing
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, 'utf8');
  raw.split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) {
      const key = m[1];
      let val = m[2] || '';
      // remove surrounding quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  });
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment or .env.local.');
  process.exit(2);
}

const supabase = createClient(url, key);

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  const full_name = process.argv[4] || 'Administrateur';

  if (!email || !password) {
    console.error('Usage: node scripts/create-admin-temp.mjs <email> <password> [full_name]');
    process.exit(2);
  }

  try {
    console.log('Creating auth user...');
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: 'ADMIN' },
    });

    if (createError) throw createError;
    const user = userData.user;
    console.log('Auth user created:', user.id);

    console.log('Inserting profile...');
    const { error: profileError } = await supabase.from('profiles').insert({
      id: user.id,
      email,
      full_name,
      role: 'ADMIN',
      is_active: true,
    });
    if (profileError) throw profileError;

    console.log('Inserting audit log...');
    await supabase.from('audit_logs').insert({
      user_id: null,
      action: 'USER_CREATED',
      entity_type: 'profiles',
      entity_id: user.id,
      details: { email, role: 'ADMIN' },
    });

    console.log('Admin user created successfully:', email);
    console.log('User id:', user.id);
    process.exit(0);
  } catch (err) {
    console.error('Failed to create admin:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
