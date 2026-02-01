import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

export default function AdminRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const checkRole = useCallback(async () => {
    const u = auth.currentUser;
    if (!u) {
      setAllowed(false);
      setLoading(false);
      return;
    }
    const snap = await getDoc(doc(db, "users", u.uid));
    const data = snap.exists() ? snap.data() : {};
    const role = data.role || "user";
    const status = data.status || "active";
    setAllowed(role === "admin" && status === "active");
    setLoading(false);
  }, []);

  useEffect(() => {
    checkRole();
  }, [checkRole]);

  useEffect(() => {
    const onRefresh = () => {
      setLoading(true);
      checkRole();
    };
    window.addEventListener("admin-role-refreshed", onRefresh);
    return () => window.removeEventListener("admin-role-refreshed", onRefresh);
  }, [checkRole]);

  if (loading) return <div style={{ padding: 20 }}>Checking role...</div>;
  if (!allowed) return <Navigate to="/chat" replace />;

  return children;
}
