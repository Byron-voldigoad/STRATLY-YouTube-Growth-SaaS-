import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xjpahvdpzbnybkehhyeu.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqcGFodmRwemJueWJrZWhoeWV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ1ODk5OSwiZXhwIjoyMDgxMDM0OTk5fQ.cu2s1t9X4YQ5Eqcyb91NX9p-1nx-ec1vsoDt4au4JQ8';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkColumn() {
  console.log("Checking video_analytics for thumbnail_url...");
  const { data, error } = await supabase
    .from('video_analytics')
    .select('thumbnail_url')
    .limit(1);
    
  if (error) {
    if (error.code === '42703' || error.message.includes('does not exist')) {
        console.log("RESULT: thumbnail_url DOES NOT EXIST");
    } else {
        console.error("RESULT: Error checking:", error);
    }
  } else {
    console.log("RESULT: thumbnail_url EXISTS.");
  }
  process.exit(0);
}
checkColumn();
