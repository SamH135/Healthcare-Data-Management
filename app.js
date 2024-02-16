const express = require('express');
// const firebase = require('firebase/app');
// const firebaseDatabase = require('firebase/database'); 
const http = require('http');
const WebSocket = require('ws');

// Initialize Firebase, Express, etc.
const app = express();

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('A client connected');
  
  ws.on('message', (msg) => {
    console.log(`Received message: ${msg}`);
  });

  ws.send('Hello from the Node.js server, welcome to the network!');
});

server.listen(3000, () => {
  console.log('Server listening on port 3000'); 
});