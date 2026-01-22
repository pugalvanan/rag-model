    import React, { useMemo, useState } from "react";
import "./Signup.css";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;
const EyeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
    <circle cx="12" cy="12" r="3" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </svg>
);

export default function Signup() {
  const [role, setRole] = useState("");   
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
   const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");


  const [touched, setTouched] = useState({
    role: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  const emailValid = emailRegex.test(email.trim());
  const passwordValid = passwordRegex.test(password);
  const confirmValid = confirmPassword.length > 0 && confirmPassword === password;

  const roleError = touched.role && !role ? "Please select Admin or User." : "";
  const emailError =
    touched.email && !emailValid ? "Enter a valid email address." : "";
  const passwordError =
    touched.password && !passwordValid
      ? "Password must be 8+ chars and include 1 uppercase, 1 lowercase, and 1 special character."
      : "";
  const confirmError =
    touched.confirmPassword && !confirmValid ? "Passwords do not match." : "";

  const canSubmit = useMemo(() => {
    return role && emailValid && passwordValid && confirmValid;
  }, [role, emailValid, passwordValid, confirmValid]);

  const onSubmit = (e) => {
    e.preventDefault();

    setTouched({
      role: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    if (!canSubmit) return;

   
    alert(`Signup success (demo)\nRole: ${role}\nEmail: ${email}`);
  };

  return (
    <div className="signup-bg">
      <div className="signup-card">
        <h1 className="signup-title">Sign Up</h1>

        <form className="signup-form" onSubmit={onSubmit}>
          {/* ROLE */}
          <label className="label">Select Account Type</label>
          <div className="role-row">
            <label className={`role-pill ${role === "admin" ? "active" : ""}`}>
              <input
                type="radio"
                name="role"
                value="admin"
                checked={role === "admin"}
                onChange={() => setRole("admin")}
                onBlur={() => setTouched((p) => ({ ...p, role: true }))}
              />
              Admin
            </label>

            <label className={`role-pill ${role === "user" ? "active" : ""}`}>
              <input
                type="radio"
                name="role"
                value="user"
                checked={role === "user"}
                onChange={() => setRole("user")}
                onBlur={() => setTouched((p) => ({ ...p, role: true }))}
              />
              User
            </label>
          </div>
          {roleError ? <p className="error">{roleError}</p> : <div className="space" />}

          {/* EMAIL */}
          <label className="label">Email</label>
          <input
            className={`input ${emailError ? "input-error" : ""}`}
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched((p) => ({ ...p, email: true }))}
          />
          {emailError ? <p className="error">{emailError}</p> : <div className="space" />}

          {/* PASSWORD */}
          <label className="label">Password</label>
<div className={`field ${passwordError ? "field-error" : ""}`}>
  <input
    className="field-input"
    type={showPassword ? "text" : "password"}
    placeholder="Create a password"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    onBlur={() => setTouched((p) => ({ ...p, password: true }))}
  />

  <button
    type="button"
    className="icon-btn"
    onClick={() => setShowPassword((s) => !s)}
    aria-label={showPassword ? "Hide password" : "Show password"}
  >
    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
  </button>
</div>
{passwordError ? <p className="error">{passwordError}</p> : <div className="space" />}

          
          {/* CONFIRM PASSWORD */}
          <label className="label">Confirm Password</label>
<div className={`field ${confirmError ? "field-error" : ""}`}>
  <input
    className="field-input"
    type={showConfirmPassword ? "text" : "password"}
    placeholder="Re-enter password"
    value={confirmPassword}
    onChange={(e) => setConfirmPassword(e.target.value)}
    onBlur={() => setTouched((p) => ({ ...p, confirmPassword: true }))}
  />

  <button
    type="button"
    className="icon-btn"
    onClick={() => setShowConfirmPassword((s) => !s)}
    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
  >
    {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
  </button>
</div>

{touched.confirmPassword && confirmPassword.length > 0 && confirmPassword !== password ? (
  <p className="error">Password mismatch</p>
) : (
  <div className="space" />
)}

          {confirmError ? <p className="error">{confirmError}</p> : <div className="space" />}

          {/* SUBMIT */}
          <button className="signup-btn" type="submit" disabled={!canSubmit}>
            SIGN UP
          </button>
        </form>
      </div>
    </div>
  );
}
