import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Bar, Pie } from 'react-chartjs-2';
import { useNavigate } from 'react-router-dom';
import { getAllStudents } from '../../../redux/studentRelated/studentHandle';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

import { calculateOverallAttendancePercentage, calculateSubjectAttendancePercentage, groupAttendanceBySubject } from '../../../components/attendanceCalculator'; // Adjust path as necessary

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  ArcElement,  
  Title, 
  Tooltip, 
  Legend
);

const Dropout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { studentsList, loading, error } = useSelector((state) => state.student);
  const { currentUser } = useSelector(state => state.user);
  const [predictions, setPredictions] = useState({
    low: 0,
    medium: 0,
    high: 0,
    lowStudents: [],
    mediumStudents: [],
    highStudents: []
  });
  const [riskFactors, setRiskFactors] = useState({});
  const [selectedTimeframe, setSelectedTimeframe] = useState('all');
  
  // Single chart type state
  const [chartType, setChartType] = useState('bar');

  useEffect(() => {
    dispatch(getAllStudents(currentUser._id));
  }, [currentUser._id, dispatch]);

  useEffect(() => {
    if (studentsList && studentsList.length > 0) {
      predictDropout(studentsList);
    }
  }, [studentsList]);

  const predictDropout = async (students) => {
    let low = 0, medium = 0, high = 0;
    const factors = { attendance: 0, academics: 0 };
    const lowStudents = [], mediumStudents = [], highStudents = [];

    console.log('Total students to process:', students.length);

    for (const student of students) {
      if (!student || !student.examResult) {
        console.log('Skipping student due to incomplete data:', student?._id);
        continue;
      }

      // Calculate attendance percentage
      const attendanceData = student.attendance || [];
      const totalSessions = attendanceData.length;
      const presentSessions = attendanceData.filter(att => att.status === "Present").length;
      const overallAttendancePercentage = totalSessions === 0 ? 0 : (presentSessions / totalSessions) * 100;

      console.log(student?._id, overallAttendancePercentage); // Debug log to check attendance calculation

      // Calculate average exam result score
      const averageScore = student.examResult && student.examResult.length > 0
        ? student.examResult.reduce((sum, result) => sum + (result?.marksObtained || 0), 0) / student.examResult.length
        : 0;

      try {
        const response = await fetch('http://127.0.0.1:5000/predict', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            features: [overallAttendancePercentage, averageScore]
          }),
        });

        const data = await response.json();
        const prediction = data.prediction;

        if (prediction === 'low') {
          low++;
          lowStudents.push(student._id);
        } else if (prediction === 'medium') {
          medium++;
          mediumStudents.push(student._id);
          if (overallAttendancePercentage < 50) factors.attendance++;
          if (averageScore < 50) factors.academics++;
        } else if (prediction === 'high') {
          high++;
          highStudents.push(student._id);
          factors.attendance++;
          factors.academics++;
        }

      } catch (error) {
        console.error('Error predicting dropout risk:', error);
      }
    }

    console.log('Final counts:', { low, medium, high });
    console.log('Students in each category:', {
      lowStudents,
      mediumStudents,
      highStudents
    });

    setPredictions({
      low,
      medium,
      high,
      lowStudents,
      mediumStudents,
      highStudents
    });
    setRiskFactors(factors);
  };

  const handleClick = (elements) => {
    if (elements && elements.length > 0) {
      const index = elements[0].index;

      const categories = {
        0: { label: "low", students: predictions.lowStudents || [] },
        1: { label: "medium", students: predictions.mediumStudents || [] },
        2: { label: "high", students: predictions.highStudents || [] }
      };

      const category = categories[index];
      if (category) {
        console.log(`Clicking ${category.label} risk category`);

        const studentData = category.students.map(studentId => {
          const student = studentsList.find(s => s._id === studentId);
          const attendanceScore = student.attendance && student.attendance.length > 0
            ? student.attendance.filter(att => att.status === "Present").length / student.attendance.length * 100
            : 0;
          const averageScore = student.examResult && student.examResult.length > 0
            ? student.examResult.reduce((sum, result) => sum + (result?.marksObtained || 0), 0) / student.examResult.length
            : 0;

          return { studentId, attendanceScore, averageScore };
        });

        // Pass studentData to the next page
        navigate(`/Admin/dropoutstudent/${category.label}`, { state: { studentData } });
      }
    }
  };

  const totalStudents = predictions.low + predictions.medium + predictions.high;

  const riskFactorsData = {
    labels: ['Poor Attendance', 'Low Academics'],
    datasets: [{
      label: 'Contributing Factors',
      data: [
        riskFactors.attendance,
        riskFactors.academics
      ],
      backgroundColor: ['#FF9999', '#99FF99']
    }]
  };

  return (
    <div className="dropout-dashboard">
      <h1>DROPOUT RISK ANALYSIS DASHBOARD</h1>

      <div style={styles.controlPanel}>
        {/* <select
          value={selectedTimeframe}
          onChange={(e) => setSelectedTimeframe(e.target.value)}
          style={styles.select}
        >
          <option value="all">All Time</option>
          <option value="semester">Current Semester</option>
          <option value="month">Last Month</option>
        </select> */}

        <button 
          onClick={() => setChartType(chartType === 'bar' ? 'pie' : 'bar')}
          style={styles.toggleButton}
        >
          Switch to {chartType === 'bar' ? 'Pie' : 'Bar'} Charts
        </button>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      {!loading && !error && (
        <div style={styles.dashboard}>
          <div style={styles.leftPanel}>
            <div style={styles.dropoutChartContainer}>
              <h3>Dropout Risk </h3>
              <div style={styles.chartWrapper}>
                {chartType === 'bar' ? (
                  <Bar
                    data={{
                      labels: ['Low Chances', 'Medium Chances', 'High Chances'],
                      datasets: [
                        {
                          label: 'Dropout Prediction',
                          data: [predictions.low, predictions.medium, predictions.high],
                          backgroundColor: ['#36A2EB', '#FFCE56', '#FF6384'],
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: true,
                      scales: {
                        x: {
                          title: {
                            display: true,
                            text: 'Risk Categories',
                            font: {
                              size: 14,
                              weight: 'bold'
                            }
                          }
                        },
                        y: {
                          title: {
                            display: true,
                            text: 'Number of Students',
                            font: {
                              size: 14,
                              weight: 'bold'
                            }
                          },
                          beginAtZero: true
                        }
                      },
                      plugins: {
                        legend: {
                          display: false
                        },
                        title: {
                          display: true,
                          text: 'Student Dropout Risk Distribution',
                          font: {
                            size: 16,
                            weight: 'bold'
                          }
                        },
                        tooltip: {
                          callbacks: {
                            label: function (tooltipItem) {
                              const category = ['Low', 'Medium', 'High'][tooltipItem.dataIndex];
                              const count = [predictions.low, predictions.medium, predictions.high][tooltipItem.dataIndex];
                              return `${category} Dropout: ${count} students`;
                            },
                          },
                        },
                      },
                      onClick: (event, elements) => handleClick(elements),
                    }}
                  />
                ) : (
                  <Pie
                    data={{
                      labels: ['Low Chances', 'Medium Chances', 'High Chances'],
                      datasets: [
                        {
                          label: 'Dropout Prediction',
                          data: [predictions.low, predictions.medium, predictions.high],
                          backgroundColor: ['#36A2EB', '#FFCE56', '#FF6384'],
                          hoverBackgroundColor: ['#36A2EB', '#FFCE56', '#FF6384']
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: true,
                      plugins: {
                        legend: {
                          display: false
                        },
                        title: {
                          display: true,
                          text: 'Student Dropout Risk Distribution (%)',
                          font: {
                            size: 16,
                            weight: 'bold'
                          }
                        },
                        tooltip: {
                          callbacks: {
                            label: function (tooltipItem) {
                              const category = ['Low', 'Medium', 'High'][tooltipItem.dataIndex];
                              const count = [predictions.low, predictions.medium, predictions.high][tooltipItem.dataIndex];
                              const percentage = ((count / totalStudents) * 100).toFixed(2);
                              return `${category} Dropout: ${count} students (${percentage}%)`;
                            },
                          },
                        },
                      },
                      onClick: (event, elements) => handleClick(elements),
                    }}
                  />
                )}
              </div>
            </div>

            <div style={styles.statsPanel}>
              <h3>Quick Statistics</h3>
              <p>Total Students Analyzed: {totalStudents}</p>
              <p>Total Students at High Risk: {predictions.high}</p>
              <p>Most Common Risk Factor: {
                Object.entries(riskFactors).length > 0
                  ? Object.entries(riskFactors).reduce((a, b) => (a[1] > b[1] ? a : b), ['None', 0])[0]
                  : 'None'
              }</p>
            </div>
          </div>

          <div style={styles.rightPanel}>
            <div style={styles.chartContainer}>
              <h3>Contributing Risk Factors</h3>
              <div style={styles.chartWrapper}>
                {chartType === 'bar' ? (
                  <Bar 
                    data={riskFactorsData} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: true,
                      scales: {
                        x: {
                          title: {
                            display: true,
                            text: 'Risk Factors',
                            font: {
                              size: 14,
                              weight: 'bold'
                            }
                          }
                        },
                        y: {
                          title: {
                            display: true,
                            text: 'Number of Students',
                            font: {
                              size: 14,
                              weight: 'bold'
                            }
                          },
                          beginAtZero: true
                        }
                      },
                      plugins: {
                        legend: {
                          display: false
                        },
                        title: {
                          display: true,
                          text: 'Contributing Factors to Dropout Risk',
                          font: {
                            size: 16,
                            weight: 'bold'
                          }
                        },
                      }
                    }}
                  />
                ) : (
                  <Pie 
                    data={{
                      labels: riskFactorsData.labels,
                      datasets: [{
                        label: 'Contributing Factors',
                        data: riskFactorsData.datasets[0].data,
                        backgroundColor: ['#FF9999', '#99FF99']
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: true,
                      plugins: {
                        legend: {
                          display: false
                        },
                        title: {
                          display: true,
                          text: 'Contributing Factors to Dropout Risk (%)',
                          font: {
                            size: 16,
                            weight: 'bold'
                          }
                        },
                        tooltip: {
                          callbacks: {
                            label: function(tooltipItem) {
                              const total = riskFactorsData.datasets[0].data.reduce((a, b) => a + b, 0);
                              const value = riskFactorsData.datasets[0].data[tooltipItem.dataIndex];
                              const percentage = ((value / total) * 100).toFixed(2);
                              return `${tooltipItem.label}: ${value} students (${percentage}%)`;
                            }
                          }
                        }
                      }
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Update styles to fix chart overflow and improve layout
const styles = {
  dashboard: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr', 
    gap: '20px',
    padding: '20px'
  },
  leftPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  rightPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  controlPanel: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: '10px 0',
    padding: '0 20px'
  },
  dropoutChartContainer: {
    background: '#fff',
    borderRadius: '8px',
    padding: '15px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    height: '400px',
    display: 'flex',
    flexDirection: 'column'
  },
  chartContainer: {
    background: '#fff',
    borderRadius: '8px',
    padding: '15px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    height: '400px',
    display: 'flex',
    flexDirection: 'column'
  },
  chartWrapper: {
    flex: 1,
    position: 'relative',
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden'
  },
  statsPanel: {
    background: '#f8f9fa',
    padding: '20px',
    borderRadius: '8px'
  },
  select: {
    padding: '8px 16px',
    borderRadius: '4px',
    margin: '10px'
  },
  toggleButton: {
    padding: '8px 16px',
    backgroundColor: '#1a237e',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease'
  }
};

export default Dropout;
