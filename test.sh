#!/bin/bash

echo "Testing Game API Server"
echo "=========================="

echo ""
echo "1. Testing health endpoint:"
curl -s http://localhost:3000/health

echo ""
echo ""
echo "2. Creating a game room:"
ROOM=$(curl -s -X POST http://localhost:3000/rooms)
echo $ROOM
ROOM_ID=$(echo $ROOM | grep -o '"roomId":"[^"]*"' | cut -d'"' -f4)

echo ""
echo "3. Getting room info:"
curl -s http://localhost:3000/rooms/$ROOM_ID

echo ""
echo ""
echo "4. Listing all rooms:"
curl -s http://localhost:3000/rooms

echo ""
echo ""
echo "5. Deleting the room:"
curl -s -X DELETE http://localhost:3000/rooms/$ROOM_ID

echo ""
echo ""
echo "Test completed."
kill $SERVER_PID 2>/dev/null