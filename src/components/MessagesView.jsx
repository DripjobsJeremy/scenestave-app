const fmtSlot = (slot) => {
  if (!slot?.date || !slot?.time) return 'Unknown time';
  try {
    const d = new Date(`${slot.date}T${slot.time}`);
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
      + ' at ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      + ` (${slot.duration} min)`;
  } catch { return `${slot.date} ${slot.time} (${slot.duration} min)`; }
};

const InvitationCard = ({ msg, me, onRespond }) => {
  const inv = msg.invitation;
  const isPending = inv.status === 'pending';
  const isRecipient = msg.senderId !== me.id;
  const [selectedSlot, setSelectedSlot] = React.useState(null);

  return (
    <div style={{ maxWidth: '420px', borderRadius: '12px', overflow: 'hidden',
      border: '2px solid var(--color-primary)', backgroundColor: 'var(--color-bg-surface)' }}>
      {/* Header */}
      <div style={{ backgroundColor: 'var(--color-primary)', padding: '12px 16px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>
          🎭 Audition Invitation
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
          {inv.productionTitle}
        </div>
      </div>

      <div style={{ padding: '14px 16px' }}>
        {/* Status badge */}
        {!isPending && (
          <div style={{ marginBottom: '10px', padding: '4px 10px', borderRadius: '99px',
            display: 'inline-block', fontSize: '12px', fontWeight: 600,
            backgroundColor: inv.status === 'accepted' ? '#d1fae5' : '#fee2e2',
            color: inv.status === 'accepted' ? '#065f46' : '#991b1b' }}>
            {inv.status === 'accepted' ? '✓ Accepted' : '✗ Declined'}
            {inv.acceptedSlot && ` — ${fmtSlot(inv.acceptedSlot)}`}
          </div>
        )}

        {/* Slots */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
            Available Times
          </div>
          {inv.slots.map((slot, i) => (
            <div key={i}
              onClick={() => isRecipient && isPending && setSelectedSlot(i)}
              style={{ padding: '8px 10px', borderRadius: '6px', marginBottom: '4px',
                cursor: isRecipient && isPending ? 'pointer' : 'default',
                border: `1px solid ${selectedSlot === i ? 'var(--color-primary)' : 'var(--color-border)'}`,
                backgroundColor: selectedSlot === i ? 'var(--color-primary-surface)' : 'var(--color-bg-elevated)',
                display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0,
                border: `2px solid ${selectedSlot === i ? 'var(--color-primary)' : 'var(--color-border)'}`,
                backgroundColor: selectedSlot === i ? 'var(--color-primary)' : 'transparent' }} />
              <span style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>
                {fmtSlot(slot)}
              </span>
            </div>
          ))}
        </div>

        {/* Location */}
        {inv.location && (
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
            📍 {inv.location}
          </div>
        )}

        {/* Notes */}
        {inv.notes && (
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)',
            padding: '8px 10px', borderRadius: '6px', backgroundColor: 'var(--color-bg-elevated)',
            marginBottom: '12px', lineHeight: '1.5' }}>
            {inv.notes}
          </div>
        )}

        {/* Accept / Decline — only for recipient when pending */}
        {isRecipient && isPending && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button"
              onClick={() => {
                if (inv.slots.length > 1 && selectedSlot === null) {
                  window.showToast?.('Please select a time slot first', 'warning');
                  return;
                }
                onRespond('accepted', inv.slots.length === 1 ? inv.slots[0] : inv.slots[selectedSlot]);
              }}
              style={{ flex: 1, padding: '9px', borderRadius: '6px', fontSize: '13px',
                fontWeight: 600, cursor: 'pointer', border: 'none',
                backgroundColor: '#065f46', color: '#34d399' }}>
              ✓ Accept
            </button>
            <button type="button"
              onClick={() => onRespond('declined', null)}
              style={{ flex: 1, padding: '9px', borderRadius: '6px', fontSize: '13px',
                fontWeight: 600, cursor: 'pointer', border: '1px solid #ef4444',
                backgroundColor: '#fee2e2', color: '#991b1b' }}>
              ✗ Decline
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const MessagesView = ({ currentUser, contacts, productions, userRole }) => {
  const [threads, setThreads] = React.useState([]);
  const [activeThreadId, setActiveThreadId] = React.useState(null);
  const [showCompose, setShowCompose] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [replyBody, setReplyBody] = React.useState('');
  const [textareaKey, setTextareaKey] = React.useState(0);
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

  const handleInvitationResponse = (msg, thread, status, slot) => {
    // 1. Update invitation status in the message
    window.messagesService.updateMessageInvitation(thread.id, msg.id, {
      status,
      acceptedSlot: slot || null,
      respondedAt: new Date().toISOString(),
    });

    // 2. Send auto-reply in thread (notifies sender via unread badge)
    const replyText = status === 'accepted'
      ? `${me.name} accepted the audition invitation${slot ? ` for ${fmtSlot(slot)}` : ''}.`
      : `${me.name} declined the audition invitation.`;
    window.messagesService.sendMessage({ threadId: thread.id, senderUser: me, body: replyText });

    // 3. If accepted — write event to production calendar
    if (status === 'accepted' && slot) {
      const inv = msg.invitation;
      console.log('[handleInvitationResponse] inv:', inv, 'status:', status, 'slot:', slot);

      if (!inv?.productionId) {
        console.error('[handleInvitationResponse] inv.productionId is missing — cannot write calendar event', inv);
      } else {
        try {
          const calKey = `calendar_events_${inv.productionId}`;
          const existingEvents = JSON.parse(localStorage.getItem(calKey) || '[]');
          const alreadyExists = existingEvents.some(
            e => e.invitationThreadId === thread.id && e.attendees?.some(a => a.id === me.id)
          );
          if (!alreadyExists) {
            const startDateTime = `${slot.date}T${slot.time}:00`;
            const endMs = new Date(startDateTime).getTime() + slot.duration * 60 * 1000;
            const auditionEvent = {
              id: 'cal_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
              type: 'audition',
              title: `Audition — ${me.name}`,
              start: startDateTime,
              end: new Date(endMs).toISOString().slice(0, 16),
              date: slot.date,
              location: inv.location || '',
              notes: inv.notes || '',
              status: 'scheduled',
              productionId: inv.productionId,
              scenes: [],
              charactersNeeded: [],
              propsNeeded: [],
              costumesNeeded: [],
              attendees: [{ id: me.id, name: me.name, role: 'actor' }],
              attendance: {},
              invitationThreadId: thread.id,
              createdAt: new Date().toISOString(),
            };
            localStorage.setItem(calKey, JSON.stringify([...existingEvents, auditionEvent]));
            console.log('[handleInvitationResponse] wrote audition event to', calKey, auditionEvent);
            window.dispatchEvent(new CustomEvent('productionUpdated', { detail: { id: inv.productionId } }));
          } else {
            console.log('[handleInvitationResponse] duplicate — event already exists in', calKey);
          }
        } catch (e) {
          console.error('Failed to write audition event to calendar:', e);
        }
      }

      // Resolve production title for toast (inv.productionTitle stored at compose time; fallback to localStorage)
      let prodTitle = inv?.productionTitle || '';
      if (!prodTitle && inv?.productionId) {
        try {
          const allProds = JSON.parse(localStorage.getItem('showsuite_productions') || '[]');
          prodTitle = allProds.find(p => p.id === inv.productionId)?.title || '';
        } catch {}
      }

      const d = new Date(`${slot.date}T${slot.time}`);
      window.showToast?.(
        `Audition confirmed${prodTitle ? ` for ${prodTitle}` : ''} — ${d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} at ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`,
        'success'
      );
    } else if (status === 'declined') {
      window.showToast?.('Audition invitation declined', 'success');
    }

    loadThreads();
  };

  const handleSendReply = () => {
    if (!replyBody.trim() || !activeThreadId) return;
    window.messagesService.sendMessage({
      threadId: activeThreadId,
      senderUser: me,
      body: replyBody.trim(),
    });
    setReplyBody('');
    setTextareaKey(k => k + 1);
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
                    {msg.messageType === 'audition_invitation' && msg.invitation ? (
                      <InvitationCard
                        msg={msg}
                        me={me}
                        onRespond={(status, slot) => handleInvitationResponse(msg, activeThread, status, slot)}
                      />
                    ) : (
                      <div style={{
                        maxWidth: '68%', padding: '10px 14px', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        backgroundColor: isMe ? 'var(--color-primary)' : 'var(--color-bg-elevated)',
                        color: isMe ? '#ffffff' : 'var(--color-text-primary)',
                        fontSize: '13px', lineHeight: '1.5',
                      }}>
                        {msg.body}
                      </div>
                    )}
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
                key={textareaKey}
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
  const [messageType, setMessageType] = React.useState('message');
  const [recipients, setRecipients] = React.useState([]);
  const [subject, setSubject] = React.useState('');
  const [body, setBody] = React.useState('');
  const [productionId, setProductionId] = React.useState('');
  const [recipientSearch, setRecipientSearch] = React.useState('');
  const [showRecipientDropdown, setShowRecipientDropdown] = React.useState(false);
  const [auditionSlots, setAuditionSlots] = React.useState([{ date: '', time: '', duration: 30 }]);
  const [auditionLocation, setAuditionLocation] = React.useState('');
  const [auditionNotes, setAuditionNotes] = React.useState('');

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
    if (!recipients.length) return;
    if (messageType === 'audition_invitation') {
      if (!productionId) { window.showToast?.('Please select a production', 'warning'); return; }
      if (!auditionSlots.some(s => s.date && s.time)) { window.showToast?.('Please add at least one date and time', 'warning'); return; }
    } else {
      if (!body.trim()) return;
    }
    const prod = productions?.find(p => p.id === productionId);
    const validSlots = auditionSlots.filter(s => s.date && s.time);
    onSend({
      senderUser: me,
      recipientUsers: recipients,
      subject: messageType === 'audition_invitation'
        ? `Audition Invitation — ${prod?.title || 'Production'}`
        : (subject || `Message from ${me.name}`),
      body: messageType === 'audition_invitation'
        ? (body.trim() || `You have been invited to audition for ${prod?.title || 'this production'}.`)
        : body.trim(),
      productionId: productionId || null,
      productionTitle: prod?.title || null,
      messageType,
      invitation: messageType === 'audition_invitation' ? {
        productionId,
        productionTitle: prod?.title || null,
        slots: validSlots,
        location: auditionLocation,
        notes: auditionNotes,
        status: 'pending',
        respondedAt: null,
        acceptedSlot: null,
      } : null,
    });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ backgroundColor: 'var(--color-bg-surface)', borderRadius: '12px',
        padding: '24px', width: '520px', maxWidth: '90vw',
        border: '1px solid var(--color-border)', maxHeight: '90vh', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            New Message
          </h3>
          <button type="button" onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer',
              color: 'var(--color-text-muted)', lineHeight: 1 }}>
            ×
          </button>
        </div>

        {/* Message type toggle */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {[
            { id: 'message', label: '💬 Message' },
            { id: 'audition_invitation', label: '🎭 Audition Invitation' },
          ].map(t => (
            <button key={t.id} type="button"
              onClick={() => setMessageType(t.id)}
              style={{
                padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 500,
                cursor: 'pointer', border: '1px solid var(--color-border)',
                backgroundColor: messageType === t.id ? 'var(--color-primary)' : 'var(--color-bg-elevated)',
                color: messageType === t.id ? '#fff' : 'var(--color-text-secondary)',
              }}>
              {t.label}
            </button>
          ))}
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

        {/* Subject — hidden for audition invitations (auto-generated) */}
        {messageType === 'message' && (
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
        )}

        {/* Audition invitation fields */}
        {messageType === 'audition_invitation' && (
          <div style={{ marginBottom: '16px', padding: '14px', borderRadius: '8px',
            backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '12px' }}>
              🗓 Audition Details
            </div>

            {/* Production — required */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>
                Production *
              </label>
              <select value={productionId} onChange={e => setProductionId(e.target.value)}
                title="Select production"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px',
                  border: `1px solid ${!productionId ? '#ef4444' : 'var(--color-border)'}`,
                  backgroundColor: 'var(--color-bg-surface)', color: 'var(--color-text-primary)' }}>
                <option value="">— Select production —</option>
                {(productions || []).map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>

            {/* Time slots */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Available Time Slots *</label>
                <button type="button"
                  onClick={() => setAuditionSlots(s => [...s, { date: '', time: '', duration: 30 }])}
                  style={{ fontSize: '11px', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  + Add Slot
                </button>
              </div>
              {auditionSlots.map((slot, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 24px',
                  gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
                  <input type="date" title="Audition date" value={slot.date}
                    onChange={e => setAuditionSlots(s => s.map((sl, idx) => idx === i ? { ...sl, date: e.target.value } : sl))}
                    style={{ padding: '7px 8px', borderRadius: '6px', fontSize: '12px',
                      border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-surface)',
                      color: 'var(--color-text-primary)' }} />
                  <input type="time" title="Audition time" value={slot.time}
                    onChange={e => setAuditionSlots(s => s.map((sl, idx) => idx === i ? { ...sl, time: e.target.value } : sl))}
                    style={{ padding: '7px 8px', borderRadius: '6px', fontSize: '12px',
                      border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-surface)',
                      color: 'var(--color-text-primary)' }} />
                  <select value={slot.duration} title="Duration"
                    onChange={e => setAuditionSlots(s => s.map((sl, idx) => idx === i ? { ...sl, duration: parseInt(e.target.value) } : sl))}
                    style={{ padding: '7px 4px', borderRadius: '6px', fontSize: '12px',
                      border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-surface)',
                      color: 'var(--color-text-primary)' }}>
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>60 min</option>
                    <option value={90}>90 min</option>
                  </select>
                  {auditionSlots.length > 1 && (
                    <button type="button"
                      onClick={() => setAuditionSlots(s => s.filter((_, idx) => idx !== i))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--color-danger, #ef4444)', fontSize: '18px', lineHeight: 1, padding: 0 }}>
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Location */}
            <div style={{ marginBottom: '8px' }}>
              <label style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>
                Location
              </label>
              <input type="text" value={auditionLocation} onChange={e => setAuditionLocation(e.target.value)}
                placeholder="e.g. Main Stage, Room 204..."
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px',
                  border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-surface)',
                  color: 'var(--color-text-primary)' }} />
            </div>

            {/* Audition notes */}
            <div>
              <label style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>
                Notes (preparation instructions, sides, etc.)
              </label>
              <textarea value={auditionNotes} onChange={e => setAuditionNotes(e.target.value)}
                placeholder="Please prepare 16 bars of an uptempo number..."
                rows={3}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px',
                  border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-surface)',
                  color: 'var(--color-text-primary)', resize: 'vertical' }} />
            </div>
          </div>
        )}

        {/* Production context — message mode only (optional) */}
        {messageType === 'message' && productions?.length > 0 && (
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
              {productions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
        )}

        {/* Body */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '6px' }}>
            {messageType === 'audition_invitation' ? 'Personal Note (optional)' : 'Message'}
          </label>
          <textarea value={body} onChange={e => setBody(e.target.value)}
            placeholder={messageType === 'audition_invitation'
              ? 'Add a personal note to the invitation...'
              : 'Write your message...'}
            rows={messageType === 'audition_invitation' ? 3 : 5}
            style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', fontSize: '13px',
              border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-elevated)',
              color: 'var(--color-text-primary)', resize: 'vertical', lineHeight: '1.5' }} />
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} className="btn-secondary px-4 py-2 rounded-lg text-sm">
            Cancel
          </button>
          <button type="button" onClick={handleSend}
            disabled={!recipients.length || (messageType === 'message' && !body.trim())}
            className="btn-primary px-4 py-2 rounded-lg text-sm"
            style={{ opacity: (recipients.length && (messageType !== 'message' || body.trim())) ? 1 : 0.5 }}>
            {messageType === 'audition_invitation' ? 'Send Invitation' : 'Send Message'}
          </button>
        </div>
      </div>
    </div>
  );
};

window.MessagesView = MessagesView;
console.log('✅ MessagesView loaded');
