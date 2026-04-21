require('dotenv').config();
const http    = require('http');
const bcrypt  = require('bcrypt');
const { Server } = require('socket.io');
const app     = require('./src/app');
const registerSockets = require('./src/sockets');
const sequelize = require('./src/models/index');
const User       = require('./src/models/User');
require('./src/models/Withdrawal');
require('./src/models/Deposit');

const PORT = process.env.PORT || 4000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST'],
  },
});

registerSockets(io);

const syncOptions = process.env.NODE_ENV === 'production' ? {} : { alter: true };
sequelize.sync(syncOptions).then(async () => {
  const adminExists = await User.findOne({ where: { pseudo: 'admin' } });
  if (!adminExists) {
    const hashed = await bcrypt.hash('Admin#Casino99', 12);
    await User.create({ pseudo: 'admin', password: hashed, balance: 0, isAdmin: true });
    console.log('Compte admin créé (admin / Admin#Casino99)');
  }

  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
