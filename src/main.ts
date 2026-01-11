import { dockerManager } from "./docker.ts";

const activeRooms = new Map<string, { port: number; containerId: string; createdAt: Date }>();
enum HttpMethods
{
    DELETE = "DELETE",
    GET = "GET",
    OPTIONS = "OPTIONS",
    POST = "POST",
    PUT = "PUT",
}
const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": `${Object.values(HttpMethods).join(", ")}`,
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
};

console.log("Game API Server starting on http://localhost:3000");

Deno.serve({ port: 3000, hostname: "0.0.0.0" }, async (req) =>
{
    const url = new URL(req.url);
    const path = url.pathname;

    if (req.method === HttpMethods.OPTIONS) return new Response(null, { headers, status: 204 });

    try
    {

        if (req.method === HttpMethods.GET)
        {
            if (path === "/health")
            {
                return Response.json({ status: "healthy", timestamp: new Date().toISOString(), rooms: activeRooms.size }, { headers });
            }

            if (path === "/rooms")
            {
                const rooms = Array.from(activeRooms.entries()).map(([roomId, data]) => ({
                    roomId,
                    websocketUrl: `ws://localhost:${data.port}`,
                    createdAt: data.createdAt.toISOString(),
                    uptime: Date.now() - data.createdAt.getTime(),
                }));

                return Response.json({ success: true, rooms, count: rooms.length }, { headers });
            }

            if (path.startsWith("/rooms/"))
            {
                const roomId = path.substring("/rooms/".length);
                const room = activeRooms.get(roomId);

                if (!room) return Response_Error(404, "Room not found");

                return Response.json({
                    success: true,
                    roomId,
                    websocketUrl: `ws://localhost:${room.port}`,
                    createdAt: room.createdAt.toISOString(),
                    uptime: Date.now() - room.createdAt.getTime(),
                }, { headers });
            }
        }

        if (req.method === HttpMethods.POST)
        {
            if (path === "/rooms") 
            {
                const roomId = crypto.randomUUID().slice(0, 8);
                const port = await dockerManager.findAvailablePort();

                console.log(`Creating room ${roomId} on port ${port}...`);

                try
                {
                    const containerId = await dockerManager.launchWebSocketServer(roomId, port);

                    activeRooms.set(roomId, { port, containerId, createdAt: new Date() });

                    return Response.json({
                        success: true,
                        roomId,
                        websocketUrl: `ws://localhost:${port}`,
                        createdAt: new Date().toISOString(),
                    }, { headers, status: 201 });
                } catch (error)
                {
                    console.error(`Failed to create room ${roomId}:`, error);
                    return Response_Error(500, "error.message");
                }
            }
        }

        if (req.method === HttpMethods.DELETE)
        {
            if (path.startsWith("/rooms/"))
            {
                const roomId = path.substring("/rooms/".length);
                const room = activeRooms.get(roomId);

                if (!room) return Response_Error(404, "Room not found");

                try
                {
                    await dockerManager.stopContainer(room.containerId);
                    activeRooms.delete(roomId);
                    dockerManager.releasePort(room.port);

                    return Response.json({ success: true, message: `Room ${roomId} deleted` }, { headers });
                } catch (error)
                {
                    console.error(`Failed to delete room ${roomId}:`, error);
                    return Response_Error(500, "error.message");
                }
            }
        }

        return Response_Error(404, "Endpoint not found");
    } catch (error)
    {
        console.error("Server error:", error);
        return Response_Error(500, "Internal server error");
    }
});

function Response_Error(status: number, error: string): Response
{
    return Response.json({ success: false, error }, { headers, status });
}


const controller = new AbortController();
Deno.addSignalListener("SIGINT", shutdown);
Deno.addSignalListener("SIGTERM", shutdown);

async function shutdown()
{
    console.log("Shutdown started...");
    controller.abort();
    await dockerManager.cleanupAll();
    Deno.exit(0);
}

