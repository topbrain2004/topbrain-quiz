import React, { useState, useEffect } from 'react';
import socket from '../socket';

function StudentClient() {
    const [gameState, setGameState] = useState(null);
    const [studentInfo, setStudentInfo] = useState(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [myAnswer, setMyAnswer] = useState(null);
    const [tempAnswer, setTempAnswer] = useState('');
    const [isJoined, setIsJoined] = useState(false);
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [myScore, setMyScore] = useState(0);
    const [stats, setStats] = useState(null);

    // Form State
    const [schoolNameInput, setSchoolNameInput] = useState('');
    const [schoolType, setSchoolType] = useState('elementary'); // elementary, middle, high
    const [grade, setGrade] = useState('1');
    const [name, setName] = useState('');

    useEffect(() => {
        function onConnect() {
            setIsConnected(true);
            socket.emit('requestState');
        }

        function onDisconnect() {
            setIsConnected(false);
        }

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        socket.on('gameState', (state) => {
            console.log("Received Game State:", state);
            setGameState(state);

            // Reset answer when a new question starts (status becomes 'answering')
            if (state.status === 'answering') {
                setMyAnswer(null);
                setTempAnswer('');
            }

            if (state.status === 'waiting') {
                setMyAnswer(null);
                setTempAnswer('');
            }
        });

        socket.on('studentList', (list) => {
            const me = list.find(s => s.id === socket.id);
            if (me) {
                setMyScore(me.score);
            }
        });

        socket.on('statsReveal', (data) => {
            setStats(data);
        });

        socket.on('timerUpdate', setTimeLeft);

        // Request initial state if already connected
        if (socket.connected) {
            onConnect();
        }

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('gameState');
            socket.off('studentList');
            socket.off('statsReveal');
            socket.off('timerUpdate');
        };
    }, []);

    const joinGame = () => {
        if (!schoolNameInput || !name) return alert("학교 이름과 본인 이름을 모두 입력해주세요.");

        let typeSuffix = "";
        if (schoolType === 'elementary') typeSuffix = "초등학교";
        else if (schoolType === 'middle') typeSuffix = "중학교";
        else if (schoolType === 'high') typeSuffix = "고등학교";

        const fullSchoolName = `${schoolNameInput}${typeSuffix}`;
        const info = { school: fullSchoolName, grade: `${grade}학년`, name };
        setStudentInfo(info);
        socket.emit('join', info);
        setIsJoined(true);
    };

    const submitAnswer = (ans) => {
        setMyAnswer(ans);
        socket.emit('submitAnswer', ans);
    };

    const retryConnection = () => {
        socket.connect();
        socket.emit('requestState');
    };

    const closeWindow = () => {
        try {
            window.open('', '_self', '');
            window.close();
        } catch (e) { }

        // Fallback if window.close() is blocked
        setTimeout(() => {
            alert("브라우저 보안 설정으로 인해 창이 자동으로 닫히지 않을 수 있습니다.\n직접 창을 닫아주세요.");
            window.location.href = "about:blank"; // Optional: Redirect to blank page
        }, 500);
    };

    if (!isJoined) {
        return (
            <div className="card animate-fade-in">
                <h1>퀴즈 참가</h1>
                {!isConnected && <div className="error-banner">서버 연결 끊김. 재연결 중...</div>}
                <div className="form-group">
                    <label>학교 정보</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input
                            placeholder="학교명 (예: 서울)"
                            value={schoolNameInput}
                            onChange={e => setSchoolNameInput(e.target.value)}
                            style={{ flex: 1 }}
                        />
                        <select value={schoolType} onChange={e => { setSchoolType(e.target.value); setGrade('1'); }} style={{ width: '120px' }}>
                            <option value="elementary">초등학교</option>
                            <option value="middle">중학교</option>
                            <option value="high">고등학교</option>
                        </select>
                    </div>

                    <label>학년 선택</label>
                    <select value={grade} onChange={e => setGrade(e.target.value)}>
                        {[...Array(schoolType === 'elementary' ? 6 : 3)].map((_, i) => (
                            <option key={i + 1} value={i + 1}>{i + 1}학년</option>
                        ))}
                    </select>

                    <label>이름 입력</label>
                    <input placeholder="이름을 입력하세요" value={name} onChange={e => setName(e.target.value)} />

                    <button onClick={joinGame} className="w-100 mt-4" disabled={!isConnected}>입장하기</button>
                </div>
            </div>
        );
    }

    if (!gameState) {
        return (
            <div className="loader">
                <p>Waiting for server...</p>
                <button onClick={retryConnection} className="secondary mt-4">서버 연결 재시도</button>
            </div>
        );
    }

    // 1. Waiting
    if (gameState.status === 'waiting') {
        return (
            <div className="card animate-fade-in">
                <h2>안녕하세요, {name} 학생!</h2>
                <p>선생님이 문제를 낼 때까지 기다려주세요.</p>
                <div className="loader"></div>
            </div>
        );
    }

    // 2. Answering
    if (gameState.status === 'answering') {
        return (
            <div className="card animate-fade-in">
                <div className="timer">{timeLeft}</div>
                <h2>정답을 입력하세요!</h2>

                {myAnswer ? (
                    <div className="submitted-message">
                        <h3>제출 완료!</h3>
                        <p>내 답: {myAnswer}번</p>
                        <p>다른 친구들을 기다리는 중...</p>
                        <button onClick={() => setMyAnswer(null)} className="secondary mt-4">답 수정하기</button>
                    </div>
                ) : (
                    <div className="input-area">
                        {gameState.questionType === 'choice' ? (
                            <div className="option-grid">
                                {[1, 2, 3, 4, 5].map(num => (
                                    <button key={num} onClick={() => submitAnswer(num.toString())} className="option-btn">
                                        {num}번
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-input-area">
                                <input
                                    value={tempAnswer}
                                    onChange={e => setTempAnswer(e.target.value)}
                                    placeholder="정답을 입력하세요"
                                />
                                <button onClick={() => submitAnswer(tempAnswer)}>제출</button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // 3. Locked / Stats Reveal
    if (gameState.status === 'locked' || gameState.status === 'result_stats') {
        return (
            <div className="card animate-fade-in">
                <h2>정답 공개 대기 중...</h2>
                <p>곧 결과가 발표됩니다!</p>
                {myAnswer && <p>내가 쓴 답: {myAnswer}번</p>}

                {gameState.status === 'result_stats' && stats && (
                    <div className="stats-chart mt-4">
                        <h3>친구들의 선택</h3>
                        <div className="stats-grid">
                            {Object.entries(stats).map(([ans, count]) => (
                                <div key={ans} className="stat-item" style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <div className="stat-label" style={{ width: '50px', fontWeight: 'bold' }}>{ans}{gameState.questionType === 'choice' ? '번' : ''}</div>
                                    <div className="stat-bar-container" style={{ flex: 1, background: 'rgba(255,255,255,0.1)', height: '20px', borderRadius: '10px', margin: '0 10px', overflow: 'hidden' }}>
                                        <div
                                            className="stat-bar"
                                            style={{ width: `${(count / Object.values(stats).reduce((a, b) => a + b, 0)) * 100}%`, background: 'var(--primary-color)', height: '100%' }}
                                        ></div>
                                    </div>
                                    <div className="stat-count" style={{ width: '40px', textAlign: 'right' }}>{count}명</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // 4. Result Reveal
    if (gameState.status === 'result_answer') {
        const isCorrect = myAnswer === gameState.correctAnswer;
        return (
            <div className="card animate-fade-in">
                {isCorrect ? (
                    <div className="result-correct">
                        <h1>🎉</h1>
                        <h2>{name}님 {gameState.feedback.correct}</h2>
                    </div>
                ) : (
                    <div className="result-wrong">
                        <h1>😢</h1>
                        <h2>{name}님 {gameState.feedback.wrong}</h2>
                        <p>정답은 <strong>{gameState.correctAnswer}번</strong> 입니다.</p>
                    </div>
                )}
                <div className="mt-4">
                    <p>다음 문제를 기다려주세요.</p>
                </div>
            </div>
        );
    }

    // 5. Game Ended
    if (gameState.status === 'ended') {
        return (
            <div className="card animate-fade-in" style={{ textAlign: 'center' }}>
                <h1>{name}님 수고하셨습니다!</h1>
                <div className="score-display" style={{ margin: '2rem 0', fontSize: '1.5rem' }}>
                    <p>맞은 문제 수</p>
                    <strong style={{ fontSize: '3rem', color: 'var(--primary-color)' }}>{myScore} / {gameState.totalQuestions}</strong>
                </div>

                {gameState.isClassEnded ? (
                    <button onClick={closeWindow} className="w-100">마침 (나가기)</button>
                ) : (
                    <div className="waiting-message">
                        <p>선생님이 수업을 종료할 때까지 잠시만 기다려주세요.</p>
                        <div className="loader" style={{ margin: '1rem auto' }}></div>
                    </div>
                )}
            </div>
        );
    }

    return <div>Unknown State</div>;
}

export default StudentClient;
