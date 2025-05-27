import mongoose from 'mongoose';

async function testConnection() {
  try {
    // Using the same format as mongosh
    const mongoUri = 'mongodb://127.0.0.1:27017/admin?authSource=admin';
    console.log('Testing MongoDB connection...');
    
    await mongoose.connect(mongoUri, {
      auth: {
        username: 'admin',
        password: 'password123'
      }
    });
    console.log('✅ MongoDB connected successfully');
    
    // Test a simple operation
    if (mongoose.connection.db) {
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log('Available collections:', collections.map(c => c.name));
    } else {
      console.log('Database connection not available');
    }
    
    await mongoose.connection.close();
    console.log('Connection closed');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
  }
}

testConnection(); 