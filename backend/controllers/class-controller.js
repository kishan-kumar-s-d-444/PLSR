const Sclass = require('../models/sclassSchema.js');
const Student = require('../models/studentSchema.js');
const Subject = require('../models/subjectSchema.js');
const Teacher = require('../models/teacherSchema.js');
const Admin = require('../models/adminSchema.js');

const sclassCreate = async (req, res) => {
    try {
        const { sclassName, adminID } = req.body;

        // Validate input
        if (!sclassName || !adminID) {
            return res.status(400).send({ message: 'Class name and admin ID are required' });
        }

        // Check if class exists
        const existingSclass = await Sclass.findOne({
            sclassName: sclassName,
            school: adminID
        });

        if (existingSclass) {
            return res.status(400).send({ message: 'Class name already exists' });
        }

        // Verify admin exists
        const adminExists = await Admin.findById(adminID);
        if (!adminExists) {
            return res.status(404).send({ message: 'Admin not found' });
        }

        // Create new class
        const sclass = new Sclass({
            sclassName: sclassName,
            school: adminID
        });
        
        const savedClass = await sclass.save();
        res.status(201).send(savedClass);

    } catch (err) {
        console.error('Server Error:', err);
        res.status(500).send({
            message: 'Internal Server Error',
            error: err.message
        });
    }
};

const sclassList = async (req, res) => {
    try {
        const adminID = req.params.id;
        const classes = await Sclass.find({ school: adminID });

        if (classes.length > 0) {
            res.send(classes);
        } else {
            res.send({ message: "No classes found" });
        }
    } catch (err) {
        console.error('Error fetching classes:', err);
        res.status(500).json(err);
    }
};

const deleteSclass = async (req, res) => {
    try {
        const classId = req.params.id;

        // Delete class and related data
        const deletedClass = await Sclass.findByIdAndDelete(classId);
        if (!deletedClass) {
            return res.status(404).send({ message: "Class not found" });
        }

        // Delete related data
        await Promise.all([
            Student.deleteMany({ sclassName: classId }),
            Subject.deleteMany({ sclassName: classId }),
            Teacher.deleteMany({ teachSclass: classId })
        ]);

        res.send(deletedClass);
    } catch (error) {
        console.error('Error deleting class:', error);
        res.status(500).json({
            message: 'Failed to delete class',
            error: error.message
        });
    }
};

const deleteSclasses = async (req, res) => {
    try {
        const adminId = req.params.id;
        const result = await Sclass.deleteMany({ school: adminId });

        if (result.deletedCount === 0) {
            return res.send({ message: "No classes found to delete" });
        }

        // Delete related data
        await Promise.all([
            Student.deleteMany({ school: adminId }),
            Subject.deleteMany({ school: adminId }),
            Teacher.deleteMany({ school: adminId })
        ]);

        res.send(result);
    } catch (error) {
        console.error('Error deleting classes:', error);
        res.status(500).json(error);
    }
};

const getSclassDetail = async (req, res) => {
    try {
        const sclass = await Sclass.findById(req.params.id)
            .populate("school", "schoolName");

        if (!sclass) {
            return res.status(404).send({ message: "Class not found" });
        }

        res.send(sclass);
    } catch (err) {
        console.error('Error fetching class details:', err);
        res.status(500).json(err);
    }
};

const getSclassStudents = async (req, res) => {
    try {
        const students = await Student.find({ sclassName: req.params.id })
            .select('-password'); // Exclude password field

        if (students.length > 0) {
            res.send(students);
        } else {
            res.send({ message: "No students found" });
        }
    } catch (err) {
        console.error('Error fetching students:', err);
        res.status(500).json(err);
    }
};

const getClassTeachers = async (req, res) => {
    try {
        const classId = req.params.id;
        const teachers = await Teacher.find({ teachSclass: classId })
            .populate('teachSubject', 'subName subCode')
            .select('-password');

        if (teachers.length > 0) {
            res.send(teachers);
        } else {
            res.status(404).send({ message: "No teachers found for this class" });
        }
    } catch (err) {
        console.error('Error fetching class teachers:', err);
        res.status(500).json({
            message: 'Failed to fetch teachers',
            error: err.message
        });
    }
};

module.exports = { 
    sclassCreate, 
    sclassList, 
    deleteSclass, 
    deleteSclasses, 
    getSclassDetail, 
    getSclassStudents,
    getClassTeachers 
};