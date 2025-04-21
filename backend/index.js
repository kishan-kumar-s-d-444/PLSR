require('dotenv').config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const app = express();
const Routes = require("./routes/route.js");
const PORT = process.env.PORT || 5000;
const { initializeDBConnections, db } = require('./config/db');
app.use(express.json({ limit: '10mb' }));
app.use(cors());

const http = require("http");
const { Server } = require("socket.io");
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:3000", "https://plsr-psi.vercel.app"],
        methods: ["GET", "POST"],
        credentials: true
    },
});


const Doubt = require("./models/doubtSchema");

// Initialize database connections before starting the server
const startServer = async () => {
    try {
        await initializeDBConnections();
        console.log("MongoDB connection initialized.");

        // Set up routes
        app.use("/", Routes);

        // Socket.IO Setup
        io.on("connection", (socket) => {
            console.log("A user connected:", socket.id);

            // Listen for "join_room" event to create a specific room for each user
            socket.on("join_room", (userId) => {
                socket.join(userId);
                console.log(`User ${userId} joined their personal room`);
            });

            // Listen for "send_message" event from clients
            socket.on("send_message", async (data) => {
                console.log("Full message data received:", data);

                try {
                    // Prepare message data with all relevant fields
                    const messageData = {
                        senderId: data.senderId,
                        senderName: data.senderName,
                        text: data.text,
                        senderType: data.senderType,
                        createdAt: new Date()
                    };

                    // Add receiverId or subject based on message type
                    if (data.receiverId) {
                        messageData.receiverId = data.receiverId;
                    }
                    if (data.subject) {
                        messageData.subject = data.subject;
                    }

                    // Add class information for confidentiality
                    if (data.senderClass) {
                        messageData.senderClass = data.senderClass;
                    }
                    if (data.receiverClass) {
                        messageData.receiverClass = data.receiverClass;
                    }

                    // Save message to MongoDB
                    const newDoubt = new Doubt(messageData);
                    const savedDoubt = await newDoubt.save();

                    // Determine rooms to send message to
                    const rooms = new Set();
                    
                    // Always send to sender's room
                    rooms.add(data.senderId);

                    // Add receiver room if exists
                    if (data.receiverId) {
                        rooms.add(data.receiverId);
                    }
                    if (data.subject) {
                        rooms.add(data.subject);
                    }

                    // Broadcast to all relevant rooms, but only once per room
                    const processedRooms = new Set();
                    rooms.forEach(room => {
                        if (!processedRooms.has(room)) {
                            console.log(`Emitting to room: ${room}`);
                            io.to(room).emit("receive_message", savedDoubt);
                            processedRooms.add(room);
                        }
                    });

                } catch (error) {
                    console.error("Error saving message:", error);
                }
            });

            // Handle disconnection
            socket.on("disconnect", () => {
                console.log("A user disconnected:", socket.id);
            });
        });

        // Start server using `server.listen`
        server.listen(PORT, () => {
            console.log(`Server started at port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1); // Exit the process if database connection fails
    }
};

// Start the server
startServer();