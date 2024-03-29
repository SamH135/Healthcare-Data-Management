const express = require('express');
const path = require("path");
const http = require('http');
const { WebSocket, WebSocketServer } = require('ws');
const session = require('express-session');
const hbs = require('hbs');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid'); // For generating unique IDsnp

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Use express-session middleware
app.use(session({
    secret: 'your-secret-key', // Use a strong, unique key for your session
    resave: true,
    saveUninitialized: true,
}));

// Serve static files from the 'public' directory
const publicDirectory = path.join(__dirname, './public');
app.use(express.static(publicDirectory));

// Parse URL-encoded bodies and JSON bodies
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Set up Handlebars as the view engine
app.set('view engine', 'hbs');
app.use('/js', express.static(__dirname + '/public/js', { 'Content-Type': 'application/javascript' }));

// Register Handlebars helper if needed
hbs.registerHelper('equal', function (a, b, options) {
    return a === b ? options.fn(this) : options.inverse(this);
});

// Define routes for the web pages
app.use('/', require('./routes/pages'));
app.use('/auth', require('./routes/auth'));


let leader = null; // Variable to store the current leader


// WebSocket logic
wss.on('connection', (ws) => {

  ws.send('Message from the server: Welcome to the network!');  // Send welcome message

  const connectionId = uuidv4(); // Assign a unique ID to each connection
  ws.id = connectionId; // Attach the ID to the WebSocket object

  const timestamp = new Date().toLocaleString(); // Get current timestamp

  console.log(`[${timestamp}] Client connected: ${connectionId}`);


  // Assign the first connected bot as the leader
  if (!leader) {
    leader = ws;
    ws.send(JSON.stringify({ action: "selectLeader", is_leader: true }));
    console.log(`[${timestamp}] Bot ${ws.id} is now the leader.`);
  } else {
    ws.send(JSON.stringify({ action: "selectLeader", is_leader: false }));
  }


  ws.on('message', (message) => {
      try {
        // try to parse messages from clients as JSON 
        const msg = JSON.parse(message);
        console.log(`[${timestamp}] Received: ${message}`);
  
        // list current connections - used for front-end admin page
        if (msg.action === 'listConnections') {
          const connections = Array.from(wss.clients)
            .filter(client => client.readyState === WebSocket.OPEN)
            .map(client => ({ id: client.id }));
          ws.send(JSON.stringify({ connections: connections }));
        } 

        // close connections
        else if (msg.action === 'closeConnection') {
          const { connId } = msg;
          const clientToClose = Array.from(wss.clients)
            .find(client => client.id === connId);
          if (clientToClose) {
            const closeTimestamp = new Date().toLocaleString(); // Get timestamp for closure
            console.log(`[${closeTimestamp}] Closing connection: ${connId}`);
            clientToClose.close();
          }
        } 

        // add a block of data to the chain of each connected node 
        else if (msg.action === 'addBlock') {
          const blockchainActionMessage = {
            action: "addBlock",
            data: msg.data,
          };
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(blockchainActionMessage));
            }
          });
        } 
        else if (msg.action === 'broadcastTransaction') {
          const transaction = msg.data;
          console.log('Received broadcastTransaction action with data:', transaction);
        
          // Broadcast the transaction to all connected bots except the leader bot
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN && !client.is_leader) {
              console.log('Broadcasting transaction to bot:', client.id);
              client.send(JSON.stringify({ action: "vote", data: transaction }));
            }
          });
        } 

        // nodes vote to come to consensus
        else if (msg.action === 'vote') {
          // Forward the vote to the leader bot
          if (leader && leader.readyState === WebSocket.OPEN) {
            leader.send(JSON.stringify({ action: "vote", vote: msg.vote }));
          }
        }

        // request data from the blockchain nodes
        else if (msg.action === 'requestData') {
          const { query } = msg;
          wss.clients.forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({ action: "requestData", query: query }));
              }
          });
      }

        // recieve requested data from blockchain nodes for front-end visualizations
        else if (msg.action === 'dataResponse') {
          // Send the data response to the client who requested it, only if it comes from the leader bot
          if (ws === leader) {
            ws.send(JSON.stringify({ action: "dataResponse", data: msg.data }));
          }
        }

        // broadcast other JSON messages
        else {
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(message);
            }
          });
        }
      
      // handle non-JSON messages
      } catch (e) {
        console.log(`[${timestamp}] Received a non-JSON message: ${message}`);
      }
  });

  ws.on('close', () => {
    const closeTimestamp = new Date().toLocaleString(); // Get timestamp for closure
    console.log(`[${closeTimestamp}] Client disconnected: ${connectionId}`);

    // If the disconnected bot was the leader, select a new leader
    if (ws === leader) {
      leader = null;
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          leader = client;
          client.send(JSON.stringify({ action: "selectLeader", is_leader: true }));
          console.log(`[${closeTimestamp}] Bot ${client.id} is now the leader.`);
          return;
        }
      });
    }
  });
}); // end of wss.on('connection)


// test the bot voting
app.post('/sendTransaction', (req, res) => {
  const transaction = req.body;
  
  // Broadcast the transaction to all connected bots
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ action: "addBlock", data: transaction }));
    }
  });

  res.sendStatus(200);
});

// test the data requesting functionality
app.post('/requestData', (req, res) => {
  const query = req.body; // Extract query from request body
  console.log("Raw request body:", req.body); // Log the raw request body
  wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ action: "requestData", query: query }));
      }
  });

  console.log("query: ", query);
  // Send a response indicating the request was sent
  res.sendStatus(204); // Use 204 No Content to indicate success without additional content
});













// Function to send data request to the server
function requestData(searchType, searchTerm) {
  const query = {
    search_type: searchType,
    search_term: searchTerm
  };

  fetch('/requestData', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(query)
  })
    .then(response => response.json())
    .then(data => {
      const visualizationContainer = d3.select('#visualization-container');
      visualizationContainer.html(''); // Clear previous visualization

      if (Array.isArray(data)) {
        createPatientDataTable(data);
      } else if (data.age_groups) {
        createConditionByAgeGroupBarPlot(data);
      } else if (data.people_with_condition && data.total_people) {
        createConditionProportionPieChart(data);
      }
    })
    .catch((error) => {
      console.error('Error:', error);
    });
}





















// Start the server
const port = 3000;
server.listen(port, () => {
    console.log(`Server is running on port ${port}\n\n`);
});