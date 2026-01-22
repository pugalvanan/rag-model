import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import "./App.css";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";

function Home() {
  return (
    <div className="page">
      <header className="navbar">
        <div className="brand">RAG Chatbot</div>

        <div className="nav-actions">
          <Link to="/login" className="btn btn-outline">Login</Link>
          <Link to="/signup" className="btn btn-solid">Sign Up</Link>
        </div>
      </header>

      <main className="hero">
        <h1>Welcome to the Chatbot</h1>
        <p>Your secure AI-powered document assistant.</p>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Routes>
    </Router>
  );
}
