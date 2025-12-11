/**
 * Date utility functions for FileInsight
 * 
 * Contains helper functions for date formatting and manipulation.
 */

/**
 * Formats a date string or Date object to a localized string.
 * 
 * @param date - ISO date string, timestamp, or Date object
 * @returns Formatted date string or 'Unknown' if invalid
 * 
 * @example
 * formatDate('2024-01-15T10:30:00Z') // returns "1/15/2024, 10:30:00 AM"
 * formatDate(undefined) // returns "Unknown"
 */
export const formatDate = (date?: string | number | Date): string => {
    if (!date) return 'Unknown';

    try {
        const dateObj = typeof date === 'string' || typeof date === 'number'
            ? new Date(date)
            : date;

        if (isNaN(dateObj.getTime())) return 'Unknown';

        return dateObj.toLocaleString();
    } catch {
        return 'Unknown';
    }
};

/**
 * Formats a date as a relative time string (e.g., "2 hours ago").
 * 
 * @param date - Date to format
 * @returns Relative time string
 * 
 * @example
 * formatRelativeTime(Date.now() - 3600000) // returns "1 hour ago"
 */
export const formatRelativeTime = (date: number | Date): string => {
    const now = Date.now();
    const timestamp = typeof date === 'number' ? date : date.getTime();
    const diff = now - timestamp;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
};
