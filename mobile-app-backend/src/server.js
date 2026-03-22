const app = require('./app');

process.on('exit', (code) => {
  console.log('💀 Process exiting with code:', code);
});

process.on('uncaughtException', (err) => {
  console.error('🔥 Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('⚠️ Unhandled Rejection:', err);
});

const PORT = parseInt(process.env.PORT, 10) || 3000;

const startServer = (port) => {
  const server = app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️ Port ${port} busy, trying ${port + 1}`);
      startServer(port + 1);
    } else {
      console.error('🔥 Server Error:', err);
    }
  });
};

startServer(PORT);
