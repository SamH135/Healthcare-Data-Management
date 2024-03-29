const express = require('express');
const path = require("path");
const http = require('http');
const { WebSocket, WebSocketServer } = require('ws');
const session = require('express-session');
const hbs = require('hbs');
const bodyParser = require('body-parser');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
module.exports = { wss };

app.use(session({
    secret: 'your-secret-key',
    resave: true,
    saveUninitialized: true,
}));

const publicDirectory = path.join(__dirname, './public');
app.use(express.static(publicDirectory));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.set('view engine', 'hbs');
app.use('/js', express.static(__dirname + '/public/js', { 'Content-Type': 'application/javascript' }));

hbs.registerHelper('equal', function (a, b, options) {
    return a === b ? options.fn(this) : options.inverse(this);
});

app.use('/', require('./routes/pages'));
app.use('/auth', require('./routes/auth'));

const authController = require('./controllers/auth')(wss);

wss.on('connection', (ws) => {
    authController.handleWebSocketConnection(ws);
});



const port = 3000;
server.listen(port, () => {
    console.log(`Server is running on port ${port}\n\n`);
});