/**
 * YouTube API Proxy
 * 
 * Proxies YouTube API requests through the backend to avoid exposing the API key
 * and to bypass HTTP referrer restrictions on the API key.
 * 
 * Endpoints:
 * - GET /api/youtube-proxy?endpoint=videos&part=liveStreamingDetails&id={videoId}
 * - GET /api/youtube-proxy?endpoint=search&part=snippet&channelId={channelId}&type=video...
 */

export const config = {
    runtime: 'edge',
};

const ALLOWED_ENDPOINTS = ['videos', 'search', 'channels', 'playlistItems'];

export default async function handler(req) {
    // Handle CORS
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    const url = new URL(req.url);
    const endpoint = url.searchParams.get('endpoint');

    if (!endpoint || !ALLOWED_ENDPOINTS.includes(endpoint)) {
        return new Response(
            JSON.stringify({ error: 'Invalid or missing endpoint parameter' }),
            { status: 400, headers: corsHeaders }
        );
    }

    // Get API key from environment
    const apiKey = process.env.YOUTUBE_API_KEY || process.env.VITE_DEFAULT_YOUTUBE_API_KEY;

    if (!apiKey) {
        return new Response(
            JSON.stringify({ error: 'YouTube API key not configured' }),
            { status: 500, headers: corsHeaders }
        );
    }

    // Build YouTube API URL
    const youtubeUrl = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);

    // Copy all query params except 'endpoint' to YouTube API URL
    for (const [key, value] of url.searchParams.entries()) {
        if (key !== 'endpoint') {
            youtubeUrl.searchParams.set(key, value);
        }
    }

    // Add API key (will override any client-supplied key for security)
    youtubeUrl.searchParams.set('key', apiKey);

    try {
        const response = await fetch(youtubeUrl.toString(), {
            headers: {
                'Accept': 'application/json',
            },
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('[YOUTUBE-PROXY] API Error:', data.error?.message || response.statusText);
            return new Response(
                JSON.stringify({
                    error: data.error?.message || 'YouTube API error',
                    code: data.error?.code || response.status,
                }),
                { status: response.status, headers: corsHeaders }
            );
        }

        return new Response(JSON.stringify(data), { status: 200, headers: corsHeaders });
    } catch (error) {
        console.error('[YOUTUBE-PROXY] Fetch error:', error);
        return new Response(
            JSON.stringify({ error: 'Failed to fetch from YouTube API', message: error.message }),
            { status: 500, headers: corsHeaders }
        );
    }
}
