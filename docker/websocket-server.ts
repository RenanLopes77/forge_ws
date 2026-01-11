const ROOM_ID = Deno.env.get("ROOM_ID") || "unknown";
const PORT = parseInt(Deno.env.get("PORT") || "8000");

console.log(`> Game Room ${ROOM_ID} WebSocket server starting on port ${PORT}`);

const connectedClients = new Set<WebSocket>();

Deno.serve({ port: PORT, hostname: "0.0.0.0" }, req =>
{
    if (req.headers.get("upgrade") !== "websocket")
    {
        return new Response(
            `<html>
                <head>
                <title>Game Room ${ROOM_ID}</title>
                </head>
                <body>
                <h1>Game Room: ${ROOM_ID}</h1>
                <div>
                    <p> >> WebSocket server is running</p>
                    <p> <code>ws://localhost:${PORT}</code></p>
                    <p> Connected players: <strong>${connectedClients.size}</strong></p>
                    <p> Server started: ${new Date().toISOString()}</p>
                </div>
                </body>
            </html>`,
            {
                status: 200,
                headers: { "Content-Type": "text/html" },
            },
        );
    }

    const { socket, response } = Deno.upgradeWebSocket(req);

    socket.onopen = () =>
    {
        console.log(`[${ROOM_ID}] Client connected`);
        connectedClients.add(socket);

        socket.send(JSON.stringify({
            type: "welcome",
            roomId: ROOM_ID,
            message: "Welcome to the game!",
            playerCount: connectedClients.size,
            timestamp: Date.now(),
        }));

        broadcast({ type: "player_joined", playerCount: connectedClients.size, timestamp: Date.now() });
    };

    socket.onmessage = (event) =>
    {
        console.log(`[${ROOM_ID}] Received:`, event.data);

        try
        {
            const data = JSON.parse(event.data);
            data.timestamp = Date.now();
            data.roomId = ROOM_ID;
            broadcast(data);
        } catch
        {
            socket.send(JSON.stringify({ type: "echo", message: event.data, timestamp: Date.now() }));
        }
    };

    socket.onclose = () =>
    {
        console.log(`[${ROOM_ID}] Client disconnected`);
        connectedClients.delete(socket);

        broadcast({ type: "player_left", playerCount: connectedClients.size, timestamp: Date.now() });
    };

    socket.onerror = (error) => { console.error(`[${ROOM_ID}] WebSocket error:`, error); };

    return response;
});

function broadcast(message: object)
{
    const messageStr = JSON.stringify(message);
    connectedClients.forEach((client) =>
    {
        if (client.readyState !== WebSocket.OPEN) return;
        client.send(messageStr);
    });
}

console.log(`> WebSocket server for room ${ROOM_ID} is ready!`);
