import json
from json.decoder import JSONDecodeError
from collections import defaultdict
import asyncio
import websockets
import hashlib
import pickle
import signal
import sys
import datetime


class Block:

    def __init__(self, index, data, previous_hash):
        self.index = index
        self.timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self.data = data
        self.previous_hash = previous_hash
        self.hash = self.generate_hash()

    def generate_hash(self):
        block_string = json.dumps(self.__dict__, sort_keys=True)
        return hashlib.sha256(block_string.encode()).hexdigest()


class Blockchain:

    def __init__(self, filename):
        self.filename = filename
        self.chain = self.load_chain()

    # retrieves the chain from a file
    def load_chain(self):
        try:
            with open(self.filename, "rb") as f:
                return pickle.load(f)
        except (FileNotFoundError, EOFError):
            return []

    # saves the current chain to a file
    def save_chain(self):
        with open(self.filename, "wb") as f:
            pickle.dump(self.chain, f)

    # create the first block in the chain
    def create_genesis_block(self):
        genesis = Block(0, "Genesis Block", "0")
        self.chain.append(genesis)
        self.save_chain()

    # add data to the chain
    def add_block(self, data):
        if len(self.chain) == 0:
            # If the blockchain is empty, create a genesis block
            genesis = Block(0, data, "0")
            self.chain.append(genesis)
        else:
            # If the blockchain is not empty, add a new block
            prev = self.chain[-1]
            new = Block(prev.index + 1, data, prev.hash)
            self.chain.append(new)
        self.save_chain()

    def get_chain(self):
        return self.chain

    # search for specific data in the chain
    def search_data(self, search_term):
        results = []
        for block in self.chain:
            for value in block.data.values():
                if search_term in str(value):
                    results.append(block)
                    break
        return results

    # clears the chain for testing
    def clear_chain(self):
        self.chain = []  # Reset the chain to an empty list
        self.save_chain()  # Save the empty chain to the file

    # SEARCH FUNCTIONS FOR FRONT END DATA VISUALIZATIONS...

    # find all data related to a single patient
    def search_patient_data(self, search_term):
        # Convert search_term to lowercase for case-insensitive search
        search_term = search_term.lower()
        patient_data = defaultdict(lambda: {"data": {"condition": set()}})  # Use defaultdict for easy accumulation of data

        for block in self.chain:
            # Convert stored name and patient ID to lowercase for case-insensitive comparison
            name = block.data.get("name", "").lower()
            patient_id = block.data.get("patient_id", "").lower()
            if search_term in (name, patient_id):
                patient_id = block.data.get("patient_id")
                patient_record = patient_data[patient_id]
                patient_record["timestamp"] = block.timestamp  # Keep track of the latest timestamp
                # Update the patient record with the latest data, max() used for age to keep the highest age reported
                patient_record["data"].update({
                    "patient_id": patient_id,
                    "name": block.data.get("name"),
                    "age": max(patient_record["data"].get("age", 0), block.data.get("age"))
                })
                patient_record["data"]["condition"].add(block.data.get("condition"))  # Add condition to a set to avoid duplicates

        consolidated_data = []
        for data in patient_data.values():
            data["data"]["condition"] = ", ".join(data["data"]["condition"])  # Convert set of conditions to a string
            consolidated_data.append(data)

        return consolidated_data

    # get data to make a bar plot for condition by age group
    def search_condition_by_age_group(self, condition):
        # Convert condition to lowercase for case-insensitive comparison
        condition = condition.lower()
        age_groups = {i: 0 for i in range(0, 110, 10)}  # Predefine age groups
        for block in self.chain:
            # Check condition in a case-insensitive manner
            if block.data.get("condition", "").lower() == condition:
                age = block.data.get("age")
                age_group = (age // 10) * 10  # Determine the age group
                age_groups[age_group] += 1  # Increment the count for the age group
        return {"condition": condition, "age_groups": age_groups}

    # get data to generate a pie chart for the proportion of people with a searched condition
    def search_condition_proportion(self, condition):
        # Convert condition to lowercase for case-insensitive comparison
        condition = condition.lower()
        patient_ids = set()  # To track unique patients
        patients_with_condition = set()  # To track unique patients with the specified condition

        for block in self.chain:
            patient_id = block.data.get("patient_id")
            name = block.data.get("name")
            patient_tuple = (patient_id, name)  # Create a tuple of patient ID and name for uniqueness
            patient_ids.add(patient_tuple)
            if block.data.get("condition", "").lower() == condition:
                patients_with_condition.add(patient_tuple)  # Add to set if condition matches

        total_people = len(patient_ids)  # Count of unique patients
        people_with_condition = len(patients_with_condition)  # Count of unique patients with the specified condition
        return {"condition": condition, "people_with_condition": people_with_condition, "total_people": total_people}


class Bot:
    def __init__(self):
        self.is_leader = False
        self.blockchain = Blockchain("blockchain.pkl")

    async def connect(self, uri):
        uri = "ws://localhost:3000"

        try:
            async with websockets.connect(uri) as websocket:
                await websocket.send(json.dumps({"message": "Hello!"}))

                while True:
                    # listen for responses from the server
                    response = await websocket.recv()

                    # Validate JSON response
                    try:
                        data = json.loads(response)
                    except JSONDecodeError:
                        print("Ignoring non-JSON response:", response)
                        continue

                    # the server sent a message
                    if "message" in data:
                        print("message was in data...")
                        print("message: ", response)

                    # the server sent an action
                    if "action" in data:
                        print("action was in data...", data["action"])
                        # Handle different JSON messages (requests to read/write data, vote, send node status, etc.)
                        if data["action"] == "selectLeader":
                            self.is_leader = data["is_leader"]
                            print(f"Bot is leader: {self.is_leader}")

                        elif data["action"] == "addBlock":
                            print("action was addBlock")

                            transaction = data["data"]

                            if self.is_leader:
                                print("this bot is the leader")

                                # If the bot is the leader, initiate the voting process
                                votes = await self.initiate_voting(transaction, websocket, self.is_leader)

                                if self.validate_voting_result(votes):
                                    self.blockchain.add_block(transaction)

                                    await websocket.send(
                                        json.dumps({"action": "consensus", "reached": True, "data": transaction}))
                                    print("consensus was reached")
                                else:
                                    await websocket.send(json.dumps({"action": "consensus", "reached": False}))

                                    print("consensus was NOT reached")

                            else:
                                # If the bot is not the leader, participate in the voting
                                vote = Bot.validate_transaction(transaction)

                                await websocket.send(json.dumps({"action": "vote", "vote": vote}))

                        elif data["action"] == "vote":
                            print("Received vote action")
                            if "data" in data:
                                transaction = data["data"]
                                vote = Bot.validate_transaction(transaction)
                                await websocket.send(json.dumps({"action": "vote", "vote": vote}))
                            else:
                                print("Missing 'data' field in vote action")

                        elif data["action"] == "requestData":
                            requestId = data.get("requestId")
                            requested_data = self.get_requested_data(data["query"], requestId)

                            if requested_data:
                                await websocket.send(json.dumps({"action": "dataResponse", **requested_data}))
                            else:
                                print("No data found for the request.")

                        elif data["action"] == "consensus":
                            if data["reached"]:
                                self.blockchain.add_block(data["data"])

                        else:
                            print("Unknown JSON action:", data["action"])

        except websockets.WebSocketException as e:
            print("WebSocket error:", e)

        except Exception as e:
            print("Unexpected error:", e)

    @staticmethod
    async def initiate_voting(transaction, websocket, is_leader):
        print("reached initiate_voting()")
        # Send the transaction to all connected bots for voting
        votes = []

        # If the bot is the leader, add its own vote
        if bot.is_leader:
            vote = Bot.validate_transaction(transaction)
            votes.append(vote)
            print("Leader bots vote:", vote)

        # Send the vote request to the server
        await websocket.send(json.dumps({"action": "broadcastTransaction", "data": transaction}))
        print("Sent broadcastTransaction to the server with data:", transaction)

        # Collect votes from other bots (if any)
        timeout = 5  # Set a timeout for waiting for votes (in seconds)
        start_time = asyncio.get_event_loop().time()
        while len(votes) < 2 and asyncio.get_event_loop().time() - start_time < timeout:
            try:
                vote_response = await asyncio.wait_for(websocket.recv(),
                                                       timeout - (asyncio.get_event_loop().time() - start_time))
                vote_data = json.loads(vote_response)
                if vote_data["action"] == "vote":
                    print("Received vote response:", vote_data)
                    votes.append(vote_data["vote"])
            except asyncio.TimeoutError:
                break

        print("Collected votes:", votes)
        return votes

    @staticmethod
    def validate_voting_result(votes):
        # Check if the majority of votes are True
        print("in validate_voting_result(): ", votes.count(True) > len(votes) // 2)
        return votes.count(True) > len(votes) // 2

    @staticmethod
    def validate_transaction(transaction):
        # Check if all required data fields are present
        required_fields = ["patient_id", "name", "age", "condition"]
        for field in required_fields:
            if field not in transaction:
                print(f"Missing required field: {field}")
                return False

        # Verify data integrity
        patient_id = transaction["patient_id"]
        name = transaction["name"]
        age = transaction["age"]
        condition = transaction["condition"]

        # Check if patient_id is a non-empty string
        if not isinstance(patient_id, str) or not patient_id:
            print("Invalid patient_id")
            return False

        # Check if name is a non-empty string
        if not isinstance(name, str) or not name:
            print("Invalid name")
            return False

        # Check if age is a positive integer
        if not isinstance(age, int) or age <= 0:
            print("Invalid age")
            return False

        # Check if condition is a non-empty string
        if not isinstance(condition, str) or not condition:
            print("Invalid condition")
            return False

        # Check if age is between 18 and 130
        if age < 18 or age > 130:
            print("Age out of range")
            return False

        # All checks passed
        return True

    def get_requested_data(self, query, requestId):
        # Retrieve the requested data based on the query
        search_type = query.get("search_type")
        search_term = query.get("search_term")

        print("search_type: ", search_type)
        print("search_term: ", search_term)

        # only the leader needs to return the data requested
        requested_data = None
        if self.is_leader:
            if search_type == "patient_data":
                requested_data = self.blockchain.search_patient_data(search_term)
            elif search_type == "condition_by_age_group":
                requested_data = self.blockchain.search_condition_by_age_group(search_term)
            elif search_type == "condition_proportion":
                requested_data = self.blockchain.search_condition_proportion(search_term)
            else:
                print(f"Unknown search type: {search_type}")

        # Include requestId in the response
        if requested_data is not None:
            return {"requestId": requestId, "data": requested_data}
        else:
            return {"requestId": requestId, "error": "No data found for the given query."}

    def read_chain(self):
        print("\nReading the blockchain:")
        chain = self.blockchain.get_chain()
        for block in chain:
            print(f"Block {block.index}:")
            print("  Timestamp:", block.timestamp)
            print("  Data:", block.data)
            print("  Previous Hash:", block.previous_hash)
            print("  Hash:", block.hash)
            print()

    # generic search for any string in chain data
    def search_chain(self, search_term):
        print(f"\nSearching the blockchain for '{search_term}':")
        results = self.blockchain.search_data(search_term)
        if results:
            for block in results:
                print(f"Block {block.index}:")
                print("  Timestamp:", block.timestamp)
                print("  Data:", block.data)
                print("  Previous Hash:", block.previous_hash)
                print("  Hash:", block.hash)
                print()
        else:
            print("No matching data found in the blockchain.")


bot = Bot()


async def main():
    # bot.blockchain.clear_chain()
    # Add sample medical data to the blockchain
    sample_data = [
        {"patient_id": "1", "name": "John Doe", "age": 35, "condition": "Hypertension"},
        {"patient_id": "2", "name": "Jane Smith", "age": 28, "condition": "Diabetes"},
        {"patient_id": "3", "name": "Bob Johnson", "age": 42, "condition": "Asthma"},
        {"patient_id": "4", "name": "Alice Brown", "age": 50, "condition": "Hypertension"},
        {"patient_id": "5", "name": "Charlie Davis", "age": 61, "condition": "Diabetes"},
        {"patient_id": "1", "name": "John Doe", "age": 37, "condition": "Diabetes"}
    ]
    # clears the chain for testing
    # bot.blockchain.clear_chain()

    # used to initialize some test data in the chain
    # for data in sample_data:
    #     bot.blockchain.add_block(data)

    bot.read_chain()

    # Single Patient Data Search
    patient_name = "John Doe"
    patient_data = bot.blockchain.search_patient_data(patient_name)
    print(f"\nPatient data for '{patient_name}':")
    for data in patient_data:
        print("  Timestamp:", data["timestamp"])
        print("  Data:", data["data"])
        print()

    # Search Medical Condition Count by Age Group
    condition = "Hypertension"
    condition_by_age_group = bot.blockchain.search_condition_by_age_group(condition)
    print(f"\nCount of '{condition}' by age group:")
    for age_group, count in condition_by_age_group["age_groups"].items():
        print(f"  {age_group}-{age_group + 9}: {count}")
    print()

    # Search Proportion of People Having a Condition
    condition = "Diabetes"
    condition_proportion = bot.blockchain.search_condition_proportion(condition)
    print(f"\nProportion of people with '{condition}':")
    print("  People with condition:", condition_proportion["people_with_condition"])
    print("  Total people:", condition_proportion["total_people"])
    print()

    # connect to the websocket server
    await bot.connect("ws://localhost:3000")


def signal_handler(sig, frame):
    print('Saving blockchain data...')
    bot.blockchain.save_chain()
    print('Blockchain data saved. Exiting...')
    sys.exit(0)


if __name__ == "__main__":
    signal.signal(signal.SIGINT, signal_handler)
    asyncio.run(main())
