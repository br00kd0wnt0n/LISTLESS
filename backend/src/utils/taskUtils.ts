import { getReferenceDate } from './dateUtils';

export interface WorkbackTime {
  scheduledEnd: Date;
  estimatedTime: number;
  title: string;
}

/**
 * Rounds a number to the nearest 5 minutes
 * @param minutes Number of minutes
 * @returns Rounded number
 */
export function roundToNearest5Minutes(minutes: number): number {
  return Math.round(minutes / 5) * 5;
}

/**
 * Calculates workback times for a task
 * @param deadline Task deadline
 * @param totalDuration Total estimated time in minutes
 * @returns Array of workback times
 */
export function calculateWorkbackTimes(deadline: Date, totalDuration: number): WorkbackTime[] {
  const workbackItems: WorkbackTime[] = [];
  
  // Convert deadline to NY timezone for consistent calculations
  const deadlineNY = new Date(deadline.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const nowNY = getReferenceDate(); // Use reference date instead of current date
  
  // Calculate hours until deadline in NY timezone
  const hoursUntilDeadline = (deadlineNY.getTime() - nowNY.getTime()) / (1000 * 60 * 60);
  
  // Helper function to create NY timezone date string
  const createNYDateString = (date: Date) => {
    const nyDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const year = nyDate.getFullYear();
    const month = String(nyDate.getMonth() + 1).padStart(2, '0');
    const day = String(nyDate.getDate()).padStart(2, '0');
    const hours = String(nyDate.getHours()).padStart(2, '0');
    const minutes = String(nyDate.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:00.000-04:00`;
  };
  
  // Calculate workback item durations based on total duration
  let firstItemDuration, secondItemDuration;
  
  if (hoursUntilDeadline <= 2) {
    // For tasks due within 2 hours
    firstItemDuration = Math.floor(totalDuration * 0.25);
    secondItemDuration = Math.floor(totalDuration * 0.75);
  } else if (hoursUntilDeadline <= 4) {
    // For tasks due within 4 hours
    firstItemDuration = Math.floor(totalDuration * 0.3);
    secondItemDuration = Math.floor(totalDuration * 0.7);
  } else {
    // For tasks due in more than 4 hours
    firstItemDuration = Math.floor(totalDuration * 0.4);
    secondItemDuration = Math.floor(totalDuration * 0.6);
  }
  
  // Ensure minimum durations and round to nearest 5 minutes
  firstItemDuration = Math.max(15, roundToNearest5Minutes(firstItemDuration));
  secondItemDuration = Math.max(15, roundToNearest5Minutes(secondItemDuration));
  
  // Add a 15-minute buffer between items
  const bufferMinutes = 15;
  
  // Calculate end times for each item, working backwards from the deadline
  const secondItemEnd = new Date(deadlineNY);
  const secondItemStart = new Date(secondItemEnd.getTime() - (secondItemDuration * 60 * 1000));
  const firstItemEnd = new Date(secondItemStart.getTime() - (bufferMinutes * 60 * 1000));
  const firstItemStart = new Date(firstItemEnd.getTime() - (firstItemDuration * 60 * 1000));
  
  // Verify that items don't overlap and are in the future
  if (firstItemEnd <= firstItemStart || secondItemEnd <= secondItemStart || firstItemEnd >= secondItemStart) {
    // If there's an overlap, adjust the durations to fit within the available time
    const totalAvailableMinutes = (deadlineNY.getTime() - nowNY.getTime()) / (1000 * 60);
    const adjustedTotalDuration = Math.min(totalDuration, totalAvailableMinutes - bufferMinutes);
    
    // Recalculate durations proportionally
    firstItemDuration = Math.max(15, roundToNearest5Minutes(adjustedTotalDuration * 0.4));
    secondItemDuration = Math.max(15, roundToNearest5Minutes(adjustedTotalDuration * 0.6));
    
    // Recalculate times
    const newSecondItemEnd = new Date(deadlineNY);
    const newSecondItemStart = new Date(newSecondItemEnd.getTime() - (secondItemDuration * 60 * 1000));
    const newFirstItemEnd = new Date(newSecondItemStart.getTime() - (bufferMinutes * 60 * 1000));
    const newFirstItemStart = new Date(newFirstItemEnd.getTime() - (firstItemDuration * 60 * 1000));
    
    // Add items in chronological order (earliest first)
    workbackItems.push({
      scheduledEnd: new Date(createNYDateString(newFirstItemEnd)),
      estimatedTime: firstItemDuration,
      title: 'Step 1: Initial preparation'
    });
    
    workbackItems.push({
      scheduledEnd: new Date(createNYDateString(newSecondItemEnd)),
      estimatedTime: secondItemDuration,
      title: 'Step 2: Final completion'
    });
  } else {
    // Add items in chronological order (earliest first)
    workbackItems.push({
      scheduledEnd: new Date(createNYDateString(firstItemEnd)),
      estimatedTime: firstItemDuration,
      title: 'Step 1: Initial preparation'
    });
    
    workbackItems.push({
      scheduledEnd: new Date(createNYDateString(secondItemEnd)),
      estimatedTime: secondItemDuration,
      title: 'Step 2: Final completion'
    });
  }
  
  return workbackItems;
}

export type LifeDomain = 'purple' | 'blue' | 'yellow' | 'green' | 'orange' | 'red';

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
  // If there's an existing domain and it's valid, keep it
  if (existingDomain && isValidLifeDomain(existingDomain)) {
    return existingDomain;
  }
  
  // Map categories to life domains
  const categoryMap: Record<string, LifeDomain> = {
    work: 'purple',
    personal: 'blue',
    health: 'yellow',
    family: 'green',
    social: 'orange',
    urgent: 'red'
  };
  
  // If it's an urgent task, assign to red domain
  if (priority.toLowerCase() === 'urgent') {
    return 'red';
  }
  
  // Try to match the category
  const normalizedCategory = category.toLowerCase();
  for (const [key, domain] of Object.entries(categoryMap)) {
    if (normalizedCategory.includes(key)) {
      return domain;
    }
  }
  
  // Default to purple (work) if no match found
  return 'purple';
}

/**
 * Validates a life domain value
 * @param domain The domain to validate
 * @returns Whether the domain is valid
 */
export function isValidLifeDomain(domain: string): domain is LifeDomain {
  return ['purple', 'blue', 'yellow', 'green', 'orange', 'red'].includes(domain);
}

/**
 * Gets the display name for a life domain
 * @param domain The life domain
 * @returns The display name
 */
export function getLifeDomainName(domain: LifeDomain): string {
  const domainNames: Record<LifeDomain, string> = {
    purple: 'Work & Career',
    blue: 'Personal Growth',
    yellow: 'Health & Wellness',
    green: 'Family & Relationships',
    orange: 'Social & Community',
    red: 'Urgent & Important'
  };
  return domainNames[domain];
} 