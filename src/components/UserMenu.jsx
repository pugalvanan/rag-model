import React, { useEffect, useRef, useState } from "react";
import "./UserMenu.css";
import userIcon from "../assets/user.webp";

import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

const PersonIconSvg = ({ width = 16, height = 16, className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={width}
    height={height}
    fill="currentColor"
    className={`bi bi-person ${className || ""}`}
    viewBox="0 0 16 16"
    aria-hidden="true"
  >
    <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z" />
  </svg>
);

export default function UserMenu({ role = "user", onManageAccess, onCategoryClick, onProfileClick, avatarSrc, avatarSize, usePersonIcon = false }) {
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

  const closeAnd = (fn) => () => {
    setOpen(false);
    fn?.();
  };

  const avatarStyle = avatarSize ? { width: avatarSize, height: avatarSize } : undefined;

  return (
    <div className="userMenu" ref={wrapRef}>
      <button className="userBtn" onClick={() => setOpen((s) => !s)} title="Profile" aria-label="User profile menu">
        {usePersonIcon ? (
          <span className="userMenu-personIcon" style={avatarStyle}>
            <PersonIconSvg width={avatarSize || 32} height={avatarSize || 32} />
          </span>
        ) : (
          <img
            className={`userAvatar ${avatarSize ? "userAvatar--sized" : ""}`}
            style={avatarStyle}
            src={avatarSrc || userIcon}
            alt="User"
          />
        )}
      </button>

      {open && (
        <div className="dropdown">
          <div className="dropdownTop">
            <div className="who">
              Signed in as <b>{role}</b>
            </div>
          </div>

          <button className="dropItem" onClick={onProfileClick ? closeAnd(onProfileClick) : closeAnd()}>
            Profile
          </button>
          <button className="dropItem" onClick={closeAnd()}>
            Settings
          </button>

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

          {role === "admin" && onCategoryClick && (
            <button
              className="dropItem"
              onClick={() => {
                setOpen(false);
                onCategoryClick?.();
              }}
            >
              Category
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
