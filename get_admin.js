const mongoose = require('mongoose');
require('dotenv').config({path: '.env'});

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const User = require('./models/User');
    const admin = await User.findOne({role: 'admin'});
    console.log(admin ? 'admin email: ' + admin.email : 'No admin found');
    process.exit(0);
}).catch(console.error);
