import "./App.css";
import GamePage from "./pages/GamePage";
import { Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import { useState } from "react";

function App() {
  const [, setPlayerName] = useState("");
  const [, setSelectedTeam] = useState("");

  return (
    <Routes>
      <Route
        path="/"
        element={
          <LoginPage
            setPlayerName={setPlayerName}
            setSelectedTeam={setSelectedTeam}
          />
        }
      />

      <Route path="/game" element={<GamePage />} />
    </Routes>
  );
}

export default App;
