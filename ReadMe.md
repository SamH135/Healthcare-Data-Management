**THE SERVER IS CURRENTLY DEPLOYED ON [RENDER.COM](https://healthcare-data-management.onrender.com/)**

*Usage*

    To use the web app, you must connect a `BlockchainNode.py` bot to the server. 
    The code is provided in the "model" directory of this repo.

    To render the data visualizations provided on the web app, you must ensure that...
        1. A bot is connected to the server
        2. The bot has medical data stored in it's blockchain database (pickle file stored on the machine locally where the bot is running)

    NOTE: you can add data to a connected bot through the web app (Add Patient Data menu option) or download the `blockchain.pkl` file 
          so that the bot can search and pull data to the satisfy requests from the server.

*Architecture*

The architecture consists of three main components:

1. Client-side:
Regular users: Interact with the web app built with Node.js, Express, and D3.js via a front-end connection through HTTPS.

Python script nodes: Run independently and use the server to communicate with other nodes via WebSockets.

2. Server-side:
Node.js server: Acts as a relay between users and nodes.
Pulls data from nodes based on user requests.
Processes and visualizes data using D3.js visualizations.
Broadcasts messages between nodes using the ws (WebSocket) javascript framework.


3. Blockchain:
Python script nodes: Each node maintains a copy of the medical data blockchain.
Nodes implement consensus algorithms for data validation and consistency.
Nodes implement smart contracts.
The node encrypts the data with AES-256 before adding it to the blockchain for data security/integrity. 
When the server requests the data, the node decrypts it from the blockchain, processes it, and sends it to the server.
Each node has functions implemented to connect to the server and send/receive messages from the network via WebSockets.



*To Set Up Server-Side On localhost - For Testing*

    Node.js SETUP:

    1. Install node.js from https://nodejs.org/en/. Make sure to install the latest version of LTS (Long Term Support) release line, which currently

    2. Run the following commands in your IDE terminal

            npm init -y

            npm install ws express nodemon https express-handlebars express-session handlebars hbs jsonwebtoken path bootstrap uuid body-parser

            node app.js

                NOTE: you can add the "start" to your scripts file in the package.json to use npm start instead of node app.js:
                    "scripts": {
                    "test": "echo \"Error: no test specified\" && exit 1",
                    "start": "node app.js"
                    },

    3. Copy all the  files from this repository into your local folder in VS Code or a similar IDE.
       (Make sure to keep the file structure)

*Client-Side*

    2 Types of clients: python bots (act like blockchain nodes), regular users (https connections through the front-end)

    Bots are Python scripts that connect to the server via websockets using the `websockets` library. They are used for pulling data from blockchains when a client requests data from the web app. 

    Bot Functionality: 
    
        Message Handling: the message handling functionality includes different types of messages such as transaction data, chain updates, consensus/ voting, and database read/write operations.

        Blockchain Data Structure: Incorporates a basic blockchain structure within the Python node. This includes the ability to add transactions, create blocks, and validate the chain through consensus.

        Consensus Algorithm: the mechanism allows nodes to agree on the current state of the blockchain by checking chain lengths and sending missing data to new bots.

        Smart Contracts: Implement conditional logic that automates certain aspects of the data transactions and rejects transactions that don’t meet the blockchain criteria
            The validate_transaction() function performs the following checks on a given transaction to implement basic smart contract logic:

            - It checks if all the required data fields ("patient_id", "name", "age", "condition") are present in the transaction dictionary. If any field is missing, it prints an error message, and returns False.
            - It verifies the data integrity of the transaction by checking the following conditions:
            - It checks if "patient_id" is a non-empty string. If not, it prints an error message and returns False.
            - It checks if "name" is a non-empty string. If not, it prints an error message and returns False.
            - It checks if "age" is a positive integer. If not, it prints an error message and returns False.
            - It checks if "condition" is a non-empty string. If not, it prints an error message and returns False.
            - It checks if "age" is between 18 and 130 (inclusive). If not, it prints an error message and returns False.
            - If all the checks pass successfully, the function returns True, indicating that the transaction is valid, otherwise, it returns False, and the transaction is rejected and no changes are made to the blockchain.


        Database Operations: the node interacts with its blockchain database by adding new transactions and blocks and searching for specific data to send back to the server.





