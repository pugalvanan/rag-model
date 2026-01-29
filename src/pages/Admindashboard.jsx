import React, { useEffect, useState } from "react";
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
import { useNavigate } from "react-router-dom";

import { auth, db } from "../firebase";
import UserMenu from "../components/UserMenu";
import "./AdminDashboard.css";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [role, setRole] = useState("admin");
  const [loading, setLoading] = useState(true);

 
  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");

  
  const [docName, setDocName] = useState("");
  const [file, setFile] = useState(null);

  
  useEffect(() => {
    const load = async () => {
      try {
        const u = auth.currentUser;
        if (!u) {
          setLoading(false);
          return;
        }

        
        const userSnap = await getDoc(doc(db, "users", u.uid));
        const r = userSnap.exists() ? userSnap.data()?.role : "user";
        setRole(r === "admin" ? "admin" : "user");

       
        const q1 = query(collection(db, "threads"), where("ownerUid", "==", u.uid));
        const snap = await getDocs(q1);
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));

        setThreads(list);

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
    const botMsg = { role: "assistant", text: "Demo reply (connect backend next).", ts: Date.now() };
    const finalMsgs = [...next, botMsg];
    setMessages(finalMsgs);

    await setDoc(
      doc(db, "threads", activeThreadId),
      { messages: finalMsgs, updatedAt: serverTimestamp() },
      { merge: true }
    );
  };

  
  const uploadDocument = async () => {
    if (!file) return alert("Please select a document first.");
    alert(
      `Upload clicked (UI only)\nName: ${docName || file.name}\nFile: ${file.name}\nNext: Firebase Storage upload`
    );
  };

  if (loading) return <div className="ad-wrap">Loading admin dashboard...</div>;

  return (
    <div className="ad-wrap">
     
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
            onManageAccess={() => navigate("/admin/grant-access")}
          />
        </div>

        <button className="ad-btn" onClick={createThread}>
          + New Chat
        </button>

        
        <div className="ad-controls" id="admin-controls">
          <h3 className="ad-h3">Upload Document</h3>

          <input
            className="ad-input"
            placeholder="Document name (optional)"
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
          />

          
          <input
            type="file"
            id="adminFileUpload"
            hidden
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />

          
          <button
            type="button"
            className="ad-file-btn"
            onClick={() => document.getElementById("adminFileUpload").click()}
          >
            {file ? file.name : "Select Document"}
          </button>

          <button className="ad-btn solid" onClick={uploadDocument}>
            Upload
          </button>

          <div className="ad-line" />

          
          <button
            type="button"
            className="ad-btn outline"
            onClick={() => navigate("/admin/grant-access")}
          >
            Manage User Access
          </button>
        </div>

        <div className="ad-line" />

        
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

      
      <main className="ad-main">
        <div className="ad-topbar">
          <div className="ad-topbar-title">Admin Chat</div>
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
    </div>
  );
}
