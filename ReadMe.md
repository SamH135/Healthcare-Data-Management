**THE SERVER IS CURRENTLY DEPLOYED ON RENDER.COM**


*Server-Side*

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

*Client-Side*
    Python scripts connect to the server via  websockets using the `websockets` library. 

    Regular users will connect through the web apps front-end via http or https




