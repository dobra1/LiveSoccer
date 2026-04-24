import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type Props = { playerName: string; selectedTeam: string };

type Player = {
  id: number;
  name: string;
  team: string;
  ready: boolean;
};

function GamePage({ playerName, selectedTeam }: Props) {
  const [time, setTime] = useState(0);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [leftMessage, setLeftMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!playerName || !selectedTeam) return;

    const ws = new WebSocket("ws://localhost:3002");

    ws.onopen = () => {
      console.log("Kapcsolódva a WebSocket szerverhez");

      ws.send(
        JSON.stringify({
          type: "join",
          name: playerName,
          team: selectedTeam,
        }),
      );

      ws.send(
        JSON.stringify({
          type: "ready",
        }),
      );
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Üzenet a szervertől:", data);

        if (data.type === "players_update") {
          setPlayers(data.players);
          setGameStarted(data.gameStarted);
        }

        if (data.type === "player_left") {
          setLeftMessage(data.message);
        }
      } catch (error) {
        console.log("Nem JSON üzenet:", event.data);
      }
    };

    ws.onclose = () => {
      console.log("Kapcsolat bontva a WebSocket szerverrel");
    };

    return () => {
      ws.close();
    };
  }, [playerName, selectedTeam]);

  useEffect(() => {
    if (!gameStarted) return;

    const interval = setInterval(() => {
      setTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [gameStarted]);

  const teamAPlayers = players.filter((player) => player.team === "A");
  const teamBPlayers = players.filter((player) => player.team === "B");

  const formatTime = (t: number) => {
    const minutes = Math.floor(t / 60);
    const seconds = t % 60;

    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div id="game-container">
      <div id="scoreboard">
        <div className="teamA">
          {teamAPlayers.length > 0
            ? teamAPlayers.map((player) => player.name).join(", ")
            : "A csapat"}{" "}
          {scoreA}
        </div>

        <div className="timer">{formatTime(time)}</div>

        <div className="teamB">
          {teamBPlayers.length > 0
            ? teamBPlayers.map((player) => player.name).join(", ")
            : "B csapat"}{" "}
          {scoreB}
        </div>
      </div>

      {/* 👇 IDE KELL */}
      {leftMessage && (
        <div style={{ color: "white", textAlign: "center", marginTop: "20px" }}>
          {leftMessage}
        </div>
      )}

      <div id="field">
        <div className="mid-line"></div>
        <div className="center-circle"></div>
        <div className="goal left-goal"></div>
        <div className="goal right-goal"></div>

        <div className="ball"></div>

        <div className="player player-a player-a-1"></div>
        <div className="player player-a player-a-2"></div>
        <div className="player player-a player-a-3"></div>

        <div className="player player-b player-b-1"></div>
        <div className="player player-b player-b-2"></div>
        <div className="player player-b player-b-3"></div>
      </div>

      <div className="button-container">
        <button id="close-btn" onClick={() => navigate("/match-setup")}>
          Kilépés a játékból
        </button>
      </div>
    </div>
  );
}

export default GamePage;
