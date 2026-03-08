
async function test() {
    console.log('--- STARTING GENKIT TEST ---');
    try {
        const response = await fetch('http://localhost:3400/analyzeChannel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                data: {
                    videos: [
                        { id: '1', title: 'Test Video', views: 100, publishedAt: new Date().toISOString() }
                    ],
                    channelStats: {
                        subscriberCount: 10,
                        viewCount: 100,
                        videoCount: 1,
                        channelTitle: 'Test Channel'
                    }
                }
            })
        });

        const data = await response.json();
        console.log('RESULT:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('TEST FAILED:', error);
    }
}

test();
