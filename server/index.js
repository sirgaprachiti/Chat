// const express = require("express");
// const mongoose = require("mongoose");
// const cors = require("cors");
// const authRoutes = require("./routes/auth");
// const chatRoutes = require("./routes/chat");

// const app = express();
// app.use(express.json());
// app.use(cors({ origin: "http://localhost:3000", credentials: true })); // adjust frontend port

// // Routes
// app.use("/api/auth", authRoutes);
// app.use("/api/chat", chatRoutes);

// // MongoDB connection
// mongoose.connect("mongodb://127.0.0.1:27017/chatapp", {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// })
// .then(() => console.log("MongoDB connected"))
// .catch(err => console.error("MongoDB connection error:", err));

// const PORT = 5000;
// app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));


const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");

const authRoutes = require("./routes/auth");
const chatRoutes = require("./routes/chat");
const resetRoutes = require("./routes/reset");

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(cors({ origin: "http://localhost:3000", credentials: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/reset", resetRoutes);

// Socket.io setup
const io = new Server(server, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("message:send", (data) => {
    // Save message to DB...
    io.to(data.receiverId).emit("message:receive", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected", socket.id);
  });
});

// // MongoDB connection
// mongoose.connect("mongodb://127.0.0.1:27017/chatapp", {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// })
// .then(() => console.log("MongoDB connected"))
// .catch(err => console.error(err));
connectDB();

const PORT = 5000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
