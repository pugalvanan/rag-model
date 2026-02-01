import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { useNavigate } from "react-router-dom";

import { auth, db, functions } from "../firebase";
import UserMenu from "../components/UserMenu";
import RequestCard from "../components/RequestCard";
import "./AdminDashboard.css";
import "./AdminApprovalsPage.css";

export default function AdminApprovalsPage() {
  const navigate = useNavigate();
  const [role] = useState("admin");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectModal, setRejectModal] = useState({ open: false, request: null, reason: "" });

  const fetchPending = async () => {
    setLoading(true);
    setError("");
    try {
      const q = query(
        collection(db, "admin_requests"),
        where("status", "==", "pending")
      );
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => {
        const ta = a.requestedAt?.seconds ?? 0;
        const tb = b.requestedAt?.seconds ?? 0;
        return tb - ta;
      });
      setRequests(list);
    } catch (e) {
      console.error("Fetch pending requests error", e);
      setError("Failed to load pending requests. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const u = auth.currentUser;
    if (!u) {
      navigate("/login");
      return;
    }
    fetchPending();
  }, [navigate]);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 4000);
  };

  const handleAccept = async (request) => {
    setActionLoading(request.id);
    setError("");
    try {
      const approve = httpsCallable(functions, "approveAdminRequest");
      await approve({ requestId: request.id });
      setRequests((prev) => prev.filter((r) => r.id !== request.id));
      showToast("Request approved. User has been promoted to admin.");
    } catch (e) {
      console.error("Approve error", e);
      const msg = e?.message || e?.code || "Approval failed. Deploy Cloud Functions if not already deployed.";
      setError(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectClick = (request) => {
    setRejectModal({ open: true, request, reason: "" });
    setError("");
  };

  const handleRejectConfirm = async () => {
    if (!rejectModal.request) return;
    const { request, reason } = rejectModal;
    setActionLoading(request.id);
    setError("");
    try {
      const reject = httpsCallable(functions, "rejectAdminRequest");
      await reject({ requestId: request.id, reason: (reason || "").trim() || undefined });
      setRequests((prev) => prev.filter((r) => r.id !== request.id));
      setRejectModal({ open: false, request: null, reason: "" });
      showToast("Request rejected.");
    } catch (e) {
      console.error("Reject error", e);
      const msg = e?.message || e?.code || "Rejection failed. Deploy Cloud Functions if not already deployed.";
      setError(msg);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && requests.length === 0) {
    return (
      <div className="ad-wrap">
        <div className="ad-main aap-loading-wrap">
          <div className="aap-spinner" aria-hidden="true" />
          <p>Loading pending requests…</p>
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
        <div className="ad-line" />
      </aside>

      <main className="ad-main aap-main">
        <div className="aap-topbar">
          <h1 className="aap-title">Pending Admin Requests</h1>
          <p className="aap-subtitle">Accept or reject admin role requests</p>
        </div>

        <div className="aap-content">
          {toast && (
            <div className="aap-toast" role="status">
              {toast}
            </div>
          )}
          {error && (
            <div className="aap-message aap-message--error" role="alert">
              {error}
              <button type="button" className="aap-retry" onClick={fetchPending}>
                Retry
              </button>
            </div>
          )}

          {requests.length === 0 && !loading ? (
            <p className="aap-empty">No pending admin requests</p>
          ) : (
            <div className="aap-list">
              {requests.map((req) => (
                <RequestCard
                  key={req.id}
                  request={req}
                  onAccept={handleAccept}
                  onReject={handleRejectClick}
                  loading={actionLoading === req.id}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {rejectModal.open && rejectModal.request && (
        <div
          className="modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && setRejectModal({ open: false, request: null, reason: "" })}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Reject admin request</h3>
            <p>Reject request from <strong>{rejectModal.request.requesterEmail}</strong>?</p>
            <label className="ad-label" htmlFor="aap-reject-reason">Reason (optional)</label>
            <input
              id="aap-reject-reason"
              type="text"
              className="ad-input"
              placeholder="Optional reason"
              value={rejectModal.reason}
              onChange={(e) => setRejectModal((m) => ({ ...m, reason: e.target.value }))}
            />
            <div className="modal-actions">
              <button
                type="button"
                className="ad-btn outline"
                onClick={() => setRejectModal({ open: false, request: null, reason: "" })}
              >
                Cancel
              </button>
              <button type="button" className="ad-btn solid aap-btn-reject" onClick={handleRejectConfirm}>
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
