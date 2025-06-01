import mongoose from 'mongoose';
import TaskModel from '../models/Task';

async function fixTaskDomains() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/listless');
    console.log('Connected to MongoDB');

    // Update rules based on task category and title
    const updates = [
      // Social and relationship activities -> yellow
      {
        filter: {
          $or: [
            { category: 'social' },
            { category: 'family' },
            { title: { $regex: /reservation|dinner|gathering|party|meet|visit|family|friend|social|relationship/i } }
          ]
        },
        update: { lifeDomain: 'yellow' }
      },
      // Cleaning, errands, and household tasks -> orange
      {
        filter: {
          $or: [
            { category: 'household' },
            { title: { $regex: /clean|wash|organize|maintenance|chore|errand|grocery|laundry|pick up|dry cleaning|car wash|windows/i } }
          ]
        },
        update: { lifeDomain: 'orange' }
      },
      // Work tasks -> purple
      {
        filter: {
          $or: [
            { category: 'work' },
            { title: { $regex: /work|meeting|presentation|report|project|client|business|submit|prepare/i } }
          ]
        },
        update: { lifeDomain: 'purple' }
      },
      // Health tasks -> green
      {
        filter: {
          $or: [
            { category: 'health' },
            { title: { $regex: /doctor|appointment|exercise|health|wellness|medical|therapy|checkup/i } }
          ]
        },
        update: { lifeDomain: 'green' }
      },
      // Personal growth and learning -> blue
      {
        filter: {
          $or: [
            { category: 'personal' },
            { title: { $regex: /study|learn|read|practice|skill|course|training|development|blog|write|research/i } }
          ]
        },
        update: { lifeDomain: 'blue' }
      }
    ];

    // First, reset all domains to null to avoid conflicts
    await TaskModel.updateMany({}, { $set: { lifeDomain: null } });
    console.log('Reset all domains to null');

    // Apply updates in sequence
    for (const update of updates) {
      const result = await TaskModel.updateMany(
        { ...update.filter, lifeDomain: null }, // Only update tasks that haven't been assigned yet
        { $set: update.update }
      );
      console.log(`Updated ${result.modifiedCount} tasks for ${update.update.lifeDomain} domain`);
    }

    // Set remaining tasks to orange (life maintenance) as default
    const defaultResult = await TaskModel.updateMany(
      { lifeDomain: null },
      { $set: { lifeDomain: 'orange' } }
    );
    console.log(`Set ${defaultResult.modifiedCount} remaining tasks to orange (default)`);

    // Log final domain distribution
    const domainCounts = await TaskModel.aggregate([
      { $group: { _id: '$lifeDomain', count: { $sum: 1 } } }
    ]);
    console.log('\nFinal domain distribution:');
    console.log(domainCounts);

    // Log tasks by domain for verification
    console.log('\nTasks by domain:');
    for (const domain of ['purple', 'blue', 'yellow', 'green', 'orange', 'red']) {
      const tasks = await TaskModel.find({ lifeDomain: domain }, { title: 1, category: 1 }).lean();
      console.log(`\n${domain.toUpperCase()} domain tasks:`);
      tasks.forEach(task => console.log(`- ${task.title} (${task.category})`));
    }

    console.log('\nDomain fix completed successfully');
  } catch (error) {
    console.error('Error fixing task domains:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
fixTaskDomains(); 