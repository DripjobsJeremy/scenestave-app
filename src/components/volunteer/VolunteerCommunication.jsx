/**
 * VolunteerCommunication.jsx
 * Full communication tools: recipient filtering, templates, merge fields, preview, clipboard, save/load.
 */

const { useState, useEffect, useMemo } = React;

const VolunteerCommunication = ({ userRole='Admin' }) => {
  const allowedRoles = new Set(['Admin','Board Admin','Stage Manager']);
  if (!allowedRoles.has(userRole)) return <div className="p-4 text-sm text-red-600">Access denied.</div>;

  const storage = window.volunteerStorageService;
  const calc = window.volunteerCalculationService;

  const [volunteers, setVolunteers] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [template, setTemplate] = useState('Shift Reminder');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [preview, setPreview] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [templateName, setTemplateName] = useState('');

  useEffect(()=>{
    setVolunteers(storage.getVolunteerProfiles());
    loadSavedTemplates();
  }, []);

  function loadSavedTemplates() {
    try {
      const saved = localStorage.getItem('volunteerEmailTemplates');
      setSavedTemplates(saved? JSON.parse(saved): []);
    } catch(e) { setSavedTemplates([]); }
  }

  function saveTemplate() {
    if (!templateName.trim()) { window.toast?.error('Enter template name'); return; }
    const newTemplate = { id: Date.now(), name: templateName, subject, body };
    const updated = [...savedTemplates, newTemplate];
    localStorage.setItem('volunteerEmailTemplates', JSON.stringify(updated));
    setSavedTemplates(updated);
    setTemplateName('');
    window.toast?.success('Template saved');
  }

  function loadTemplate(tpl) {
    setSubject(tpl.subject);
    setBody(tpl.body);
    setTemplate('Custom');
  }

  function deleteTemplate(id) {
    if (!confirm('Delete this template?')) return;
    const updated = savedTemplates.filter(t => t.id !== id);
    localStorage.setItem('volunteerEmailTemplates', JSON.stringify(updated));
    setSavedTemplates(updated);
  }

  // Preset template autofill
  useEffect(()=>{
    if (template === 'Shift Reminder') {
      setSubject('Upcoming Shift Reminder');
      setBody('Hello {{volunteer_name}},\n\nThis is a reminder for your upcoming shift on {{shift_date}} at {{shift_time}}.\n\nLocation: {{shift_location}}\nRole: {{shift_role}}\n\nPlease confirm your attendance or let us know if you cannot make it.\n\nThank you,\nSceneStave Team');
    } else if (template === 'Thank You') {
      setSubject('Thank You for Volunteering!');
      setBody('Dear {{volunteer_name}},\n\nThank you for your dedication and time! You have contributed {{volunteer_hours}} hours to our organization.\n\nYour efforts make a real difference. We appreciate all you do.\n\nWith gratitude,\nSceneStave Team');
    } else if (template === 'Opportunity Announcement') {
      setSubject('New Volunteer Opportunity: {{opportunity_name}}');
      setBody('Hi {{volunteer_name}},\n\nWe have an exciting new volunteer opportunity: {{opportunity_name}}.\n\nIf you are interested, please reach out or check the volunteer portal for details.\n\nBest,\nSceneStave Team');
    } else if (template === 'General Update') {
      setSubject('Volunteer Program Update');
      setBody('Hello {{volunteer_name}},\n\nWe wanted to share the latest updates from our volunteer program.\n\n[Add your message here]\n\nThank you for being part of our community!\n\nRegards,\nSceneStave Team');
    } else if (template === 'Custom') {
      // Keep current values when switching to Custom
    } else {
      setSubject('');
      setBody('');
    }
  }, [template]);

  const filtered = useMemo(()=>{
    let list = volunteers.slice();
    if (statusFilter !== 'all') list = list.filter(v => (v.volunteerInfo?.status||'unknown') === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(v => `${v.firstName} ${v.lastName}`.toLowerCase().includes(q) || (v.email||'').toLowerCase().includes(q));
    }
    return list;
  }, [volunteers, search, statusFilter]);

  function addRecipient(v) {
    setRecipients(prev => prev.find(r=>r.id===v.id) ? prev : [...prev, v]);
  }
  
  function removeRecipient(id) {
    setRecipients(prev => prev.filter(r=>r.id!==id));
  }

  function addAllFiltered() {
    const newRecips = filtered.filter(v => !recipients.find(r=>r.id===v.id));
    setRecipients(prev => [...prev, ...newRecips]);
  }

  function clearRecipients() {
    setRecipients([]);
  }

  function mergeFields(text, volunteer) {
    const info = volunteer.volunteerInfo||{};
    const hours = calc.calculateVolunteerHours? calc.calculateVolunteerHours(volunteer.id): (info.totalHours||0);
    return text
      .replace(/\{\{volunteer_name\}\}/g, `${volunteer.firstName} ${volunteer.lastName}`)
      .replace(/\{\{first_name\}\}/g, volunteer.firstName||'')
      .replace(/\{\{last_name\}\}/g, volunteer.lastName||'')
      .replace(/\{\{email\}\}/g, volunteer.email||'')
      .replace(/\{\{volunteer_hours\}\}/g, String(hours))
      .replace(/\{\{status\}\}/g, info.status||'')
      .replace(/\{\{opportunity_name\}\}/g, 'Sample Opportunity')
      .replace(/\{\{shift_date\}\}/g, 'YYYY-MM-DD')
      .replace(/\{\{shift_time\}\}/g, 'HH:MM')
      .replace(/\{\{shift_location\}\}/g, 'Venue')
      .replace(/\{\{shift_role\}\}/g, 'Volunteer Role');
  }

  function mergePreview() {
    if (recipients.length === 0) return body;
    const sample = recipients[0];
    return mergeFields(body, sample);
  }

  function copyEmails() {
    const emails = recipients.map(r => r.email).filter(e=>e).join(', ');
    navigator.clipboard.writeText(emails).then(()=> window.toast?.success('Copied emails to clipboard')).catch(()=> window.toast?.error('Copy failed'));
  }

  function copyMessage() {
    const merged = recipients.length>0? mergePreview(): body;
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${merged}`).then(()=> window.toast?.success('Copied message to clipboard')).catch(()=> window.toast?.error('Copy failed'));
  }

  function generateMailtoLinks() {
    // Generate individual mailto for each recipient
    return recipients.map(r => {
      const mergedSubject = mergeFields(subject, r);
      const mergedBody = mergeFields(body, r);
      return `mailto:${r.email}?subject=${encodeURIComponent(mergedSubject)}&body=${encodeURIComponent(mergedBody)}`;
    });
  }

  function openMailto() {
    if (recipients.length===0) { window.toast?.warning('No recipients selected'); return; }
    const links = generateMailtoLinks();
    // Open first mailto (browsers typically limit bulk opens)
    if (links.length>0) window.open(links[0], '_blank');
    if (links.length>1) window.toast?.info(`${links.length} recipients. Only first email client opened. Use Copy Emails for bulk.`, 6000);
  }

  const mergeFieldsList = [
    '{{volunteer_name}}', '{{first_name}}', '{{last_name}}', '{{email}}',
    '{{volunteer_hours}}', '{{status}}', '{{opportunity_name}}',
    '{{shift_date}}', '{{shift_time}}', '{{shift_location}}', '{{shift_role}}'
  ];

  return (
    <div className="p-4 space-y-4" aria-label="Volunteer Communication Tools">
      <header className="vol-page-header flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white vol-page-title">Communication Center</h1>
          <div className="text-xs vol-page-subtitle mt-1">Compose messages with merge fields</div>
        </div>
      </header>

      {/* Recipient Selection */}
      <div className="bg-white p-4 rounded shadow space-y-3 text-gray-900">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-semibold">Recipients ({recipients.length} selected)</h2>
          <div className="flex gap-2 text-xs">
            <button onClick={addAllFiltered} title="Add all filtered" className="px-2 py-1 rounded border bg-white text-gray-900">Add All Filtered</button>
            <button onClick={clearRecipients} title="Clear recipients" className="px-2 py-1 rounded border bg-white text-gray-900">Clear</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name or email" title="Search volunteers" className="border rounded px-2 py-1 flex-1 min-w-[160px] bg-white text-gray-900" />
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} title="Filter by status" className="border rounded px-2 py-1 text-xs bg-white text-gray-900">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="paused">Paused</option>
          </select>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-auto border rounded p-2 bg-gray-50">
          {filtered.slice(0,100).map(v => (
            <button key={v.id} onClick={()=>addRecipient(v)} title={`Add ${v.firstName} ${v.lastName}`} className="text-left text-xs border rounded px-2 py-1 bg-white hover:bg-blue-50 text-gray-900">{v.firstName} {v.lastName}</button>
          ))}
          {filtered.length===0 && <div className="text-xs text-gray-500 col-span-full">No volunteers match filter</div>}
        </div>
        {recipients.length>0 && (
          <div className="border rounded p-2 bg-gray-50 max-h-40 overflow-auto text-gray-900">
            <div className="flex flex-wrap gap-2">
              {recipients.map(r => (
                <span key={r.id} className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded text-[11px] flex items-center gap-1">{r.firstName} {r.lastName}<button title="Remove" onClick={()=>removeRecipient(r.id)} className="text-violet-700 hover:text-violet-900">✕</button></span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Template & Message Composition */}
      <div className="bg-white p-4 rounded shadow space-y-3 text-gray-900" aria-label="Message Composition">
        <div className="flex flex-wrap gap-2 items-center text-sm">
          <label className="text-xs font-medium" htmlFor="templateSelect">Template:</label>
          <select id="templateSelect" title="Select template" value={template} onChange={e=>setTemplate(e.target.value)} className="border rounded px-2 py-1 text-xs bg-white text-gray-900">
            {['Shift Reminder','Thank You','Opportunity Announcement','General Update','Custom'].map(t => <option key={t}>{t}</option>)}
          </select>
          <button onClick={()=>setPreview(p=>!p)} title="Toggle preview" className={`border rounded px-3 py-1 text-xs ${preview?'bg-violet-600 text-white':'bg-white text-gray-900'}`}>{preview?'Hide':'Show'} Preview</button>
        </div>
        <div className="space-y-2">
          <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Subject line" title="Email subject" className="border rounded w-full px-2 py-1 text-sm bg-white text-gray-900" />
          <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="Message body (use merge fields like {{volunteer_name}})" title="Email body" className="border rounded w-full h-48 p-2 text-xs font-mono bg-white text-gray-900" />
        </div>
        {preview && (
          <div className="bg-gray-50 border rounded p-3 text-xs whitespace-pre-wrap text-gray-900" aria-label="Preview">
            <div className="font-semibold mb-2 text-gray-900">Subject: {recipients.length>0? mergeFields(subject, recipients[0]): subject}</div>
            <div className="text-gray-800">{mergePreview()}</div>
          </div>
        )}
        <div className="flex flex-wrap gap-2 justify-between items-center text-xs">
          <div className="flex flex-wrap gap-2">
            <span className="font-medium">Merge Fields:</span>
            {mergeFieldsList.slice(0,6).map(field => (
              <button key={field} onClick={()=>setBody(b=>b+field)} title={`Insert ${field}`} className="px-1.5 py-0.5 rounded bg-gray-100 text-[10px] hover:bg-gray-200 text-gray-900">{field}</button>
            ))}
            <button onClick={()=>setBody(b=>b+'\n'+mergeFieldsList.join(' '))} title="Show all fields" className="px-1.5 py-0.5 rounded border text-[10px] bg-white text-gray-900">...</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 justify-end text-sm">
          <button onClick={copyEmails} title="Copy recipient emails" className="px-3 py-1 rounded border bg-white text-gray-900">Copy Emails</button>
          <button onClick={copyMessage} title="Copy message text" className="px-3 py-1 rounded border bg-white text-gray-900">Copy Message</button>
          <button onClick={openMailto} title="Open in email client" className="px-3 py-1 rounded bg-blue-600 text-white">Open in Email</button>
        </div>
      </div>

      {/* Saved Templates */}
      <div className="bg-white p-4 rounded shadow space-y-3 text-gray-900">
        <h2 className="text-sm font-semibold">Saved Templates</h2>
        <div className="flex gap-2 items-center text-xs">
          <input value={templateName} onChange={e=>setTemplateName(e.target.value)} placeholder="Template name" title="Template name" className="border rounded px-2 py-1 flex-1 bg-white text-gray-900" />
          <button onClick={saveTemplate} title="Save current as template" className="px-3 py-1 rounded bg-green-600 text-white">Save Current</button>
        </div>
        {savedTemplates.length>0 ? (
          <ul className="space-y-2 text-xs">
            {savedTemplates.map(tpl => (
              <li key={tpl.id} className="flex justify-between items-center border rounded p-2 bg-gray-50 text-gray-900">
                <div>
                  <div className="font-medium text-gray-900">{tpl.name}</div>
                  <div className="text-[10px] text-gray-600">{tpl.subject}</div>
                </div>
                <div className="flex gap-2">
                                  <td className="px-2 py-1 space-x-1">
                  <button onClick={()=>loadTemplate(tpl)} title="Load template" className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors">Load</button>
                  <button onClick={()=>deleteTemplate(tpl.id)} title="Delete template" className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors">Delete</button>
                </td>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-xs text-gray-500">No saved templates. Save one above.</div>
        )}
      </div>
    </div>
  );
};

window.VolunteerCommunication = VolunteerCommunication;
