const https = require('https');

const options = {
  hostname: 'xjpahvdpzbnybkehhyeu.supabase.co',
  path: '/rest/v1/?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqcGFodmRwemJueWJrZWhoeWV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ1ODk5OSwiZXhwIjoyMDgxMDM0OTk5fQ.cu2s1t9X4YQ5Eqcyb91NX9p-1nx-ec1vsoDt4au4JQ8',
  method: 'GET',
  headers: {
    'Accept': 'application/openapi+json'
  }
};

const req = https.request(options, res => {
  let data = '';
  res.on('data', chunk => {
    data += chunk;
  });
  res.on('end', () => {
    try {
      const spec = JSON.parse(data);
      if (spec.definitions && spec.definitions.video_analytics) {
        const columns = Object.keys(spec.definitions.video_analytics.properties);
        console.log("Columns in video_analytics:", columns.join(', '));
        if (columns.includes('thumbnail_url')) {
          console.log("--> thumbnail_url DOES exist!");
        } else {
          console.log("--> thumbnail_url DOES NOT exist!");
        }
      } else {
        console.log("video_analytics table not found in schema");
      }
    } catch (e) {
      console.error(e);
    }
  });
});

req.on('error', error => {
  console.error(error);
});

req.end();
