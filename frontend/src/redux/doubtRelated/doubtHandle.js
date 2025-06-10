import axios from 'axios';
import { 
    createDoubt, 
    fetchDoubts, 
    fetchConversation 
} from './doubtSlice';

const BASE_URL = "http://localhost:5000";

export const sendDoubt = (doubtData) => async (dispatch) => {
    try {
        const response = await axios.post(`${process.env.REACT_APP_BASE_URL}/doubt/add`, doubtData);
        dispatch(createDoubt(response.data));
    } catch (error) {
        console.error('Error sending doubt:', error);
    }
};

export const retrieveDoubts = (userId, userType) => async (dispatch) => {
    try {
        const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/doubt/get`, {
            params: { userId, userType },
        });
        dispatch(fetchDoubts(response.data));
    } catch (error) {
        console.error('Error retrieving doubts:', error);
    }
};

export const retrieveConversation = (senderId, receiverId) => async (dispatch) => {
    try {
        const response = await axios.get(
            `${process.env.REACT_APP_BASE_URL}/doubt/conversation/${senderId}/${receiverId}`
        );
        dispatch(fetchConversation(response.data));
    } catch (error) {
        console.error('Error retrieving conversation:', error);
    }
};

// Optional: Direct API call functions if needed
export const getSubjectTeachers = async (subjectId) => {
    try {
        const response = await axios.get(`/api/subject/${subjectId}/teachers`);
        return response.data;
    } catch (error) {
        console.error('Error fetching subject teachers:', error);
        throw error;
    }
};

export const getStudentsList = async () => {
    try {
        const response = await axios.get('/api/students');
        return response.data;
    } catch (error) {
        console.error('Error fetching students list:', error);
        throw error;
    }
};
