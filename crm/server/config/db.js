import mongoose from 'mongoose';
import User from '../models/User.js';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
    });
    console.log('MongoDB Connected...');

    // Ensure indexes after connection
    try {
      const indexes = await User.collection.indexes();
      const dropIfExists = async (name) => {
        if (indexes.some((ix) => ix.name === name)) {
          try { await User.collection.dropIndex(name); console.log(`✅ Dropped legacy index: ${name}`); }
          catch (e) { console.warn(`⚠️ Drop index warning (${name}):`, e.message); }
        }
      };
      // Drop legacy single-field uniques (global uniqueness)
      await dropIfExists('employeeCode_1');
      await dropIfExists('email_1');
      await dropIfExists('externalId_1');

      // Recreate indexes as defined in schema (includes partial unique index)
      await User.syncIndexes();
      console.log('✅ User indexes synchronized');
    } catch (idxErr) {
      console.warn('⚠️ Index ensure warning:', idxErr.message);
    }
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

export default connectDB;