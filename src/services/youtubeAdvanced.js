// Advanced YouTube operations - channel and playlist queries
// All API calls go through /api/youtube-proxy to avoid API key exposure and 403 errors

import axios from 'axios';
import { extractVideoId } from './youtube';

export const extractChannelId = (channelUrl) => {
    // Extract channel ID from various YouTube channel URL formats
    const patterns = [
        /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/,
        /youtube\.com\/@([a-zA-Z0-9_-]+)/,
        /youtube\.com\/c\/([a-zA-Z0-9_-]+)/,
        /youtube\.com\/user\/([a-zA-Z0-9_-]+)/
    ];

    for (const pattern of patterns) {
        const match = channelUrl.match(pattern);
        if (match) return { id: match[1], type: pattern.source.includes('channel/') ? 'id' : 'username' };
    }

    return null;
};

export const extractPlaylistId = (playlistUrl) => {
    const match = playlistUrl.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
};

export const getChannelLivestreams = async (channelUrl) => {
    try {
        const channelInfo = extractChannelId(channelUrl);
        if (!channelInfo) {
            throw new Error('Invalid channel URL');
        }

        let channelId = channelInfo.id;

        // If we have a username, we need to resolve it to a channel ID first
        if (channelInfo.type !== 'id') {
            const searchResponse = await axios.get('/api/youtube-proxy', {
                params: {
                    endpoint: 'search',
                    part: 'snippet',
                    q: channelInfo.id,
                    type: 'channel',
                    maxResults: 1
                }
            });

            if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
                throw new Error('Channel not found');
            }

            channelId = searchResponse.data.items[0].snippet.channelId;
        }

        // Search for live and upcoming broadcasts on this channel
        const response = await axios.get('/api/youtube-proxy', {
            params: {
                endpoint: 'search',
                part: 'snippet',
                channelId: channelId,
                eventType: 'live',
                type: 'video',
                maxResults: 10
            }
        });

        const liveStreams = (response.data.items || []).map(item => ({
            videoId: item.id.videoId,
            title: item.snippet.title,
            description: item.snippet.description,
            thumbnail: item.snippet.thumbnails?.default?.url,
            publishedAt: item.snippet.publishedAt,
            url: `https://www.youtube.com/watch?v=${item.id.videoId}`
        }));

        // Also check for upcoming streams
        const upcomingResponse = await axios.get('/api/youtube-proxy', {
            params: {
                endpoint: 'search',
                part: 'snippet',
                channelId: channelId,
                eventType: 'upcoming',
                type: 'video',
                maxResults: 10
            }
        });

        const upcomingStreams = (upcomingResponse.data.items || []).map(item => ({
            videoId: item.id.videoId,
            title: item.snippet.title,
            description: item.snippet.description,
            thumbnail: item.snippet.thumbnails?.default?.url,
            publishedAt: item.snippet.publishedAt,
            url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
            upcoming: true
        }));

        return [...liveStreams, ...upcomingStreams];
    } catch (error) {
        console.error('Error fetching channel livestreams:', error);
        throw error;
    }
};

export const getPlaylistVideos = async (playlistUrl, eventStartDate) => {
    try {
        const playlistId = extractPlaylistId(playlistUrl);
        if (!playlistId) {
            throw new Error('Invalid playlist URL');
        }

        const response = await axios.get('/api/youtube-proxy', {
            params: {
                endpoint: 'playlistItems',
                part: 'snippet',
                playlistId: playlistId,
                maxResults: 50
            }
        });

        const videos = (response.data.items || []).map(item => ({
            videoId: item.snippet.resourceId.videoId,
            title: item.snippet.title,
            description: item.snippet.description,
            thumbnail: item.snippet.thumbnails?.default?.url,
            publishedAt: item.snippet.publishedAt,
            url: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`
        }));

        // If event date provided, filter videos published around that date
        if (eventStartDate) {
            const eventDate = new Date(eventStartDate);
            const dayBefore = new Date(eventDate);
            dayBefore.setDate(dayBefore.getDate() - 1);
            const dayAfter = new Date(eventDate);
            dayAfter.setDate(dayAfter.getDate() + 3); // Allow 3 days after for multi-day events

            return videos.filter(video => {
                const videoDate = new Date(video.publishedAt);
                return videoDate >= dayBefore && videoDate <= dayAfter;
            });
        }

        return videos;
    } catch (error) {
        console.error('Error fetching playlist videos:', error);
        throw error;
    }
};

export const validateVideoUrl = async (videoUrl) => {
    try {
        const videoId = extractVideoId(videoUrl);
        if (!videoId) return { valid: false, reason: 'Invalid URL' };

        const response = await axios.get('/api/youtube-proxy', {
            params: {
                endpoint: 'videos',
                part: 'snippet,liveStreamingDetails',
                id: videoId
            }
        });

        if (!response.data.items || response.data.items.length === 0) {
            return { valid: false, reason: 'Video not found' };
        }

        const video = response.data.items[0];
        const isLive = video.liveStreamingDetails !== undefined;

        return {
            valid: true,
            isLive,
            title: video.snippet.title,
            thumbnail: video.snippet.thumbnails?.default?.url
        };
    } catch (error) {
        console.error('Error validating video:', error);
        return { valid: false, reason: 'API error' };
    }
};
