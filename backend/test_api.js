async function test() {
    try {
        console.log('Sending request to /analyzeChannel...');
        const response = await fetch('http://localhost:3400/analyzeChannel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                data: {
                    userId: "00000000-0000-0000-0000-000000000000",
                    channelId: "testChannel123",
                    videos: [
                        { id: '1', title: 'Gojo vs Sukuna', views: 5000, likes: 300, comments: 50, publishedAt: '2024-12-01' },
                        { id: '2', title: 'Top 5 meilleures AMV', views: 800, likes: 20, comments: 5, publishedAt: '2025-01-15' },
                        { id: '3', title: 'Test mon vlog de vacances', views: 500, likes: 10, comments: 2, publishedAt: '2025-02-15' },
                        { id: '4', title: 'Samsung vs iPhone', views: 12000, likes: 100, comments: 30, publishedAt: '2025-02-01' },
                    ],
                    channelStats: {
                        subscriberCount: 500,
                        viewCount: 18300,
                        videoCount: 4,
                        channelTitle: 'Test Channel AI'
                    },
                    focusNiches: []
                }
            })
        });

        const data = await response.json();
        console.log('API RESPONSE:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('TEST ERROR:', error);
    }
}

test();
