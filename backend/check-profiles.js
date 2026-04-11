import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data, error } = await supabase.from('profiles').select('*');
  console.log('Profiles found:', data?.length);
  if (data?.length < 5) console.log(data);
  if (error) console.error('Error:', error);
}
main();
