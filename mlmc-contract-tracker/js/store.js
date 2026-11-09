/* =========================================================================
   State, permissions, tracking rules and actions.
   Persistence: browser localStorage (prototype). Every mutating action
   writes to the activity history so the audit trail is always complete.
   ========================================================================= */
window.MLMC = window.MLMC || {};

(function (M) {
  // v2: two tester accounts only, no sample names. Changing the key makes every
  // browser start fresh instead of keeping the old 8-person demo data.
  const KEY = 'mlmc-tracker-v2';
  const DAY = 86400000;

  M.today = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; };
  M.daysUntil = (iso) => { if (!iso) return null; const [y, m, d] = iso.split('-').map(Number); return Math.round((new Date(y, m - 1, d) - M.today()) / DAY); };
  M.addDays = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); const t = new Date(y, m - 1, d + n); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; };
  // MM-DD-YYYY, matching MLMC's document template
  M.fmt = (iso) => { if (!iso) return '—'; const [y, m, d] = iso.split('-'); return `${m}-${d}-${y}`; };
  M.fmtTs = (iso) => { if (!iso) return '—'; const t = new Date(iso); return `${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}-${t.getFullYear()} ${t.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`; };
  M.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  M.uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  const store = {
    state: null,
    load() {
      try { const raw = localStorage.getItem(KEY); this.state = raw ? JSON.parse(raw) : M.seed(); }
      catch (e) { this.state = M.seed(); }
      this.save();
    },
    save() { try { localStorage.setItem(KEY, JSON.stringify(this.state)); } catch (e) { console.warn('Could not persist state', e); } },
    reset() { this.state = M.seed(); this.save(); },

    /* ---------- session ---------- */
    currentUser() {
      let id = null; try { id = sessionStorage.getItem(KEY + '-session'); } catch (e) {}
      return this.state.users.find((u) => u.id === id) || null;
    },
    /* Passwords are never in the code. Each allowed email creates its own
       password on first sign-in; only a salted SHA-256 hash is kept, in this
       browser, under a separate key so "Reset demo data" doesn't erase it. */
    findUser(email) { return this.state.users.find((x) => x.email.toLowerCase() === String(email || '').trim().toLowerCase()) || null; },
    pwStore() { try { return JSON.parse(localStorage.getItem(KEY + '-passwords') || '{}'); } catch (e) { return {}; } },
    hasPassword(u) { return !!this.pwStore()[u.email.toLowerCase()]; },
    async hash(u, password) {
      const text = 'mlmc-tracker|' + u.email.toLowerCase() + '|' + password;
      if (window.crypto && crypto.subtle) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
        return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
      }
      let h = 5381; for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0; // fallback
      return 'djb2-' + h.toString(16);
    },
    async setPassword(u, password) {
      if (String(password).length < 8) throw new Error('Use at least 8 characters.');
      const all = this.pwStore(); all[u.email.toLowerCase()] = await this.hash(u, password);
      try { localStorage.setItem(KEY + '-passwords', JSON.stringify(all)); } catch (e) { throw new Error('Could not save the password in this browser.'); }
    },
    startSession(u) { try { sessionStorage.setItem(KEY + '-session', u.id); } catch (e) {} return u; },
    // Returns { status: 'ok' | 'invalid' | 'needs-password', user }
    async checkLogin(email, password) {
      const u = this.findUser(email);
      if (!u) return { status: 'invalid' };
      if (!this.hasPassword(u)) return { status: 'needs-password', user: u };
      const ok = (await this.hash(u, password)) === this.pwStore()[u.email.toLowerCase()];
      return ok ? { status: 'ok', user: this.startSession(u) } : { status: 'invalid' };
    },
    logout() { try { sessionStorage.removeItem(KEY + '-session'); } catch (e) {} },

    /* ---------- lookups ---------- */
    lookups: {
      deptName: (c) => (M.DEPARTMENTS.find((d) => d.code === c) || { name: c || '—' }).name,
      typeName: (c) => (M.DOC_TYPES.find((d) => d.code === c) || { name: c || '—' }).name,
    },
    user(id) { return this.state.users.find((u) => u.id === id); },
    userName(id) { const u = this.user(id); return u ? u.name : 'Unassigned'; },
    record(id) { return this.state.records.find((r) => r.id === id); },

    /* ---------- permissions ---------- */
    isTeam(u) { return u && u.role === 'team'; },
    activeGrant(u, rec, type) {
      const now = new Date().toISOString();
      return this.state.requests.find((q) => q.userId === u.id && q.recordId === rec.id && q.status === 'Approved' && q.expiresAt > now && (type === 'view' || q.type === 'download'));
    },
    canView(u, rec) { return this.isTeam(u) || rec.ownerId === u.id || !!this.activeGrant(u, rec, 'view'); },
    canDownload(u, rec) { return this.isTeam(u) || rec.ownerId === u.id || !!this.activeGrant(u, rec, 'download'); },
    pendingRequest(u, rec) { return this.state.requests.find((q) => q.userId === u.id && q.recordId === rec.id && q.status === 'Pending'); },

    /* ---------- tracking rules ---------- */
    // The single key date that drives monitoring for a record.
    keyDate(rec) { return rec.category === 'Contract' ? rec.expiryDate : rec.reviewDate; },
    noticeDeadline(rec) { return rec.category === 'Contract' && rec.expiryDate && rec.noticeDays ? M.addDays(rec.expiryDate, -rec.noticeDays) : ''; },
    // Returns {level: 'critical'|'warning'|'notice'|'ok'|'none', label, days}
    attention(rec) {
      if (!M.TRACKED_STATUSES.includes(rec.status)) return { level: 'none', label: rec.status === 'Draft' ? 'Not yet tracked' : 'Not tracked', days: null };
      const [t1, t2, t3] = this.state.settings.remindDays.slice().sort((a, b) => b - a); // 90,60,30
      if (rec.category === 'Contract') {
        const days = M.daysUntil(rec.expiryDate);
        if (days == null) return { level: 'warning', label: 'No expiry date set', days: null };
        if (days < 0) return { level: 'critical', label: `Expired ${-days} d ago`, days };
        const nd = this.noticeDeadline(rec); const ndays = M.daysUntil(nd);
        if (nd && ndays < 0) return { level: 'critical', label: `Notice deadline passed · expires in ${days} d`, days };
        if (days <= t3) return { level: 'critical', label: `Expires in ${days} d`, days };
        if (nd && ndays <= 30) return { level: 'warning', label: `Renewal notice due in ${ndays} d`, days };
        if (days <= t2) return { level: 'warning', label: `Expires in ${days} d`, days };
        if (days <= t1) return { level: 'notice', label: `Expires in ${days} d`, days };
        return { level: 'ok', label: `Expires in ${days} d`, days };
      }
      const days = M.daysUntil(rec.reviewDate);
      if (days == null) return { level: 'warning', label: 'No review date set', days: null };
      if (days < 0) return { level: 'critical', label: `Review overdue ${-days} d`, days };
      if (days <= t3) return { level: 'warning', label: `Review due in ${days} d`, days };
      if (days <= t2) return { level: 'notice', label: `Review due in ${days} d`, days };
      return { level: 'ok', label: `Review in ${days} d`, days };
    },

    /* ---------- audit ---------- */
    log(recordId, userId, action, detail) {
      this.state.activity.unshift({ id: M.uid('a'), recordId, userId, action, detail, ts: new Date().toISOString() });
    },

    /* ---------- record actions ---------- */
    saveRecord(u, data, existingId) {
      if (existingId) {
        const rec = this.record(existingId);
        const changes = [];
        const fields = { title: 'Title', code: 'Code', status: 'Status', version: 'Version', ownerId: 'Owner', effectiveDate: 'Effective date', lastRevisedDate: 'Last revised', expiryDate: 'Expiry date', reviewDate: 'Review date', noticeDays: 'Notice period', dept: 'Department', ownerDept: 'Document owner', type: 'Type', counterparty: 'Counterparty', value: 'Value' };
        Object.keys(fields).forEach((k) => {
          if (String(rec[k] ?? '') !== String(data[k] ?? '')) {
            const fmtv = (v) => (k === 'ownerId' ? this.userName(v) : k.endsWith('Date') ? M.fmt(v) : v || '—');
            changes.push(`${fields[k]}: ${fmtv(rec[k])} → ${fmtv(data[k])}`);
          }
        });
        const ownerChanged = rec.ownerId !== data.ownerId;
        const statusChanged = rec.status !== data.status;
        Object.assign(rec, data, { updatedAt: new Date().toISOString() });
        if (statusChanged) this.log(rec.id, u.id, 'Status changed', changes.find((c) => c.startsWith('Status')));
        if (ownerChanged) this.log(rec.id, u.id, 'Owner assigned', `Owner set to ${this.userName(rec.ownerId)}`);
        const other = changes.filter((c) => !c.startsWith('Status') && !c.startsWith('Owner'));
        if (other.length) this.log(rec.id, u.id, 'Updated', other.join('; '));
        if (!changes.length) this.log(rec.id, u.id, 'Updated', 'Details saved (no field changes)');
        this.save();
        return rec;
      }
      const rec = Object.assign({ id: M.uid('r'), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, data);
      this.state.records.unshift(rec);
      this.log(rec.id, u.id, 'Created', `Record registered (${rec.code})`);
      if (rec.ownerId) this.log(rec.id, u.id, 'Owner assigned', `Owner set to ${this.userName(rec.ownerId)}`);
      this.save();
      return rec;
    },
    deleteRecord(u, id) {
      const rec = this.record(id);
      this.state.records = this.state.records.filter((r) => r.id !== id);
      delete this.state.files[id];
      this.state.requests.forEach((q) => { if (q.recordId === id && q.status === 'Pending') { q.status = 'Withdrawn'; } });
      this.log(id, u.id, 'Deleted', `Record ${rec.code} — "${rec.title}" permanently deleted`);
      this.save();
    },
    nextCode(dept, type, version) {
      const prefix = `MLMC-${dept}-${type}-`;
      const nums = this.state.records.filter((r) => r.code.startsWith(prefix)).map((r) => parseInt(r.code.slice(prefix.length), 10) || 0);
      const n = String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, '0');
      return `${prefix}${n}-${version || '1.0'}`;
    },

    /* ---------- users & roles ---------- */
    updateUser(u, userId, data) {
      if (!this.isTeam(u)) throw new Error('Only the Records Team can edit people.');
      const target = this.user(userId);
      const name = String(data.name || '').trim();
      if (!name) throw new Error('Name is required.');
      const changes = [];
      if (target.name !== name) changes.push(`name: ${target.name} → ${name}`);
      if ((target.title || '') !== (data.title || '').trim()) changes.push(`position: ${target.title || '—'} → ${(data.title || '').trim() || '—'}`);
      if ((target.dept || '') !== (data.dept || '')) changes.push(`department: ${target.dept || '—'} → ${data.dept || '—'}`);
      Object.assign(target, { name, title: (data.title || '').trim(), dept: data.dept || '' });
      if (changes.length) this.log(null, u.id, 'Person updated', changes.join('; '));
      this.save();
    },
    // Grant or remove full (Records Team) access. Guards: you can't change
    // your own role, and at least one Records Team member must remain.
    setRole(u, userId, role) {
      const target = this.user(userId);
      if (!this.isTeam(u)) throw new Error('Only the Records Team can change access levels.');
      if (!target || !M.ROLES[role]) throw new Error('Unknown user or role.');
      if (target.id === u.id) throw new Error("You can't change your own access level.");
      if (role === 'limited' && this.state.users.filter((x) => x.role === 'team').length <= 1) throw new Error('At least one person must keep full access.');
      if (target.role === role) return;
      const from = M.ROLES[target.role].label;
      target.role = role;
      this.log(null, u.id, role === 'team' ? 'Full access granted' : 'Full access removed', `${target.name}: ${from} → ${M.ROLES[role].label}`);
      this.save();
    },

    /* ---------- access requests ---------- */
    requestAccess(u, recId, type, reason, durationDays) {
      const q = { id: M.uid('q'), recordId: recId, userId: u.id, type, reason, durationDays, status: 'Pending', ts: new Date().toISOString() };
      this.state.requests.unshift(q);
      this.log(recId, u.id, 'Access requested', `${type === 'download' ? 'View & download' : 'View'} access requested by ${u.name} for ${durationDays} days`);
      this.save();
      return q;
    },
    decideRequest(u, qid, approve, note) {
      const q = this.state.requests.find((x) => x.id === qid);
      const req = this.user(q.userId);
      q.status = approve ? 'Approved' : 'Rejected'; q.decidedBy = u.id; q.decidedTs = new Date().toISOString(); q.note = note || '';
      if (approve) q.expiresAt = new Date(Date.now() + q.durationDays * DAY).toISOString();
      this.log(q.recordId, u.id, approve ? 'Access approved' : 'Access rejected',
        approve ? `${q.type === 'download' ? 'View & download' : 'View'} access granted to ${req.name} until ${M.fmtTs(q.expiresAt)}` : `Request by ${req.name} rejected${note ? ': ' + note : ''}`);
      this.save();
    },
    revokeRequest(u, qid) {
      const q = this.state.requests.find((x) => x.id === qid);
      q.status = 'Revoked'; q.expiresAt = new Date().toISOString();
      this.log(q.recordId, u.id, 'Access revoked', `Access for ${this.userName(q.userId)} revoked`);
      this.save();
    },
    logDownload(u, rec) { this.log(rec.id, u.id, 'Downloaded', `File downloaded by ${u.name}`); this.save(); },
    logViewed(u, rec) {
      // log a view at most once per user/record/day to keep the history readable
      const day = new Date().toISOString().slice(0, 10);
      if (this.state.activity.some((a) => a.recordId === rec.id && a.userId === u.id && a.action === 'Viewed' && a.ts.slice(0, 10) === day)) return;
      this.log(rec.id, u.id, 'Viewed', `Record opened by ${u.name}`); this.save();
    },
  };

  M.store = store;
})(window.MLMC);
