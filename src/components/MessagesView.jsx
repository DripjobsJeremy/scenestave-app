const MessagesView = ({ currentUser, contacts, productions, userRole }) => {
  const [threads, setThreads] = React.useState([]);
  const [activeThreadId, setActiveThreadId] = React.useState(null);
  const [showCompose, setShowCompose] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [replyBody, setReplyBody] = React.useState('');
  const replyRef = React.useRef(null);

  // currentUser shape: { id, name, role }
  // Derive from props or localStorage if not passed
  const me = React.useMemo(() => {
    if (currentUser) return currentUser;
    const stored = JSON.parse(localStorage.getItem('showsuite_current_user') || '{}');
    return {
      id: stored.id || 'user_' + (userRole || 'admin'),
      name: stored.name || stored.displayName || 'Admin',
      role: userRole || stored.role || 'admin',
    };
  }, [currentUser, userRole]);

  const loadThreads = React.useCallback(() => {
    setThreads(window.messagesService.getThreadsForUser(me.id));
  }, [me.id]);

  React.useEffect(() => {
    loadThreads();
    const handler = () => loadThreads();
    window.addEventListener('messagesUpdated', handler);
    // Poll every 10 seconds for new messages (Phase 1 — no WebSocket yet)
    const poll = setInterval(loadThreads, 10000);
    return () => {
      window.removeEventListener('messagesUpdated', handler);
      clearInterval(poll);
    };
  }, [loadThreads]);

  // Mark thread as read when opened
  React.useEffect(() => {
    if (activeThreadId) {
      window.messagesService.markThreadRead(activeThreadId, me.id);
      loadThreads();
    }
  }, [activeThreadId, me.id]);

  const activeThread = React.useMemo(() =>
    threads.find(t => t.id === activeThreadId) || null,
    [threads, activeThreadId]
  );

  const filteredThreads = React.useMemo(() => {
    if (!searchQuery) return threads;
    const q = searchQuery.toLowerCase();
    return threads.filter(t =>
      t.subject.toLowerCase().includes(q) ||
      t.participants.some(p => p.name.toLowerCase().includes(q))
    );
  }, [threads, searchQuery]);

  const handleSendReply = () => {
    if (!replyBody.trim() || !activeThreadId) return;
    if (replyRef.current) replyRef.current.style.height = '40px';
    window.messagesService.sendMessage({
      threadId: activeThreadId,
      senderUser: me,
      body: replyBody.trim(),
    });
    setReplyBody('');
    loadThreads();
  };

  const fmtTime = (iso) => {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    return isToday
      ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getThreadPreview = (thread) => {
    const last = thread.messages[thread.messages.length - 1];
    return last ? last.body.slice(0, 60) + (last.body.length > 60 ? '...' : '') : '';
  };

  const getOtherParticipants = (thread) =>
    thread.participants.filter(p => p.id !== me.id);

  const getUnread = (thread) =>
    window.messagesService.getThreadUnreadCount(thread.id, me.id);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 80px)', overflow: 'hidden',
      backgroundColor: 'var(--color-bg-base)' }}>

      {/* LEFT: Thread list */}
      <div style={{ width: '320px', flexShrink: 0, display: 'flex', flexDirection: 'column',
        borderRight: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-surface)' }}>

        {/* Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Messages
            </h2>
            <button type="button" onClick={() => setShowCompose(true)}
              className="btn-primary px-3 py-1.5 rounded-lg text-sm">
              + Compose
            </button>
          </div>
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px',
              border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-elevated)',
              color: 'var(--color-text-primary)' }}
          />
        </div>

        {/* Thread list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredThreads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--color-text-muted)' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>💬</div>
              <p style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px',
                color: 'var(--color-text-primary)' }}>No messages yet</p>
              <p style={{ fontSize: '12px' }}>Start a conversation with your team</p>
            </div>
          ) : filteredThreads.map(thread => {
            const unread = getUnread(thread);
            const others = getOtherParticipants(thread);
            const isActive = thread.id === activeThreadId;
            return (
              <div key={thread.id}
                onClick={() => setActiveThreadId(thread.id)}
                style={{
                  padding: '14px 16px', cursor: 'pointer',
                  borderBottom: '1px solid var(--color-border)',
                  backgroundColor: isActive ? 'var(--color-primary-surface)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
                  transition: 'background-color 0.1s',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'var(--color-bg-elevated)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: unread > 0 ? 600 : 500,
                    color: 'var(--color-text-primary)', flex: 1, marginRight: '8px',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {others.map(p => p.name).join(', ') || 'You'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    {unread > 0 && (
                      <span style={{ backgroundColor: 'var(--color-primary)', color: '#fff',
                        fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '99px',
                        minWidth: '18px', textAlign: 'center' }}>
                        {unread}
                      </span>
                    )}
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                      {fmtTime(thread.updatedAt)}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: '12px', fontWeight: unread > 0 ? 600 : 400,
                  color: unread > 0 ? 'var(--color-text-secondary)' : 'var(--color-text-muted)',
                  marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {thread.subject}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {getThreadPreview(thread)}
                </div>
                {thread.productionTitle && (
                  <div style={{ fontSize: '10px', color: 'var(--color-primary)', marginTop: '4px' }}>
                    🎭 {thread.productionTitle}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT: Thread / Chat window */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {!activeThread ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: '12px', color: 'var(--color-text-muted)' }}>
            <div style={{ fontSize: '48px' }}>💬</div>
            <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
              Select a conversation
            </p>
            <p style={{ fontSize: '13px' }}>or compose a new message</p>
            <button type="button" onClick={() => setShowCompose(true)}
              className="btn-primary px-4 py-2 rounded-lg text-sm mt-2">
              + Compose
            </button>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-surface)', display: 'flex', justifyContent: 'space-between',
              alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)',
                  marginBottom: '2px' }}>
                  {activeThread.subject}
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  {activeThread.participants.map(p => p.name).join(', ')}
                  {activeThread.productionTitle && ` · 🎭 ${activeThread.productionTitle}`}
                </p>
              </div>
              {me.role === 'super_admin' && (
                <button type="button"
                  onClick={() => {
                    if (window.confirm('Delete this conversation?')) {
                      window.messagesService.deleteThread(activeThread.id);
                      setActiveThreadId(null);
                      loadThreads();
                    }
                  }}
                  style={{ fontSize: '12px', color: 'var(--color-danger)', background: 'none',
                    border: 'none', cursor: 'pointer', padding: '4px 8px' }}>
                  Delete
                </button>
              )}
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px',
              display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activeThread.messages.map((msg, i) => {
                const isMe = msg.senderId === me.id;
                const showSender = i === 0 || activeThread.messages[i-1]?.senderId !== msg.senderId;
                return (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: 'column',
                    alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                    {showSender && !isMe && (
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)',
                        marginBottom: '3px', marginLeft: '4px' }}>
                        {msg.senderName}
                      </span>
                    )}
                    <div style={{
                      maxWidth: '68%', padding: '10px 14px', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      backgroundColor: isMe ? 'var(--color-primary)' : 'var(--color-bg-elevated)',
                      color: isMe ? '#ffffff' : 'var(--color-text-primary)',
                      fontSize: '13px', lineHeight: '1.5',
                    }}>
                      {msg.body}
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--color-text-muted)',
                      marginTop: '3px', marginLeft: isMe ? 0 : '4px', marginRight: isMe ? '4px' : 0 }}>
                      {fmtTime(msg.sentAt)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Reply composer */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-surface)', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
              <textarea
                ref={replyRef}
                value={replyBody}
                onChange={e => {
                  setReplyBody(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (replyRef.current) replyRef.current.style.height = '40px';
                    handleSendReply();
                  }
                }}
                placeholder="Write a message... (Enter to send, Shift+Enter for new line)"
                style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', fontSize: '13px',
                  border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-elevated)',
                  color: 'var(--color-text-primary)', resize: 'none', lineHeight: '1.5',
                  height: '40px', minHeight: '40px', maxHeight: '150px', overflowY: 'auto' }}
              />
              <button type="button" onClick={handleSendReply}
                disabled={!replyBody.trim()}
                className="btn-primary px-4 py-2 rounded-lg text-sm"
                style={{ flexShrink: 0, opacity: replyBody.trim() ? 1 : 0.5 }}>
                Send
              </button>
            </div>
          </>
        )}
      </div>

      {/* COMPOSE MODAL */}
      {showCompose && (
        <ComposeModal
          me={me}
          contacts={contacts}
          productions={productions}
          onSend={(threadData) => {
            window.messagesService.createThread(threadData);
            loadThreads();
            setShowCompose(false);
          }}
          onClose={() => setShowCompose(false)}
        />
      )}
    </div>
  );
};

