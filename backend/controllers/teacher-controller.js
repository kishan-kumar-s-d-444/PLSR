const bcrypt = require('bcrypt');
const Teacher = require('../models/teacherSchema.js');
const Subject = require('../models/subjectSchema.js');
const Admin = require('../models/adminSchema.js');
const Sclass = require('../models/sclassSchema.js');
const jwt = require('jsonwebtoken');

const teacherRegister = async (req, res) => {
    const { name, email, password, role, school, teachSubject, teachSclass } = req.body;
    try {
        if (!name || !email || !password) {
            return res.status(400).send({ message: 'Name, email, and password are required' });
        }

        const admin = await Admin.findById(school);
        if (!admin) {
            return res.status(404).send({ message: "School not found" });
        }

        const existingTeacher = await Teacher.findOne({ email });
        if (existingTeacher) {
            return res.status(400).send({ message: 'Email already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPass = await bcrypt.hash(password, salt);

        if (teachSubject) {
            const subject = await Subject.findById(teachSubject);
            if (!subject) {
                return res.status(404).send({ message: "Subject not found" });
            }
        }

        if (teachSclass) {
            const sclass = await Sclass.findById(teachSclass);
            if (!sclass) {
                return res.status(404).send({ message: "Class not found" });
            }
        }

        const teacher = new Teacher({
            name,
            email,
            password: hashedPass,
            role,
            school,
            teachSubject,
            teachSclass
        });

        const mongoResult = await teacher.save();

        if (teachSubject) {
            await Subject.findByIdAndUpdate(teachSubject, { teacher: teacher._id });
        }

        const response = {
            ...mongoResult.toObject(),
            password: undefined
        };

        res.status(201).send(response);

    } catch (err) {
        console.error('Teacher Registration Error:', err);
        res.status(500).send({ 
            message: 'Internal server error during teacher registration',
            error: err.message 
        });
    }
};

const teacherLogIn = async (req, res) => {
    try {
        let teacher = await Teacher.findOne({ email: req.body.email });
        
        if (!teacher) {
            return res.status(404).send({ message: "Teacher not found" });
        }

        const validated = await bcrypt.compare(req.body.password, teacher.password);
        if (!validated) {
            return res.status(401).send({ message: "Invalid password" });
        }

        teacher = await teacher.populate("teachSubject", "subName sessions");
        teacher = await teacher.populate("school", "schoolName");
        teacher = await teacher.populate("teachSclass", "sclassName");

        const token = jwt.sign(
            { _id: teacher._id },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        const teacherData = teacher.toObject();
        delete teacherData.password;

        res.status(200).json({
            ...teacherData,
            token
        });

    } catch (error) {
        console.error('Teacher login error:', error);
        res.status(500).json({
            message: 'Login failed',
            error: error.message
        });
    }
};

const getTeachers = async (req, res) => {
    try {
        const admin = await Admin.findById(req.params.id);
        if (!admin) {
            return res.status(404).send({ message: "Admin not found" });
        }

        let mongoTeachers = await Teacher.find({ school: req.params.id })
            .populate("teachSubject", "subName")
            .populate("teachSclass", "sclassName");

        const teachers = mongoTeachers.map(teacher => {
            const t = teacher.toObject();
            delete t.password;
            return t;
        });

        res.send(teachers);
    } catch (err) {
        console.error('Error fetching teachers:', err);
        res.status(500).json(err);
    }
};

const getTeacherDetail = async (req, res) => {
    try {
        let teacher = await Teacher.findById(req.params.id)
            .populate("teachSubject", "subName sessions")
            .populate("school", "schoolName")
            .populate("teachSclass", "sclassName");

        if (!teacher) {
            return res.send({ message: "No teacher found" });
        }

        const response = teacher.toObject();
        delete response.password;

        res.send(response);
    } catch (err) {
        console.error('Error fetching teacher details:', err);
        res.status(500).json(err);
    }
};

const updateTeacherSubject = async (req, res) => {
    const { teacherId, teachSubject } = req.body;
    try {
        const updatedTeacher = await Teacher.findByIdAndUpdate(
            teacherId,
            { teachSubject },
            { new: true }
        );

        await Subject.findByIdAndUpdate(teachSubject, { teacher: updatedTeacher._id });

        res.send(updatedTeacher);
    } catch (error) {
        console.error('Error updating teacher subject:', error);
        res.status(500).json(error);
    }
};

const deleteTeacher = async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.params.id);
        if (!teacher) {
            return res.status(404).send({ message: "Teacher not found" });
        }

        const deletedTeacher = await Teacher.findByIdAndDelete(req.params.id);

        await Subject.updateOne(
            { teacher: deletedTeacher._id },
            { $unset: { teacher: 1 } }
        );

        res.send(deletedTeacher);
    } catch (error) {
        console.error('Error deleting teacher:', error);
        res.status(500).json(error);
    }
};

const deleteTeachers = async (req, res) => {
    try {
        const teachersToDelete = await Teacher.find({ school: req.params.id });

        const deletionResult = await Teacher.deleteMany({ school: req.params.id });

        await Subject.updateMany(
            { teacher: { $in: teachersToDelete.map(teacher => teacher._id) } },
            { $unset: { teacher: "" } }
        );

        res.send(deletionResult);
    } catch (error) {
        res.status(500).json(error);
    }
};

const deleteTeachersByClass = async (req, res) => {
    try {
        const teachersToDelete = await Teacher.find({ teachSclass: req.params.id });

        const deletionResult = await Teacher.deleteMany({ teachSclass: req.params.id });

        await Subject.updateMany(
            { teacher: { $in: teachersToDelete.map(teacher => teacher._id) } },
            { $unset: { teacher: "" } }
        );

        res.send(deletionResult);
    } catch (error) {
        res.status(500).json(error);
    }
};

const teacherAttendance = async (req, res) => {
    const { status, date } = req.body;

    try {
        const teacher = await Teacher.findById(req.params.id);
        if (!teacher) {
            return res.send({ message: 'Teacher not found' });
        }

        const existingAttendance = teacher.attendance.find(
            (a) => a.date.toDateString() === new Date(date).toDateString()
        );

        if (existingAttendance) {
            existingAttendance.status = status;
        } else {
            teacher.attendance.push({ date, status });
        }

        const mongoResult = await teacher.save();

        return res.send(mongoResult);
    } catch (error) {
        console.error('Error updating teacher attendance:', error);
        res.status(500).json(error);
    }
};

module.exports = {
    teacherRegister,
    teacherLogIn,
    getTeachers,
    getTeacherDetail,
    updateTeacherSubject,
    deleteTeacher,
    deleteTeachers,
    deleteTeachersByClass,
    teacherAttendance
};
