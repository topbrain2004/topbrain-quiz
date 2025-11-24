const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const GameManager = require('./gameManager');

const path = require('path');

const app = express();
app.use(cors());

// Serve static files from the React client
app.use(express.static(path.join(__dirname, '../client/dist')));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for MVP
        methods: ["GET", "POST"]
    }
});

const gameManager = new GameManager(io);

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Send initial state
    socket.emit('gameState', gameManager.gameState);
    socket.emit('studentList', Array.from(gameManager.students.values()));

    // Student Events
    socket.on('join', (studentData) => {
        gameManager.joinStudent(socket.id, studentData);
    });

    socket.on('submitAnswer', (answer) => {
        gameManager.submitAnswer(socket.id, answer);
    });

    // Teacher Events
    socket.on('startQuestion', (settings) => {
        gameManager.startQuestion(settings);
    });

    socket.on('stopTimer', () => {
        gameManager.stopTimer();
        gameManager.lockAnswers();
    });

    socket.on('revealStats', () => {
        gameManager.revealStats();
    });

    socket.on('revealAnswer', (correctAnswer) => {
        gameManager.revealAnswer(correctAnswer);
    });

    socket.on('updateFeedback', ({ correct, wrong }) => {
        gameManager.setFeedback(correct, wrong);
    });

    socket.on('resetGame', () => {
        gameManager.resetGame();
    });

    socket.on('endGame', () => {
        gameManager.endGame();
    });

    socket.on('endClass', () => {
        gameManager.endClass();
    });

    socket.on('requestState', () => {
        socket.emit('gameState', gameManager.gameState);
        socket.emit('studentList', Array.from(gameManager.students.values()));
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        gameManager.removeStudent(socket.id);
    });
});

// Handle React routing, return all requests to React app
// Handle React routing, return all requests to React app
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
