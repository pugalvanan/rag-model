import React from "react";
import { Link } from "react-router-dom";
import "./PendingAdminPage.css";

export default function PendingAdminPage() {
  return (
    <div className="pending-admin-wrap">
      <div className="pending-admin-card">
        <h1 className="pending-admin-title">Admin Request Submitted</h1>
        <p className="pending-admin-text">
          Your request for an admin account has been submitted. An existing admin will review it shortly.
        </p>
        <p className="pending-admin-text">
          You will be able to use the app as a regular user until your request is approved or rejected.
        </p>
        <Link to="/chat" className="pending-admin-btn">
          Go to Chat
        </Link>
      </div>
    </div>
  );
}
