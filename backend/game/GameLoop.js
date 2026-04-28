const WebSocket = require("ws");

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
  const room = rooms[roomId];
  if (!room) return;

  const message = JSON.stringify(data);

  room.players.forEach((player) => {
    if (player.ws && player.ws.readyState === WebSocket.OPEN) {
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

  const teams = ["A", "B"];

  teams.forEach((team) => {
    const teamPlayers = room.players.filter((p) => p.team === team);
    if (teamPlayers.length === 0) return;

    const closestPlayer = teamPlayers.reduce((closest, player) => {
      return distance(player, room.ball) < distance(closest, room.ball)
        ? player
        : closest;
    }, teamPlayers[0]);

    teamPlayers.forEach((player, index) => {
      const isClosest = player === closestPlayer;

      let target;

      if (isClosest) {
        target = room.ball;
      } else {
        target = {
          x: player.team === "A" ? room.ball.x - 18 : room.ball.x + 18,
          y: [30, 50, 70][index] ?? 50,
        };
      }

      moveTowards(player, target, isClosest ? 2.5 : 1.6);
    });
  });

  const touchingPlayers = room.players.filter(
    (player) => distance(player, room.ball) < 4,
  );

  if (touchingPlayers.length > 0) {
    const kicker = touchingPlayers.reduce((closest, player) => {
      return distance(player, room.ball) < distance(closest, room.ball)
        ? player
        : closest;
    }, touchingPlayers[0]);

    if (kicker.team === "A") {
      room.ball.dx = 2.4;
      room.ball.dy = (Math.random() - 0.5) * 1.2;
    }

    if (kicker.team === "B") {
      room.ball.dx = -2.4;
      room.ball.dy = (Math.random() - 0.5) * 1.2;
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

function addBotPlayers(room) {
  const teamAPlayers = room.players.filter((p) => p.team === "A");
  const teamBPlayers = room.players.filter((p) => p.team === "B");

  while (teamAPlayers.length < 3) {
    const index = teamAPlayers.length;
    const pos = getStartPosition("A", index);

    const bot = {
      name: `A${index + 1}`,
      team: "A",
      x: pos.x,
      y: pos.y,
      ws: null,
    };

    teamAPlayers.push(bot);
    room.players.push(bot);
  }

  while (teamBPlayers.length < 3) {
    const index = teamBPlayers.length;
    const pos = getStartPosition("B", index);

    const bot = {
      name: `B${index + 1}`,
      team: "B",
      x: pos.x,
      y: pos.y,
      ws: null,
    };

    teamBPlayers.push(bot);
    room.players.push(bot);
  }
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

function handleConnection(ws) {
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

      const humanPlayers = room.players.filter((p) => p.ws);

      if (humanPlayers.length < 2) {
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Legalább 2 játékos kell!",
          }),
        );
        return;
      }

      const allHumansHaveTeam = humanPlayers.every((p) => p.team);

      if (!allHumansHaveTeam) {
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

      addBotPlayers(room);
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

    room.players = room.players.filter((p) => p.ws !== ws);

    const humanPlayers = room.players.filter((p) => p.ws);

    if (humanPlayers.length === 0) {
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
}

module.exports = { handleConnection };
