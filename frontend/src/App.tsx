import "./App.css";
import GamePage from "./pages/GamePage";
import { Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import MatchSetupPage from "./pages/MatchSetupPage";
import { useState } from "react";

function App() {
  const [playerName, setPlayerName] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");

  return (
    <Routes>
      <Route path="/" element={<LoginPage setPlayerName={setPlayerName} />} />

      <Route
        path="/match-setup"
        element={
          <MatchSetupPage
            playerName={playerName}
            selectedTeam={selectedTeam}
            setSelectedTeam={setSelectedTeam}
            setPlayerName={setPlayerName}
          />
        }
      />

      <Route
        path="/game"
        element={
          <GamePage playerName={playerName} selectedTeam={selectedTeam} />
        }
      />
    </Routes>
  );
}

export default App;
