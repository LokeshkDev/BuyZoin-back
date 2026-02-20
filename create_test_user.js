const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/buyzoin';

const createUser = async () => {
    try {
        console.log('Connecting to:', MONGO_URI);
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // Check if user exists
        let user = await User.findOne({ email: 'lokesh@buyzoin.com' });

        if (user) {
            console.log('User exists, updating password...');
            user.password = 'lokesh123';
            await user.save();
            console.log('✅ Password updated for: lokesh@buyzoin.com');
        } else {
            user = await User.create({
                name: 'Lokesh Kumar',
                email: 'lokesh@buyzoin.com',
                password: 'lokesh123',
                phone: '9876543210',
                role: 'user'
            });
            console.log('✅ User created: lokesh@buyzoin.com / lokesh123');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error creating user:', error);
        process.exit(1);
    }
};

createUser();
