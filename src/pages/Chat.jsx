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

import { auth, db } from "../firebase";
import UserMenu from "../components/UserMenu";
import "../Chat.css";

export default function Chat() {
  // ✅ role from Firestore: "admin" | "user"
  const [role, setRole] = useState("user");
  const [loading, setLoading] = useState(true);

  // Threads / Messages
  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");

  // ✅ Load role + threads on mount
  useEffect(() => {
    const loadAll = async () => {
      try {
        const u = auth.currentUser;
        if (!u) {
          setLoading(false);
          return;
        }

        // 1) Load role
        const userSnap = await getDoc(doc(db, "users", u.uid));
        const userRole = userSnap.exists() ? userSnap.data()?.role : "user";
        setRole(userRole === "admin" ? "admin" : "user");

        // 2) Load threads for this user
        const q1 = query(
          collection(db, "threads"),
          where("ownerUid", "==", u.uid)
        );
        const snap = await getDocs(q1);

        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort(
          (a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0)
        );

        setThreads(list);

        if (list[0]) {
          setActiveThreadId(list[0].id);
          setMessages(list[0].messages || []);
        } else {
          setActiveThreadId(null);
          setMessages([]);
        }
      } catch (err) {
        console.error("Load error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadAll();
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
    const nextMsgs = [...messages, userMsg];
    setMessages(nextMsgs);
    setMessage("");

    try {
      // 🔌 Call Python RAG Backend
      const response = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: message.trim(),
          thread_id: activeThreadId,
          user_id: auth.currentUser?.uid,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      const botMsg = {
        role: "assistant",
        text: data.answer,
        sources: data.sources || [],
        ts: Date.now(),
      };

      const finalMsgs = [...nextMsgs, botMsg];
      setMessages(finalMsgs);

      await setDoc(
        doc(db, "threads", activeThreadId),
        {
          messages: finalMsgs,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error("Error calling RAG API:", err);
      const errorMsg = {
        role: "assistant",
        text: `Error: ${err.message}. Make sure Python RAG server is running on port 8000.`,
        ts: Date.now(),
      };

      const finalMsgs = [...nextMsgs, errorMsg];
      setMessages(finalMsgs);
    }
  };

  // ✅ Admin actions (placeholder UI)
  const onAdminUpload = () => {
    alert("Admin: Upload document (next step we will connect Firebase Storage)");
  };

  const onAdminManageAccess = () => {
    alert("Admin: Manage user access (next step we will build this UI)");
  };

  if (loading) {
    return <div style={{ padding: 20 }}>Loading chat...</div>;
  }

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* LEFT: HISTORY */}
      <aside style={{ width: 320, borderRight: "1px solid #ddd", padding: 12 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>History</div>
            <div style={{ fontSize: 12, color: "#666" }}>
              Signed in as <b>{role}</b>
            </div>
          </div>

          {/* ✅ Profile icon (person SVG, same as admin dashboard) */}
          <UserMenu
            role={role}
            onManageAccess={onAdminManageAccess}
            usePersonIcon={true}
            avatarSize={32}
          />
        </div>

        <button className="chat-new-chat-btn" onClick={createThread}>
          + New Chat
        </button>

        <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
          {threads.map((t) => (
            <button
              key={t.id}
              onClick={() => openThread(t.id)}
              style={{
                textAlign: "left",
                padding: 10,
                border: "1px solid #ddd",
                borderRadius: 10,
                background: t.id === activeThreadId ? "#fff7f2" : "white",
                cursor: "pointer",
              }}
            >
              {t.title || "Chat"}
            </button>
          ))}
        </div>
      </aside>

      {/* RIGHT: CHAT */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* HEADER */}
        <div
          style={{
            padding: 14,
            borderBottom: "1px solid #ddd",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <b style={{ fontSize: 18 }}>
            {role === "admin" ? "Admin Chat" : "User Chat"}
          </b>

          {/* ✅ ADMIN CONTROLS ONLY */}
          {role === "admin" && (
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onAdminUpload}>Upload Document</button>
              <button onClick={onAdminManageAccess}>Manage Access</button>
            </div>
          )}
        </div>

        {/* MESSAGES */}
        <div style={{ flex: 1, padding: 14, overflowY: "auto" }}>
          {messages.map((m, idx) => (
            <div key={idx} style={{ marginBottom: 10 }}>
              <b>{m.role === "user" ? "You" : "Bot"}:</b> {m.text}
            </div>
          ))}
        </div>

        {/* INPUT */}
        <div className="chat-inputbar">
          <input
            className="chat-query-input"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask..."
            onKeyDown={(e) => (e.key === "Enter" ? onSend() : null)}
          />
          <button type="button" className="chat-send-btn" onClick={onSend}>
            Send
          </button>
        </div>
      </main>
    </div>
  );
}
