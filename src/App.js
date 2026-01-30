import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import "./App.css";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import ProtectedRoute from "./components/Protectedroute";
import AdminRoute from "./components/Adminroute";
import Chat from "./pages/Chat";
import AdminDashboard from "./pages/Admindashboard";
import AdminCategories from "./pages/AdminCategories";
import AdminProfile from "./pages/AdminProfile";
import AdminManageUsers from "./pages/AdminManageUsers";

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
        <h1 className="welcome-title">Welcome to the Chatbot</h1>
<p className="welcome-subtitle">
  Your secure AI-powered document assistant.
</p>

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
        <Route path="/chat"element={<ProtectedRoute><Chat /></ProtectedRoute>}/>
        <Route path="/admin-dashboard"element={<ProtectedRoute><AdminRoute><AdminDashboard /></AdminRoute></ProtectedRoute> }/>
        <Route path="/admin/categories" element={<ProtectedRoute><AdminRoute><AdminCategories /></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/profile" element={<ProtectedRoute><AdminRoute><AdminProfile /></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/manage-users" element={<ProtectedRoute><AdminRoute><AdminManageUsers /></AdminRoute></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}
