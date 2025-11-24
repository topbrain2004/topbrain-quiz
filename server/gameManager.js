class GameManager {
    constructor(io) {
        this.io = io;
        this.students = new Map(); // socketId -> { id, name, school, grade, score, currentAnswer }
        this.gameState = {
            status: 'waiting', // waiting, answering, locked, result_stats, result_answer
            questionType: 'choice', // choice, text
            timer: 0,
            startTime: 0,
            totalQuestions: 0,
            feedback: {
                correct: "축하합니다!",
                wrong: "아쉽게도 틀렸네요 다음문제에 도전하세요"
            },
            correctAnswer: null
        };
        this.timerInterval = null;
    }

    // Student joins
    joinStudent(socketId, studentData) {
        this.students.set(socketId, {
            ...studentData,
            id: socketId,
            score: 0,
            currentAnswer: null
        });
        this.broadcastStudentList();
    }

    // Student disconnects
    removeStudent(socketId) {
        this.students.delete(socketId);
        this.broadcastStudentList();
    }

    // Teacher starts a question
    startQuestion(settings) {
        this.gameState.status = 'answering';
        this.gameState.questionType = settings.type;
        this.gameState.timer = settings.timer;
        this.gameState.correctAnswer = null; // Reset answer
        this.gameState.totalQuestions += 1;

        // Reset student answers for this round
        for (const student of this.students.values()) {
            student.currentAnswer = null;
        }

        this.io.emit('gameState', this.gameState);
        this.startTimer(settings.timer);
    }

    startTimer(seconds) {
        if (this.timerInterval) clearInterval(this.timerInterval);

        let timeLeft = seconds;
        this.timerInterval = setInterval(() => {
            timeLeft--;
            this.io.emit('timerUpdate', timeLeft);

            if (timeLeft <= 0) {
                this.stopTimer();
                this.lockAnswers();
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    lockAnswers() {
        this.gameState.status = 'locked';
        this.io.emit('gameState', this.gameState);
    }

    // Student submits answer
    submitAnswer(socketId, answer) {
        if (this.gameState.status !== 'answering') return;

        const student = this.students.get(socketId);
        if (student) {
            student.currentAnswer = answer;
            this.io.emit('answerSubmitted', { socketId }); // Notify teacher only (optimization)
        }
    }

    // Teacher sets feedback messages
    setFeedback(correctMsg, wrongMsg) {
        this.gameState.feedback.correct = correctMsg;
        this.gameState.feedback.wrong = wrongMsg;
    }

    // Stage 1: Reveal Stats (Distribution)
    revealStats() {
        this.gameState.status = 'result_stats';
        this.stopTimer();

        // Calculate stats
        const stats = {};
        for (const student of this.students.values()) {
            const ans = student.currentAnswer || 'No Answer';
            stats[ans] = (stats[ans] || 0) + 1;
        }

        this.io.emit('gameState', this.gameState);
        this.io.emit('statsReveal', stats);
    }

    // Stage 2: Reveal Answer & Names
    revealAnswer(correctAnswer) {
        this.gameState.status = 'result_answer';
        this.gameState.correctAnswer = correctAnswer;

        // Update scores
        for (const student of this.students.values()) {
            if (student.currentAnswer === correctAnswer) {
                student.score += 1;
            }
        }

        this.io.emit('gameState', this.gameState);
        this.broadcastStudentList(); // Update scores on clients
    }

    broadcastStudentList() {
        // Convert Map to Array for sending
        const studentList = Array.from(this.students.values());
        this.io.emit('studentList', studentList);
    }

    resetGame() {
        this.gameState.status = 'waiting';
        this.gameState.correctAnswer = null;
        this.gameState.totalQuestions = 0;
        this.io.emit('gameState', this.gameState);
        this.broadcastStudentList();
    }

    endGame() {
        this.gameState.status = 'ended';
        this.io.emit('gameState', this.gameState);
    }
}

module.exports = GameManager;
