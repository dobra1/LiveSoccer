import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSocket } from "../socket";

type Props = {
  setPlayerName: (name: string) => void;
  setSelectedTeam: (team: string) => void;
};

type Player = {
  name: string;
  team: "A" | "B" | null;
};

function LoginPage({ setPlayerName, setSelectedTeam }: Props) {
  const [name, setName] = useState("");
  const [gameId, setGameId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "join" | "">("");

  const wsRef = useRef<WebSocket | null>(null);
  const navigate = useNavigate();

  const connectSocket = () => {
    const ws = getSocket();
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Szerver üzenet:", data);

      if (data.type === "room_created") {
        setRoomId(data.roomId);
      }

      if (data.type === "players_update") {
        setPlayers(data.players);
      }

      if (data.type === "game_started") {
        navigate("/game");
      }

      if (data.type === "error") {
        alert(data.message);
      }
    };

    return ws;
  };

  const handleCreateGame = () => {
    if (!name.trim()) {
      alert("Add meg a neved!");
      return;
    }

    setPlayerName(name);
    setMode("create");
    setIsModalOpen(true);

    const ws = connectSocket();

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "create_room",
          name,
        }),
      );
    };
  };

  const handleJoinGame = () => {
    if (!name.trim()) {
      alert("Add meg a neved!");
      return;
    }

    if (!gameId.trim()) {
      alert("Add meg a szobaazonosítót!");
      return;
    }

    setPlayerName(name);
    setRoomId(gameId);
    setMode("join");
    setIsModalOpen(true);

    const ws = connectSocket();

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "join_room",
          name,
          roomId: gameId,
        }),
      );
    };
  };

  const selectTeam = (team: "A" | "B") => {
    setSelectedTeam(team);

    wsRef.current?.send(
      JSON.stringify({
        type: "select_team",
        team,
      }),
    );
  };

  const handleStartGame = () => {
    if (players.length < 2) {
      alert("Legalább 2 játékos szükséges!");
      return;
    }

    const allHaveTeam = players.every((p) => p.team);

    if (!allHaveTeam) {
      alert("Minden játékosnak választania kell csapatot!");
      return;
    }

    wsRef.current?.send(
      JSON.stringify({
        type: "start_game",
      }),
    );
  };

  const leftTeam = players.filter((p) => p.team === "A");
  const rightTeam = players.filter((p) => p.team === "B");
  const waitingPlayers = players.filter((p) => !p.team);

  return (
    <div className="min-h-screen w-full bg-black text-white">
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="flex w-full max-w-md flex-col items-center">
          <h1 className="bg-gradient-to-r from-lime-400 to-emerald-500 bg-clip-text text-center text-7xl font-black text-transparent">
            BALLZONE
          </h1>

          <button className="mb-8 mt-6 text-2xl font-bold text-yellow-300 transition hover:scale-105">
            How to play?
          </button>

          <label className="mb-5 w-full">
            <p className="mb-2 text-zinc-300">Enter your name</p>
            <input
              type="text"
              placeholder="Player"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 w-full rounded-lg bg-zinc-500/40 px-4 text-white outline-none ring-green-500 placeholder:text-zinc-400 focus:ring"
            />
          </label>

          <label className="mb-4 w-full">
            <p className="mb-2 text-zinc-300">Enter game id</p>
            <input
              type="text"
              placeholder="Game id..."
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              className="h-10 w-full rounded-lg bg-zinc-500/40 px-4 text-white outline-none ring-green-500 placeholder:text-zinc-400 focus:ring"
            />
          </label>

          <button
            className="mb-6 h-10 w-full rounded-lg bg-gradient-to-r from-lime-500 to-emerald-500 font-extrabold text-black transition hover:opacity-80 transition delay-150 duration-300 ease-in-out hover:-translate-y-1 hover:scale-110 hover:bg-indigo-500"
            onClick={handleJoinGame}
          >
            Join game
          </button>

          <div className="mb-6 flex w-full items-center gap-3">
            <div className="h-px flex-1 bg-zinc-500/40" />
            <p className="text-zinc-500">or</p>
            <div className="h-px flex-1 bg-zinc-500/40" />
          </div>

          <button
            className="h-10 w-full rounded-lg bg-gradient-to-r from-lime-500 to-emerald-500 font-extrabold text-black transition hover:opacity-80"
            onClick={handleCreateGame}
          >
            Create game
          </button>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-md">
          <div className="w-full max-w-5xl rounded-2xl bg-zinc-900 p-8 shadow-2xl">
            {mode === "create" && (
              <>
                <h2 className="mb-4 text-center text-3xl font-black text-white">
                  VÁROK A KEZDÉSRE
                </h2>

                <p className="mb-4 text-center text-xl font-bold tracking-widest text-lime-400">
                  Szobaazonosító: {roomId}
                </p>

                <h3 className="mb-6 text-center text-zinc-300">
                  Kattints egy csapat nevére, hogy csatlakozz
                </h3>
              </>
            )}

            {mode === "join" && (
              <>
                <h2 className="mb-4 text-center text-3xl font-black text-white">
                  VÁLASSZ CSAPATOT
                </h2>

                <p className="mb-6 text-center text-zinc-400">
                  Csatlakoztál a játékhoz. Válassz csapatot!
                </p>
              </>
            )}

            <div className="grid grid-cols-3 gap-6">
              <div
                onClick={() => selectTeam("A")}
                className="flex min-h-80 cursor-pointer flex-col items-center rounded-2xl border border-zinc-700 bg-zinc-800 p-6 transition hover:scale-105 hover:border-lime-400"
              >
                <h3 className="mb-6 text-2xl font-bold text-lime-400">
                  Left Team
                </h3>

                <div className="flex w-full flex-col gap-3">
                  {leftTeam.map((player, index) => (
                    <div
                      key={index}
                      className="rounded-lg bg-zinc-700 px-4 py-3 text-center"
                    >
                      {player.name}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex min-h-80 flex-col items-center rounded-2xl border border-zinc-700 bg-black/40 p-6">
                <h3 className="mb-6 text-2xl font-bold text-white">Players</h3>

                <div className="flex w-full flex-col gap-3">
                  {waitingPlayers.map((player, index) => (
                    <div
                      key={index}
                      className="rounded-lg bg-zinc-800 px-4 py-3 text-center"
                    >
                      {player.name}
                    </div>
                  ))}
                </div>
              </div>

              <div
                onClick={() => selectTeam("B")}
                className="flex min-h-80 cursor-pointer flex-col items-center rounded-2xl border border-zinc-700 bg-zinc-800 p-6 transition hover:scale-105 hover:border-emerald-400"
              >
                <h3 className="mb-6 text-2xl font-bold text-emerald-400">
                  Right Team
                </h3>

                <div className="flex w-full flex-col gap-3">
                  {rightTeam.map((player, index) => (
                    <div
                      key={index}
                      className="rounded-lg bg-zinc-700 px-4 py-3 text-center"
                    >
                      {player.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-center gap-4">
              <button
                className="rounded-lg bg-zinc-700 px-8 py-2 font-bold text-white transition hover:bg-zinc-600"
                onClick={() => setIsModalOpen(false)}
              >
                Close
              </button>

              <button
                className="rounded-lg bg-gradient-to-r from-lime-500 to-emerald-500 px-8 py-2 font-extrabold text-black transition hover:opacity-80"
                onClick={handleStartGame}
              >
                Start game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoginPage;
