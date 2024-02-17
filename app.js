const express = require('express');
const http = require('http');
const { WebSocket } = require('ws');

const app = express();

// Create HTTP server from Express app
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let connections = [];

wss.on('connection', (ws) => {
    connections.push(ws);

    ws.on('close', () => {
        connections = connections.filter((con) => con !== ws);
    });

    ws.on('message', (msg) => {
        try {
            const message = JSON.parse(msg);
            if (message.type === 'broadcast') {
                connections.forEach((con) => {
                    if (con !== ws) {
                        con.send(JSON.stringify({ message: message.text }));
                    }
                });
            } else {
                console.log('Invalid message type!', msg);
            }
        } catch (error) {
            console.error('Failed to parse JSON message', msg);
        }
    });

    ws.send(JSON.stringify({ message: 'Welcome to the WebSocket server!' }));
});

// Example route for HTTP requests
app.get('/', (req, res) => {
    res.send('Hello from the HTTP server!');
});

// Specify the port using the PORT environment variable provided by Render
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
