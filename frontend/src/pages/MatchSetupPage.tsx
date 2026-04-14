import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

type Props = {
  playerName: string;
  selectedTeam: string;
  setSelectedTeam: (team: string) => void;
  setPlayerName: (name: string) => void;
};

type Player = {
  id: number;
  name: string;
  team: string;
  ready: boolean;
};

function MatchSetupPage({
  playerName,
  selectedTeam,
  setSelectedTeam,
  setPlayerName,
}: Props) {
  const navigate = useNavigate();
  const wsRef = useRef<WebSocket | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    wsRef.current = new WebSocket("ws://localhost:3002");

    wsRef.current.onopen = () => {
      console.log("Kapcsolódva a WebSocket szerverhez");
    };

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Kapott üzenet:", data);

      if (data.type === "players_update") {
        setPlayers(data.players);
        setGameStarted(data.gameStarted);

        if (data.gameStarted) {
          navigate("/game");
        }
      }

      if (data.type === "team_taken") {
        alert(data.message);
      }
    };

    wsRef.current.onclose = () => {
      console.log("Kapcsolat lezárva");
    };

    return () => {
      wsRef.current?.close();
    };
  }, [navigate]);

  const handleSelectTeam = (team: string) => {
    setSelectedTeam(team);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "join",
          name: playerName,
          team: team,
        }),
      );
    }
  };

  const handleLeave = () => {
    setPlayerName("");
    setSelectedTeam("");
    navigate("/");
  };

  const handleStartGame = () => {
    if (!selectedTeam) {
      alert("Kérem, válassza ki a csapatot a játék indításához!");
      return;
    }

    if (players.length < 2) {
      alert("A játékhoz 2 játékos szükséges.");
      return;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "ready",
        }),
      );
    }
  };

  const teamAPlayers = players.filter((player) => player.team === "A");
  const teamBPlayers = players.filter((player) => player.team === "B");

  const isTeamATaken =
    teamAPlayers.length > 0 &&
    !teamAPlayers.some((player) => player.name === playerName);

  const isTeamBTaken =
    teamBPlayers.length > 0 &&
    !teamBPlayers.some((player) => player.name === playerName);

  const currentPlayer = players.find((player) => player.name === playerName);

  return (
    <div id="match-container">
      <div id="welcome-text">Üdvözöljük a játékban!</div>
      <div id="match-title">⏳ Várakozás a csatlakozásra...</div>
      <div id="instruction-text">
        Válassza ki a csapatot, majd mindkét játékos indítsa el a játékot.
      </div>

      <div className="teams-container">
        <div
          className={
            selectedTeam === "A"
              ? "team-card team-a selected"
              : isTeamATaken
                ? "team-card team-a taken"
                : "team-card team-a"
          }
        >
          <h2>A csapat</h2>
          <hr style={{ height: "5px", backgroundColor: "white" }} />

          <div
            className="player-slot selectable-slot"
            onClick={() => {
              if (isTeamATaken) return;
              handleSelectTeam("A");
            }}
          >
            {teamAPlayers.length > 0
              ? teamAPlayers.map((player) => player.name).join(", ")
              : ""}
          </div>
        </div>

        <div
          className={
            selectedTeam === "B"
              ? "team-card team-b selected"
              : isTeamBTaken
                ? "team-card team-b taken"
                : "team-card team-b"
          }
        >
          <h2>B csapat</h2>
          <hr style={{ height: "5px", backgroundColor: "white" }} />

          <div
            className="player-slot selectable-slot"
            onClick={() => {
              if (isTeamBTaken) return;
              handleSelectTeam("B");
            }}
          >
            {teamBPlayers.length > 0
              ? teamBPlayers.map((player) => player.name).join(", ")
              : ""}
          </div>
        </div>
      </div>

      <div id="button-container">
        <button className="start-btn" onClick={handleStartGame}>
          Játék indítása
        </button>
        <button className="exit-btn" onClick={handleLeave}>
          Kilépés
        </button>
      </div>

      <div style={{ marginTop: "20px", color: "white" }}>
        {players.length < 2 && <p>Várakozás a másik játékosra...</p>}
        {players.length === 2 && !currentPlayer?.ready && (
          <p>Nyomd meg a Játék indítása gombot.</p>
        )}
        {players.length === 2 && currentPlayer?.ready && !gameStarted && (
          <p>Várakozás a másik játékosra, hogy elindítsa a játékot...</p>
        )}
      </div>
    </div>
  );
}

export default MatchSetupPage;
