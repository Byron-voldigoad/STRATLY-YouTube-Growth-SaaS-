import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

console.log('--- DB CONNECTION TEST ---');
console.log('URL:', process.env.SUPABASE_URL);
console.log('KEY (Service Role):', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Present' : 'Missing');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, email, youtube_channel_id, youtube_refresh_token')
            .not('youtube_refresh_token', 'is', null);

        if (error) {
            console.error('Error fetching profiles:', error.message);
            console.error('Details:', error);
        } else {
            console.log('Profiles found:', data.length);
            console.log('Sample users:', JSON.stringify(data.slice(0, 2), null, 2));
        }
    } catch (e) {
        console.error('Unexpected error:', e);
    }
}

test();
