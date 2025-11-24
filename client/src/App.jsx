import React, { useEffect, useState } from 'react';
import socket from './socket';
import TeacherDashboard from './components/TeacherDashboard';
import StudentClient from './components/StudentClient';
import './index.css';

function App() {
  const [role, setRole] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get('role');
    if (r === 'teacher') return 'teacher';
    if (r === 'student') return 'student';
    return null; // No role specified
  });
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  const selectRole = (newRole) => {
    if (newRole === 'teacher') {
      const password = prompt("관리자 비밀번호를 입력하세요:");
      if (password !== '1234') {
        alert("비밀번호가 틀렸습니다.");
        return;
      }
    }

    // Update URL without reloading
    const url = new URL(window.location);
    url.searchParams.set('role', newRole);
    window.history.pushState({}, '', url);
    setRole(newRole);
  };

  return (
    <div className="app-container">
      {!role ? (
        <div className="card animate-fade-in">
          <h1>환영합니다!</h1>
          <p>역할을 선택해주세요.</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
            <button onClick={() => selectRole('teacher')} style={{ padding: '2rem', fontSize: '1.2rem' }}>
              👨‍🏫 선생님 (Teacher)
            </button>
            <button onClick={() => selectRole('student')} style={{ padding: '2rem', fontSize: '1.2rem' }}>
              👨‍🎓 학생 (Student)
            </button>
          </div>
        </div>
      ) : (
        role === 'teacher' ? <TeacherDashboard /> : <StudentClient />
      )}
    </div>
  );
}

export default App;
