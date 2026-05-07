const WebSocket = require("ws");

let rooms = {};

const MAX_PLAYERS_PER_TEAM = 3;

function generateRoomId() {
  return Math.random().toString(36).substring(2, 6);
}

function createBall() {
  return {
    x: 50,
    y: 50,
    dx: 0,
    dy: 0,
    kickCooldown: 0,
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getPublicPlayers(room) {
  return room.players.map((p) => ({
    name: p.name,
    team: p.team,
    x: p.x,
    y: p.y,
    isBot: p.isBot,
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
    return { x: 20, y: 25 + index * 16 };
  }

  return { x: 80, y: 25 + index * 16 };
}

function distance(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function moveTowards(player, target, speed) {
  const dx = target.x - player.x;
  const dy = target.y - player.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length < 0.2) return;

  player.x += (dx / length) * speed;
  player.y += (dy / length) * speed;

  player.x = clamp(player.x, 5, 95);
  player.y = clamp(player.y, 6, 94);
}

function getRandomRoamTarget(player) {
  const isTeamA = player.team === "A";

  return {
    x: isTeamA ? 20 + Math.random() * 25 : 55 + Math.random() * 25,
    y: 20 + Math.random() * 60,
  };
}

function separatePlayers(players) {
  const minDistance = 8;

  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const p1 = players[i];
      const p2 = players[j];

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0 && dist < minDistance) {
        const push = (minDistance - dist) / 2;
        const nx = dx / dist;
        const ny = dy / dist;

        p1.x -= nx * push;
        p1.y -= ny * push;
        p2.x += nx * push;
        p2.y += ny * push;

        p1.x = clamp(p1.x, 5, 95);
        p1.y = clamp(p1.y, 6, 94);
        p2.x = clamp(p2.x, 5, 95);
        p2.y = clamp(p2.y, 6, 94);
      }
    }
  }
}

function separateBallFromPlayers(room) {
  const ball = room.ball;
  const minDistance = 5;

  for (const player of room.players) {
    if (!player.team) continue;

    const dx = ball.x - player.x;
    const dy = ball.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0 && dist < minDistance) {
      const nx = dx / dist;
      const ny = dy / dist;

      ball.x = player.x + nx * minDistance;
      ball.y = player.y + ny * minDistance;

      ball.x = clamp(ball.x, 2, 98);
      ball.y = clamp(ball.y, 4, 96);
    }
  }
}

function updatePlayers(room) {
  const activePlayers = room.players.filter((p) => p.team);
  if (activePlayers.length === 0) return;

  if (room.ball.kickCooldown > 0) {
    room.ball.kickCooldown--;
  }

  ["A", "B"].forEach((team) => {
    const teamPlayers = activePlayers.filter((p) => p.team === team);
    if (teamPlayers.length === 0) return;

    const closestPlayer = teamPlayers.reduce((closest, player) => {
      return distance(player, room.ball) < distance(closest, room.ball)
        ? player
        : closest;
    }, teamPlayers[0]);

    teamPlayers.forEach((player, index) => {
      const isClosest = player === closestPlayer;

      const ballDistance = distance(player, room.ball);

      if (isClosest || ballDistance < 22) {
        moveTowards(player, room.ball, 2.8);
      } else {
        if (
          !player.roamTarget ||
          distance(player, player.roamTarget) < 3 ||
          Math.random() < 0.01
        ) {
          player.roamTarget = getRandomRoamTarget(player);
        }

        moveTowards(player, player.roamTarget, 0.25);
      }
    });
  });

  separatePlayers(activePlayers);

  const playersNearBall = activePlayers.filter(
    (player) => distance(player, room.ball) < 9,
  );

  if (playersNearBall.length >= 2 && room.ball.kickCooldown === 0) {
    const direction = Math.random() > 0.5 ? 1 : -1;

    room.ball.dx = direction * 3.5;
    room.ball.dy = (Math.random() - 0.5) * 3.5;
    room.ball.kickCooldown = 15;

    return;
  }

  const closestToBall = activePlayers.reduce((closest, player) => {
    return distance(player, room.ball) < distance(closest, room.ball)
      ? player
      : closest;
  }, activePlayers[0]);

  if (room.ball.kickCooldown === 0 && distance(closestToBall, room.ball) < 8) {
    let dx = room.ball.x - closestToBall.x;
    let dy = room.ball.y - closestToBall.y;

    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
      dx = dx / dist;
      dy = dy / dist;
    } else {
      dx = closestToBall.team === "A" ? 1 : -1;
      dy = 0;
    }

    if (closestToBall.team === "A" && dx < -0.6) dx = -0.2;
    if (closestToBall.team === "B" && dx > 0.6) dx = 0.2;

    dy += (Math.random() - 0.5) * 0.45;

    const finalDist = Math.sqrt(dx * dx + dy * dy);

    room.ball.dx = (dx / finalDist) * 6.0;
    room.ball.dy = (dy / finalDist) * 6.0;

    room.ball.kickCooldown = 10;
  }
}

