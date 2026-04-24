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

function sendPlayersUpdate() {
  broadcast({
    type: "players_update",
    players,
    gameStarted,
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

  sendPlayersUpdate();

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log("Kapott adat:", data);

      if (data.type === "join") {
        const existingPlayer = players.find((player) => player.id === ws.id);

        if (!existingPlayer && players.length >= 2) {
          ws.send(
            JSON.stringify({
              type: "room_full",
              message: "A szoba megtelt.",
            }),
          );
          return;
        }

        const playerData = {
          id: ws.id,
          name: data.name,
          team: data.team || null,
          ready: false,
        };

        if (existingPlayer) {
          existingPlayer.name = data.name;
          existingPlayer.team = data.team || existingPlayer.team;
        } else {
          players.push(playerData);
        }

        gameStarted = false;
        players.forEach((player) => {
          player.ready = false;
        });

        sendPlayersUpdate();
      }

      if (data.type === "select_team") {
        const currentPlayer = players.find((player) => player.id === ws.id);

        if (!currentPlayer) return;

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

        currentPlayer.team = data.team;
        currentPlayer.ready = false;
        gameStarted = false;

        sendPlayersUpdate();
      }

      if (data.type === "ready") {
        const player = players.find((player) => player.id === ws.id);

        if (!player) return;

        player.ready = data.ready === true;

        const bothPlayersReady =
          players.length === 2 &&
          players.every((player) => player.ready) &&
          players.every((player) => player.team);

        gameStarted = bothPlayersReady;

        sendPlayersUpdate();
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

    sendPlayersUpdate();

    if (disconnectedPlayer) {
      broadcast({
        type: "player_left",
        message: `${disconnectedPlayer.name} kilépett a játékból.`,
      });
    }
  });
});

console.log("WebSocket szerver fut a 3002-es porton");
