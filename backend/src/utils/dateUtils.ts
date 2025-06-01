/**
 * Gets the current time in New York timezone
 * @returns Formatted date string
 */
export function getCurrentTimeInNY(): string {
  const now = getReferenceDate();
  return now.toLocaleString('en-US', { 
    timeZone: 'America/New_York',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });
}

/**
 * Gets a reference date for task scheduling
 * @returns Date object
 */
export function getReferenceDate(): Date {
  // Set reference date to May 27, 2025
  const referenceDate = new Date('2025-05-27T00:00:00.000-04:00');
  return referenceDate;
}

/**
 * Gets a relative date string for task scheduling
 * @param daysFromNow Number of days from now
 * @param hour Hour of day (0-23)
 * @param minute Minute of hour (0-59)
 * @returns ISO date string
 */
export function getRelativeDate(daysFromNow: number, hour?: number, minute?: number): string {
  // Create date in NY timezone using reference date
  const now = getReferenceDate();
  const nyDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  nyDate.setDate(nyDate.getDate() + daysFromNow);
  
  // If specific time is provided, use it; otherwise use end of day
  if (hour !== undefined && minute !== undefined) {
    nyDate.setHours(hour, minute, 0, 0);
  } else {
    nyDate.setHours(23, 59, 59, 999);
  }
  
  // Format the date in NY timezone with explicit year
  const year = nyDate.getFullYear();
  const month = String(nyDate.getMonth() + 1).padStart(2, '0');
  const day = String(nyDate.getDate()).padStart(2, '0');
  const hours = String(nyDate.getHours()).padStart(2, '0');
  const minutes = String(nyDate.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:00.000-04:00`;
}

/**
 * Formats a date for display
 * @param date Date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });
}

/**
 * Formats a duration in minutes to a human-readable string
 * @param minutes Duration in minutes
 * @returns Formatted duration string
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }
  return `${remainingMinutes}m`;
} 