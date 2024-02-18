import json
import asyncio
import websockets


async def connect():
    # Use the appropriate URI based on your server setup
    uri = "wss://healthcare-data-management.onrender.com"  # Use wss:// for secure connection
    # uri = "ws://localhost:3000"

    try:
        async with websockets.connect(uri) as websocket:
            # Send initial message
            await websocket.send(json.dumps({"message": "Hello!"}))

            # Continuously listen for messages from the server
            while True:
                response = await websocket.recv()
                print(response)

    except websockets.WebSocketException as e:
        print("Connection error!", e)

    except Exception as e:
        print("Unexpected error!", e)

try:
    asyncio.run(connect())
except KeyboardInterrupt:
    print("Program interrupted")
