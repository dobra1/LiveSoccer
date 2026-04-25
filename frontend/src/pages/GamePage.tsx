import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSocket } from "../socket";

type Player = {
  name: string;
  team: "A" | "B" | null;
};

function GamePage() {
  const [time, setTime] = useState(0);
  const [scoreA] = useState(0);
  const [scoreB] = useState(0);
  const [players, setPlayers] = useState<Player[]>([]);
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
        }

        if (data.type === "game_started") {
          setPlayers(data.players);
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
    <div className="min-h-screen w-full bg-black px-6 py-4 text-white">
      <div className="mx-auto flex h-full max-w-7xl flex-col items-center">
        <div className="mb-3 flex w-full max-w-5xl items-center justify-between rounded-lg bg-zinc-900 px-3 py-1.5 shadow">
          <div className="w-1/3 text-left text-lg font-bold text-red-400">
            {teamAPlayers.length > 0
              ? teamAPlayers.map((player) => player.name).join(", ")
              : "A csapat"}{" "}
            <span className="text-white px-2">{scoreA}</span>
          </div>

          <div className="rounded-xl bg-black px-8 text-3xl font-black text-lime-400">
            {formatTime(time)}
          </div>

          <div className="w-1/3 text-right text-lg font-bold text-blue-400">
            {teamBPlayers.length > 0
              ? teamBPlayers.map((player) => player.name).join(", ")
              : "B csapat"}{" "}
            <span className="text-white px-2">{scoreB}</span>
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

          <div className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-lg" />

          <div className="absolute left-[25%] top-[25%] h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-black bg-red-500" />
          <div className="absolute left-[18%] top-[50%] h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-black bg-red-500" />
          <div className="absolute left-[25%] top-[75%] h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-black bg-red-500" />

          <div className="absolute left-[75%] top-[25%] h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-black bg-blue-500" />
          <div className="absolute left-[82%] top-[50%] h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-black bg-blue-500" />
          <div className="absolute left-[75%] top-[75%] h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-black bg-blue-500" />
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
