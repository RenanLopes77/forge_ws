import { CommandResult, ContainerInfo } from "./types.ts";


export class DockerManager
{
    private basePort = 8000;
    private maxPort = 9000;
    private ports = new Set<number>();
    private LOCALHOST = "127.0.0.1";

    private async runCommand(cmd: string[], cwd?: string,): Promise<CommandResult>
    {
        try
        {
            console.log(cmd)
            const command = new Deno.Command(cmd[0], { args: cmd.slice(1), cwd, stdout: "piped", stderr: "piped" });
            const { success, stdout, stderr } = await command.output();

            return {
                success,
                stdout: new TextDecoder().decode(stdout),
                stderr: new TextDecoder().decode(stderr),
            } as CommandResult;
        } catch (error)
        {
            console.error(`Command failed: ${cmd.join(" ")}`, error);
            throw error;
        }
    }

    findAvailablePort(): number
    {
        for (let port = this.basePort + this.ports.size; port <= this.maxPort; port++)
        {
            if (!this.ports.has(port))
            {
                try
                {
                    const listener = Deno.listen({ port, hostname: this.LOCALHOST });
                    listener.close();
                    this.ports.add(port);
                    return port;
                } catch (error)
                {
                    if (error instanceof Deno.errors.AddrInUse)
                    {
                        this.ports.add(port);
                        continue;
                    }
                    throw error;
                }
            }
        }
        throw new Error("No available ports (8000-9000)");
    }

    releasePort(port: number): void
    {
        this.ports.delete(port);
    }

    async launchWebSocketServer(roomId: string, port: number): Promise<string>
    {
        const containerName = `game-room-${roomId}`;

        console.log(`Launching WebSocket server for room ${roomId} on port ${port}...`);

        try
        {
            const result = await this.runCommand([
                "docker",
                "run",
                "-d",
                "--rm",
                "--name",
                containerName,
                "-p",
                `${port}:${port}`,
                "-e",
                `PORT=${port}`,
                "-e",
                `ROOM_ID=${roomId}`,
                "game-websocket-server",
            ]);

            if (!result.success)
            {
                this.releasePort(port);
                throw new Error(`Failed to launch container: ${result.stderr}`);
            }

            const containerId = result.stdout.trim();

            await new Promise((resolve) => setTimeout(resolve, 2000));

            const checkResult = await this.runCommand(["docker", "ps", "-q", "-f", `id=${containerId}`]);
            console.log(checkResult.stdout)
            console.log(checkResult.stderr)
            if (!checkResult.success || !checkResult.stdout.trim())
            {
                throw new Error(`Container ${containerId} failed to start`);
            }

            console.log(`✓ Container ${containerName} started (ID: ${containerId.slice(0, 12)})`);
            return containerId;
        } catch (error)
        {
            this.releasePort(port);
            console.error("✗ Failed to launch container:", error);
            throw error;
        }
    }

    async stopContainer(containerId: string): Promise<void>
    {
        try
        {
            console.log(`Stopping container ${containerId.slice(0, 12)}...`);

            const stopResult = await this.runCommand(["docker", "stop", containerId]);
            if (!stopResult.success) await this.runCommand(["docker", "kill", containerId]);

            console.log(`✓ Container ${containerId.slice(0, 12)} stopped`);
        } catch (error)
        {
            console.error("✗ Error stopping container:", error);
            throw error;
        }
    }

    async listContainers(): Promise<ContainerInfo[]>
    {
        try
        {
            const result = await this.runCommand([
                "docker",
                "ps",
                "--filter",
                "name=game-room-",
                "--format",
                "{{.ID}}|{{.Names}}|{{.Ports}}|{{.Status}}",
            ]);

            if (!result.success)
            {
                return [];
            }

            return result.stdout
                .trim()
                .split("\n")
                .filter((line) => line.trim())
                .map((line) =>
                {
                    const [id, name, ports, status] = line.split("|");
                    return { id, name, ports, status };
                });
        } catch
        {
            return [];
        }
    }

    public async cleanupAll(): Promise<void>
    {
        try
        {
            const containers = await this.listContainers();
            containers.forEach(async (container) => await this.stopContainer(container.id));
            this.ports.clear();
            console.log(`✓ Cleaned up ${containers.length} containers`);
        } catch (error)
        {
            console.error("✗ Error during cleanup:", error);
            throw error;
        }
    }
}

export const dockerManager = new DockerManager();
