const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    await mongoose.connection.collection('restaurants').deleteMany({});
    console.log('Cleared restaurants collection');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
