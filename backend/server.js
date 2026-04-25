const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 3002 });

let rooms = {};

function generateRoomId() {
  return Math.random().toString(36).substring(2, 6);
}

function broadcastToRoom(roomId, data) {
  const message = JSON.stringify(data);

  rooms[roomId]?.players.forEach((player) => {
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(message);
    }
  });
}

wss.on("connection", (ws) => {
  console.log("Új kliens csatlakozott");

  ws.roomId = null;
  ws.playerName = null;

  ws.on("message", (message) => {
    const data = JSON.parse(message);
    console.log("Üzenet:", data);

    if (data.type === "create_room") {
      const roomId = generateRoomId();

      rooms[roomId] = {
        players: [],
        gameStarted: false,
      };

      const player = {
        name: data.name,
        team: null,
        ws,
      };

      rooms[roomId].players.push(player);

      ws.roomId = roomId;
      ws.playerName = data.name;

      ws.send(
        JSON.stringify({
          type: "room_created",
          roomId,
        }),
      );

      broadcastToRoom(roomId, {
        type: "players_update",
        players: rooms[roomId].players.map((p) => ({
          name: p.name,
          team: p.team,
        })),
      });
    }

    if (data.type === "join_room") {
      const room = rooms[data.roomId];

      if (!room) {
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Szoba nem létezik",
          }),
        );
        return;
      }

      const player = {
        name: data.name,
        team: null,
        ws,
      };

      room.players.push(player);

      ws.roomId = data.roomId;
      ws.playerName = data.name;

      broadcastToRoom(data.roomId, {
        type: "players_update",
        players: room.players.map((p) => ({
          name: p.name,
          team: p.team,
        })),
      });
    }

    if (data.type === "select_team") {
      const room = rooms[ws.roomId];
      if (!room) return;

      const player = room.players.find((p) => p.name === ws.playerName);

      if (player) {
        player.team = data.team;
      }

      broadcastToRoom(ws.roomId, {
        type: "players_update",
        players: room.players.map((p) => ({
          name: p.name,
          team: p.team,
        })),
      });
    }

    if (data.type === "get_room_state") {
      const room = rooms[ws.roomId];
      if (!room) return;

      ws.send(
        JSON.stringify({
          type: "players_update",
          players: room.players.map((p) => ({
            name: p.name,
            team: p.team,
          })),
        }),
      );
    }

    if (data.type === "start_game") {
      const room = rooms[ws.roomId];
      if (!room) return;

      if (room.players.length < 2) {
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Legalább 2 játékos kell!",
          }),
        );
        return;
      }

      const allHaveTeam = room.players.every((p) => p.team);

      if (!allHaveTeam) {
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Minden játékosnak csapatot kell választania!",
          }),
        );
        return;
      }

      room.gameStarted = true;

      broadcastToRoom(ws.roomId, {
        type: "game_started",
        players: room.players.map((p) => ({
          name: p.name,
          team: p.team,
        })),
      });
    }
  });

  ws.on("close", () => {
    const room = rooms[ws.roomId];
    if (!room) return;

    room.players = room.players.filter((p) => p.name !== ws.playerName);

    broadcastToRoom(ws.roomId, {
      type: "players_update",
      players: room.players.map((p) => ({
        name: p.name,
        team: p.team,
      })),
    });

    console.log("Kliens lecsatlakozott");
  });
});

console.log("WebSocket szerver fut: ws://localhost:3002");
