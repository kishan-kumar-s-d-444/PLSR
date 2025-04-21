const Complain = require('../models/complainSchema.js');

const complainCreate = async (req, res) => {
    try {
        // Input validation
        const { title, description, user, school } = req.body;
        
        if (!title || !description || !user || !school) {
            return res.status(400).json({ 
                message: 'Title, description, user, and school are required' 
            });
        }

        // Create new complain
        const complain = new Complain({
            title,
            description,
            user,
            school,
            status: 'Pending' // Default status
        });

        // Save to database
        const result = await complain.save();
        
        // Send response without internal fields
        const response = result.toObject();
        delete response.__v; // Remove version key
        
        res.status(201).json(response);
    } catch (err) {
        console.error('Error creating complain:', err);
        res.status(500).json({ 
            message: 'Server error while creating complain',
            error: err.message 
        });
    }
};

const complainList = async (req, res) => {
    try {
        const schoolId = req.params.id;
        
        if (!schoolId) {
            return res.status(400).json({ message: 'School ID is required' });
        }

        // Get complains with user name populated, sorted by newest first
        const complains = await Complain.find({ school: schoolId })
            .populate("user", "name email")
            .sort({ createdAt: -1 })
            .lean(); // Return plain JS objects

        if (complains.length > 0) {
            // Remove version key from each complain
            const cleanedComplains = complains.map(complain => {
                const { __v, ...rest } = complain;
                return rest;
            });
            
            res.json(cleanedComplains);
        } else {
            res.status(404).json({ message: "No complaints found" });
        }
    } catch (err) {
        console.error('Error fetching complains:', err);
        res.status(500).json({ 
            message: 'Server error while fetching complains',
            error: err.message 
        });
    }
};

module.exports = { 
    complainCreate, 
    complainList 
};