import dotenv from 'dotenv';
import mongoose from 'mongoose';
dotenv.config();
console.log('Connecting to:', process.env.MONGODB_URI?.slice(0, 50));
try {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  console.log('SUCCESS — readyState:', mongoose.connection.readyState);
  await mongoose.disconnect();
} catch(e) {
  console.error('FAILED:', e.message);
}
import dotenv from 'dotenv';
import mongoose from 'mongoose';
dotenv.config();
console.log('Connecting to:', process.env.MONGODB_URI?.slice(0, 50));
try {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  console.log('SUCCESS — readyState:', mongoose.connection.readyState);
  await mongoose.disconnect();
} catch(e) {
  console.error('FAILED:', e.message);
}
