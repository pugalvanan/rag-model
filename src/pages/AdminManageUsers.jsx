/* eslint-disable import/first */
import React, { useEffect, useState, useMemo } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import UserMenu from "../components/UserMenu";
import "./AdminDashboard.css";
import "./AdminManageUsers.css";

const PER_PAGE = 15;
const SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "email", label: "Email" },
  { value: "createdAt", label: "Registration Date" },
];
const FILTER_OPTIONS = [
  { value: "all", label: "All Users" },
  { value: "active", label: "Active Users" },
  { value: "blocked", label: "Blocked Users" },
];

function formatDate(timestamp) {
  if (!timestamp || !timestamp.seconds) return "—";
  return new Date(timestamp.seconds * 1000).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function AdminManageUsers() {
  const navigate = useNavigate();
  const [role] = useState("admin");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("user");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const currentUid = auth.currentUser?.uid;

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const snapshot = await getDocs(collection(db, "users"));
      const list = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name ?? "",
          email: data.email ?? "",
          role: data.role ?? "user",
          status: data.status ?? "active",
          createdAt: data.createdAt ?? null,
          lastLoginAt: data.lastLoginAt ?? null,
        };
      });
      setUsers(list);
    } catch (e) {
      console.error("Fetch users error", e);
      setError("Failed to load users. Please try again.");
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
    fetchUsers();
  }, [navigate]);

  const filteredAndSorted = useMemo(() => {
    let list = [...users];
    const q = (search || "").toLowerCase().trim();
    if (q) {
      list = list.filter(
        (u) =>
          (u.name || "").toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q)
      );
    }
    if (statusFilter === "active") list = list.filter((u) => u.status === "active");
    if (statusFilter === "blocked") list = list.filter((u) => u.status === "blocked");
    const order = sortOrder === "asc" ? 1 : -1;
    list.sort((a, b) => {
      let va = a[sortBy];
      let vb = b[sortBy];
      if (sortBy === "createdAt" || sortBy === "lastLoginAt") {
        va = va?.seconds ?? 0;
        vb = vb?.seconds ?? 0;
        return order * (va - vb);
      }
      va = (va || "").toString().toLowerCase();
      vb = (vb || "").toString().toLowerCase();
      return order * va.localeCompare(vb);
    });
    return list;
  }, [users, search, statusFilter, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / PER_PAGE));
  const paginated = useMemo(() => {
    const start = (page - 1) * PER_PAGE;
    return filteredAndSorted.slice(start, start + PER_PAGE);
  }, [filteredAndSorted, page]);

  const openEdit = (user) => {
    setEditingUser(user);
    setEditName(user.name || "");
    setEditRole(user.role || "user");
    setActionError("");
  };

  const closeEdit = () => {
    setEditingUser(null);
    setEditName("");
    setEditRole("user");
    setActionError("");
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setSaving(true);
    setActionError("");
    try {
      await updateDoc(doc(db, "users", editingUser.id), {
        name: (editName || "").trim() || null,
        role: editRole,
        updatedAt: serverTimestamp(),
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? { ...u, name: (editName || "").trim() || "", role: editRole }
            : u
        )
      );
      setSuccessMessage("User updated successfully");
      setTimeout(() => setSuccessMessage(""), 4000);
      closeEdit();
    } catch (e) {
      console.error(e);
      setActionError("Update failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (user) => {
    const newStatus = user.status === "active" ? "blocked" : "active";
    setActionError("");
    try {
      await updateDoc(doc(db, "users", user.id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u))
      );
      setSuccessMessage(`User ${newStatus === "blocked" ? "blocked" : "unblocked"} successfully`);
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (e) {
      console.error(e);
      setActionError("Failed to update status.");
    }
  };

  const openDeleteConfirm = (user) => {
    setDeleteTarget(user);
    setActionError("");
  };

  const closeDeleteConfirm = () => {
    setDeleteTarget(null);
    setActionError("");
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    setActionError("");
    const userId = deleteTarget.id;
    try {
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        setActionError("User no longer exists.");
        closeDeleteConfirm();
        return;
      }
      const userData = userSnap.data();
      const deletedUserEmail = userData.email || userData.name || userId;

      const adminUid = auth.currentUser?.uid;
      let adminEmail = "";
      if (adminUid) {
        const adminSnap = await getDoc(doc(db, "users", adminUid));
        const adminData = adminSnap.exists() ? adminSnap.data() : {};
        adminEmail = adminData.email || adminData.name || adminUid;
      }

      const refsToDelete = [userRef];

      const q1 = query(collection(db, "admin_requests"), where("requesterId", "==", userId));
      const snap1 = await getDocs(q1);
      snap1.docs.forEach((d) => refsToDelete.push(d.ref));

      const q2 = query(collection(db, "admin_requests"), where("userId", "==", userId));
      const snap2 = await getDocs(q2);
      snap2.docs.forEach((d) => refsToDelete.push(d.ref));

      const q3 = query(collection(db, "notifications"), where("requesterId", "==", userId));
      const snap3 = await getDocs(q3);
      snap3.docs.forEach((d) => refsToDelete.push(d.ref));

      const q4 = query(collection(db, "notifications"), where("referenceUserId", "==", userId));
      const snap4 = await getDocs(q4);
      snap4.docs.forEach((d) => refsToDelete.push(d.ref));

      const q5 = query(
        collection(db, "notifications"),
        where("type", "==", "ADMIN_REQUEST"),
        where("referenceId", "==", userId)
      );
      const snap5 = await getDocs(q5);
      snap5.docs.forEach((d) => refsToDelete.push(d.ref));

      const uniqueRefs = [...new Set(refsToDelete)];
      const BATCH_SIZE = 500;
      for (let i = 0; i < uniqueRefs.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        uniqueRefs.slice(i, i + BATCH_SIZE).forEach((ref) => batch.delete(ref));
        await batch.commit();
      }

      await addDoc(collection(db, "notifications"), {
        type: "USER_DELETED",
        message: `User ${deletedUserEmail} was deleted by ${adminEmail}`,
        targetRole: "admin",
        deletedUserId: userId,
        deletedBy: adminUid,
        createdAt: serverTimestamp(),
      });

      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setSuccessMessage("User removed successfully");
      setTimeout(() => setSuccessMessage(""), 4000);
      closeDeleteConfirm();
      window.dispatchEvent(new CustomEvent("admin-pending-refresh"));
    } catch (e) {
      console.error("Delete user error:", e);
      setActionError(e?.message ?? "Delete failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="ad-wrap">
        <div className="ad-main amu-loading-wrap">
          <div className="amu-spinner" aria-hidden="true" />
          <p>Loading users…</p>
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

      <main className="ad-main amu-main">
        <div className="amu-topbar">
          <div>
            <h1 className="amu-title">Manage User Access</h1>
            <p className="amu-subtitle">View and manage all registered users</p>
          </div>
          <button type="button" className="ad-btn outline" onClick={() => navigate("/admin-dashboard")}>
            Back to Dashboard
          </button>
        </div>

        <div className="amu-content">
          {error && (
            <div className="amu-message amu-message--error" role="alert">
              {error}
              <button type="button" className="amu-retry" onClick={fetchUsers}>
                Retry
              </button>
            </div>
          )}
          {successMessage && (
            <div className="amu-message amu-message--success" role="status">
              {successMessage}
            </div>
          )}
          {actionError && (
            <div className="amu-message amu-message--error" role="alert">
              {actionError}
            </div>
          )}

          {!error && (
            <>
              <div className="amu-toolbar">
                <input
                  type="search"
                  className="amu-search"
                  placeholder="Search by name or email…"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  aria-label="Search users"
                />
                <select
                  className="amu-select"
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                  aria-label="Filter by status"
                >
                  {FILTER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <select
                  className="amu-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  aria-label="Sort by"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="amu-sort-order"
                  onClick={() => setSortOrder((o) => (o === "asc" ? "desc" : "asc"))}
                  title={sortOrder === "asc" ? "Descending" : "Ascending"}
                  aria-label={`Sort ${sortOrder === "asc" ? "descending" : "ascending"}`}
                >
                  {sortOrder === "asc" ? "↑" : "↓"}
                </button>
              </div>

              <div className="amu-table-wrap">
                {filteredAndSorted.length === 0 ? (
                  <p className="amu-empty">No users found</p>
                ) : (
                  <table className="amu-table" role="grid">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Registration Date</th>
                        <th>Last Login</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((user, index) => (
                        <tr key={user.id} className={user.id === currentUid ? "amu-row-you" : ""}>
                          <td>{(page - 1) * PER_PAGE + index + 1}</td>
                          <td>{user.name || "—"}{user.id === currentUid && <span className="amu-badge-you">You</span>}</td>
                          <td>{user.email || "—"}</td>
                          <td><span className={`amu-badge amu-badge--${user.role}`}>{user.role}</span></td>
                          <td><span className={`amu-badge amu-badge--${user.status}`}>{user.status}</span></td>
                          <td>{formatDate(user.createdAt)}</td>
                          <td>{formatDate(user.lastLoginAt)}</td>
                          <td>
                            <div className="amu-actions">
                              <button type="button" className="amu-btn amu-btn--edit" onClick={() => openEdit(user)} title="Edit">Edit</button>
                              <button type="button" className={`amu-btn amu-btn--status`} onClick={() => toggleStatus(user)} title={user.status === "active" ? "Block" : "Unblock"}>
                                {user.status === "active" ? "Block" : "Unblock"}
                              </button>
                              <button type="button" className="amu-btn amu-btn--delete" onClick={() => openDeleteConfirm(user)} title="Delete" disabled={user.id === currentUid}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {filteredAndSorted.length > 0 && (
                <div className="amu-pagination">
                  <span className="amu-total">Total: {filteredAndSorted.length} user(s)</span>
                  <div className="amu-pagination-controls">
                    <button type="button" className="ad-btn outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                      Previous
                    </button>
                    <span className="amu-page-info">Page {page} of {totalPages}</span>
                    <button type="button" className="ad-btn outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Edit modal */}
      {editingUser && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && closeEdit()}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Edit User</h3>
            {actionError && <p className="amu-modal-error">{actionError}</p>}
            <form onSubmit={handleSaveEdit}>
              <label className="ad-label" htmlFor="amu-edit-name">Name</label>
              <input id="amu-edit-name" type="text" className="ad-input" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" disabled={saving} />
              <label className="ad-label" htmlFor="amu-edit-role">Role</label>
              <select id="amu-edit-role" className="ad-select" value={editRole} onChange={(e) => setEditRole(e.target.value)} disabled={saving}>
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
              <div className="modal-actions">
                <button type="button" className="ad-btn outline" onClick={closeEdit} disabled={saving}>Cancel</button>
                <button type="submit" className="ad-btn solid" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && closeDeleteConfirm()}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Delete User</h3>
            <p>Are you sure you want to remove <strong>{deleteTarget.email || deleteTarget.id}</strong>? This cannot be undone.</p>
            {actionError && <p className="amu-modal-error">{actionError}</p>}
            <div className="modal-actions">
              <button type="button" className="ad-btn outline" onClick={closeDeleteConfirm} disabled={saving}>Cancel</button>
              <button type="button" className="ad-btn solid amu-btn-delete-confirm" onClick={handleDelete} disabled={saving}>{saving ? "Deleting…" : "Delete"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
