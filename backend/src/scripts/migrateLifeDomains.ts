import mongoose from 'mongoose';
import TaskModel from '../models/Task';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Category to life domain mapping
const categoryToDomain: Record<string, 'purple' | 'blue' | 'yellow' | 'green' | 'orange' | 'red'> = {
  work: 'purple',           // Work and career
  household: 'orange',      // Life maintenance
  personal: 'blue',         // Personal growth
  family: 'yellow',         // Relationships
  health: 'green',          // Health and wellness
  finance: 'orange',        // Life maintenance
  maintenance: 'orange',    // Life maintenance
  social: 'yellow',         // Relationships
  other: 'orange'           // Default to life maintenance
};

async function migrateLifeDomains() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Find all tasks without life domains
    const tasks = await TaskModel.find({ lifeDomain: { $exists: false } });
    console.log(`Found ${tasks.length} tasks without life domains`);

    // Update tasks with life domains based on category
    let updatedCount = 0;
    let skippedCount = 0;

    for (const task of tasks) {
      // Skip tasks that already have a life domain
      if (task.lifeDomain) {
        skippedCount++;
        continue;
      }

      // Get life domain based on category
      const lifeDomain = categoryToDomain[task.category] || 'orange';

      // Update task with life domain
      task.lifeDomain = lifeDomain;
      await task.save();
      updatedCount++;

      // Log progress every 100 tasks
      if (updatedCount % 100 === 0) {
        console.log(`Updated ${updatedCount} tasks...`);
      }
    }

    console.log('\nMigration completed:');
    console.log(`- Updated ${updatedCount} tasks with life domains`);
    console.log(`- Skipped ${skippedCount} tasks (already had life domains)`);

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateLifeDomains(); 