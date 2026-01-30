import React, { useEffect, useRef, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

import { auth, db } from "../firebase";
import UserMenu from "../components/UserMenu";
import "./AdminDashboard.css";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [role, setRole] = useState("admin");
  const [loading, setLoading] = useState(true);

  // threads
  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");

  // upload multiple docs
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [docName, setDocName] = useState("");
  const [files, setFiles] = useState([]); // ✅ multiple
  const [uploading, setUploading] = useState(false);

  // popup
  const [showDocPrompt, setShowDocPrompt] = useState(false);
  const [pendingDocs, setPendingDocs] = useState([]); // ✅ array [{id,name}]
  const [selectedDocId, setSelectedDocId] = useState(""); // pick doc to ask
  const [successMessage, setSuccessMessage] = useState("");

  // in-page query chat (same page, no routing)
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [queryDocId, setQueryDocId] = useState("");
  const [queryDocName, setQueryDocName] = useState("");
  const [queryMessages, setQueryMessages] = useState([]);
  const [queryInput, setQueryInput] = useState("");

  // header profile dropdown
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef(null);
  const categorySelectRef = useRef(null);

  // Load role + threads
  useEffect(() => {
    const load = async () => {
      try {
        const u = auth.currentUser;
        if (!u) {
          setLoading(false);
          return;
        }

        // role
        const userSnap = await getDoc(doc(db, "users", u.uid));
        const r = userSnap.exists() ? userSnap.data()?.role : "user";
        setRole(r === "admin" ? "admin" : "user");

        // threads
        const q1 = query(collection(db, "threads"), where("ownerUid", "==", u.uid));
        const snap = await getDocs(q1);
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));

        setThreads(list);

        // categories (same source as Category Management)
        const qCat = query(collection(db, "categories"), where("createdByUid", "==", u.uid));
        const catSnap = await getDocs(qCat);
        const catList = catSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        catList.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        setCategories(catList);

        if (list[0]) {
          setActiveThreadId(list[0].id);
          setMessages(list[0].messages || []);
        } else {
          setActiveThreadId(null);
          setMessages([]);
        }
      } catch (e) {
        console.error("AdminDashboard load error:", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // Close profile dropdown on outside click and Escape
  useEffect(() => {
    const handleOutside = (e) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === "Escape") setProfileDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleHeaderLogout = async () => {
    setProfileDropdownOpen(false);
    try {
      await signOut(auth);
      navigate("/login");
    } catch (e) {
      alert("Logout failed. Try again.");
    }
  };

  const createThread = async () => {
    const u = auth.currentUser;
    if (!u) return;

    const title = `New chat ${threads.length + 1}`;

    const ref = await addDoc(collection(db, "threads"), {
      ownerUid: u.uid,
      title,
      messages: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const newThread = { id: ref.id, title, messages: [] };
    setThreads([newThread, ...threads]);
    setActiveThreadId(ref.id);
    setMessages([]);
  };

  const openThread = async (id) => {
    setActiveThreadId(id);
    const snap = await getDoc(doc(db, "threads", id));
    if (snap.exists()) setMessages(snap.data().messages || []);
  };

  const onSend = async () => {
    if (!activeThreadId || !message.trim()) return;

    const userMsg = { role: "user", text: message.trim(), ts: Date.now() };
    const next = [...messages, userMsg];
    setMessages(next);
    setMessage("");

    // TODO: connect middleware backend
    const botMsg = {
      role: "assistant",
      text: "Demo reply (connect backend next).",
      ts: Date.now(),
    };
    const finalMsgs = [...next, botMsg];
    setMessages(finalMsgs);

    await setDoc(
      doc(db, "threads", activeThreadId),
      { messages: finalMsgs, updatedAt: serverTimestamp() },
      { merge: true }
    );
  };

  // ✅ MULTI-UPLOAD (Firestore metadata)
  const uploadDocument = async () => {
    setCategoryError("");
    const categorySelected = selectedCategoryId?.trim() && selectedCategoryId !== "Select a category";
    if (!categorySelected) {
      setCategoryError("Please select the category");
      setTimeout(() => categorySelectRef.current?.focus(), 100);
      return;
    }
    if (files.length === 0) {
      alert("Please select documents first.");
      return;
    }

    const u = auth.currentUser;
    if (!u) return alert("Please login again.");

    const selectedCat = categories.find((c) => c.id === selectedCategoryId);
    const categoryName = selectedCat?.name || "";

    try {
      setUploading(true);

      const uploaded = [];

      for (const f of files) {
        const name = docName?.trim()
          ? `${docName.trim()} - ${f.name}`
          : f.name;

        const ref = await addDoc(collection(db, "documents"), {
          ownerUid: u.uid,
          categoryId: selectedCategoryId,
          categoryName,
          name,
          originalFileName: f.name,
          size: f.size,
          mimeType: f.type,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        uploaded.push({ id: ref.id, name });
      }

      setPendingDocs(uploaded);
      setSelectedDocId(uploaded[0]?.id || "");
      setShowDocPrompt(true);
    } catch (e) {
      console.error(e);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // YES: open in-page query chat (no navigation)
  const handleAskQuery = () => {
    if (!selectedDocId) return alert("Please select a document to chat with.");

    const chosen = pendingDocs.find((d) => d.id === selectedDocId);
    if (!chosen) return;

    setShowDocPrompt(false);
    setQueryDocId(chosen.id);
    setQueryDocName(chosen.name);
    setQueryMessages([]);
    setQueryInput("");
    setChatPanelOpen(true);
    // Reset form fields but keep pendingDocs for document switcher in chat
    setSelectedCategoryId("");
    setDocName("");
    setFiles([]);
  };

  // NO: close modal, show success, reset form, stay on page
  const handleCloseUploadModal = () => {
    setShowDocPrompt(false);
    setSuccessMessage("Document uploaded successfully");
    setSelectedCategoryId("");
    setDocName("");
    setFiles([]);
    setPendingDocs([]);
    setSelectedDocId("");
    setTimeout(() => setSuccessMessage(""), 4000);
  };

  // Close query chat panel and reset
  const handleCloseQueryChat = () => {
    setChatPanelOpen(false);
    setQueryDocId("");
    setQueryDocName("");
    setQueryMessages([]);
    setQueryInput("");
    setPendingDocs([]);
    setSelectedDocId("");
  };

  // Switch document in query chat (from dropdown)
  const handleSwitchQueryDoc = (docId) => {
    const chosen = pendingDocs.find((d) => d.id === docId);
    if (!chosen) return;
    setQueryDocId(chosen.id);
    setQueryDocName(chosen.name);
    setQueryMessages([]);
    setQueryInput("");
  };

  // Send query in in-page chat (placeholder backend)
  const onSendQuery = async () => {
    if (!queryInput.trim() || !queryDocId) return;

    const userMsg = { role: "user", text: queryInput.trim(), ts: Date.now() };
    setQueryMessages((prev) => [...prev, userMsg]);
    setQueryInput("");

    // TODO: call backend/AI with queryDocId and user query
    const botMsg = {
      role: "assistant",
      text: "Demo reply (connect backend to process document queries).",
      ts: Date.now(),
    };
    setQueryMessages((prev) => [...prev, botMsg]);
  };

  // Clear query chat messages only
  const handleClearQueryChat = () => {
    setQueryMessages([]);
  };

  if (loading) return <div className="ad-wrap">Loading admin dashboard...</div>;

  return (
    <div className="ad-wrap">
      {/* LEFT SIDEBAR */}
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

        <button className="ad-btn" onClick={createThread}>
          + New Chat
        </button>

        {/* UPLOAD */}
        <div className="ad-controls" id="admin-controls">
          <h3 className="ad-h3">Upload Documents</h3>

          <label className="ad-label" htmlFor="admin-category-select">
            Category
          </label>
          {categories.length === 0 ? (
            <p className="ad-category-empty">No categories available. Add categories first.</p>
          ) : (
            <select
              ref={categorySelectRef}
              id="admin-category-select"
              className={`ad-select ${categoryError ? "ad-select--error ad-select--shake" : ""}`}
              value={selectedCategoryId}
              onChange={(e) => {
                setSelectedCategoryId(e.target.value);
                setCategoryError("");
              }}
              aria-label="Select category"
              aria-invalid={!!categoryError}
              aria-describedby={categoryError ? "admin-category-error" : undefined}
            >
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          {categoryError && (
            <span id="admin-category-error" className="ad-field-error" role="alert">
              {categoryError}
            </span>
          )}

          <label className="ad-label" htmlFor="admin-doc-name">
            Document name (optional)
          </label>
          <input
            id="admin-doc-name"
            className="ad-input"
            placeholder="Document name (optional)"
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
          />

          {/* Hidden multi-file input */}
          <input
            type="file"
            id="adminFileUpload"
            hidden
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
          />

          {/* Styled select button */}
          <button
            type="button"
            className="ad-file-btn"
            onClick={() => document.getElementById("adminFileUpload").click()}
          >
            {files.length > 0 ? `${files.length} file(s) selected` : "Select Documents"}
          </button>

          <button
            type="button"
            className="ad-btn solid"
            onClick={uploadDocument}
            disabled={uploading || categories.length === 0}
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>

          <div className="ad-line" />

          <button
            type="button"
            className="ad-btn outline"
            onClick={() => navigate("/admin/manage-users")}
          >
            Manage User Access
          </button>
        </div>

        <div className="ad-line" />

        {/* SUCCESS MESSAGE (after "No, Close") */}
        {successMessage && (
          <div className="ad-success-msg" role="status">
            {successMessage}
          </div>
        )}

        {/* IN-PAGE QUERY CHAT (expands below Manage User Access) */}
        {chatPanelOpen && (
          <div className="ad-query-panel">
            <div className="ad-query-header">
              <h3 className="ad-query-title">Chat with Document: {queryDocName}</h3>
              {pendingDocs.length > 1 && (
                <select
                  className="ad-query-doc-select"
                  value={queryDocId}
                  onChange={(e) => handleSwitchQueryDoc(e.target.value)}
                  aria-label="Switch document"
                >
                  {pendingDocs.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              )}
              <div className="ad-query-header-actions">
                <button
                  type="button"
                  className="ad-query-btn ad-query-btn--clear"
                  onClick={handleClearQueryChat}
                  title="Clear chat"
                >
                  Clear Chat
                </button>
                <button
                  type="button"
                  className="ad-query-btn ad-query-btn--close"
                  onClick={handleCloseQueryChat}
                  title="Close"
                  aria-label="Close query chat"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="ad-query-messages">
              {queryMessages.length === 0 && (
                <p className="ad-query-placeholder">Ask a question about the uploaded document...</p>
              )}
              {queryMessages.map((m, idx) => (
                <div key={idx} className={`ad-query-msg ${m.role === "user" ? "ad-query-msg--user" : "ad-query-msg--bot"}`}>
                  <span className="ad-query-msg-role">{m.role === "user" ? "You" : "AI"}</span>
                  <div className="ad-query-msg-text">{m.text}</div>
                </div>
              ))}
            </div>
            <div className="ad-query-inputbar">
              <input
                className="ad-query-input"
                placeholder="Ask a question about the uploaded document..."
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                onKeyDown={(e) => (e.key === "Enter" ? onSendQuery() : null)}
                aria-label="Query input"
              />
              <button type="button" className="ad-query-send" onClick={onSendQuery}>
                Send
              </button>
            </div>
          </div>
        )}

        {/* THREAD LIST */}
        <div className="ad-list">
          {threads.map((t) => (
            <button
              key={t.id}
              className={`ad-thread ${t.id === activeThreadId ? "active" : ""}`}
              onClick={() => openThread(t.id)}
            >
              {t.title || "Chat"}
            </button>
          ))}
        </div>
      </aside>

      {/* RIGHT MAIN CHAT */}
      <main className="ad-main">
        <div className="ad-topbar">
          <div className="ad-topbar-title">Admin Chat</div>
          <div className="ad-topbar-profile-wrap" ref={profileDropdownRef}>
            <button
              type="button"
              className="ad-profile-trigger"
              onClick={() => setProfileDropdownOpen((o) => !o)}
              aria-label="User profile menu"
              aria-expanded={profileDropdownOpen}
              aria-haspopup="true"
              id="ad-profile-trigger"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                className="bi bi-person ad-profile-icon"
                viewBox="0 0 16 16"
                aria-hidden="true"
              >
                <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z" />
              </svg>
            </button>
            {profileDropdownOpen && (
              <div
                className="ad-profile-dropdown"
                role="menu"
                aria-labelledby="ad-profile-trigger"
              >
                <button
                  type="button"
                  className="ad-profile-dropdown-item"
                  role="menuitem"
                  onClick={() => { setProfileDropdownOpen(false); navigate("/admin/profile"); }}
                >
                  Profile
                </button>
                <button
                  type="button"
                  className="ad-profile-dropdown-item"
                  role="menuitem"
                  onClick={() => setProfileDropdownOpen(false)}
                >
                  Settings
                </button>
                <button
                  type="button"
                  className="ad-profile-dropdown-item"
                  role="menuitem"
                  onClick={() => { setProfileDropdownOpen(false); navigate("/admin/categories"); }}
                >
                  Category
                </button>
                <button
                  type="button"
                  className="ad-profile-dropdown-item ad-profile-dropdown-item--danger"
                  role="menuitem"
                  onClick={handleHeaderLogout}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="ad-messages">
          {messages.map((m, idx) => (
            <div key={idx} className={`ad-msg ${m.role === "user" ? "me" : "bot"}`}>
              <div className="ad-msg-role">{m.role === "user" ? "You" : "Bot"}</div>
              <div className="ad-msg-text">{m.text}</div>
            </div>
          ))}
        </div>

        <div className="ad-inputbar">
          <input
            className="ad-chat-input"
            placeholder="Ask..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => (e.key === "Enter" ? onSend() : null)}
          />
          <button className="ad-send" onClick={onSend}>
            Send
          </button>
        </div>
      </main>

      {/* ✅ UPLOAD CONFIRMATION MODAL */}
      {showDocPrompt && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Document uploaded successfully!</h3>

            <p>
              Do you want to ask a query about this file?
              {pendingDocs.length > 1 && " Select a document below."}
            </p>

            {pendingDocs.length > 1 && (
              <>
                <label className="ad-label" htmlFor="upload-modal-doc-select">
                  Select document
                </label>
                <select
                  id="upload-modal-doc-select"
                  className="ad-select"
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                >
                  {pendingDocs.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </>
            )}

            <div className="modal-actions" style={{ marginTop: 14 }}>
              <button type="button" className="ad-btn solid" onClick={handleAskQuery}>
                Yes, Ask Query
              </button>
              <button type="button" className="ad-btn outline" onClick={handleCloseUploadModal}>
                No, Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
