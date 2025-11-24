import React, { useState, useEffect } from 'react';
import socket from '../socket';

function TeacherDashboard() {
    const [gameState, setGameState] = useState(null);
    const [students, setStudents] = useState([]);
    const [stats, setStats] = useState(null);

    // Setup Form State
    const [timer, setTimer] = useState(30);
    const [qType, setQType] = useState('choice');
    const [feedback, setFeedback] = useState({
        correct: "축하합니다!",
        wrong: "아쉽게도 틀렸네요 다음문제에 도전하세요"
    });
    const [correctAnswer, setCorrectAnswer] = useState('');

    useEffect(() => {
        const onConnect = () => {
            socket.emit('requestState');
        };

        socket.on('connect', onConnect);
        socket.on('gameState', setGameState);
        socket.on('studentList', setStudents);
        socket.on('statsReveal', setStats);
        socket.on('answerSubmitted', () => {
            // Optional: Trigger a sound or visual flash
        });

        // Request initial state if already connected
        if (socket.connected) {
            socket.emit('requestState');
        }

        return () => {
            socket.off('connect', onConnect);
            socket.off('gameState');
            socket.off('studentList');
            socket.off('statsReveal');
            socket.off('answerSubmitted');
        };
    }, []);

    const startQuestion = () => {
        socket.emit('updateFeedback', feedback);
        socket.emit('startQuestion', { type: qType, timer: parseInt(timer) });
        setStats(null); // Reset stats
        setCorrectAnswer(''); // Reset local answer input
    };

    const revealStats = () => {
        socket.emit('revealStats');
    };

    const revealAnswer = () => {
        if (!correctAnswer) return alert("정답을 입력해주세요!");
        socket.emit('revealAnswer', correctAnswer);
    };

    const resetGame = () => {
        if (confirm("정말 초기화 하시겠습니까?")) {
            socket.emit('resetGame');
        }
    }

    const [showFinalResults, setShowFinalResults] = useState(false);

    if (!gameState) return <div className="loader">Loading...</div>;

    const submittedCount = students.filter(s => s.currentAnswer).length;

    const downloadCSV = () => {
        const headers = ["순위,이름,학교/학년,점수,총문제수"];
        const sortedStudents = [...students].sort((a, b) => b.score - a.score);

        const rows = sortedStudents.map((s, index) => {
            return `${index + 1},${s.name},${s.school} ${s.grade},${s.score},${gameState.totalQuestions}`;
        });

        const csvContent = "\uFEFF" + [headers, ...rows].join("\n"); // Add BOM for Korean support
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `퀴즈결과_${new Date().toLocaleDateString()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Final Results View
    if (showFinalResults) {
        const sortedStudents = [...students].sort((a, b) => b.score - a.score);
        return (
            <div className="dashboard-container">
                <header className="card mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1>🏆 최종 결과 발표 🏆</h1>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={downloadCSV} style={{ background: '#22c55e' }}>📥 결과 저장 (엑셀)</button>
                        <button onClick={() => setShowFinalResults(false)}>돌아가기</button>
                    </div>
                </header>
                <div className="card">
                    <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #333' }}>
                                <th style={{ padding: '10px' }}>순위</th>
                                <th style={{ padding: '10px' }}>이름</th>
                                <th style={{ padding: '10px' }}>학교/학년</th>
                                <th style={{ padding: '10px' }}>점수</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedStudents.map((s, index) => (
                                <tr key={s.id} style={{ borderBottom: '1px solid #444' }}>
                                    <td style={{ padding: '10px' }}>{index + 1}위</td>
                                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{s.name}</td>
                                    <td style={{ padding: '10px' }}>{s.school} {s.grade}</td>
                                    <td style={{ padding: '10px', color: 'var(--primary-color)' }}>{s.score}점</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <header className="card mb-4">
                <h1>Teacher Dashboard</h1>
                <div className="status-bar">
                    <span>Status: <strong>{gameState.status}</strong></span>
                    <span>Students: <strong>{students.length}명</strong></span>
                    <span>Submitted: <strong>{submittedCount}명</strong></span>
                </div>
                <button onClick={() => { setShowFinalResults(true); socket.emit('endGame'); }} style={{ marginLeft: 'auto', background: '#8b5cf6' }}>
                    🏆 최종 결과 보기
                </button>
            </header>

            {/* Student Invite Section */}
            <div className="card mb-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid var(--primary-color)' }}>
                <div>
                    <h3>📢 학생 초대 링크</h3>
                    <p style={{ margin: 0, opacity: 0.8 }}>학생들에게 아래 주소를 보내주세요.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                        readOnly
                        value={`${window.location.origin}?role=student`}
                        style={{ width: '300px', cursor: 'pointer' }}
                        onClick={(e) => e.target.select()}
                    />
                    <button onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}?role=student`);
                        alert("주소가 복사되었습니다!");
                    }}>🔗 주소 복사</button>
                </div>
            </div>

            <div className="grid-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

                {/* Left Column: Controls */}
                <div className="controls-section card">
                    <h2>Game Controls</h2>

                    {gameState.status === 'waiting' || gameState.status === 'result_answer' ? (
                        <div className="setup-form">
                            <div className="form-group">
                                <label>Question Type:</label>
                                <select value={qType} onChange={e => setQType(e.target.value)}>
                                    <option value="choice">Multiple Choice (1-5)</option>
                                    <option value="text">Short Answer</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Timer (sec):</label>
                                <input type="number" value={timer} onChange={e => setTimer(e.target.value)} />
                            </div>

                            <div className="form-group">
                                <label>Correct Msg:</label>
                                <input value={feedback.correct} onChange={e => setFeedback({ ...feedback, correct: e.target.value })} />
                            </div>

                            <div className="form-group">
                                <label>Wrong Msg:</label>
                                <input value={feedback.wrong} onChange={e => setFeedback({ ...feedback, wrong: e.target.value })} />
                            </div>

                            <button onClick={startQuestion} className="w-100">Start Question</button>
                        </div>
                    ) : (
                        <div className="active-controls">
                            {gameState.status === 'answering' && (
                                <button onClick={() => socket.emit('stopTimer')} className="secondary">Stop Timer Early</button>
                            )}

                            {(gameState.status === 'locked' || gameState.status === 'answering') && (
                                <button onClick={revealStats}>Step 1: Reveal Stats</button>
                            )}

                            {(gameState.status === 'result_stats' || gameState.status === 'locked') && (
                                <div className="reveal-section">
                                    <input
                                        placeholder="Enter Correct Answer"
                                        value={correctAnswer}
                                        onChange={e => setCorrectAnswer(e.target.value)}
                                    />
                                    <button onClick={revealAnswer}>Step 2: Reveal Answer</button>
                                </div>
                            )}
                        </div>
                    )}

                    <hr />
                    <button onClick={resetGame} className="secondary" style={{ backgroundColor: '#ef4444' }}>Reset Game</button>
                </div>

                {/* Right Column: Live View */}
                <div className="live-view card">
                    <h2>Live Status</h2>

                    {/* Stats View */}
                    {gameState.status === 'result_stats' && stats && (
                        <div className="stats-chart">
                            <h3>Answer Distribution</h3>
                            <div className="stats-grid">
                                {Object.entries(stats).map(([ans, count]) => (
                                    <div key={ans} className="stat-item" style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <div className="stat-label" style={{ width: '50px', fontWeight: 'bold' }}>{ans}{gameState.questionType === 'choice' ? '번' : ''}</div>
                                        <div className="stat-bar-container" style={{ flex: 1, background: 'rgba(255,255,255,0.1)', height: '20px', borderRadius: '10px', margin: '0 10px', overflow: 'hidden' }}>
                                            <div
                                                className="stat-bar"
                                                style={{ width: `${(count / students.length) * 100}%`, background: 'var(--primary-color)', height: '100%' }}
                                            ></div>
                                        </div>
                                        <div className="stat-count" style={{ width: '40px', textAlign: 'right' }}>{count}명</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Leaderboard / Student List */}
                    <div className="student-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        <h3>Student List</h3>
                        <table style={{ width: '100%', textAlign: 'left' }}>
                            <thead>
                                <tr>
                                    <th>번호</th>
                                    <th>이름</th>
                                    <th>학교/학년</th>
                                    <th>점수</th>
                                    <th>상태</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.sort((a, b) => b.score - a.score).map((s, index) => (
                                    <tr key={s.id} style={{ background: s.currentAnswer === gameState.correctAnswer && gameState.status === 'result_answer' ? 'rgba(34, 197, 94, 0.2)' : 'transparent' }}>
                                        <td>{index + 1}</td>
                                        <td>{s.name}</td>
                                        <td>{s.school} / {s.grade}</td>
                                        <td>{s.score} / {gameState.totalQuestions}</td>
                                        <td>
                                            {gameState.status === 'result_answer' ? (
                                                s.currentAnswer === gameState.correctAnswer ? '✅' : `❌ (${s.currentAnswer || '-'})`
                                            ) : (
                                                s.currentAnswer ? 'Submitted' : '...'
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default TeacherDashboard;
