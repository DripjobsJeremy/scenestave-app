(function(global) {
  'use strict';

  const MESSAGES_KEY = 'scenestave_messages';

  // Permission matrix — who can message whom
  const CAN_MESSAGE = {
    super_admin:   ['super_admin','venue_manager','admin','client_admin','director','stage_manager','lighting','sound','wardrobe','props','set','board_member','actor','volunteer','donor'],
    venue_manager: ['super_admin','venue_manager','admin','director','stage_manager','board_member'],
    admin:         ['super_admin','admin','director','stage_manager','lighting','sound','wardrobe','props','set','actor','volunteer'],
    client_admin:  ['super_admin','client_admin','director','stage_manager'],
    board_member:  ['super_admin','admin','board_member'],
    director:      ['super_admin','admin','director','stage_manager','lighting','sound','wardrobe','props','set','actor'],
    stage_manager: ['super_admin','admin','director','stage_manager','lighting','sound','wardrobe','props','set'],
    lighting:      ['super_admin','admin','director','stage_manager','lighting'],
    sound:         ['super_admin','admin','director','stage_manager','sound'],
    wardrobe:      ['super_admin','admin','director','stage_manager','wardrobe'],
    props:         ['super_admin','admin','director','stage_manager','props'],
    set:           ['super_admin','admin','director','stage_manager','set'],
    actor:         ['director','stage_manager'],
    volunteer:     ['super_admin','admin'],
    donor:         ['super_admin','admin'],
  };

  const load = () => {
    try {
      const raw = localStorage.getItem(MESSAGES_KEY);
      return raw ? JSON.parse(raw) : { threads: {} };
    } catch { return { threads: {} }; }
  };

  const save = (data) => {
    try {
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(data));
      window.dispatchEvent(new CustomEvent('messagesUpdated'));
      return true;
    } catch { return false; }
  };

  // Generate IDs
  const uid = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;

  // Create a new thread
  const createThread = ({ senderUser, recipientUsers, subject, body, productionId = null, productionTitle = null, messageType = 'message', invitation = null }) => {
    const data = load();
    const threadId = uid('thread');
    const msgId = uid('msg');
    const now = new Date().toISOString();

    const participants = [
      { id: senderUser.id, name: senderUser.name, role: senderUser.role },
      ...recipientUsers.map(u => ({ id: u.id, name: u.name, role: u.role })),
    ];

    const thread = {
      id: threadId,
      participants,
      participantIds: participants.map(p => p.id),
      subject: subject || '(No subject)',
      productionId,
      productionTitle,
      createdAt: now,
      updatedAt: now,
      messages: [{
        id: msgId,
        threadId,
        senderId: senderUser.id,
        senderName: senderUser.name,
        senderRole: senderUser.role,
        body,
        sentAt: now,
        readBy: [senderUser.id],
        messageType,
        invitation,
      }],
    };

    data.threads[threadId] = thread;
    save(data);
    return thread;
  };

  // Send a message in an existing thread
  const sendMessage = ({ threadId, senderUser, body }) => {
    const data = load();
    const thread = data.threads[threadId];
    if (!thread) return null;
    const now = new Date().toISOString();
    const msg = {
      id: uid('msg'),
      threadId,
      senderId: senderUser.id,
      senderName: senderUser.name,
      senderRole: senderUser.role,
      body,
      sentAt: now,
      readBy: [senderUser.id],
    };
    thread.messages.push(msg);
    thread.updatedAt = now;
    data.threads[threadId] = thread;
    save(data);
    return msg;
  };

  // Mark all messages in a thread as read by a user
  const markThreadRead = (threadId, userId) => {
    const data = load();
    const thread = data.threads[threadId];
    if (!thread) return;
    thread.messages = thread.messages.map(m => ({
      ...m,
      readBy: m.readBy.includes(userId) ? m.readBy : [...m.readBy, userId],
    }));
    data.threads[threadId] = thread;
    save(data);
  };

  // Get all threads for a user, sorted by most recent
  const getThreadsForUser = (userId) => {
    const data = load();
    return Object.values(data.threads)
      .filter(t => t.participantIds.includes(userId))
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  };

  // Get unread count for a user across all threads
  const getUnreadCount = (userId) => {
    const data = load();
    let count = 0;
    Object.values(data.threads).forEach(thread => {
      if (!thread.participantIds.includes(userId)) return;
      thread.messages.forEach(msg => {
        if (!msg.readBy.includes(userId)) count++;
      });
    });
    return count;
  };

  // Get unread count for a specific thread
  const getThreadUnreadCount = (threadId, userId) => {
    const data = load();
    const thread = data.threads[threadId];
    if (!thread) return 0;
    return thread.messages.filter(m => !m.readBy.includes(userId)).length;
  };

  // Delete a thread (super_admin only)
  const deleteThread = (threadId) => {
    const data = load();
    delete data.threads[threadId];
    save(data);
  };

  // Update invitation status on a specific message
  const updateMessageInvitation = (threadId, messageId, invitationUpdate) => {
    const data = load();
    const thread = data.threads[threadId];
    if (!thread) return;
    const msg = thread.messages.find(m => m.id === messageId);
    if (!msg || !msg.invitation) return;
    msg.invitation = { ...msg.invitation, ...invitationUpdate };
    data.threads[threadId] = thread;
    save(data);
  };

  // Check if a sender role can message a recipient role
  const canMessage = (senderRole, recipientRole) => {
    return (CAN_MESSAGE[senderRole] || []).includes(recipientRole);
  };

  // Get list of roles this role can message
  const getMessagableRoles = (senderRole) => {
    return CAN_MESSAGE[senderRole] || [];
  };

  global.messagesService = {
    CAN_MESSAGE,
    createThread,
    sendMessage,
    markThreadRead,
    getThreadsForUser,
    getUnreadCount,
    getThreadUnreadCount,
    deleteThread,
    canMessage,
    getMessagableRoles,
    updateMessageInvitation,
    load,
  };

  console.log('✅ messagesService loaded');
})(window);
