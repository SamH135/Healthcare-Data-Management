import websockets
import asyncio
import json


async def connect():
    # TESTING
    uri = "ws://localhost:3000"  # to connect to localhost - make sure port number matches Node.js server

    # DEPLOYMENT
    # uri = "wss://example.render.com:8080"  # Use wss:// for secure connections - need to modify server to accept wss

    async with websockets.connect(uri) as websocket:
        await websocket.send(json.dumps({"message": "Hello from Python!"}))
        response = await websocket.recv()
        print(response)


asyncio.run(connect())
