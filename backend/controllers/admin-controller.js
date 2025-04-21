const bcrypt = require('bcrypt');
const Admin = require('../models/adminSchema.js');
const { db } = require('../config/db'); 

const adminRegister = async (req, res) => {
    try {
        // Log incoming request
        console.log('Registration request received:', {
            ...req.body,
            password: '[REDACTED]' // Don't log passwords
        });

        const { name, email, password, role, schoolName } = req.body;
        
        // Validation with detailed errors
        if (!name) return res.status(400).send({ message: 'Name is required' });
        if (!email) return res.status(400).send({ message: 'Email is required' });
        if (!password) return res.status(400).send({ message: 'Password is required' });
        if (!schoolName) return res.status(400).send({ message: 'School name is required' });

        // Check for existing admin in MongoDB
        const existingAdminByEmail = await Admin.findOne({ email });
        const existingSchool = await Admin.findOne({ schoolName });

        if (existingAdminByEmail) {
            return res.status(400).send({ message: 'Email already exists' });
        } else if (existingSchool) {
            return res.status(400).send({ message: 'School name already exists' });
        }

        // Hash password before saving
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new admin in MongoDB
        const admin = new Admin({
            name,
            email,
            password: hashedPassword,
            role: role || 'Admin',
            schoolName
        });

        const savedAdmin = await admin.save();
        
        // Send response without password
        const response = { ...savedAdmin.toObject() };
        delete response.password;
        res.status(201).send(response);

    } catch (err) {
        console.error('Server Error:', err);
        res.status(500).send({ 
            message: 'Internal Server Error', 
            error: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
};

const adminLogIn = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).send({ message: "Email and password are required" });
        }

        // Check in MongoDB
        const admin = await Admin.findOne({ email });
        
        if (!admin) {
            return res.status(401).send({ message: "Invalid email or password" });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, admin.password);
        if (!validPassword) {
            return res.status(401).send({ message: "Invalid email or password" });
        }

        // Send response without sensitive data
        const response = {
            _id: admin._id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
            schoolName: admin.schoolName
        };

        res.status(200).send(response);

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).send({ 
            message: 'Login failed', 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

const getAdminDetail = async (req, res) => {
    try {
        const { id } = req.params;

        // Get from MongoDB using ID
        const admin = await Admin.findById(id).select('-password'); // Exclude password field
        
        if (!admin) {
            return res.status(404).send({ message: "Admin not found" });
        }

        res.status(200).send(admin);

    } catch (err) {
        console.error('Error fetching admin details:', err);
        res.status(500).send({ 
            message: 'Error fetching admin details', 
            error: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
};

const getAllAdmins = async (req, res) => {
    try {
        // Get all admins from MongoDB, excluding password field
        const admins = await Admin.find({}).select('-password');
        
        if (!admins || admins.length === 0) {
            return res.status(404).send({ message: "No admins found" });
        }

        res.status(200).send(admins);
    } catch (err) {
        console.error('Error fetching all admins:', err);
        res.status(500).send({ 
            message: 'Error fetching all admins', 
            error: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
};

module.exports = { adminRegister, adminLogIn, getAdminDetail, getAllAdmins };