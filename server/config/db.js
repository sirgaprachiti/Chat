// const mongoose = require("mongoose");

// const connectDB = async () => {
//   try {
//     await mongoose.connect(
//       "mongodb+srv://sirgaprachiti_db_user:jaidadaji@cluster0.krzypky.mongodb.net/chat?retryWrites=true&w=majority&appName=Cluster0",
//       // "mongodb+srv://sirgaprachiti_db_user:jaidadaji@cluster0.8yw13z7.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
//       {
//         useNewUrlParser: true,
//         useUnifiedTopology: true,
//       }
//     );
//     console.log("✅ MongoDB connected (Atlas)");
//   } catch (err) {
//     console.error("❌ MongoDB connection error:", err.message);
//     process.exit(1); // stop app if DB fails
//   }
// };

// module.exports = connectDB;
require("dotenv").config();
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // await mongoose.connect(
    //   "mongodb+srv://sirgaprachiti_db_user:jaidadaji@cluster0.krzypky.mongodb.net/chat?retryWrites=true&w=majority&appName=Cluster0"
    // );
    
await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected (Atlas)");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1); // stop app if DB fails
  }
};

module.exports = connectDB;

