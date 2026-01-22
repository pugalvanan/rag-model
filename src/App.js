import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import "./App.css";
import Login from "./pages/Login";

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

function Signup() {
  return (
    <div className="page center">
      <h2>Sign Up Page</h2>
      <p>(UI will be added here)</p>
      <Link to="/" className="link">← Back to Home</Link>
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
