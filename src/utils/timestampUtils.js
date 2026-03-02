// Utility functions for handling stream timestamps

export const downloadTimestamp = (timestamp, filename = 'timestamp.txt') => {
    if (!timestamp) {
        alert('No timestamp available to download');
        return;
    }

    const element = document.createElement('a');
    const file = new Blob([timestamp], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(element.href);
};

export const copyToClipboard = async (timestamp) => {
    if (!timestamp) {
        alert('No timestamp available to copy');
        return false;
    }

    try {
        await navigator.clipboard.writeText(timestamp);
        return true;
    } catch (err) {
        console.error('Failed to copy:', err);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = timestamp;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return true;
        } catch {
            document.body.removeChild(textArea);
            return false;
        }
    }
};

export const formatTimestamp = (startTime, title = '') => {
    if (!startTime) return 'Timestamp unavailable';

    const date = new Date(startTime);
    const formattedDate = date.toISOString();
    const humanReadable = date.toLocaleString();

    // Create a comprehensive timestamp string
    const timestamp = title 
        ? `Title: ${title}\nStream Start: ${humanReadable}\nISO: ${formattedDate}`
        : `Stream Start: ${humanReadable}\nISO: ${formattedDate}`;

    return timestamp;
};

export const createTimestampFile = (streamData) => {
    /**
     * Creates a formatted timestamp file content from stream data
     * @param {Array} streamData - Array of objects with { title, startTime, url }
     */
    let content = 'YouTube Stream Timestamps\n';
    content += '='.repeat(50) + '\n\n';

    streamData.forEach((stream, idx) => {
        const date = new Date(stream.startTime);
        content += `${idx + 1}. ${stream.title || 'Untitled Stream'}\n`;
        content += `   URL: ${stream.url}\n`;
        content += `   Start Time: ${date.toLocaleString()}\n`;
        content += `   ISO: ${date.toISOString()}\n\n`;
    });

    content += `Generated: ${new Date().toLocaleString()}\n`;
    return content;
};
