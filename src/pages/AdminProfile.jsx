import React, { useEffect, useState } from "react";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import {
  signOut,
  updateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";

import { auth, db } from "../firebase";
import UserMenu from "../components/UserMenu";
import "./AdminDashboard.css";
import "./AdminProfile.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getAuthErrorMessage(code) {
  switch (code) {
    case "auth/email-already-in-use":
      return "Email already in use";
    case "auth/invalid-email":
      return "Invalid email format";
    case "auth/requires-recent-login":
      return "Please enter your password to confirm email change";
    case "auth/network-request-failed":
      return "Network error. Please try again";
    case "auth/wrong-password":
      return "Incorrect password";
    default:
      return "Something went wrong. Please try again.";
  }
}

export default function AdminProfile() {
  const navigate = useNavigate();
  const [role] = useState("admin");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({ name: "", email: "" });
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForEmail, setPasswordForEmail] = useState("");

  useEffect(() => {
    const u = auth.currentUser;
    if (!u) {
      setLoading(false);
      navigate("/login");
      return;
    }
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        const data = snap.exists() ? snap.data() : {};
        const name = data.name ?? "";
        const email = data.email ?? u.email ?? "";
        setProfile({ name, email });
        setNameInput(name);
        setEmailInput(email);
      } catch (e) {
        console.error("Profile load error", e);
        setError("Failed to load profile. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate]);

  const startEditing = () => {
    setNameInput(profile.name);
    setEmailInput(profile.email);
    setError("");
    setSuccessMessage("");
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setError("");
    setPasswordForEmail("");
    setShowPasswordModal(false);
  };

  const validateAndSave = async () => {
    setError("");
    const name = (nameInput || "").trim();
    const email = (emailInput || "").trim();
    if (!email) {
      setError("Email is required.");
      return;
    }
    if (!EMAIL_REGEX.test(email)) {
      setError("Invalid email format");
      return;
    }
    const u = auth.currentUser;
    if (!u) {
      setError("Please sign in again.");
      return;
    }
    const emailChanged = email !== profile.email;
    if (emailChanged) {
      setShowPasswordModal(true);
      return;
    }
    await saveProfile(u.uid, name, email, null);
  };

  const saveProfile = async (uid, name, email, password) => {
    setSaving(true);
    setError("");
    setSuccessMessage("");
    const u = auth.currentUser;
    if (!u) {
      setSaving(false);
      setError("Please sign in again.");
      return;
    }
    const emailChanged = email !== profile.email;
    try {
      if (emailChanged && password) {
        const credential = EmailAuthProvider.credential(profile.email, password);
        await reauthenticateWithCredential(u, credential);
        await updateEmail(u, email);
      }
      if (emailChanged && !password && email !== u.email) {
        setShowPasswordModal(true);
        setSaving(false);
        return;
      }
      await updateDoc(doc(db, "users", uid), {
        name: name || null,
        email,
        updatedAt: serverTimestamp(),
      });
      setProfile({ name, email });
      setEditing(false);
      setShowPasswordModal(false);
      setPasswordForEmail("");
      setSuccessMessage("Profile updated successfully");
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) {
      console.error(err);
      const code = err?.code || "";
      setError(getAuthErrorMessage(code));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    const name = (nameInput || "").trim();
    const email = (emailInput || "").trim();
    if (!passwordForEmail.trim()) {
      setError("Please enter your password.");
      return;
    }
    saveProfile(auth.currentUser?.uid, name, email, passwordForEmail.trim());
  };

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    try {
      await signOut(auth);
      navigate("/login");
    } catch (e) {
      console.error(e);
      setError("Logout failed. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="ad-wrap">
        <div className="ad-main ap-loading-wrap">
          <div className="ap-spinner" aria-hidden="true" />
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ad-wrap">
      <aside className="ad-side">
        <div className="ad-side-top">
          <div>
            <div className="ad-title">Admin</div>
            <div className="ad-sub">Signed in as <b>{role}</b></div>
          </div>
          <UserMenu
            role={role}
            onManageAccess={() => navigate("/admin/manage-users")}
            onCategoryClick={() => navigate("/admin/categories")}
            onProfileClick={() => navigate("/admin/profile")}
            usePersonIcon={true}
            avatarSize={32}
          />
        </div>
        <button type="button" className="ad-btn outline" onClick={() => navigate("/admin-dashboard")}>
          Back to Dashboard
        </button>
      </aside>

      <main className="ad-main ap-main">
        <div className="ap-topbar">
          <h1 className="ap-title">Profile</h1>
        </div>

        <div className="ap-content">
          {error && (
            <div className="ap-message ap-message--error" role="alert">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="ap-message ap-message--success" role="status">
              {successMessage}
            </div>
          )}

          <div className="ap-card">
            {!editing ? (
              <>
                <div className="ap-field">
                  <label className="ap-label">Name</label>
                  <p className="ap-value">{profile.name || "—"}</p>
                </div>
                <div className="ap-field">
                  <label className="ap-label">Email</label>
                  <p className="ap-value">{profile.email || "—"}</p>
                </div>
                <button type="button" className="ap-btn ap-btn--edit" onClick={startEditing}>
                  Edit Profile
                </button>
              </>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  validateAndSave();
                }}
                className="ap-form"
              >
                <div className="ap-field">
                  <label className="ap-label" htmlFor="ap-name">
                    Name
                  </label>
                  <input
                    id="ap-name"
                    type="text"
                    className="ad-input"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Your name"
                    disabled={saving}
                  />
                </div>
                <div className="ap-field">
                  <label className="ap-label" htmlFor="ap-email">
                    Email
                  </label>
                  <input
                    id="ap-email"
                    type="email"
                    className="ad-input"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="your@email.com"
                    disabled={saving}
                  />
                </div>
                <div className="ap-form-actions">
                  <button type="button" className="ap-btn ap-btn--cancel" onClick={cancelEditing} disabled={saving}>
                    Cancel
                  </button>
                  <button type="submit" className="ap-btn ap-btn--save" disabled={saving}>
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="ap-card">
            <button
              type="button"
              className="ap-btn ap-btn--logout"
              onClick={() => setShowLogoutConfirm(true)}
            >
              Logout
            </button>
          </div>
        </div>
      </main>

      {/* Password modal for email change */}
      {showPasswordModal && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && cancelEditing()}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm email change</h3>
            <p>Enter your current password to update your email.</p>
            <form onSubmit={handlePasswordSubmit}>
              <label className="ad-label" htmlFor="ap-password">
                Password
              </label>
              <input
                id="ap-password"
                type="password"
                className="ad-input"
                value={passwordForEmail}
                onChange={(e) => setPasswordForEmail(e.target.value)}
                placeholder="Your password"
                autoFocus
                disabled={saving}
              />
              <div className="modal-actions">
                <button type="button" className="ad-btn outline" onClick={cancelEditing} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="ad-btn solid" disabled={saving}>
                  {saving ? "Saving..." : "Confirm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Logout confirmation */}
      {showLogoutConfirm && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowLogoutConfirm(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Logout</h3>
            <p>Are you sure you want to logout?</p>
            <div className="modal-actions">
              <button type="button" className="ad-btn outline" onClick={() => setShowLogoutConfirm(false)}>
                Cancel
              </button>
              <button type="button" className="ad-btn solid ap-btn--logout-confirm" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