function updateBall(room) {
  const ball = room.ball;

  ball.x += ball.dx;
  ball.y += ball.dy;

  ball.dx *= 0.985;
  ball.dy *= 0.985;

  if (Math.abs(ball.dx) < 0.03) ball.dx = 0;
  if (Math.abs(ball.dy) < 0.03) ball.dy = 0;

  if (ball.y <= 4 || ball.y >= 96) {
    ball.dy *= -1;
    ball.y = clamp(ball.y, 4, 96);
  }

  const isLeftGoal = ball.x <= 2 && ball.y >= 40 && ball.y <= 60;
  const isRightGoal = ball.x >= 98 && ball.y >= 40 && ball.y <= 60;

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

  if (ball.x <= 2 || ball.x >= 98) {
    ball.dx *= -1;
    ball.x = clamp(ball.x, 2, 98);
  }

  ball.x = clamp(ball.x, 2, 98);
  ball.y = clamp(ball.y, 4, 96);

  const ballInCorner =
    (ball.x <= 8 || ball.x >= 92) && (ball.y <= 10 || ball.y >= 90);

  if (ballInCorner) {
    const pushX = ball.x <= 8 ? 1 : -1;
    const pushY = ball.y <= 10 ? 1 : -1;

    ball.dx = pushX * 3.2;
    ball.dy = pushY * 2.4;

    ball.x += pushX * 2;
    ball.y += pushY * 2;

    ball.kickCooldown = 15;
  }

  separateBallFromPlayers(room);
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

function addBotPlayers(room) {
  ["A", "B"].forEach((team) => {
    const teamPlayers = room.players.filter((p) => p.team === team);
    const missingBots = MAX_PLAYERS_PER_TEAM - teamPlayers.length;

    for (let i = 0; i < missingBots; i++) {
      const index = teamPlayers.length + i;
      const pos = getStartPosition(team, index);

      room.players.push({
        name: `${team}${index + 1}`,
        team,
        x: pos.x,
        y: pos.y,
        ws: null,
        isBot: true,
      });
    }
  });
}

function addOrReplacePlayerInTeam(room, ws, team, name) {
  const teamPlayers = room.players.filter((p) => p.team === team);
  const botInTeam = teamPlayers.find((p) => p.isBot);

  if (teamPlayers.length >= MAX_PLAYERS_PER_TEAM) {
    if (botInTeam) {
      botInTeam.name = name;
      botInTeam.ws = ws;
      botInTeam.isBot = false;

      ws.team = team;
      ws.playerName = name;

      return true;
    }

    ws.send(
      JSON.stringify({
        type: "error",
        message: "Ez a csapat már tele van.",
      }),
    );

    return false;
  }

  const pos = getStartPosition(team, teamPlayers.length);

  const player = room.players.find((p) => p.ws === ws);

  if (player) {
    player.name = name;
    player.team = team;
    player.x = pos.x;
    player.y = pos.y;
    player.isBot = false;
  } else {
    room.players.push({
      name,
      team,
      x: pos.x,
      y: pos.y,
      ws,
      isBot: false,
    });
  }

  ws.team = team;
  ws.playerName = name;

  return true;
}

function startGameLoop(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  if (room.intervalId) return;

  room.intervalId = setInterval(() => {
    updateBall(room);
    updatePlayers(room);

    broadcastToRoom(roomId, {
      type: "game_state",
      ...getGameState(room),
    });
  }, 50);
}

function handleConnection(ws) {
  console.log("Új kliens csatlakozott");

  ws.roomId = null;
  ws.playerName = null;
  ws.team = null;

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
        isBot: false,
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
            message: "A szoba nem létezik",
          }),
        );
        return;
      }

      ws.roomId = data.roomId;
      ws.playerName = data.name;

      const existingPlayer = room.players.find((p) => p.ws === ws);

      if (!existingPlayer) {
        room.players.push({
          name: data.name,
          team: null,
          x: 50,
          y: 50,
          ws,
          isBot: false,
        });
      }

      broadcastToRoom(data.roomId, {
        type: "players_update",
        ...getGameState(room),
      });
    }

    if (data.type === "select_team") {
      const room = rooms[ws.roomId];
      if (!room) return;

      const oldPlayer = room.players.find((p) => p.ws === ws);

      if (oldPlayer && oldPlayer.team === data.team) {
        return;
      }

      if (oldPlayer && oldPlayer.team !== data.team) {
        room.players = room.players.filter((p) => p.ws !== ws);
      }

      const success = addOrReplacePlayerInTeam(
        room,
        ws,
        data.team,
        ws.playerName || data.name,
      );

      if (!success) return;

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

      if (room.gameStarted) {
        ws.send(
          JSON.stringify({
            type: "game_started",
            ...getGameState(room),
          }),
        );
        return;
      }

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

      addBotPlayers(room);

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

    room.players = room.players.filter((p) => p.ws !== ws);

    const humanPlayers = room.players.filter((p) => p.ws);

    if (humanPlayers.length === 0) {
      clearInterval(room.intervalId);
      delete rooms[ws.roomId];
      return;
    }

    broadcastToRoom(ws.roomId, {
      type: "player_left",
      message: `${ws.playerName} kilépett a játékból.`,
    });

    broadcastToRoom(ws.roomId, {
      type: "players_update",
      ...getGameState(room),
    });

    console.log("Kliens lecsatlakozott");
  });
}

module.exports = { handleConnection };
