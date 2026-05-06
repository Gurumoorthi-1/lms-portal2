import { io } from 'socket.io-client';

const socket = io('http://localhost:5002', {
  autoConnect: true,
  reconnection: true,
});

export default socket;
