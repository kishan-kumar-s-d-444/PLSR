const bcrypt = require('bcrypt');
const Student = require('../models/studentSchema.js');
const Subject = require('../models/subjectSchema.js');
const Admin = require('../models/adminSchema.js');
const Sclass = require('../models/sclassSchema.js');

const studentRegister = async (req, res) => {
    try {
        const { name, rollNum, password, adminID, sclassName } = req.body;

        // Validate input
        if (!name || !rollNum || !password || !adminID || !sclassName) {
            return res.status(400).json({ 
                message: 'All fields are required: name, rollNum, password, adminID, sclassName' 
            });
        }

        // Verify admin exists
        const adminExists = await Admin.findById(adminID);
        if (!adminExists) {
            return res.status(404).json({ message: "Admin not found" });
        }

        // Verify class exists
        const classExists = await Sclass.findById(sclassName);
        if (!classExists) {
            return res.status(404).json({ message: "Class not found" });
        }

        // Check for existing student
        const existingStudent = await Student.findOne({
            rollNum,
            school: adminID,
            sclassName
        });

        if (existingStudent) {
            return res.status(400).json({ message: 'Roll Number already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPass = await bcrypt.hash(password, salt);

        // Create new student
        const student = new Student({
            name,
            rollNum,
            password: hashedPass,
            school: adminID,
            sclassName,
            role: 'Student'
        });

        const savedStudent = await student.save();
        
        // Remove sensitive data before sending response
        const response = savedStudent.toObject();
        delete response.password;
        delete response.__v;

        res.status(201).json(response);

    } catch (err) {
        console.error('Student registration error:', err);
        res.status(500).json({
            message: 'Failed to register student',
            error: err.message
        });
    }
};

const studentLogIn = async (req, res) => {
    try {
        const { rollNum, studentName, password } = req.body;

        // Validate input
        if (!rollNum || !studentName || !password) {
            return res.status(400).json({ message: 'Roll number, name and password are required' });
        }

        // Find student and populate related data
        let student = await Student.findOne({ 
            rollNum,
            name: studentName 
        })
        .populate("school", "schoolName")
        .populate("sclassName", "sclassName");

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, student.password);
        if (!validPassword) {
            return res.status(401).json({ message: "Invalid password" });
        }

        // Remove sensitive data before sending response
        const response = student.toObject();
        delete response.password;
        delete response.__v;
        delete response.attendance;
        delete response.examResult;

        res.status(200).json(response);

    } catch (err) {
        console.error('Student login error:', err);
        res.status(500).json({
            message: 'Login failed',
            error: err.message
        });
    }
};

const getStudents = async (req, res) => {
    try {
        const adminId = req.params.id;

        // Get students with populated class info, excluding passwords
        const students = await Student.find({ school: adminId })
            .populate("sclassName", "sclassName")
            .select('-password -__v');

        if (students.length === 0) {
            return res.status(404).json({ message: "No students found" });
        }

        res.status(200).json(students);
    } catch (err) {
        console.error('Error fetching students:', err);
        res.status(500).json({
            message: 'Failed to fetch students',
            error: err.message
        });
    }
};

const getStudentDetail = async (req, res) => {
    try {
        const studentId = req.params.id;

        // Get student with all populated data
        const student = await Student.findById(studentId)
            .populate("school", "schoolName")
            .populate("sclassName", "sclassName")
            .populate("examResult.subName", "subName")
            .populate("attendance.subName", "subName sessions")
            .select('-password -__v');

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        res.status(200).json(student);
    } catch (err) {
        console.error('Error fetching student details:', err);
        res.status(500).json({
            message: 'Failed to fetch student details',
            error: err.message
        });
    }
};

const deleteStudent = async (req, res) => {
    try {
        const studentId = req.params.id;

        const deletedStudent = await Student.findByIdAndDelete(studentId);
        
        if (!deletedStudent) {
            return res.status(404).json({ message: "Student not found" });
        }

        res.status(200).json({ 
            message: "Student deleted successfully",
            deletedStudent
        });
    } catch (error) {
        console.error('Error deleting student:', error);
        res.status(500).json({
            message: 'Failed to delete student',
            error: error.message
        });
    }
};

const deleteStudents = async (req, res) => {
    try {
        const adminId = req.params.id;

        const result = await Student.deleteMany({ school: adminId });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "No students found to delete" });
        }

        res.status(200).json({ 
            message: `${result.deletedCount} students deleted successfully`,
            result
        });
    } catch (error) {
        console.error('Error deleting students:', error);
        res.status(500).json({
            message: 'Failed to delete students',
            error: error.message
        });
    }
};

const deleteStudentsByClass = async (req, res) => {
    try {
        const classId = req.params.id;

        const result = await Student.deleteMany({ sclassName: classId });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "No students found in this class" });
        }

        res.status(200).json({ 
            message: `${result.deletedCount} students deleted successfully`,
            result
        });
    } catch (error) {
        console.error('Error deleting students by class:', error);
        res.status(500).json({
            message: 'Failed to delete students',
            error: error.message
        });
    }
};

const updateStudent = async (req, res) => {
    try {
        const studentId = req.params.id;
        const updateData = { ...req.body };

        // Handle password update
        if (updateData.password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(updateData.password, salt);
        }

        const updatedStudent = await Student.findByIdAndUpdate(
            studentId,
            updateData,
            { new: true, runValidators: true }
        )
        .select('-password -__v');

        if (!updatedStudent) {
            return res.status(404).json({ message: "Student not found" });
        }

        res.status(200).json(updatedStudent);
    } catch (error) {
        console.error('Error updating student:', error);
        res.status(500).json({
            message: 'Failed to update student',
            error: error.message
        });
    }
};