const ComposeModal = ({ me, contacts, productions, onSend, onClose }) => {
  const [recipients, setRecipients] = React.useState([]);
  const [subject, setSubject] = React.useState('');
  const [body, setBody] = React.useState('');
  const [productionId, setProductionId] = React.useState('');
  const [recipientSearch, setRecipientSearch] = React.useState('');
  const [showRecipientDropdown, setShowRecipientDropdown] = React.useState(false);

  const messagableRoles = window.messagesService.getMessagableRoles(me.role);

  // Build recipient options from contacts + users
  const allUsers = React.useMemo(() => {
    const users = JSON.parse(localStorage.getItem('showsuite_users') || '[]');
    const actors = JSON.parse(localStorage.getItem('showsuite_actors') || '[]');
    const result = [];

    users.forEach(u => {
      if (u.id === me.id) return;
      if (!messagableRoles.includes(u.role)) return;
      result.push({ id: u.id, name: u.name || `${u.firstName} ${u.lastName}`.trim(), role: u.role, type: 'user' });
    });

    if (messagableRoles.includes('actor')) {
      actors.forEach(a => {
        result.push({ id: a.id, name: `${a.firstName} ${a.lastName}`.trim(), role: 'actor', type: 'actor' });
      });
    }

    return result;
  }, [me.role, messagableRoles]);

  const filteredUsers = recipientSearch.length > 0
    ? allUsers.filter(u => u.name.toLowerCase().includes(recipientSearch.toLowerCase()) &&
        !recipients.find(r => r.id === u.id))
    : [];

  const addRecipient = (user) => {
    setRecipients(prev => [...prev, user]);
    setRecipientSearch('');
    setShowRecipientDropdown(false);
  };

  const removeRecipient = (id) => setRecipients(prev => prev.filter(r => r.id !== id));

  const handleSend = () => {
    if (!recipients.length || !body.trim()) return;
    const prod = productions?.find(p => p.id === productionId);
    onSend({
      senderUser: me,
      recipientUsers: recipients,
      subject: subject || `Message from ${me.name}`,
      body: body.trim(),
      productionId: productionId || null,
      productionTitle: prod?.title || null,
    });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ backgroundColor: 'var(--color-bg-surface)', borderRadius: '12px',
        padding: '24px', width: '520px', maxWidth: '90vw',
        border: '1px solid var(--color-border)', maxHeight: '90vh', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            New Message
          </h3>
          <button type="button" onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer',
              color: 'var(--color-text-muted)', lineHeight: 1 }}>
            ×
          </button>
        </div>

        {/* Recipients */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '6px' }}>
            To
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '8px',
            borderRadius: '6px', border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-elevated)', minHeight: '40px', position: 'relative' }}>
            {recipients.map(r => (
              <span key={r.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '2px 8px', borderRadius: '99px', fontSize: '12px',
                backgroundColor: 'var(--color-primary-surface)', color: 'var(--color-primary)',
                border: '1px solid var(--color-primary)' }}>
                {r.name}
                <button type="button" onClick={() => removeRecipient(r.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit',
                    fontSize: '14px', lineHeight: 1, padding: 0 }}>
                  ×
                </button>
              </span>
            ))}
            <input
              type="text"
              value={recipientSearch}
              onChange={e => { setRecipientSearch(e.target.value); setShowRecipientDropdown(true); }}
              onFocus={() => setShowRecipientDropdown(true)}
              placeholder={recipients.length === 0 ? 'Search for recipient...' : ''}
              style={{ border: 'none', outline: 'none', fontSize: '13px', flex: 1, minWidth: '120px',
                backgroundColor: 'transparent', color: 'var(--color-text-primary)' }}
            />
            {showRecipientDropdown && filteredUsers.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 60,
                backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)',
                borderRadius: '6px', marginTop: '2px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                maxHeight: '200px', overflowY: 'auto' }}>
                {filteredUsers.map(u => (
                  <div key={u.id} onMouseDown={() => addRecipient(u)}
                    style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px',
                      color: 'var(--color-text-primary)' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-bg-elevated)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <span style={{ fontWeight: 500 }}>{u.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginLeft: '6px' }}>
                      {u.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Subject */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '6px' }}>
            Subject
          </label>
          <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
            placeholder="Subject (optional)"
            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px',
              border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-elevated)',
              color: 'var(--color-text-primary)' }} />
        </div>

        {/* Production context (optional) */}
        {productions?.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '6px' }}>
              Related Production (optional)
            </label>
            <select value={productionId} onChange={e => setProductionId(e.target.value)}
              title="Related production"
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px',
                border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-elevated)',
                color: 'var(--color-text-primary)' }}>
              <option value="">— No production —</option>
              {productions.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
        )}

        {/* Body */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '6px' }}>
            Message
          </label>
          <textarea value={body} onChange={e => setBody(e.target.value)}
            placeholder="Write your message..."
            rows={5}
            style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', fontSize: '13px',
              border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-elevated)',
              color: 'var(--color-text-primary)', resize: 'vertical', lineHeight: '1.5' }} />
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} className="btn-secondary px-4 py-2 rounded-lg text-sm">
            Cancel
          </button>
          <button type="button" onClick={handleSend}
            disabled={!recipients.length || !body.trim()}
            className="btn-primary px-4 py-2 rounded-lg text-sm"
            style={{ opacity: recipients.length && body.trim() ? 1 : 0.5 }}>
            Send Message
          </button>
        </div>
      </div>
    </div>
  );
};

window.MessagesView = MessagesView;
console.log('✅ MessagesView loaded');
