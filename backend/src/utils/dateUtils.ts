/**
 * Gets the current time in New York timezone
 * @returns Formatted date string
 */
export function getCurrentTimeInNY(): string {
  const now = new Date();
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
  return new Date();
}

/**
 * Gets a relative date string for task scheduling
 * @param days Number of days from now
 * @param hours Hour of day (0-23)
 * @param minutes Minute of hour (0-59)
 * @returns ISO date string
 */
export function getRelativeDate(days: number, hours: number, minutes: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

/**
 * Formats a date for display
 * @param date Date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
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
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
} 