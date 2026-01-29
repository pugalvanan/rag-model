import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

import { auth, db } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";


const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;
const EyeIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="black"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="black"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
    <circle cx="12" cy="12" r="3" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </svg>
);

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
    const navigate = useNavigate();
    
const [firebaseError, setFirebaseError] = useState("");



  const [touched, setTouched] = useState({ email: false, password: false });
  const [showPassword, setShowPassword] = useState(false);
  


  const isEmailValid = emailRegex.test(email.trim());
  const isPasswordValid = passwordRegex.test(password);

  const emailError =
    touched.email && !isEmailValid ? "Enter a valid email address." : "";

  const passwordError =
    touched.password && !isPasswordValid
      ? "Password must be 8+ chars, include 1 uppercase, 1 lowercase, and 1 special character."
      : "";

  const canSubmit = isEmailValid && isPasswordValid;

  const onSubmit = async (e) => {
  e.preventDefault();
  setTouched({ email: true, password: true });
  setFirebaseError("");

  if (!canSubmit) return;

  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);

    
const snap = await getDoc(doc(db, "users", cred.user.uid));
const data = snap.exists() ? snap.data() : null;
const role = data?.role || "user";

if (role === "admin") navigate("/admin-dashboard");
else navigate("/chat");

  } catch (err) {
    const code = err?.code || "";

    if (code === "auth/user-not-found") {
      setFirebaseError("No account found. Please sign up.");
    } else if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
      setFirebaseError("Incorrect email or password.");
    } else if (code === "auth/too-many-requests") {
      setFirebaseError("Too many attempts. Try again later.");
    } else {
      setFirebaseError("Login failed. Please try again.");
    }
  }
};


  return (
    <div className="login-bg">
      <div className="login-card">
        <h1 className="login-title">Login</h1>

        <form className="login-form" onSubmit={onSubmit}>
          {/* EMAIL */}
          <label className="login-label">Email</label>
          <div className={`input-wrap ${emailError ? "input-error" : ""}`}>
            <span className="icon" aria-hidden="true"></span>
            <input
              type="email"
              placeholder="Type your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((p) => ({ ...p, email: true }))}
            />
          </div>
          {emailError ? <p className="error-text">{emailError}</p> : <div className="error-space" />}

          {/* PASSWORD */}
          <label className="login-label">Password</label>
          <div className={`input-wrap password-wrap ${passwordError ? "input-error" : ""}`}>
    <input
    type={showPassword ? "text" : "password"}
    placeholder="Type your password"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    onBlur={() => setTouched((p) => ({ ...p, password: true }))}
  />

  <button
    type="button"
    className="eye-btn"
    onClick={() => setShowPassword((s) => !s)}
    aria-label={showPassword ? "Hide password" : "Show password"}
  >
    {showPassword ? <EyeOffIcon /> : <EyeIcon />}

  </button>
</div>

          {passwordError ? <p className="error-text">{passwordError}</p> : <div className="error-space" />}

          <div className="forgot-row">
            <button type="button" className="link-btn">
              Forgot password?
            </button>
          </div>
          {firebaseError ? <p className="error">{firebaseError}</p> : <div className="space" />}


          <button type="submit" className="login-btn" disabled={!canSubmit}>
            LOGIN
          </button>


          <div className="signup-only">
  <button
  type="button"
  className="signup-link"
  onClick={() => navigate("/signup")}
>
  SIGN UP
</button>

</div>

        </form>
      </div>
    </div>
  );
}
