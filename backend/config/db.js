// Create new file for database connections (MongoDB only)
const mongoose = require('mongoose');
require('dotenv').config();

// Create an object to store the database connection
const db = {};

// MongoDB connection
const connectMongo = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("Connected to MongoDB");
        db.mongodb = mongoose.connection;
    } catch (err) {
        console.error("NOT CONNECTED TO MONGODB:", err.message);
        throw err; // Re-throw the error to handle it in the initializeDBConnections function
    }
};

// Initialize the MongoDB connection
const initializeDBConnections = async () => {
    await connectMongo();
    return db;
};

module.exports = { initializeDBConnections, db };