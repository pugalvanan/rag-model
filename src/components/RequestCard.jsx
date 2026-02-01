import React from "react";
import "./RequestCard.css";

function formatDate(timestamp) {
  if (!timestamp || !timestamp.seconds) return "—";
  return new Date(timestamp.seconds * 1000).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function RequestCard({ request, onAccept, onReject, loading }) {
  return (
    <div className="request-card">
      <div className="request-card-body">
        <div className="request-card-field">
          <span className="request-card-label">Name</span>
          <span className="request-card-value">{request.requesterName || "—"}</span>
        </div>
        <div className="request-card-field">
          <span className="request-card-label">Email</span>
          <span className="request-card-value">{request.requesterEmail || "—"}</span>
        </div>
        <div className="request-card-field">
          <span className="request-card-label">Requested at</span>
          <span className="request-card-value">{formatDate(request.requestedAt)}</span>
        </div>
      </div>
      <div className="request-card-actions">
        <button
          type="button"
          className="request-card-btn request-card-btn--accept"
          onClick={() => onAccept(request)}
          disabled={loading}
        >
          {loading ? "…" : "Accept"}
        </button>
        <button
          type="button"
          className="request-card-btn request-card-btn--reject"
          onClick={() => onReject(request)}
          disabled={loading}
        >
          {loading ? "…" : "Reject"}
        </button>
      </div>
    </div>
  );
}
