import { useState } from "react";
import { useNavigate } from "react-router-dom";

type Props = { setPlayerName: (name: string) => void };

function LoginPage({ setPlayerName }: Props) {
  const [name, setName] = useState("");
  const navigate = useNavigate();

  const handleLogin = () => {
    if (!name.trim()) {
      alert("Kérem, adjon meg egy nevet!");
      return;
    }

    if (name.length < 3) {
      alert("A név nem lehet rövidebb 3 karakternél!");
      return;
    }

    localStorage.setItem("username", name);

    setPlayerName(name);
    navigate("/match-setup");
  };

  return (
    <div id="container">
      <h1 id="login_title">Bejelentkezés a játékba</h1>

      <input
        type="text"
        placeholder="Adja meg a nevét:"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleLogin();
          }
        }}
      />

      <button className="login-btn" onClick={handleLogin}>
        Belépek
      </button>
    </div>
  );
}

export default LoginPage;
