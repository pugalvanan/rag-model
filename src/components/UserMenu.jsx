import React, { useEffect, useRef, useState } from "react";
import "./UserMenu.css";
import userIcon from "../assets/user.webp";

import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

export default function UserMenu({ role = "user", onManageAccess }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const wrapRef = useRef(null);

  // close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (e) {
      alert("Logout failed. Try again.");
    }
  };

  return (
    <div className="userMenu" ref={wrapRef}>
      <button className="userBtn" onClick={() => setOpen((s) => !s)} title="Profile">
        <img className="userAvatar" src={userIcon} alt="User" />
      </button>

      {open && (
        <div className="dropdown">
          <div className="dropdownTop">
            <div className="who">
              Signed in as <b>{role}</b>
            </div>
          </div>

          {role === "admin" && (
            <button
              className="dropItem"
              onClick={() => {
                setOpen(false);
                onManageAccess?.();
              }}
            >
              Manage User Access
            </button>
          )}

          <button className="dropItem danger" onClick={handleLogout}>
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
