const { players } = require("./gameState");

function updatePlayers() {
  players.forEach((player) => {
    const moveX = (Math.random() - 0.5) * 4;
    const moveY = (Math.random() - 0.5) * 4;

    player.x = Math.max(5, Math.min(95, player.x + moveX));
    player.y = Math.max(5, Math.min(95, player.y + moveY));
  });
}

module.exports = { updatePlayers };
