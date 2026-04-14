const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 3002 });

let clients = [];
let players = [];
let nextId = 1;
let gameStarted = false;

function broadcast(data) {
  const message = JSON.stringify(data);

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

wss.on("connection", (ws) => {
  console.log("Új játékos csatlakozott");

  ws.id = nextId++;
  clients.push(ws);

  ws.send(
    JSON.stringify({
      type: "welcome",
      message: "Sikeres csatlakozás a szerverhez",
    }),
  );

  ws.send(
    JSON.stringify({
      type: "players_update",
      players: players,
      gameStarted: gameStarted,
    }),
  );

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log("Kapott adat:", data);

      if (data.type === "join") {
        const takenByOtherPlayer = players.find(
          (player) => player.team === data.team && player.id !== ws.id,
        );

        if (takenByOtherPlayer) {
          ws.send(
            JSON.stringify({
              type: "team_taken",
              message: `A(z) ${data.team} csapat már foglalt.`,
            }),
          );
          return;
        }

        const existingPlayerIndex = players.findIndex(
          (player) => player.id === ws.id,
        );

        const playerData = {
          id: ws.id,
          name: data.name,
          team: data.team,
          ready: false,
        };

        if (existingPlayerIndex !== -1) {
          players[existingPlayerIndex] = {
            ...players[existingPlayerIndex],
            name: data.name,
            team: data.team,
          };
        } else {
          players.push(playerData);
        }

        gameStarted = false;

        broadcast({
          type: "players_update",
          players: players,
          gameStarted: gameStarted,
        });
      }

      if (data.type === "ready") {
        const player = players.find((player) => player.id === ws.id);

        if (player) {
          player.ready = true;
        }

        const bothPlayersReady =
          players.length === 2 && players.every((player) => player.ready);

        if (bothPlayersReady) {
          gameStarted = true;
        }

        broadcast({
          type: "players_update",
          players: players,
          gameStarted: gameStarted,
        });
      }
    } catch (error) {
      console.error("Hiba az üzenet feldolgozásakor:", error);
    }
  });

  ws.on("close", () => {
    console.log("Játékos lecsatlakozott");

    clients = clients.filter((client) => client !== ws);

    const disconnectedPlayer = players.find((player) => player.id === ws.id);

    players = players.filter((player) => player.id !== ws.id);
    gameStarted = false;

    players.forEach((player) => {
      player.ready = false;
    });

    broadcast({
      type: "players_update",
      players: players,
      gameStarted: gameStarted,
    });

    if (disconnectedPlayer) {
      broadcast({
        type: "player_left",
        message: `${disconnectedPlayer.name} kilépett a játékból.`,
      });
    }
  });
});

console.log("WebSocket szerver fut a 3002-es porton");