const updateExamResult = async (req, res) => {
    try {
        const studentId = req.params.id;
        const { subName, marksObtained } = req.body;

        // Validate input
        if (!subName || !marksObtained) {
            return res.status(400).json({ 
                message: 'Subject ID and marks obtained are required' 
            });
        }

        // Verify subject exists
        const subjectExists = await Subject.findById(subName);
        if (!subjectExists) {
            return res.status(404).json({ message: "Subject not found" });
        }

        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        // Update or add exam result
        const existingResultIndex = student.examResult.findIndex(
            result => result.subName.toString() === subName
        );

        if (existingResultIndex >= 0) {
            student.examResult[existingResultIndex].marksObtained = marksObtained;
        } else {
            student.examResult.push({ subName, marksObtained });
        }

        const updatedStudent = await student.save();
        
        // Remove sensitive data before response
        const response = updatedStudent.toObject();
        delete response.password;
        delete response.__v;

        res.status(200).json(response);
    } catch (error) {
        console.error('Error updating exam result:', error);
        res.status(500).json({
            message: 'Failed to update exam result',
            error: error.message
        });
    }
};

const studentAttendance = async (req, res) => {
    try {
        const studentId = req.params.id;
        const { subName, status, date } = req.body;

        // Validate input
        if (!subName || !status || !date) {
            return res.status(400).json({ 
                message: 'Subject ID, status and date are required' 
            });
        }

        // Verify subject exists
        const subject = await Subject.findById(subName);
        if (!subject) {
            return res.status(404).json({ message: "Subject not found" });
        }

        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        // Check if attendance already exists for this date and subject
        const attendanceDate = new Date(date);
        const existingAttendanceIndex = student.attendance.findIndex(a => 
            a.subName.toString() === subName && 
            a.date.toDateString() === attendanceDate.toDateString()
        );

        if (existingAttendanceIndex >= 0) {
            // Update existing attendance
            student.attendance[existingAttendanceIndex].status = status;
        } else {
            // Check session limit
            const attendedSessions = student.attendance.filter(
                a => a.subName.toString() === subName
            ).length;

            if (attendedSessions >= subject.sessions) {
                return res.status(400).json({ 
                    message: 'Maximum attendance sessions reached for this subject' 
                });
            }

            // Add new attendance
            student.attendance.push({ 
                date: attendanceDate, 
                status, 
                subName 
            });
        }

        const updatedStudent = await student.save();
        
        // Remove sensitive data before response
        const response = updatedStudent.toObject();
        delete response.password;
        delete response.__v;

        res.status(200).json(response);
    } catch (error) {
        console.error('Error updating attendance:', error);
        res.status(500).json({
            message: 'Failed to update attendance',
            error: error.message
        });
    }
};

const clearAllStudentsAttendanceBySubject = async (req, res) => {
    try {
        const subjectId = req.params.id;

        // Verify subject exists
        const subjectExists = await Subject.findById(subjectId);
        if (!subjectExists) {
            return res.status(404).json({ message: "Subject not found" });
        }

        // Remove attendance records for this subject from all students
        const result = await Student.updateMany(
            { 'attendance.subName': subjectId },
            { $pull: { attendance: { subName: subjectId } } }
        );

        res.status(200).json({
            message: `Cleared attendance for subject ${subjectId}`,
            result
        });
    } catch (error) {
        console.error('Error clearing attendance by subject:', error);
        res.status(500).json({
            message: 'Failed to clear attendance',
            error: error.message
        });
    }
};

const clearAllStudentsAttendance = async (req, res) => {
    try {
        const adminId = req.params.id;

        // Clear attendance for all students of this school
        const result = await Student.updateMany(
            { school: adminId },
            { $set: { attendance: [] } }
        );

        res.status(200).json({
            message: `Cleared attendance for all students in school ${adminId}`,
            result
        });
    } catch (error) {
        console.error('Error clearing all attendance:', error);
        res.status(500).json({
            message: 'Failed to clear attendance',
            error: error.message
        });
    }
};

const removeStudentAttendanceBySubject = async (req, res) => {
    try {
        const studentId = req.params.id;
        const subjectId = req.body.subId;

        // Verify subject exists
        const subjectExists = await Subject.findById(subjectId);
        if (!subjectExists) {
            return res.status(404).json({ message: "Subject not found" });
        }

        // Remove attendance records for this subject from the student
        const result = await Student.updateOne(
            { _id: studentId },
            { $pull: { attendance: { subName: subjectId } } }
        );

        if (result.nModified === 0) {
            return res.status(404).json({ 
                message: "No attendance records found for this subject" 
            });
        }

        res.status(200).json({
            message: `Removed attendance for subject ${subjectId}`,
            result
        });
    } catch (error) {
        console.error('Error removing attendance by subject:', error);
        res.status(500).json({
            message: 'Failed to remove attendance',
            error: error.message
        });
    }
};

const removeStudentAttendance = async (req, res) => {
    try {
        const studentId = req.params.id;

        // Clear all attendance for this student
        const result = await Student.updateOne(
            { _id: studentId },
            { $set: { attendance: [] } }
        );

        res.status(200).json({
            message: "Cleared all attendance records",
            result
        });
    } catch (error) {
        console.error('Error removing attendance:', error);
        res.status(500).json({
            message: 'Failed to remove attendance',
            error: error.message
        });
    }
};

module.exports = {
    studentRegister,
    studentLogIn,
    getStudents,
    getStudentDetail,
    deleteStudents,
    deleteStudent,
    updateStudent,
    studentAttendance,
    deleteStudentsByClass,
    updateExamResult,
    clearAllStudentsAttendanceBySubject,
    clearAllStudentsAttendance,
    removeStudentAttendanceBySubject,
    removeStudentAttendance,
};