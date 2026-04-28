import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSocket } from "../socket";

type Player = {
  name: string;
  team: "A" | "B" | null;
  x: number;
  y: number;
};

type Ball = {
  x: number;
  y: number;
};

function GamePage() {
  const [time, setTime] = useState(0);

  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);

  const [players, setPlayers] = useState<Player[]>([]);
  const [ball, setBall] = useState<Ball>({ x: 50, y: 50 });
  const [leftMessage, setLeftMessage] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const ws = getSocket();

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        console.log("GamePage üzenet:", data);

        if (data.type === "players_update") {
          setPlayers(data.players);

          if (data.ball) {
            setBall(data.ball);
          }

          if (typeof data.scoreA === "number") {
            setScoreA(data.scoreA);
          }

          if (typeof data.scoreB === "number") {
            setScoreB(data.scoreB);
          }
        }

        if (data.type === "game_started") {
          setPlayers(data.players);

          if (data.ball) {
            setBall(data.ball);
          }

          if (typeof data.scoreA === "number") {
            setScoreA(data.scoreA);
          }

          if (typeof data.scoreB === "number") {
            setScoreB(data.scoreB);
          }
        }

        if (data.type === "game_state") {
          setPlayers(data.players);

          if (data.ball) {
            setBall(data.ball);
          }

          if (typeof data.scoreA === "number") {
            setScoreA(data.scoreA);
          }

          if (typeof data.scoreB === "number") {
            setScoreB(data.scoreB);
          }
        }

        if (data.type === "player_left") {
          setLeftMessage(data.message);
        }
      } catch {
        console.log("Nem JSON üzenet:", event.data);
      }
    };

    ws.addEventListener("message", handleMessage);

    ws.send(
      JSON.stringify({
        type: "get_room_state",
      }),
    );

    return () => {
      ws.removeEventListener("message", handleMessage);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const teamAPlayers = players.filter(
    (player) => player.team === "A" && !player.name.startsWith("A"),
  );
  const teamBPlayers = players.filter(
    (player) => player.team === "B" && !player.name.startsWith("B"),
  );

  const formatTime = (t: number) => {
    const minutes = Math.floor(t / 60);
    const seconds = t % 60;

    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen w-full bg-black px-6 py-4 text-white">
      <div className="mx-auto flex h-full max-w-7xl flex-col items-center">
        <div className="mb-3 flex w-full max-w-5xl items-center justify-between rounded-lg bg-zinc-900 px-3 py-1.5 shadow">
          <div className="w-1/3 text-left text-lg font-bold text-red-400">
            {teamAPlayers.length > 0
              ? teamAPlayers.map((player) => player.name).join(", ")
              : "A csapat"}{" "}
            <span className="px-2 text-white">{scoreA}</span>
          </div>

          <div className="rounded-xl bg-black px-8 text-3xl font-black text-lime-400">
            {formatTime(time)}
          </div>

          <div className="w-1/3 text-right text-lg font-bold text-blue-400">
            {teamBPlayers.length > 0
              ? teamBPlayers.map((player) => player.name).join(", ")
              : "B csapat"}{" "}
            <span className="px-2 text-white">{scoreB}</span>
          </div>
        </div>

        {leftMessage && (
          <div className="mb-4 rounded-lg bg-red-500/20 px-6 py-2 text-center text-red-300">
            {leftMessage}
          </div>
        )}

        <div className="relative aspect-[5/3] w-full max-w-5xl overflow-hidden rounded-2xl border-4 border-white bg-green-700 shadow-2xl">
          <div className="absolute left-1/2 top-0 h-full w-1 -translate-x-1/2 bg-white" />
          <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white" />
          <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
          <div className="absolute left-0 top-1/2 h-32 w-6 -translate-y-1/2 border-y-4 border-r-4 border-white" />
          <div className="absolute right-0 top-1/2 h-32 w-6 -translate-y-1/2 border-y-4 border-l-4 border-white" />
          <div
            className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-lg transition-all duration-300"
            style={{
              left: `${ball.x}%`,
              top: `${ball.y}%`,
            }}
          />{" "}
          {players.map((player, index) => (
            <div
              key={`${player.name}-${index}`}
              className={`absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-black text-xs font-bold text-white shadow-lg transition-all duration-300 ${
                player.team === "A" ? "bg-red-500" : "bg-blue-500"
              }`}
              style={{
                left: `${player.x}%`,
                top: `${player.y}%`,
              }}
            >
              {player.name.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>

        <div className="mt-6 flex w-full max-w-5xl justify-end">
          <button
            className="rounded-lg bg-red-600 px-6 py-2 font-bold text-white transition hover:bg-red-500"
            onClick={() => navigate("/")}
          >
            Kilépés a játékból
          </button>
        </div>
      </div>
    </div>
  );
}

export default GamePage;
