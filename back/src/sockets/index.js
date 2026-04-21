const registerRoulette = require('./roulette');

function registerSockets(io) {
  registerRoulette(io);

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
}

module.exports = registerSockets;
