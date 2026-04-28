const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 3002 });

let rooms = {};

function generateRoomId() {
  return Math.random().toString(36).substring(2, 6);
}

function createBall() {
  return {
    x: 50,
    y: 50,
    dx: 0,
    dy: 0,
  };
}

function createRoom() {
  return {
    players: [],
    gameStarted: false,
    intervalId: null,
    ball: createBall(),
    scoreA: 0,
    scoreB: 0,
  };
}

function getPublicPlayers(room) {
  return room.players.map((p) => ({
    name: p.name,
    team: p.team,
    x: p.x,
    y: p.y,
  }));
}

function getGameState(room) {
  return {
    players: getPublicPlayers(room),
    ball: {
      x: room.ball.x,
      y: room.ball.y,
    },
    scoreA: room.scoreA,
    scoreB: room.scoreB,
  };
}

function broadcastToRoom(roomId, data) {
  const message = JSON.stringify(data);

  rooms[roomId]?.players.forEach((player) => {
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(message);
    }
  });
}

function getStartPosition(team, index) {
  if (team === "A") {
    return { x: 20, y: 30 + index * 20 };
  }

  return { x: 80, y: 30 + index * 20 };
}

function distance(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function moveTowards(player, target, speed) {
  const dx = target.x - player.x;
  const dy = target.y - player.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) return;

  player.x += (dx / length) * speed;
  player.y += (dy / length) * speed;

  player.x = Math.max(5, Math.min(95, player.x));
  player.y = Math.max(5, Math.min(95, player.y));
}

function updatePlayers(room) {
  if (room.players.length === 0) return;

  const closestPlayer = room.players.reduce((closest, player) => {
    return distance(player, room.ball) < distance(closest, room.ball)
      ? player
      : closest;
  }, room.players[0]);

  room.players.forEach((player, index) => {
    if (player === closestPlayer) {
      moveTowards(player, room.ball, 0.8);
      return;
    }

    const isTeamA = player.team === "A";

    const target = {
      x: isTeamA ? 30 : 70,
      y: 25 + index * 15,
    };

    moveTowards(player, target, 0.25);
  });

  if (distance(closestPlayer, room.ball) < 3) {
    if (closestPlayer.team === "A") {
      room.ball.dx = 1.4;
      room.ball.dy = (Math.random() - 0.5) * 0.9;
    }

    if (closestPlayer.team === "B") {
      room.ball.dx = -1.4;
      room.ball.dy = (Math.random() - 0.5) * 0.9;
    }
  }
}

function resetAfterGoal(room) {
  room.ball = createBall();

  let teamAIndex = 0;
  let teamBIndex = 0;

  room.players.forEach((player) => {
    if (player.team === "A") {
      const pos = getStartPosition("A", teamAIndex);
      player.x = pos.x;
      player.y = pos.y;
      teamAIndex++;
    }

    if (player.team === "B") {
      const pos = getStartPosition("B", teamBIndex);
      player.x = pos.x;
      player.y = pos.y;
      teamBIndex++;
    }
  });
}

function updateBall(room) {
  const ball = room.ball;

  ball.x += ball.dx;
  ball.y += ball.dy;

  ball.dx *= 0.99;
  ball.dy *= 0.99;

  if (ball.y <= 3 || ball.y >= 97) {
    ball.dy *= -1;
  }

  const isLeftGoal = ball.x <= 0 && ball.y >= 40 && ball.y <= 60;
  const isRightGoal = ball.x >= 100 && ball.y >= 40 && ball.y <= 60;

  if (isRightGoal) {
    room.scoreA += 1;
    resetAfterGoal(room);
    return;
  }

  if (isLeftGoal) {
    room.scoreB += 1;
    resetAfterGoal(room);
    return;
  }

  if (ball.x <= 0 || ball.x >= 100) {
    ball.dx *= -1;
  }

  ball.x = Math.max(0, Math.min(100, ball.x));
  ball.y = Math.max(0, Math.min(100, ball.y));
}

function startGameLoop(roomId) {
  const room = rooms[roomId];
  if (!room) return;

  if (room.intervalId) return;

  room.intervalId = setInterval(() => {
    updatePlayers(room);
    updateBall(room);

    broadcastToRoom(roomId, {
      type: "game_state",
      ...getGameState(room),
    });
  }, 100);
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

      rooms[roomId] = createRoom();

      const player = {
        name: data.name,
        team: null,
        x: 50,
        y: 50,
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
        ...getGameState(rooms[roomId]),
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
        x: 50,
        y: 50,
        ws,
      };

      room.players.push(player);

      ws.roomId = data.roomId;
      ws.playerName = data.name;

      broadcastToRoom(data.roomId, {
        type: "players_update",
        ...getGameState(room),
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
        ...getGameState(room),
      });
    }

    if (data.type === "get_room_state") {
      const room = rooms[ws.roomId];
      if (!room) return;

      ws.send(
        JSON.stringify({
          type: "players_update",
          ...getGameState(room),
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
      room.ball = createBall();

      resetAfterGoal(room);

      broadcastToRoom(ws.roomId, {
        type: "game_started",
        ...getGameState(room),
      });

      startGameLoop(ws.roomId);
    }
  });

  ws.on("close", () => {
    const room = rooms[ws.roomId];
    if (!room) return;

    room.players = room.players.filter((p) => p.name !== ws.playerName);

    if (room.players.length === 0) {
      clearInterval(room.intervalId);
      delete rooms[ws.roomId];
      return;
    }

    broadcastToRoom(ws.roomId, {
      type: "players_update",
      ...getGameState(room),
    });

    console.log("Kliens lecsatlakozott");
  });
});

console.log("WebSocket szerver fut: ws://localhost:3002");
