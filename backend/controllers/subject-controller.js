const Subject = require('../models/subjectSchema.js');
const Teacher = require('../models/teacherSchema.js');
const Student = require('../models/studentSchema.js');
const Admin = require('../models/adminSchema.js');
const Sclass = require('../models/sclassSchema.js');

const subjectCreate = async (req, res) => {
    try {
        const subjects = req.body.subjects.map((subject) => ({
            subName: subject.subName,
            subCode: subject.subCode,
            sessions: subject.sessions,
        }));

        const admin = await Admin.findById(req.body.adminID);
        if (!admin) {
            return res.status(404).send({ message: "Admin not found" });
        }

        const sclass = await Sclass.findById(req.body.sclassName);
        if (!sclass) {
            return res.status(404).send({ message: "Class not found" });
        }

        const existingSubject = await Subject.findOne({
            subCode: subjects[0].subCode,
            school: req.body.adminID,
        });

        if (existingSubject) {
            return res.send({ message: 'Sorry this subcode must be unique as it already exists' });
        }

        const newSubjects = subjects.map((subject) => ({
            ...subject,
            sclassName: req.body.sclassName,
            school: req.body.adminID,
        }));

        const mongoResults = await Subject.insertMany(newSubjects);

        res.send(mongoResults);
    } catch (err) {
        console.error('Error creating subjects:', err);
        res.status(500).json({ message: 'Failed to create subjects', error: err.message });
    }
};

const allSubjects = async (req, res) => {
    try {
        const admin = await Admin.findById(req.params.id);
        if (!admin) {
            return res.status(404).send({ message: "Admin not found" });
        }

        const mongoSubjects = await Subject.find({ school: req.params.id })
            .populate("sclassName", "sclassName");

        if (mongoSubjects.length > 0) {
            res.send(mongoSubjects);
        } else {
            res.send({ message: "No subjects found" });
        }
    } catch (err) {
        console.error('Error fetching subjects:', err);
        res.status(500).json({ message: 'Failed to fetch subjects', error: err.message });
    }
};

const classSubjects = async (req, res) => {
    try {
        const sclass = await Sclass.findById(req.params.id);
        if (!sclass) {
            return res.status(404).send({ message: "Class not found" });
        }

        const mongoSubjects = await Subject.find({ sclassName: req.params.id });

        if (mongoSubjects.length > 0) {
            res.send(mongoSubjects);
        } else {
            res.send({ message: "No subjects found" });
        }
    } catch (err) {
        console.error('Error fetching class subjects:', err);
        res.status(500).json({ message: 'Failed to fetch subjects', error: err.message });
    }
};

const freeSubjectList = async (req, res) => {
    try {
        const mongoSubjects = await Subject.find({ 
            sclassName: req.params.id, 
            teacher: { $exists: false } 
        });

        if (mongoSubjects.length > 0) {
            res.send(mongoSubjects);
        } else {
            res.send({ message: "No subjects found" });
        }
    } catch (err) {
        console.error('Error fetching free subjects:', err);
        res.status(500).json({ message: 'Failed to fetch subjects', error: err.message });
    }
};

const getSubjectDetail = async (req, res) => {
    try {
        let subject = await Subject.findById(req.params.id)
            .populate("sclassName", "sclassName")
            .populate("teacher", "name");

        if (!subject) {
            return res.send({ message: "No subject found" });
        }

        res.send(subject);
    } catch (err) {
        console.error('Error fetching subject details:', err);
        res.status(500).json({ message: 'Failed to fetch subject details', error: err.message });
    }
};

const deleteSubject = async (req, res) => {
    try {
        const subjectToDelete = await Subject.findById(req.params.id);
        if (!subjectToDelete) {
            return res.status(404).send({ message: "Subject not found" });
        }

        const deletedSubject = await Subject.findByIdAndDelete(req.params.id);

        await Teacher.updateOne(
            { teachSubject: deletedSubject._id },
            { $unset: { teachSubject: "" } }
        );

        await Student.updateMany(
            {},
            { 
                $pull: { 
                    examResult: { subName: deletedSubject._id },
                    attendance: { subName: deletedSubject._id }
                }
            }
        );

        res.send(deletedSubject);
    } catch (error) {
        console.error('Error deleting subject:', error);
        res.status(500).json({ message: 'Failed to delete subject', error: error.message });
    }
};

const deleteSubjects = async (req, res) => {
    try {
        const admin = await Admin.findById(req.params.id);
        if (!admin) {
            return res.status(404).send({ message: "Admin not found" });
        }

        const deletedSubjects = await Subject.deleteMany({ school: req.params.id });

        await Teacher.updateMany(
            { school: req.params.id },
            { $unset: { teachSubject: "" } }
        );

        await Student.updateMany(
            { school: req.params.id },
            { $set: { examResult: [], attendance: [] } }
        );

        res.send(deletedSubjects);
    } catch (error) {
        console.error('Error deleting subjects:', error);
        res.status(500).json({ message: 'Failed to delete subjects', error: error.message });
    }
};

const deleteSubjectsByClass = async (req, res) => {
    try {
        const sclass = await Sclass.findById(req.params.id);
        if (!sclass) {
            return res.status(404).send({ message: "Class not found" });
        }

        const deletedSubjects = await Subject.deleteMany({ sclassName: req.params.id });

        await Teacher.updateMany(
            { teachSclass: req.params.id },
            { $unset: { teachSubject: "" } }
        );

        await Student.updateMany(
            { sclassName: req.params.id },
            { $set: { examResult: [], attendance: [] } }
        );

        res.send(deletedSubjects);
    } catch (error) {
        console.error('Error deleting subjects by class:', error);
        res.status(500).json({ message: 'Failed to delete subjects', error: error.message });
    }
};

module.exports = {
    subjectCreate,
    allSubjects,
    classSubjects,
    freeSubjectList,
    getSubjectDetail,
    deleteSubject,
    deleteSubjects,
    deleteSubjectsByClass
};
