import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

export default function AdminRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const run = async () => {
      const u = auth.currentUser;
      if (!u) {
        setAllowed(false);
        setLoading(false);
        return;
      }
      const snap = await getDoc(doc(db, "users", u.uid));
      const role = snap.exists() ? snap.data().role : "user";
      setAllowed(role === "admin");
      setLoading(false);
    };
    run();
  }, []);

  if (loading) return <div style={{ padding: 20 }}>Checking role...</div>;
  if (!allowed) return <Navigate to="/chat" replace />;

  return children;
}
