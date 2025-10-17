
// const mongoose = require('mongoose');
// const env=require('dotenv').config();

// const connectDB=async ()=>{
//     try{

//         await mongoose.connect(process.env.MONGODB_URI)
//         console.log("DB connected")

//     }catch(error){

//         console.log("Db Connection error",error.message);
//         process.exit(1);
//     }
// }

// module.exports = connectDB;



// config/db.js


const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });

    console.log(` MongoDB connected: ${conn.connection.host}`);

    mongoose.connection.on('disconnected', () => {
      console.log(' MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('error', (err) => {
      console.error(' MongoDB connection error:', err.message);
    });

  } catch (error) {
    console.error(' MongoDB connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
