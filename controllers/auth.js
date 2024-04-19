const { v4: uuidv4 } = require('uuid');
const { WebSocket } = require('ws');

let leader = null;

module.exports = (wss) => {
  return {
    register: (req, res) => {
      res.sendStatus(200);
    },

    handleWebSocketConnection: (ws) => {
      ws.send('Message from the server: Welcome to the network!');

      const connectionId = uuidv4();
      ws.id = connectionId;

      const timestamp = new Date().toLocaleString();

      console.log(`[${timestamp}] Client connected: ${connectionId}`);

      ws.isBot = false; // Initialize isBot property to false

      ws.on('message', (message) => {
        try {
          const msg = JSON.parse(message);
          console.log(`[${timestamp}] Received: ${message}`);

          if (msg.message === 'Hello!') {
            ws.isBot = true; // Set isBot to true if the bot sends the specific message
            if (!leader) {
              leader = ws;
              ws.send(JSON.stringify({ action: "selectLeader", is_leader: true }));
              console.log(`[${timestamp}] Bot ${ws.id} is now the leader.`);
            } else {
              ws.send(JSON.stringify({ action: "selectLeader", is_leader: false }));
            }
            
            // Initiate chain update process when a new bot joins
            requestChainLengths();
            
          }

          else if (msg.action === 'listConnections') {
            const connections = Array.from(wss.clients)
              .filter(client => client.readyState === WebSocket.OPEN)
              .map(client => ({ id: client.id }));
            ws.send(JSON.stringify({ connections: connections }));
          }

          else if (msg.action === 'closeConnection') {
            const { connId } = msg;
            const clientToClose = Array.from(wss.clients)
              .find(client => client.id === connId);
            if (clientToClose) {
              const closeTimestamp = new Date().toLocaleString();
              console.log(`[${closeTimestamp}] Closing connection: ${connId}`);
              clientToClose.close();
            }
          }

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

            wss.clients.forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN && !client.is_leader) {
                console.log('Broadcasting transaction to bot:', client.id);
                client.send(JSON.stringify({ action: "vote", data: transaction }));
              }
            });
          }

          else if (msg.action === 'vote') {
            if (leader && leader.readyState === WebSocket.OPEN) {
              leader.send(JSON.stringify({ action: "vote", vote: msg.vote }));
            }
          }

          else if (msg.action === 'requestData') {
            const { query } = msg;
            wss.clients.forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ action: "requestData", query: query }));
              }
            });
          }

          else if (msg.action === 'dataResponse') {
            if (ws === leader) {
              ws.send(JSON.stringify({ action: "dataResponse", data: msg.data }));
            }
          }

          else if (msg.action === 'chainLengthResponse') {
            ws.chainLength = msg.length;
            checkChainLengths();
          }

          else if (msg.action === 'chainDataResponse') {
            broadcastChainData(msg.data);
          }

          else {
            wss.clients.forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message);
              }
            });
          }

        } catch (e) {
          console.log(`[${timestamp}] Received a non-JSON message: ${message}`);
        }
      });

      ws.on('close', () => {
        const closeTimestamp = new Date().toLocaleString();
        console.log(`[${closeTimestamp}] Client disconnected: ${connectionId}`);

        if (ws === leader) {
          leader = null;
          wss.clients.forEach((client) => {
            if (client.isBot && client.readyState === WebSocket.OPEN) {
              leader = client;
              client.send(JSON.stringify({ action: "selectLeader", is_leader: true }));
              console.log(`[${closeTimestamp}] Bot ${client.id} is now the leader.`);
              return;
            }
          });
        }
      });
    },

    sendTransaction: (req, res) => {
      const transaction = req.body;

      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ action: "addBlock", data: transaction }));
        }
      });

      res.sendStatus(200);
    },

    requestData: (req, res) => {
      const query = req.body;
      const requestId = uuidv4();
      console.log("Raw request body:", req.body);

      let responseSent = false;

      // Attach a one-time listener for each client
      const messageHandlers = new Map();

      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          const messageHandler = (message) => {
            try {
              const msg = JSON.parse(message);
              if (msg.action === 'dataResponse' && msg.requestId === requestId) {
                // Send response back to the HTTP client
                res.status(200).json(msg.data);
                responseSent = true;
                cleanupHandlers(); // Cleanup handlers after sending response
              }
            } catch (e) {
              console.error("Error parsing message:", e);
            }
          };

          // Store the handler reference to remove later
          messageHandlers.set(client, messageHandler);
          client.on('message', messageHandler);
          client.send(JSON.stringify({ action: "requestData", requestId: requestId, query: query }));
        }
      });

      // Set a timeout for the response in case some WebSocket clients do not respond in time
      const responseTimeout = setTimeout(() => {
        if (!responseSent) {
          res.status(504).send('Request timed out');
          cleanupHandlers(); // Cleanup handlers on timeout
        }
      }, 10000); // 10 seconds timeout, adjust as necessary

      // Cleanup listeners to avoid memory leaks
      function cleanupHandlers() {
        clearTimeout(responseTimeout);
        messageHandlers.forEach((handler, client) => {
          client.removeListener('message', handler);
        });
        messageHandlers.clear();
      }
    }, // end of requestData()

    addPatient: (req, res) => {
      const patientData = {
        patient_id: req.body.patient_id,
        name: req.body.name,
        age: parseInt(req.body.age),
        condition: req.body.condition
      };

      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ action: "addBlock", data: patientData }));
        }
      });

      res.redirect('/');
    }, // end of addPatient()

    requestChainLengths: () => {
      wss.clients.forEach((client) => {
        if (client.isBot && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ action: "chainLengthRequest" }));
        }
      });
    },

    checkChainLengths: () => {
      let maxLength = 0;
      let longestChainClient = null;

      wss.clients.forEach((client) => {
        if (client.chainLength && client.chainLength > maxLength) {
          maxLength = client.chainLength;
          longestChainClient = client;
        }
      });

      if (longestChainClient) {
        longestChainClient.send(JSON.stringify({ action: "chainDataRequest" }));
      }
    },

    broadcastChainData: (chainData) => {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ action: "chainDataBroadcast", data: chainData }));
        }
      });
    }
  };
};