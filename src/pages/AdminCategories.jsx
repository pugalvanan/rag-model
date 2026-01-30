import React, { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

import { auth, db } from "../firebase";
import UserMenu from "../components/UserMenu";
import "./AdminDashboard.css";
import "./AdminCategories.css";

export default function AdminCategories() {
  const navigate = useNavigate();
  const [role] = useState("admin");
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [categoryName, setCategoryName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  useEffect(() => {
    const u = auth.currentUser;
    if (!u) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const q = query(
          collection(db, "categories"),
          where("createdByUid", "==", u.uid)
        );
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        setCategories(list);
      } catch (e) {
        console.error("Categories load error", e);
        setMessage({ type: "error", text: "Failed to load categories." });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setCategoryName("");
    setDeleteConfirmId(null);
    setShowModal(true);
    setMessage({ type: "", text: "" });
  };

  const openEdit = (cat) => {
    setEditingId(cat.id);
    setCategoryName(cat.name || "");
    setDeleteConfirmId(null);
    setShowModal(true);
    setMessage({ type: "", text: "" });
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setCategoryName("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = (categoryName || "").trim();
    if (!name) {
      setMessage({ type: "error", text: "Category name is required." });
      return;
    }
    const u = auth.currentUser;
    if (!u) {
      setMessage({ type: "error", text: "Please sign in again." });
      return;
    }
    setSubmitting(true);
    setMessage({ type: "", text: "" });
    try {
      if (editingId) {
        await setDoc(
          doc(db, "categories", editingId),
          { name, updatedAt: serverTimestamp() },
          { merge: true }
        );
        setCategories((prev) =>
          prev.map((c) => (c.id === editingId ? { ...c, name } : c)).sort((a, b) => (a.name || "").localeCompare(b.name || ""))
        );
        setMessage({ type: "success", text: "Category updated successfully." });
      } else {
        const ref = await addDoc(collection(db, "categories"), {
          name,
          createdByUid: u.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setCategories((prev) => [...prev, { id: ref.id, name }].sort((a, b) => (a.name || "").localeCompare(b.name || "")));
        setMessage({ type: "success", text: "Category added successfully." });
      }
      closeModal();
      setTimeout(() => setMessage({ type: "", text: "" }), 4000);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: editingId ? "Update failed." : "Add failed." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (deleteConfirmId !== id) {
      setDeleteConfirmId(id);
      return;
    }
    setSubmitting(true);
    setMessage({ type: "", text: "" });
    try {
      await deleteDoc(doc(db, "categories", id));
      setCategories((prev) => prev.filter((c) => c.id !== id));
      setMessage({ type: "success", text: "Category deleted." });
      setDeleteConfirmId(null);
      setTimeout(() => setMessage({ type: "", text: "" }), 4000);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Delete failed." });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="ad-wrap">
        <div className="ad-main" style={{ justifyContent: "center", alignItems: "center" }}>
          Loading categories...
        </div>
      </div>
    );
  }

  return (
    <div className="ad-wrap">
      {/* SIDEBAR */}
      <aside className="ad-side">
        <div className="ad-side-top">
          <div>
            <div className="ad-title">Admin</div>
            <div className="ad-sub">
              Signed in as <b>{role}</b>
            </div>
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

      {/* MAIN: Category Management */}
      <main className="ad-main ac-main">
        <div className="ac-topbar">
          <div>
            <h1 className="ac-title">Category Management</h1>
            <p className="ac-subtitle">Manage organization file categories</p>
          </div>
        </div>

        <div className="ac-content">
          {message.text && (
            <div className={`ac-message ac-message--${message.type}`} role="alert">
              {message.text}
            </div>
          )}

          <button type="button" className="ad-btn" onClick={openAdd}>
            + Add Category
          </button>

          <div className="ac-list">
            {categories.length === 0 ? (
              <p className="ac-empty">No categories yet. Add one above.</p>
            ) : (
              categories.map((cat) => (
                <div key={cat.id} className="ac-item">
                  <span className="ac-item-name">{cat.name}</span>
                  <div className="ac-item-actions">
                    <button
                      type="button"
                      className="ac-btn ac-btn-edit"
                      onClick={() => openEdit(cat)}
                      title="Edit"
                      aria-label={`Edit ${cat.name}`}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="ac-btn ac-btn-delete"
                      onClick={() => handleDelete(cat.id)}
                      title="Delete"
                      aria-label={`Delete ${cat.name}`}
                    >
                      {deleteConfirmId === cat.id ? "Confirm?" : "Delete"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* ADD/EDIT MODAL */}
      {showModal && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ac-modal-title"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 id="ac-modal-title">{editingId ? "Edit Category" : "Add Category"}</h3>
            <form onSubmit={handleSubmit}>
              <label className="ac-label" htmlFor="ac-name">
                Category name
              </label>
              <input
                id="ac-name"
                type="text"
                className="ad-input"
                placeholder="Category name"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                autoFocus
              />
              <div className="modal-actions">
                <button type="button" className="ad-btn outline" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="ad-btn solid" disabled={submitting}>
                  {editingId ? "Save" : "Add Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
