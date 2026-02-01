import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../firebase";
import "./AdminApprovalBell.css";

/** Format timestamp to relative time (e.g. "2 hours ago") */
function timeAgo(timestamp) {
  if (!timestamp) return "";
  const seconds = timestamp?.seconds ?? (timestamp?.toMillis ? timestamp.toMillis() / 1000 : null);
  if (seconds == null) return "";
  const d = new Date(seconds * 1000);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffM = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffM / 60);
  const diffD = Math.floor(diffH / 24);
  if (diffM < 1) return "Just now";
  if (diffM < 60) return `${diffM} min ago`;
  if (diffH < 24) return `${diffH} hour(s) ago`;
  if (diffD < 7) return `${diffD} day(s) ago`;
  return d.toLocaleDateString();
}

export default function AdminApprovalBell() {
  const [open, setOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState("");
  const [confirmModal, setConfirmModal] = useState({ open: false, type: null, user: null });
  const dropdownRef = useRef(null);

  const pendingCount = pendingRequests.length;
  const notificationCount = notifications.length;
  const badgeCount = pendingCount + notificationCount;

  const fetchPending = useCallback(async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const userSnap = await getDoc(doc(db, "users", uid));
      const userData = userSnap.exists() ? userSnap.data() : {};
      if (userData.role !== "admin" || userData.status === "pending_admin") return;

      const q = query(
        collection(db, "users"),
        where("status", "==", "pending_admin")
      );
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => {
        const data = d.data();
        const createdAt = data.createdAt ?? null;
        return {
          id: d.id,
          name: data.name ?? "",
          email: data.email ?? "",
          role: data.role ?? "user",
          status: data.status ?? "pending_admin",
          createdAt,
        };
      });
      list.sort((a, b) => {
        const ta = a.createdAt?.seconds ?? 0;
        const tb = b.createdAt?.seconds ?? 0;
        return tb - ta;
      });
      setPendingRequests(list);
    } catch (e) {
      console.error("AdminApprovalBell pending-requests error", e);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const q = query(
        collection(db, "notifications"),
        where("targetRole", "==", "admin")
      );
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          type: data.type ?? "",
          message: data.message ?? "",
          createdAt: data.createdAt ?? null,
        };
      });
      list.sort((a, b) => {
        const ta = a.createdAt?.seconds ?? 0;
        const tb = b.createdAt?.seconds ?? 0;
        return tb - ta;
      });
      setNotifications(list);
    } catch (e) {
      console.error("AdminApprovalBell notifications error", e);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchPending(), fetchNotifications()]);
    setLoading(false);
  }, [fetchPending, fetchNotifications]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!open) return;
    loadAll();
  }, [open, loadAll]);

  useEffect(() => {
    const onRefresh = () => loadAll();
    window.addEventListener("admin-pending-refresh", onRefresh);
    return () => window.removeEventListener("admin-pending-refresh", onRefresh);
  }, [loadAll]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const openConfirm = (type, user) => {
    setConfirmModal({ open: true, type, user });
  };

  const closeConfirm = () => {
    setConfirmModal({ open: false, type: null, user: null });
  };

  const handleApprove = async () => {
    const { user } = confirmModal;
    if (!user) return;
    setActionLoading(user.id);
    try {
      const userRef = doc(db, "users", user.id);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        setPendingRequests((prev) => prev.filter((u) => u.id !== user.id));
        setToast("User no longer exists.");
        closeConfirm();
        return;
      }
      const data = userSnap.data();
      if ((data.status || "") !== "pending_admin") {
        setPendingRequests((prev) => prev.filter((u) => u.id !== user.id));
        setToast("Request already processed.");
        closeConfirm();
        return;
      }
      const adminUid = auth.currentUser?.uid;
      if (adminUid === user.id) {
        setToast("You cannot approve your own request.");
        return;
      }
      await updateDoc(userRef, {
        role: "admin",
        status: "active",
        approvedBy: adminUid,
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setPendingRequests((prev) => prev.filter((u) => u.id !== user.id));
      setToast("Admin access granted");
      closeConfirm();
      if (auth.currentUser?.uid === user.id) {
        try {
          await auth.currentUser.getIdToken(true);
          window.dispatchEvent(new CustomEvent("admin-role-refreshed"));
        } catch (refreshErr) {
          console.warn("Token refresh after approve:", refreshErr);
        }
      }
    } catch (e) {
      console.error("Approve error:", e);
      setToast(e?.message ?? "Approval failed. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    const { user } = confirmModal;
    if (!user) return;
    setActionLoading(user.id);
    try {
      const userRef = doc(db, "users", user.id);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        setPendingRequests((prev) => prev.filter((u) => u.id !== user.id));
        setToast("User no longer exists.");
        closeConfirm();
        return;
      }
      const data = userSnap.data();
      if ((data.status || "") !== "pending_admin") {
        setPendingRequests((prev) => prev.filter((u) => u.id !== user.id));
        setToast("Request already processed.");
        closeConfirm();
        return;
      }
      const adminUid = auth.currentUser?.uid;
      if (adminUid === user.id) {
        setToast("You cannot reject your own request.");
        return;
      }
      await updateDoc(userRef, {
        status: "rejected_admin",
        rejectedBy: adminUid,
        rejectedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setPendingRequests((prev) => prev.filter((u) => u.id !== user.id));
      setToast("Admin request rejected");
      closeConfirm();
    } catch (e) {
      console.error("Reject error:", e);
      setToast(e?.message ?? "Rejection failed. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="approval-bell-wrap" ref={dropdownRef}>
      <button
        type="button"
        className="approval-bell"
        onClick={() => setOpen((o) => !o)}
        aria-label={`${badgeCount} pending request(s)`}
        aria-expanded={open}
        aria-haspopup="true"
        title="Notifications"
      >
        <svg className="approval-bell-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {badgeCount > 0 && (
          <span className="approval-bell-badge" aria-hidden="true">
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="approval-bell-dropdown" role="dialog" aria-label="Notifications">
          {toast && (
            <div className="approval-bell-toast" role="status">
              {toast}
            </div>
          )}
          <div className="approval-bell-dropdown-header">Notifications</div>
          {loading ? (
            <div className="approval-bell-loading">Loading…</div>
          ) : (
            <div className="approval-bell-list">
              {pendingRequests.map((user) => (
                <div key={user.id} className="approval-bell-item approval-bell-item--admin">
                  <div className="approval-bell-item-title">Admin Request</div>
                  <div className="approval-bell-item-body">
                    {user.name || user.email} {user.email && user.name ? `(${user.email})` : ""}
                  </div>
                  <div className="approval-bell-item-meta">Requested admin access</div>
                  <div className="approval-bell-item-actions">
                    <button
                      type="button"
                      className="approval-bell-btn approval-bell-btn--accept"
                      onClick={() => openConfirm("approve", user)}
                      disabled={!!actionLoading}
                    >
                      {actionLoading === user.id ? "…" : "Accept"}
                    </button>
                    <button
                      type="button"
                      className="approval-bell-btn approval-bell-btn--reject"
                      onClick={() => openConfirm("reject", user)}
                      disabled={!!actionLoading}
                    >
                      {actionLoading === user.id ? "…" : "Reject"}
                    </button>
                  </div>
                  <div className="approval-bell-item-time">
                    {timeAgo(user.createdAt) || "—"}
                  </div>
                </div>
              ))}
              {notifications.map((n) => (
                <div key={n.id} className="approval-bell-item approval-bell-item--notification">
                  <div className="approval-bell-item-title">
                    {n.type === "USER_DELETED" ? "User deleted" : n.type || "Notification"}
                  </div>
                  <div className="approval-bell-item-body">{n.message || "—"}</div>
                  <div className="approval-bell-item-time">{timeAgo(n.createdAt)}</div>
                </div>
              ))}
              {pendingRequests.length === 0 && notifications.length === 0 && (
                <div className="approval-bell-empty">No pending requests</div>
              )}
            </div>
          )}
        </div>
      )}

      {confirmModal.open && confirmModal.user && (
        <div
          className="approval-bell-modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && closeConfirm()}
          role="presentation"
        >
          <div className="approval-bell-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="approval-bell-modal-title">
              {confirmModal.type === "approve" ? "Grant admin access" : "Reject admin request"}
            </h3>
            <p className="approval-bell-modal-text">
              {confirmModal.type === "approve"
                ? `Grant admin access to ${confirmModal.user.name || confirmModal.user.email || "this user"}?`
                : `Reject admin request from ${confirmModal.user.name || confirmModal.user.email || "this user"}?`}
            </p>
            <div className="approval-bell-modal-actions">
              <button type="button" className="approval-bell-btn outline" onClick={closeConfirm} disabled={!!actionLoading}>
                Cancel
              </button>
              {confirmModal.type === "approve" ? (
                <button type="button" className="approval-bell-btn approval-bell-btn--accept" onClick={handleApprove} disabled={!!actionLoading}>
                  {actionLoading === confirmModal.user.id ? "…" : "Accept"}
                </button>
              ) : (
                <button type="button" className="approval-bell-btn approval-bell-btn--reject" onClick={handleReject} disabled={!!actionLoading}>
                  {actionLoading === confirmModal.user.id ? "…" : "Reject"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
