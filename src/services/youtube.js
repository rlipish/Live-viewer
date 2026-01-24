import axios from 'axios';

export const extractVideoId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|live\/|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

/**
 * Fetches YouTube stream start time via backend proxy to avoid API key exposure and 403 errors.
 */
export const getStreamStartTime = async (videoId) => {
    try {
        // Use backend proxy to avoid API key restrictions
        const response = await axios.get('/api/youtube-proxy', {
            params: {
                endpoint: 'videos',
                part: 'liveStreamingDetails',
                id: videoId,
            },
        });

        const items = response.data.items;
        if (items && items.length > 0 && items[0].liveStreamingDetails) {
            const details = items[0].liveStreamingDetails;

            // Stream has actually started
            if (details.actualStartTime) {
                return {
                    startTime: details.actualStartTime,
                    status: 'started',
                    scheduledTime: details.scheduledStartTime || null
                };
            }

            // Stream is scheduled but not started yet
            if (details.scheduledStartTime) {
                return {
                    startTime: null,
                    status: 'scheduled',
                    scheduledTime: details.scheduledStartTime
                };
            }
        }
    } catch (error) {
        console.error("Error fetching YouTube stream details:", error);
    }
    return null;
};
