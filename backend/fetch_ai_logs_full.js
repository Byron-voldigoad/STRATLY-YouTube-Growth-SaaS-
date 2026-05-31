import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xjpahvdpzbnybkehhyeu.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqcGFodmRwemJueWJrZWhoeWV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ1ODk5OSwiZXhwIjoyMDgxMDM0OTk5fQ.cu2s1t9X4YQ5Eqcyb91NX9p-1nx-ec1vsoDt4au4JQ8';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fetchLogs() {
  const { data, error } = await supabase
    .from('ai_logs')
    .select('log_type, model_used, latency_ms, created_at, prompt, response')
    .order('created_at', { ascending: false })
    .limit(3);
    
  if (error) {
    console.error("Error fetching logs:", error);
    process.exit(1);
  }

  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}

fetchLogs();
