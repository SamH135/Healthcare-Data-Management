const express = require('express');
const http = require('http');
const { WebSocket } = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });


wss.on('connection', (ws) => {

  // Send welcome message
  ws.send('Message from the server: Welcome to the network!');

  // Receive a message from client-side and broadcast it back to all clients
  ws.on('message', (msg) => {
    console.log(`Received: ${msg}`);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  });

  // Handle disconnection
  ws.on('close', () => {
    console.log('Client disconnected');
  }); 

});


server.listen(3000, () => {
  console.log('Server listening on port 3000');
});
