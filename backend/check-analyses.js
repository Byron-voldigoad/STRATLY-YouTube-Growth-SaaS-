import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data, error } = await supabase.from('ai_analyses').select('*').limit(5);
  console.log('Analyses found via Service Role:', data?.length);
  if (error) console.error(error);
}
main();
