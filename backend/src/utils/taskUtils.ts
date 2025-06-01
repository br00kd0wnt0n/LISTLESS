import { LifeDomain } from '../types/Task';

export interface WorkbackTime {
  scheduledEnd: Date;
  estimatedTime: number;
}

/**
 * Rounds a number to the nearest 5 minutes
 * @param minutes Number of minutes
 * @returns Rounded number
 */
export function roundToNearest5Minutes(minutes: number): number {
  return Math.max(15, Math.round(minutes / 5) * 5);
}

/**
 * Calculates workback times for a task
 * @param deadline Task deadline
 * @param totalTime Total estimated time in minutes
 * @returns Array of workback times
 */
export function calculateWorkbackTimes(deadline: Date, totalTime: number): WorkbackTime[] {
  const now = new Date();
  const nyNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const deadlineNY = new Date(deadline.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  
  // Ensure deadline is in the future
  if (deadlineNY <= nyNow) {
    throw new Error('Task deadline must be in the future');
  }
  
  const totalDuration = deadlineNY.getTime() - nyNow.getTime();
  const minSpacing = 15 * 60 * 1000; // 15 minutes in milliseconds
  
  // Calculate number of workback steps based on total time
  const numSteps = Math.min(
    Math.max(1, Math.floor(totalTime / 30)), // At least 1 step, max 1 step per 30 minutes
    5 // Maximum 5 steps
  );
  
  // Calculate time per step
  const timePerStep = Math.floor(totalTime / numSteps);
  const spacing = Math.max(minSpacing, Math.floor(totalDuration / (numSteps + 1)));
  
  // Generate workback times
  return Array.from({ length: numSteps }, (_, index) => {
    const itemEndTime = new Date(nyNow.getTime() + (spacing * (index + 1)));
    // Ensure the item ends before the deadline
    if (itemEndTime > deadlineNY) {
      itemEndTime.setTime(deadlineNY.getTime() - minSpacing);
    }
    return {
      scheduledEnd: itemEndTime,
      estimatedTime: roundToNearest5Minutes(timePerStep)
    };
  });
}

/**
 * Assigns a life domain to a task based on its category and priority
 * @param category The task category
 * @param priority The task priority
 * @param existingDomain Optional existing domain to validate
 * @returns The assigned life domain
 */
export function assignLifeDomain(
  category: string,
  priority: string,
  existingDomain?: LifeDomain
): LifeDomain {
  // If a valid life domain is provided, use it
  if (existingDomain && ['purple', 'blue', 'yellow', 'green', 'orange', 'red'].includes(existingDomain)) {
    return existingDomain;
  }
  
  // For urgent tasks, always assign to red domain
  if (priority === 'urgent') {
    return 'red';
  }
  
  // Otherwise, assign based on category
  const normalizedCategory = (category || 'other').toLowerCase();
  
  switch (normalizedCategory) {
    case 'work':
      return 'purple';
    case 'personal':
    case 'learning':
      return 'blue';
    case 'family':
    case 'social':
      return 'yellow';
    case 'health':
      return 'green';
    case 'household':
    case 'maintenance':
    case 'finance':
      return 'orange';
    default:
      return 'orange'; // Default to life maintenance for unknown categories
  }
}

/**
 * Validates a life domain value
 * @param domain The domain to validate
 * @returns Whether the domain is valid
 */
export function isValidLifeDomain(domain: any): domain is LifeDomain {
  return ['purple', 'blue', 'yellow', 'green', 'orange', 'red'].includes(domain);
}

/**
 * Gets the display name for a life domain
 * @param domain The life domain
 * @returns The display name
 */
export function getLifeDomainName(domain: LifeDomain): string {
  const names: Record<LifeDomain, string> = {
    purple: 'Work & Career',
    blue: 'Personal Growth',
    yellow: 'Relationships',
    green: 'Health & Wellness',
    orange: 'Life Maintenance',
    red: 'Urgent Tasks'
  };
  return names[domain] || 'Unknown Domain';
} 