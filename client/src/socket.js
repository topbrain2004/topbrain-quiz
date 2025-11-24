import io from 'socket.io-client';

// Connect to the server (relative path for production, localhost for dev)
const socket = io(window.location.hostname === 'localhost' ? 'http://localhost:3000' : undefined);

export default socket;
