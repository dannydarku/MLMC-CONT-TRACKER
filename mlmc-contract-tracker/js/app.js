/* =========================================================================
   MLMC Contract & Document Tracker — UI (vanilla JS, hash router)
   ========================================================================= */
(function (M) {
  const S = M.store;
  const esc = M.esc;
  const $app = document.getElementById('app');
  const $modal = document.getElementById('modal-root');
  const $toast = document.getElementById('toast');

  S.load();
  let storage = M.createStorage(S);

  const ui = {
    filters: { q: '', category: '', dept: '', status: '', attention: '' },
    tab: 'overview',
    tabRecord: null,
    reqTab: 'Pending',
    actFilter: { q: '', action: '' },
  };

  /* ---------------------------------------------------------- helpers */
  const DEPT_COLORS = ['#ab3a76', '#2f4f85', '#c2410c', '#0f766e', '#7c3aed', '#a16207', '#be123c', '#0369a1', '#4d7c0f', '#6d28d9', '#b45309', '#1b3a5b'];
  const deptColor = (code) => DEPT_COLORS[Math.max(0, M.DEPARTMENTS.findIndex((d) => d.code === code)) % DEPT_COLORS.length];
  const deptChip = (code, withName) => `<span class="dept" title="${esc(S.lookups.deptName(code))}"><span class="code" style="background:${deptColor(code)}">${esc(code)}</span>${withName ? `<span class="name">${esc(S.lookups.deptName(code))}</span>` : ''}</span>`;
  const statusTag = (s) => `<span class="status s-${esc(s).replace(/ /g, '-')}">${esc(s)}</span>`;
  const badge = (a) => `<span class="badge ${a.level}">${esc(a.label)}</span>`;
  const catTag = (c) => `<span class="cat ${c}">${c}</span>`;
  const initials = (n) => n.split(' ').map((x) => x[0]).slice(0, 2).join('');
  const kb = (n) => (n == null ? '~2 KB' : n < 1024 ? n + ' B' : (n / 1024).toFixed(1) + ' KB');
  const levelRank = { critical: 0, warning: 1, notice: 2, ok: 3, none: 4 };
  const deptOptions = (sel, blank) => (blank ? `<option value="">${blank}</option>` : '') + M.DEPARTMENTS.map((d) => `<option value="${d.code}" ${d.code === sel ? 'selected' : ''}>${d.code} — ${esc(d.name)}</option>`).join('');
  const userOptions = (sel) => S.state.users.map((u) => `<option value="${u.id}" ${u.id === sel ? 'selected' : ''}>${esc(u.name)} — ${esc(u.title)}</option>`).join('');

  function toast(msg) {
    $toast.textContent = msg; $toast.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => { $toast.hidden = true; }, 4500);
  }
  function openModal(html, wide) {
    $modal.innerHTML = `<div class="modal-backdrop" data-close-backdrop><div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">${html}</div></div>`;
    const first = $modal.querySelector('input, textarea, select, button.btn-primary');
    if (first) first.focus();
  }
  function closeModal() { $modal.innerHTML = ''; }
  function modalShell(title, body, foot) {
    return `<div class="modal-head"><h2>${title}</h2><button class="x" data-action="close-modal" aria-label="Close">×</button></div><div class="modal-body">${body}</div>${foot ? `<div class="modal-foot">${foot}</div>` : ''}`;
  }
  function confirmModal(title, msg, okLabel, onOk, danger) {
    openModal(modalShell(esc(title), `<p style="margin:0">${msg}</p>`, `<button class="btn" data-action="close-modal">Cancel</button><button class="btn ${danger ? 'btn-danger solid' : 'btn-primary'}" id="confirm-ok">${esc(okLabel)}</button>`));
    document.getElementById('confirm-ok').onclick = () => { closeModal(); onOk(); };
  }
  function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }

  /* ------------------------------------------------------------ login */
  function renderLogin(err) {
    const pillars = [
      ['#9a327c', 'Every record has an owner', 'One accountable person per contract or document.'],
      ['#e2893a', 'Key dates are monitored', 'Expiry, renewal notice and review dates are flagged before they are missed.'],
      ['#2f4f85', 'Complete activity history', 'Every change, approval, view and download is recorded.'],
    ];
    $app.innerHTML = `
      <div class="login">
        <section class="login-brand">
          <img class="logo" src="assets/logo-full.png" alt="Makati Life Medical Center">
          <div class="pitch">
            <h1>Contract &amp; Document Monitoring</h1>
            <p>A central system for tracking hospital contracts and controlled documents across every department, from Nursing and Radiology to Billing and Admissions.</p>
            <ul class="pillars">${pillars.map(([c, b, s]) => `<li><span class="dot" style="background:${c}"></span><div><b>${b}</b><span>${s}</span></div></li>`).join('')}</ul>
          </div>
          <footer>Metropolitan Avenue and Malugay St., Brgy. Bel-Air, Makati City, Philippines, 1209 · Internal use only</footer>
        </section>
        <section class="login-panel">
          <div class="login-card">
            <h2>Sign in</h2>
            <div class="muted">Use your hospital account. Access level is set by your role.</div>
            <form id="login-form" autocomplete="off">
              <label class="field">Email<input type="email" name="email" required></label>
              <label class="field">Password<input type="password" name="password" required></label>
              ${err ? `<div class="error-text">${esc(err)}</div>` : ''}
              <button class="btn btn-primary" type="submit">Sign in</button>
            </form>
          </div>
        </section>
      </div>`;
    document.getElementById('login-form').onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const res = await S.checkLogin(f.get('email'), f.get('password'));
      if (res.status === 'needs-password') return renderCreatePassword(res.user);
      if (res.status !== 'ok') return renderLogin('Incorrect email or password.');
      finishSignIn(res.user, 'Signed in');
    };
  }

  function finishSignIn(u, action) {
    S.log(null, u.id, action, `${u.name} ${action === 'Signed in' ? 'signed in' : 'created a password and signed in'}`); S.save();
    location.hash = '#/dashboard'; render();
  }

  // First sign-in for an allowed email: the tester chooses their own password.
  function renderCreatePassword(u, err) {
    renderLogin();
    const card = document.querySelector('.login-card');
    card.innerHTML = `
      <h2>Create your password</h2>
      <div class="muted">First sign-in for <b class="mono">${esc(u.email)}</b>. Choose a password you'll use from now on in this browser.</div>
      <form id="pw-form" autocomplete="off">
        <label class="field">New password<input type="password" name="pw1" required minlength="8" autocomplete="new-password"><span class="hint">At least 8 characters.</span></label>
        <label class="field">Confirm password<input type="password" name="pw2" required minlength="8" autocomplete="new-password"></label>
        ${err ? `<div class="error-text">${esc(err)}</div>` : ''}
        <button class="btn btn-primary" type="submit">Create password and sign in</button>
        <button class="btn" type="button" data-action="back-to-login">Back</button>
      </form>`;
    card.querySelector('[name=pw1]').focus();
    document.getElementById('pw-form').onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      if (f.get('pw1') !== f.get('pw2')) return renderCreatePassword(u, 'The two passwords do not match.');
      try { await S.setPassword(u, f.get('pw1')); } catch (err2) { return renderCreatePassword(u, err2.message); }
      S.startSession(u);
      finishSignIn(u, 'Password created');
    };
  }

  /* ------------------------------------------------------------ shell */
  function shell(u, active, content) {
    const team = S.isTeam(u);
    const pending = S.state.requests.filter((q) => q.status === 'Pending').length;
    const myPending = S.state.requests.filter((q) => q.status === 'Pending' && q.userId === u.id).length;
    const link = (hash, label, key, count) => `<a href="#${hash}" class="${active === key ? 'active' : ''}">${label}${count ? `<span class="count">${count}</span>` : ''}</a>`;
    const nav = team
      ? `<div class="group">Monitor</div>${link('/dashboard', 'Dashboard', 'dashboard')}${link('/registry', 'Registry', 'registry')}
         <div class="group">Control</div>${link('/requests', 'Access Requests', 'requests', pending)}${link('/activity', 'Activity Log', 'activity')}
         <div class="group">Admin</div>${link('/settings', 'Settings &amp; Integrations', 'settings')}`
      : `<div class="group">Menu</div>${link('/dashboard', 'My Dashboard', 'dashboard')}${link('/registry', 'Registry', 'registry')}${link('/requests', 'My Requests', 'requests', myPending)}`;
    $app.innerHTML = `
      <div class="shell">
        <header class="topbar">
          <a href="#/dashboard"><img class="logo" src="assets/logo-full.png" alt="Makati Life Medical Center"></a>
          <div class="product">Contract &amp; Document Tracker<small>Centralized monitoring and accountability</small></div>
          <div class="spacer"></div>
          <div class="userchip"><div class="avatar">${esc(initials(u.name))}</div>
            <div class="meta"><b>${esc(u.name)}</b><span class="small muted">${M.ROLES[u.role].label}${u.dept ? ' · ' + esc(u.dept) : ''}</span></div>
            <button class="btn btn-sm" data-action="logout">Sign out</button></div>
        </header>
        <div class="brandbar"></div>
        <aside class="sidebar"><nav class="nav">${nav}</nav>
          <div class="role-note"><b>${M.ROLES[u.role].label}</b>${M.ROLES[u.role].desc}</div></aside>
        <main class="view" id="view">${content}</main>
      </div>`;
  }

  /* -------------------------------------------------------- dashboard */
  function viewDashboard(u) {
    const recs = S.state.records;
    const tracked = recs.filter((r) => M.TRACKED_STATUSES.includes(r.status));
    const att = tracked.map((r) => ({ r, a: S.attention(r) }));
    const greeting = (() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; })();
    const todayStr = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    if (!S.isTeam(u)) return viewMyDashboard(u, greeting, todayStr);

    const crit = att.filter((x) => x.a.level === 'critical');
    const soon = att.filter((x) => ['critical', 'warning', 'notice'].includes(x.a.level));
    const pending = S.state.requests.filter((q) => q.status === 'Pending');
    const noOwner = recs.filter((r) => !r.ownerId);

    const needs = soon.sort((x, y) => levelRank[x.a.level] - levelRank[y.a.level] || (x.a.days ?? 0) - (y.a.days ?? 0)).slice(0, 10);

    const byDept = M.DEPARTMENTS.map((d) => {
      const rs = recs.filter((r) => r.dept === d.code);
      return { d, total: rs.length, contracts: rs.filter((r) => r.category === 'Contract').length, docs: rs.filter((r) => r.category === 'Document').length,
        attention: rs.filter((r) => ['critical', 'warning'].includes(S.attention(r).level)).length,
        action: rs.filter((r) => S.attention(r).level === 'critical').length };
    }).filter((x) => x.total);

    return `
      <div class="page-head"><div><h1>${greeting}, ${esc(u.name)}</h1><p>${todayStr} · ${tracked.length} records under active monitoring</p></div>
        <div class="actions"><a class="btn btn-primary" href="#/new">+ New record</a></div></div>
      <div class="kpis">
        <a class="kpi crit" href="#/registry" data-filter-attention="action"><div class="label">Needs action now</div><div class="value">${crit.length}</div><div class="sub">Expired, overdue or notice missed</div></a>
        <a class="kpi warn" href="#/registry" data-filter-attention="soon"><div class="label">Coming due ≤ ${Math.max(...S.state.settings.remindDays)} days</div><div class="value">${soon.length - crit.length}</div><div class="sub">Expiries, renewals and reviews</div></a>
        <a class="kpi plum" href="#/requests"><div class="label">Pending access requests</div><div class="value">${pending.length}</div><div class="sub">Awaiting Records Team approval</div></a>
        <a class="kpi" href="#/registry"><div class="label">Total records</div><div class="value">${recs.length}</div><div class="sub">${recs.filter((r) => r.category === 'Contract').length} contracts · ${recs.filter((r) => r.category === 'Document').length} documents${noOwner.length ? ` · <b style="color:var(--crit)">${noOwner.length} without owner</b>` : ''}</div></a>
      </div>
      <div class="card"><div class="card-head"><h2>Needs attention</h2><a href="#/registry" data-filter-attention="soon" class="small">View all</a></div>
          <div class="card-body flush">${needs.length ? `<table class="tbl compact"><thead><tr><th>Record</th><th>Dept</th><th>Key date</th><th>Monitoring</th></tr></thead><tbody>
            ${needs.map(({ r, a }) => `<tr class="clickable" data-href="#/record/${r.id}"><td class="title-cell"><b>${esc(r.title)}</b><span class="mono">${esc(r.code)}</span><span class="owner">Owner: ${esc(S.userName(r.ownerId))}</span></td><td>${deptChip(r.dept)}</td><td class="nowrap">${M.fmt(S.keyDate(r))}<div class="small muted">${r.category === 'Contract' ? 'Expiry' : 'Review'}</div></td><td>${badge(a)}</td></tr>`).join('')}
          </tbody></table>` : '<div class="empty">Nothing needs attention. Everything is on track.</div>'}</div></div>
      <div class="card" style="margin-top:18px"><div class="card-head"><h2>By department</h2><span class="small muted">Click a department to open its records</span></div>
        <div class="card-body flush table-wrap"><table class="tbl"><thead><tr><th>Department</th><th>Contracts</th><th>Documents</th><th>Needs attention</th><th>Needs action now</th></tr></thead><tbody>
          ${byDept.map((x) => `<tr class="clickable" data-dept="${x.d.code}"><td>${deptChip(x.d.code, true)}</td><td>${x.contracts}</td><td>${x.docs}</td><td>${x.attention ? `<span class="badge warning">${x.attention}</span>` : '<span class="muted">0</span>'}</td><td>${x.action ? `<span class="badge critical">${x.action}</span>` : '<span class="muted">0</span>'}</td></tr>`).join('')}
        </tbody></table></div></div>`;
  }

  function viewMyDashboard(u, greeting, todayStr) {
    const mine = S.state.records.filter((r) => r.ownerId === u.id);
    const myReqs = S.state.requests.filter((q) => q.userId === u.id);
    const now = new Date().toISOString();
    const grants = myReqs.filter((q) => q.status === 'Approved' && q.expiresAt > now);
    return `
      <div class="page-head"><div><h1>${greeting}, ${esc(u.name)}</h1><p>${todayStr}${u.dept ? ' · ' + esc(S.lookups.deptName(u.dept)) : ''}</p></div>
        <div class="actions"><a class="btn btn-primary" href="#/registry">Browse registry</a></div></div>
      <div class="callout" style="margin-bottom:18px"><b>You have limited access.</b>You can open records you own. To view or download any other contract or document, send a request; the Records Team approves it and access lasts for a set number of days.</div>
      <div class="kpis">
        <div class="kpi"><div class="label">Records I own</div><div class="value">${mine.length}</div><div class="sub">${mine.filter((r) => ['critical', 'warning'].includes(S.attention(r).level)).length} need attention</div></div>
        <a class="kpi plum" href="#/requests"><div class="label">Pending requests</div><div class="value">${myReqs.filter((q) => q.status === 'Pending').length}</div><div class="sub">Awaiting approval</div></a>
        <a class="kpi" href="#/requests"><div class="label">Active access</div><div class="value">${grants.length}</div><div class="sub">Approved and not yet expired</div></a>
      </div>
      <div class="card"><div class="card-head"><h2>Records I own</h2></div><div class="card-body flush">
        ${mine.length ? `<table class="tbl compact"><tbody>${mine.map((r) => `<tr class="clickable" data-href="#/record/${r.id}"><td class="title-cell"><b>${esc(r.title)}</b><span class="mono">${esc(r.code)}</span></td><td>${deptChip(r.dept)}</td><td>${statusTag(r.status)}</td><td class="nowrap">${M.fmt(S.keyDate(r))}<div class="small muted">${r.category === 'Contract' ? 'Expiry' : 'Next review'}</div></td><td style="text-align:right">${badge(S.attention(r))}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">You are not the owner of any records.</div>'}
      </div></div>
      ${grants.length ? `<div class="card" style="margin-top:18px"><div class="card-head"><h2>My active access</h2></div><div class="card-body flush"><table class="tbl compact"><tbody>
        ${grants.map((q) => { const r = S.record(q.recordId); return r ? `<tr class="clickable" data-href="#/record/${r.id}"><td class="title-cell"><b>${esc(r.title)}</b><span class="mono">${esc(r.code)}</span></td><td>${q.type === 'download' ? 'View &amp; download' : 'View only'}</td><td class="small muted nowrap">Expires ${M.fmtTs(q.expiresAt)}</td></tr>` : ''; }).join('')}
      </tbody></table></div></div>` : ''}`;
  }

  /* --------------------------------------------------------- registry */
  function filteredRecords(u) {
    const f = ui.filters; const q = f.q.trim().toLowerCase();
    return S.state.records.filter((r) => {
      if (f.category && r.category !== f.category) return false;
      if (f.dept && r.dept !== f.dept) return false;
      if (f.status && r.status !== f.status) return false;
      if (f.attention) {
        const a = S.attention(r);
        if (f.attention === 'action' && a.level !== 'critical') return false;
        if (f.attention === 'soon' && !['critical', 'warning', 'notice'].includes(a.level)) return false;
        if (f.attention === 'ok' && a.level !== 'ok') return false;
        if (f.attention === 'mine' && r.ownerId !== u.id) return false;
      }
      if (q) {
        const hay = [r.code, r.title, r.counterparty, S.lookups.deptName(r.dept), S.lookups.typeName(r.type), S.userName(r.ownerId)].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      const la = S.attention(a), lb = S.attention(b);
      return levelRank[la.level] - levelRank[lb.level] || (la.days ?? 99999) - (lb.days ?? 99999);
    });
  }

  function viewRegistry(u) {
    const team = S.isTeam(u);
    const f = ui.filters;
    const list = filteredRecords(u);
    const opt = (v, label, cur) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${label}</option>`;
    return `
      <div class="page-head"><div><h1>Registry</h1><p>All contracts and controlled documents, sorted by urgency.</p></div>
        <div class="actions">${team ? `<button class="btn" data-action="export-csv">Export CSV</button><a class="btn btn-primary" href="#/new">+ New record</a>` : ''}</div></div>
      <div class="card">
        <form class="filters" id="filters">
          <label class="field search">Search<input type="search" name="q" value="${esc(f.q)}" placeholder="Code, title, counterparty, owner…"></label>
          <label class="field">Category<select name="category">${opt('', 'All', f.category)}${opt('Contract', 'Contracts', f.category)}${opt('Document', 'Documents', f.category)}</select></label>
          <label class="field">Department<select name="dept">${deptOptions(f.dept, 'All departments')}</select></label>
          <label class="field">Status<select name="status">${opt('', 'All', f.status)}${M.STATUSES.map((s) => opt(s, s, f.status)).join('')}</select></label>
          <label class="field">Monitoring<select name="attention">${opt('', 'All', f.attention)}${opt('action', 'Needs action now', f.attention)}${opt('soon', 'Coming due / needs attention', f.attention)}${opt('ok', 'On track', f.attention)}${opt('mine', 'Owned by me', f.attention)}</select></label>
          <button type="button" class="btn" data-action="clear-filters">Clear</button>
        </form>
        <div class="card-body flush table-wrap">
          ${list.length ? `<table class="tbl"><thead><tr><th>Record</th><th>Department</th><th>Type</th><th>Owner</th><th>Key date</th><th>Monitoring</th><th>Status</th>${team ? '' : '<th>Access</th>'}</tr></thead><tbody>
          ${list.map((r) => {
            const can = S.canView(u, r);
            const pend = !team && S.pendingRequest(u, r);
            return `<tr class="clickable" data-href="#/record/${r.id}">
              <td class="title-cell"><b>${esc(r.title)}</b><span class="mono">${esc(r.code)}</span>${r.counterparty ? `<span> · ${esc(r.counterparty)}</span>` : ''}</td>
              <td>${deptChip(r.dept)}</td>
              <td>${catTag(r.category)}<div class="small muted">${esc(S.lookups.typeName(r.type))}</div></td>
              <td class="nowrap">${r.ownerId ? esc(S.userName(r.ownerId)) : '<span class="badge critical">No owner</span>'}</td>
              <td class="nowrap">${M.fmt(S.keyDate(r))}<div class="small muted">${r.category === 'Contract' ? 'Expiry' : 'Next review'}</div></td>
              <td>${badge(S.attention(r))}</td>
              <td>${statusTag(r.status)}</td>
              ${team ? '' : `<td class="lock">${can ? (r.ownerId === u.id ? 'Owner' : 'Granted') : pend ? 'Requested' : 'Locked'}</td>`}
            </tr>`; }).join('')}
          </tbody></table>` : '<div class="empty">No records match these filters.</div>'}
        </div>
      </div>
      <p class="small muted">Showing ${list.length} of ${S.state.records.length} records.</p>`;
  }

  function exportCsv(u) {
    const rows = [['Code', 'Title', 'Category', 'Type', 'Department', 'Document Owner', 'Accountable Owner', 'Status', 'Version', 'Effective Date', 'Last Revised', 'Expiry Date', 'Notice Days', 'Notice Deadline', 'Next Review', 'Counterparty', 'Value (PHP)', 'Monitoring']];
    filteredRecords(u).forEach((r) => rows.push([r.code, r.title, r.category, S.lookups.typeName(r.type), S.lookups.deptName(r.dept), S.lookups.deptName(r.ownerDept), S.userName(r.ownerId), r.status, r.version, M.fmt(r.effectiveDate), M.fmt(r.lastRevisedDate), M.fmt(r.expiryDate), r.noticeDays || '', M.fmt(S.noticeDeadline(r)), M.fmt(r.reviewDate), r.counterparty, r.value, S.attention(r).label]));
    const csv = rows.map((row) => row.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
    saveBlob(new Blob(['﻿' + csv], { type: 'text/csv' }), `MLMC-registry-${new Date().toISOString().slice(0, 10)}.csv`);
    S.log(null, u.id, 'Exported', `Registry exported to CSV (${rows.length - 1} records)`); S.save();
  }
  function saveBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  /* ------------------------------------------------------ record view */
  function docHeaderHtml(r) {
    return `<div class="doc-header"><div class="logo-cell"><img src="assets/logo-full.png" alt="Makati Life Medical Center"></div>
      <div><div class="r1">${esc(S.lookups.deptName(r.dept))}</div><div class="r2">${esc(r.title)}</div>
      <div class="r3"><div>${esc(S.lookups.typeName(r.type))}</div><div>Effective Date: ${M.fmt(r.effectiveDate)}</div><div>Version: ${esc(r.version)}</div></div></div></div>`;
  }

  function viewRecord(u, id) {
    const r = S.record(id);
    if (!r) return `<div class="empty"><h2>Record not found</h2><p>It may have been deleted. <a href="#/registry">Back to registry</a></p></div>`;
    const team = S.isTeam(u);
    if (!S.canView(u, r)) return viewLocked(u, r);
    S.logViewed(u, r);
    if (ui.tabRecord !== id) { ui.tab = ui.pendingTab || 'overview'; ui.tabRecord = id; }
    ui.pendingTab = null;
    const a = S.attention(r);
    const canDl = S.canDownload(u, r);
    const fileInfo = storage.getFileInfo(r);
    const seeHistory = team || r.ownerId === u.id;
    const tabs = [['overview', 'Overview']];
    if (seeHistory) tabs.push(['activity', `Activity (${S.state.activity.filter((x) => x.recordId === r.id).length})`]);
    if (team) tabs.push(['access', `Access (${S.state.requests.filter((q) => q.recordId === r.id).length})`]);
    if (!tabs.some((t) => t[0] === ui.tab)) ui.tab = 'overview';
    const grant = !team && r.ownerId !== u.id ? S.activeGrant(u, r, 'view') : null;

    let body = '';
    if (ui.tab === 'overview') body = recordOverview(r, fileInfo);
    if (ui.tab === 'activity') body = recordActivity(r);
    if (ui.tab === 'access') body = recordAccess(r);

    return `
      <div class="crumbs"><a href="#/registry">Registry</a> / <span class="mono">${esc(r.code)}</span></div>
      ${docHeaderHtml(r)}
      ${grant ? `<div class="callout" style="margin-bottom:14px"><b>Temporary access</b>${grant.type === 'download' ? 'View &amp; download' : 'View-only'} access approved by ${esc(S.userName(grant.decidedBy))}. Expires ${M.fmtTs(grant.expiresAt)}.</div>` : ''}
      <div class="record-bar">
        <div class="flags">${catTag(r.category)} ${statusTag(r.status)} ${badge(a)} ${deptChip(r.dept, true)}</div>
        <div class="actions">
          <button class="btn" data-action="preview" data-id="${r.id}">View document</button>
          ${team ? `<button class="btn" data-action="status-modal" data-id="${r.id}">Change status</button><button class="btn" data-action="upload-modal" data-id="${r.id}">Upload file</button><button class="btn btn-danger" data-action="delete-record" data-id="${r.id}">Delete</button>` : ''}
          <div class="end-group">
            ${team ? `<a class="btn btn-primary btn-edit" href="#/record/${r.id}/edit">Edit</a>` : ''}
            ${canDl ? `<button class="btn btn-ok" data-action="download" data-id="${r.id}">Download</button>` : S.pendingRequest(u, r) ? `<button class="btn btn-ok" disabled>Download requested</button>` : `<button class="btn btn-ok" data-action="request-modal" data-id="${r.id}" data-type="download">Request download</button>`}
          </div>
        </div>
      </div>
      <div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" class="${ui.tab === k ? 'active' : ''}" data-action="tab" data-tab="${k}">${l}</button>`).join('')}</div>
      ${body}`;
  }

  function recordOverview(r, fileInfo) {
    const sig = (p) => (p && p.name ? `<div class="signatory"><b>${esc(p.name)}</b><span>${esc(p.title)}</span></div>` : '<span class="muted">Not yet signed</span>');
    const nd = S.noticeDeadline(r);
    const ndDays = M.daysUntil(nd);
    return `<div class="grid-2">
      <div class="card"><div class="card-head"><h3>Document control</h3></div><div class="card-body"><dl class="kv">
        <dt>Document code</dt><dd class="mono">${esc(r.code)}</dd>
        <dt>Title</dt><dd>${esc(r.title)}</dd>
        <dt>Type</dt><dd>${esc(S.lookups.typeName(r.type))} (${esc(r.type)})</dd>
        <dt>Originating department</dt><dd>${deptChip(r.dept, true)}</dd>
        <dt>Document owner</dt><dd>${esc(S.lookups.deptName(r.ownerDept).toUpperCase())}</dd>
        <dt>Version</dt><dd>${esc(r.version)}</dd>
        <dt>Effective date</dt><dd>${M.fmt(r.effectiveDate)}</dd>
        <dt>Last revised date</dt><dd>${r.lastRevisedDate ? M.fmt(r.lastRevisedDate) : 'Not Applicable'}</dd>
        <dt>Prepared by</dt><dd>${sig(r.preparedBy)}</dd>
        <dt>Approved by</dt><dd>${sig(r.approvedBy)}</dd>
      </dl></div></div>
      <div class="stack">
        <div class="card"><div class="card-head"><h3>Monitoring &amp; accountability</h3></div><div class="card-body"><dl class="kv">
          <dt>Accountable owner</dt><dd>${r.ownerId ? `${esc(S.userName(r.ownerId))}<div class="small muted">${esc((S.user(r.ownerId) || {}).title || '')}</div>` : '<span class="badge critical">No owner assigned</span>'}</dd>
          <dt>Status</dt><dd>${statusTag(r.status)}</dd>
          ${r.category === 'Contract' ? `
            <dt>Counterparty</dt><dd>${esc(r.counterparty) || '—'}</dd>
            <dt>Contract value</dt><dd>${r.value ? 'PHP ' + esc(r.value) : '—'}</dd>
            <dt>Expiry date</dt><dd>${M.fmt(r.expiryDate)}</dd>
            <dt>Notice period</dt><dd>${r.noticeDays ? r.noticeDays + ' days before expiry' : 'None'}</dd>
            <dt>Notice deadline</dt><dd>${nd ? `${M.fmt(nd)} ${ndDays < 0 ? '<span class="badge critical">Passed</span>' : `<span class="small muted">(${ndDays} d left)</span>`}` : '—'}</dd>`
          : `<dt>Next review date</dt><dd>${M.fmt(r.reviewDate)}</dd>`}
          <dt>Monitoring</dt><dd>${badge(S.attention(r))}</dd>
        </dl></div></div>
        <div class="card"><div class="card-head"><h3>File</h3><span class="pill ${S.state.settings.onedrive.connected ? 'on' : 'mock'}">${esc(storage.name)}</span></div><div class="card-body"><dl class="kv">
          <dt>File name</dt><dd class="mono">${esc(fileInfo.name)}</dd><dt>Size</dt><dd>${kb(fileInfo.size)}</dd><dt>Source</dt><dd>${esc(fileInfo.source)}</dd></dl></div></div>
        ${r.notes ? `<div class="card"><div class="card-head"><h3>Notes</h3></div><div class="card-body">${esc(r.notes)}</div></div>` : ''}
      </div></div>`;
  }

  function recordActivity(r) {
    const items = S.state.activity.filter((x) => x.recordId === r.id).sort((a, b) => b.ts.localeCompare(a.ts));
    return `<div class="card"><div class="card-head"><h2>Activity history</h2><span class="small muted">Permanent record of every action on this ${r.category.toLowerCase()}</span></div>
      <ul class="timeline">${items.map((x) => `<li><div class="when">${M.fmtTs(x.ts)}</div><div class="what"><b>${esc(x.action)}</b> · ${esc(S.userName(x.userId))}<div class="detail">${esc(x.detail)}</div></div></li>`).join('') || '<li class="empty">No activity yet.</li>'}</ul></div>`;
  }

  function recordAccess(r) {
    const qs = S.state.requests.filter((q) => q.recordId === r.id);
    return `<div class="card"><div class="card-head"><h2>Access requests &amp; grants</h2></div>${qs.length ? qs.map((q) => reqCard(q, true, false)).join('') : '<div class="empty">No one has requested access to this record.</div>'}</div>`;
  }

  function viewLocked(u, r) {
    const pend = S.pendingRequest(u, r);
    const last = S.state.requests.filter((q) => q.userId === u.id && q.recordId === r.id && q.status !== 'Pending').sort((a, b) => b.ts.localeCompare(a.ts))[0];
    return `<div class="crumbs"><a href="#/registry">Registry</a> / <span class="mono">${esc(r.code)}</span></div>
      <div class="card locked"><div class="card-body">
        <h1>${esc(r.title)}</h1>
        <div class="meta">
          <div><span class="lbl">Document code</span><b class="mono">${esc(r.code)}</b></div>
          <div><span class="lbl">Department</span>${deptChip(r.dept, true)}</div>
          <div><span class="lbl">Type</span>${esc(S.lookups.typeName(r.type))}</div>
          <div><span class="lbl">Status</span>${statusTag(r.status)}</div>
        </div>
        <div class="callout warn"><b>Approval required</b>This record is restricted. The Records Team must approve your request before you can view or download it.</div>
        ${last && last.status === 'Rejected' ? `<div class="callout crit" style="margin-top:12px"><b>Your previous request was not approved</b>${esc(last.note || 'No reason given.')}</div>` : ''}
        ${last && ['Approved', 'Revoked'].includes(last.status) ? `<div class="callout" style="margin-top:12px"><b>Your previous access has ended</b>Access expired or was revoked on ${M.fmtTs(last.expiresAt)}.</div>` : ''}
        ${pend ? `<div class="callout" style="margin-top:12px"><b>Request pending</b>You requested ${pend.type === 'download' ? 'view &amp; download' : 'view'} access on ${M.fmtTs(pend.ts)}. Check back here or under My Requests for the Records Team's decision.</div>
          <div class="form-actions"><button class="btn btn-danger" data-action="withdraw" data-id="${pend.id}">Withdraw request</button></div>`
        : requestFormHtml(r, 'view')}
      </div></div>`;
  }

  function requestFormHtml(r, type) {
    const d = S.state.settings.defaultAccessDays;
    return `<form id="request-form" data-id="${r.id}" style="margin-top:18px;display:grid;gap:14px">
      <div class="field"><span style="font-size:12.5px;font-weight:600">Access needed</span><div class="radio-row">
        <label><input type="radio" name="type" value="view" ${type === 'view' ? 'checked' : ''}> View only</label>
        <label><input type="radio" name="type" value="download" ${type === 'download' ? 'checked' : ''}> View &amp; download</label></div></div>
      <label class="field">Duration<select name="durationDays">${[1, 3, 7, 14, 30].map((n) => `<option value="${n}" ${n === d ? 'selected' : ''}>${n} day${n > 1 ? 's' : ''}</option>`).join('')}</select></label>
      <label class="field"><span class="req">Reason / purpose</span><textarea name="reason" required placeholder="Why do you need this document?"></textarea></label>
      <div class="form-actions" style="margin-top:0"><button class="btn btn-primary" type="submit">Send request to Records Team</button></div>
    </form>`;
  }

  /* --------------------------------------------------- record editor */
  function viewEditor(u, id) {
    if (!S.isTeam(u)) return `<div class="empty">Only the Records Team can create or edit records.</div>`;
    const r = id ? S.record(id) : null;
    if (id && !r) return `<div class="empty">Record not found.</div>`;
    const v = r || { category: 'Document', type: 'WIN', dept: 'MBD', ownerDept: 'MBD', version: '1.0', status: 'Active', ownerId: '', preparedBy: { name: '', title: '' }, approvedBy: { name: '', title: '' }, noticeDays: 30 };
    const typeOpts = ['Document', 'Contract'].map((c) => `<optgroup label="${c}s">${M.DOC_TYPES.filter((t) => t.category === c).map((t) => `<option value="${t.code}" ${t.code === v.type ? 'selected' : ''}>${t.code} — ${t.name}</option>`).join('')}</optgroup>`).join('');
    return `
      <div class="crumbs"><a href="#/registry">Registry</a> / ${r ? `<a href="#/record/${r.id}" class="mono">${esc(r.code)}</a> / Edit` : 'New record'}</div>
      <div class="page-head"><div><h1>${r ? 'Edit record' : 'New record'}</h1><p>Fields mirror the MLMC document cover page. Fields marked * are required.</p></div></div>
      <form id="record-form" data-id="${r ? r.id : ''}" class="stack">
        <div class="card"><div class="card-head"><h3>Document control (cover page)</h3></div><div class="card-body form-grid">
          <label class="field span-2"><span class="req">Title</span><input type="text" name="title" required value="${esc(v.title || '')}"></label>
          <label class="field"><span class="req">Type</span><select name="type" id="f-type">${typeOpts}</select></label>
          <label class="field"><span class="req">Originating department</span><select name="dept" id="f-dept">${deptOptions(v.dept)}</select></label>
          <label class="field"><span class="req">Version</span><input type="text" name="version" id="f-version" required value="${esc(v.version)}"></label>
          <label class="field span-2"><span class="req">Document code</span><input type="text" name="code" id="f-code" class="mono" required value="${esc(v.code || '')}"><span class="hint">Auto-generated as MLMC-DEPT-TYPE-###-Version. You can edit it.</span></label>
          <label class="field"><span class="req">Document owner (department)</span><select name="ownerDept">${deptOptions(v.ownerDept)}</select></label>
          <label class="field"><span class="req">Effective date</span><input type="date" name="effectiveDate" required value="${esc(v.effectiveDate || '')}"></label>
          <label class="field">Last revised date<input type="date" name="lastRevisedDate" value="${esc(v.lastRevisedDate || '')}"><span class="hint">Leave blank for "Not Applicable"</span></label>
        </div></div>
        <div class="card"><div class="card-head"><h3>Monitoring &amp; accountability</h3></div><div class="card-body form-grid">
          <label class="field span-2"><span class="req">Accountable owner (person)</span><select name="ownerId" required><option value="">Select owner…</option>${userOptions(v.ownerId)}</select><span class="hint">The person accountable for this record's key dates.</span></label>
          <label class="field"><span class="req">Status</span><select name="status">${M.STATUSES.map((s) => `<option ${s === v.status ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
          <label class="field doc-only"><span class="req">Next review date</span><input type="date" name="reviewDate" value="${esc(v.reviewDate || '')}"></label>
          <label class="field con-only"><span class="req">Expiry date</span><input type="date" name="expiryDate" value="${esc(v.expiryDate || '')}"></label>
          <label class="field con-only">Renewal / termination notice (days)<input type="number" min="0" name="noticeDays" value="${esc(v.noticeDays || 0)}"></label>
          <label class="field con-only span-2">Counterparty<input type="text" name="counterparty" value="${esc(v.counterparty || '')}" placeholder="Vendor, lessor, partner…"></label>
          <label class="field con-only">Contract value (PHP)<input type="text" name="value" value="${esc(v.value || '')}"></label>
        </div></div>
        <div class="card"><div class="card-head"><h3>Signatories</h3></div><div class="card-body form-grid">
          <label class="field">Prepared by: name<input type="text" name="prepName" value="${esc(v.preparedBy.name)}"></label>
          <label class="field span-2">Prepared by: position<input type="text" name="prepTitle" value="${esc(v.preparedBy.title)}"></label>
          <label class="field">Approved by: name<input type="text" name="apprName" value="${esc(v.approvedBy.name)}"></label>
          <label class="field span-2">Approved by: position<input type="text" name="apprTitle" value="${esc(v.approvedBy.title)}"></label>
          <label class="field span-all">Notes<textarea name="notes">${esc(v.notes || '')}</textarea></label>
        </div></div>
        <div id="form-error" class="error-text"></div>
        <div class="form-actions"><a class="btn" href="${r ? '#/record/' + r.id : '#/registry'}">Cancel</a><button class="btn btn-primary" type="submit">${r ? 'Save changes' : 'Create record'}</button></div>
      </form>`;
  }

  function bindEditor(u) {
    const form = document.getElementById('record-form'); if (!form) return;
    const id = form.dataset.id;
    const codeEl = form.querySelector('#f-code');
    let codeTouched = !!id;
    codeEl.addEventListener('input', () => { codeTouched = true; });
    const sync = () => {
      const t = M.DOC_TYPES.find((x) => x.code === form.type.value);
      const isCon = t.category === 'Contract';
      form.querySelectorAll('.con-only').forEach((el) => el.classList.toggle('hidden', !isCon));
      form.querySelectorAll('.doc-only').forEach((el) => el.classList.toggle('hidden', isCon));
      if (!codeTouched) codeEl.value = S.nextCode(form.dept.value, form.type.value, form.version.value.trim());
    };
    ['type', 'dept', 'version'].forEach((n) => form[n].addEventListener(n === 'version' ? 'input' : 'change', sync));
    sync();
    form.onsubmit = (e) => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(form));
      const t = M.DOC_TYPES.find((x) => x.code === fd.type);
      const isCon = t.category === 'Contract';
      const err = (m) => { document.getElementById('form-error').textContent = m; };
      if (!fd.ownerId) return err('Every record needs an accountable owner.');
      if (isCon && !fd.expiryDate) return err('Contracts need an expiry date so they can be monitored.');
      if (!isCon && !fd.reviewDate) return err('Documents need a next review date so they can be monitored.');
      const dup = S.state.records.find((x) => x.code === fd.code.trim() && x.id !== id);
      if (dup) return err(`Document code ${fd.code} is already used by "${dup.title}".`);
      const data = {
        title: fd.title.trim(), code: fd.code.trim(), type: fd.type, category: t.category, dept: fd.dept, ownerDept: fd.ownerDept,
        version: fd.version.trim(), effectiveDate: fd.effectiveDate, lastRevisedDate: fd.lastRevisedDate, ownerId: fd.ownerId, status: fd.status,
        expiryDate: isCon ? fd.expiryDate : '', noticeDays: isCon ? Number(fd.noticeDays || 0) : 0, reviewDate: isCon ? '' : fd.reviewDate,
        counterparty: isCon ? fd.counterparty.trim() : '', value: isCon ? fd.value.trim() : '',
        preparedBy: { name: fd.prepName.trim(), title: fd.prepTitle.trim() }, approvedBy: { name: fd.apprName.trim(), title: fd.apprTitle.trim() }, notes: fd.notes.trim(),
      };
      const rec = S.saveRecord(u, data, id || null);
      toast(id ? 'Changes saved and logged.' : `Record ${rec.code} created.`);
      go('#/record/' + rec.id);
    };
  }

  /* ------------------------------------------------------- requests */
  function reqCard(q, team, showRecord = true) {
    const r = S.record(q.recordId); const req = S.user(q.userId);
    const now = new Date().toISOString();
    const live = q.status === 'Approved' && q.expiresAt > now;
    const st = q.status === 'Pending' ? 'notice' : live ? 'ok' : q.status === 'Rejected' ? 'critical' : 'none';
    const stLabel = q.status === 'Approved' ? (live ? `Approved · until ${M.fmtTs(q.expiresAt)}` : 'Expired') : q.status;
    return `<div class="req-card"><div>
        <div><span class="badge ${st}">${esc(stLabel)}</span> <b>${q.type === 'download' ? 'View &amp; download' : 'View only'}</b> · ${q.durationDays} day${q.durationDays > 1 ? 's' : ''}</div>
        ${showRecord ? `<div style="margin-top:6px">${r ? `<a href="#/record/${r.id}"><b>${esc(r.title)}</b></a> <span class="mono muted">${esc(r.code)}</span> ${deptChip(r.dept)}` : '<span class="muted">Record deleted</span>'}</div>` : ''}
        ${team ? `<div class="small" style="margin-top:4px">Requested by <b>${esc(req ? req.name : '?')}</b> (${esc(req ? [req.title, req.dept ? S.lookups.deptName(req.dept) : ''].filter(Boolean).join(', ') : '')}) on ${M.fmtTs(q.ts)}</div>` : `<div class="small muted" style="margin-top:4px">Requested ${M.fmtTs(q.ts)}</div>`}
        <div class="reason">${esc(q.reason)}</div>
        ${q.decidedBy ? `<div class="small muted" style="margin-top:6px">${q.status === 'Rejected' ? 'Rejected' : 'Decided'} by ${esc(S.userName(q.decidedBy))} on ${M.fmtTs(q.decidedTs)}${q.note ? ` · “${esc(q.note)}”` : ''}</div>` : ''}
      </div>
      <div class="btns">${team && q.status === 'Pending' ? `<button class="btn btn-ok" data-action="decide" data-id="${q.id}" data-approve="1">Approve</button><button class="btn btn-danger" data-action="decide" data-id="${q.id}" data-approve="0">Reject</button>` : ''}
        ${team && live ? `<button class="btn btn-sm btn-danger" data-action="revoke" data-id="${q.id}">Revoke</button>` : ''}
        ${!team && q.status === 'Pending' ? `<button class="btn btn-sm" data-action="withdraw" data-id="${q.id}">Withdraw</button>` : ''}
        ${!team && live && r ? `<a class="btn btn-sm btn-primary" href="#/record/${r.id}">Open</a>` : ''}</div></div>`;
  }

  function viewRequests(u) {
    const team = S.isTeam(u);
    const now = new Date().toISOString();
    const all = S.state.requests.filter((q) => team || q.userId === u.id).sort((a, b) => b.ts.localeCompare(a.ts));
    const groups = {
      Pending: all.filter((q) => q.status === 'Pending'),
      Active: all.filter((q) => q.status === 'Approved' && q.expiresAt > now),
      History: all.filter((q) => q.status !== 'Pending' && !(q.status === 'Approved' && q.expiresAt > now)),
    };
    if (!groups[ui.reqTab]) ui.reqTab = 'Pending';
    const list = groups[ui.reqTab];
    return `<div class="page-head"><div><h1>${team ? 'Access Requests' : 'My Requests'}</h1><p>${team ? 'Limited-access staff must be approved before they can view or download a record. Each grant expires automatically.' : 'Track your requests to view or download records.'}</p></div></div>
      <div class="tabs">${Object.keys(groups).map((k) => `<button class="${ui.reqTab === k ? 'active' : ''}" data-action="req-tab" data-tab="${k}">${k === 'Active' ? 'Active grants' : k} (${groups[k].length})</button>`).join('')}</div>
      <div class="card">${list.length ? list.map((q) => reqCard(q, team)).join('') : `<div class="empty">${ui.reqTab === 'Pending' ? 'No pending requests.' : 'Nothing here yet.'}</div>`}</div>`;
  }

  /* -------------------------------------------------------- activity */
  function viewActivity() {
    const f = ui.actFilter;
    const actions = [...new Set(S.state.activity.map((a) => a.action))].sort();
    const q = f.q.trim().toLowerCase();
    const list = S.state.activity.filter((a) => (!f.action || a.action === f.action) && (!q || [a.detail, S.userName(a.userId), (S.record(a.recordId) || {}).code].join(' ').toLowerCase().includes(q)))
      .sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 300);
    return `<div class="page-head"><div><h1>Activity Log</h1><p>System-wide audit trail: every change, approval, view, download and sign-in.</p></div></div>
      <div class="card"><form class="filters" id="act-filters" style="grid-template-columns:minmax(200px,2fr) minmax(160px,1fr)">
        <label class="field search">Search<input type="search" name="q" value="${esc(f.q)}" placeholder="Person, record code, detail…"></label>
        <label class="field">Action<select name="action"><option value="">All actions</option>${actions.map((a) => `<option ${a === f.action ? 'selected' : ''}>${esc(a)}</option>`).join('')}</select></label>
      </form>
      <div class="card-body flush table-wrap"><table class="tbl"><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Record</th><th>Detail</th></tr></thead><tbody>
        ${list.map((a) => { const r = S.record(a.recordId); return `<tr><td class="nowrap small">${M.fmtTs(a.ts)}</td><td class="nowrap">${esc(S.userName(a.userId))}</td><td class="nowrap"><b>${esc(a.action)}</b></td><td class="nowrap">${r ? `<a href="#/record/${r.id}" class="mono">${esc(r.code)}</a>` : a.recordId ? '<span class="muted">(deleted)</span>' : '—'}</td><td>${esc(a.detail)}</td></tr>`; }).join('') || '<tr><td colspan="5" class="empty">No matching activity.</td></tr>'}
      </tbody></table></div></div>`;
  }

  /* -------------------------------------------------------- settings */
  function viewSettings(u) {
    const st = S.state.settings; const od = st.onedrive;
    const teamCount = S.state.users.filter((x) => x.role === 'team').length;
    const files = Object.values(S.state.files);
    const uploaded = files.reduce((s, f) => s + f.size, 0);
    return `<div class="page-head"><div><h1>Settings &amp; Integrations</h1><p>Storage, monitoring rules and users.</p></div></div>
      <div class="stack">
        <div class="card"><div class="card-head"><h2>File storage</h2><span class="pill ${od.connected ? 'on' : 'mock'}">${od.connected ? 'OneDrive connected' : 'Using mock storage'}</span></div><div class="card-body">
          <div class="integration"><div class="ico">OD</div><div style="flex:1;min-width:0">
            <b>Microsoft OneDrive / SharePoint</b>
            <p class="muted" style="margin:4px 0 12px">Store contract files in the hospital's Microsoft 365 tenant. Records in the tracker link to the files, and access rules still apply.</p>
            <form id="od-form" class="form-grid">
              <label class="field">Tenant ID<input type="text" name="tenantId" value="${esc(od.tenantId)}" placeholder="xxxxxxxx-xxxx-…"></label>
              <label class="field">Application (client) ID<input type="text" name="clientId" value="${esc(od.clientId)}" placeholder="xxxxxxxx-xxxx-…"></label>
              <label class="field">Root folder<input type="text" name="rootFolder" value="${esc(od.rootFolder)}"></label>
              <div class="field span-all" style="flex-direction:row;gap:8px"><button class="btn btn-primary" type="submit">Connect OneDrive</button></div>
            </form>
            <div class="callout warn" style="margin-top:14px"><b>Not active in this prototype</b>Connecting needs an app registration in Microsoft Entra ID (Azure AD), approved by hospital IT:
              <ol class="steps"><li>Register an app; add delegated Microsoft Graph permissions <span class="mono">Files.ReadWrite.All</span> and <span class="mono">User.Read</span>.</li><li>Enter the Tenant ID and Client ID above; users sign in with their Microsoft 365 accounts.</li><li>Files are read from and written to <span class="mono">${esc(od.rootFolder)}</span> through the Graph API.</li></ol></div>
            <p class="small muted" style="margin-top:12px">Mock storage now: ${S.state.records.length - files.length} generated sample PDFs (~2 KB each, made when requested) · ${files.length} uploaded file(s), ${kb(uploaded)} total · 300 KB upload limit.</p>
          </div></div></div></div>
        <div class="card"><div class="card-head"><h2>Monitoring rules</h2></div><div class="card-body">
            <form id="rules-form" class="form-grid">
              <label class="field span-2">Flag expiries / reviews (days before)<input type="text" name="remindDays" value="${st.remindDays.join(', ')}"><span class="hint">e.g. 90, 60, 30. Sets when records turn blue, amber and red. Contracts are also flagged when the renewal-notice deadline is within 30 days.</span></label>
              <label class="field">Default access duration (days)<input type="number" min="1" name="defaultAccessDays" value="${st.defaultAccessDays}"></label>
              <div class="field span-all"><button class="btn btn-primary" type="submit" style="justify-self:start">Save rules</button></div>
            </form>
        </div></div>
        <div class="card"><div class="card-head"><h2>Users &amp; roles</h2><span class="small muted">Full access = Records Team. Changes are logged.</span></div><div class="card-body flush"><table class="tbl compact users-tbl"><thead><tr><th>Name</th><th>Department</th><th>Email</th><th>Access</th></tr></thead><tbody>
          ${S.state.users.map((x) => {
            const isMe = x.id === u.id;
            const lastTeam = x.role === 'team' && teamCount <= 1;
            const action = isMe ? '<span class="small muted">You</span>'
              : x.role === 'team'
                ? `<button class="btn btn-sm btn-danger" data-action="set-role" data-id="${x.id}" data-role="limited" ${lastTeam ? 'disabled title="At least one person must keep full access"' : ''}>Remove full access</button>`
                : `<button class="btn btn-sm btn-ok" data-action="set-role" data-id="${x.id}" data-role="team">Grant full access</button>`;
            return `<tr><td class="title-cell"><b>${esc(x.name)}</b><span>${esc(x.title || '')}</span><button class="btn btn-sm" style="margin-top:6px" data-action="edit-user" data-id="${x.id}">Edit name</button></td><td>${x.dept ? deptChip(x.dept) : '<span class="muted">—</span>'}</td><td class="mono email">${esc(x.email)}</td><td><div class="access-cell">${x.role === 'team' ? '<span class="badge ok">Records Team</span>' : '<span class="badge none">Limited</span>'}${action}</div></td></tr>`;
          }).join('')}
        </tbody></table></div></div>
        <div class="card"><div class="card-head"><h2>Demo data</h2></div><div class="card-body" style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap">
          <span class="muted">Restore the original sample contracts, requests and history. Your changes in this browser will be lost.</span>
          <button class="btn btn-danger" data-action="reset-demo">Reset demo data</button></div></div>
      </div>`;
  }

  /* ------------------------------------------------------- previews */
  function previewHtml(r) {
    const sig = (label, p) => (p && p.name ? `<div class="sig">${label}<br><br><span style="font-size:12px">[Signed original on file]</span><b>${esc(p.name)}</b><span style="font-size:12px">${esc(p.title)}</span></div>` : '');
    const rows = [['Document Code:', r.code], ['Effective Date:', M.fmt(r.effectiveDate)], ['Last Revised Date:', r.lastRevisedDate ? M.fmt(r.lastRevisedDate) : 'Not Applicable'], ['Version:', r.version], ['Document Owner:', S.lookups.deptName(r.ownerDept).toUpperCase()]];
    if (r.category === 'Contract') rows.push(['Counterparty:', r.counterparty], ['Expiry Date:', M.fmt(r.expiryDate)]);
    return `<div class="paper">${docHeaderHtml(r)}
      <div class="kind">${r.category === 'Contract' ? 'CONTRACT' : esc(S.lookups.typeName(r.type).toUpperCase()) + 'S'}</div>
      <div class="big">${esc(r.title)}</div>
      <table>${rows.map(([k, v]) => `<tr><td>${k}</td><td>${esc(v || '—')}</td></tr>`).join('')}</table>
      ${sig('Prepared by:', r.preparedBy)}${sig('Approved by:', r.approvedBy)}
      <div class="foot">Metropolitan Avenue and Malugay St., Brgy. Bel-Air, Makati City, Philippines, 1209<br>Sample cover page rendered by the prototype</div></div>`;
  }

  /* ----------------------------------------------------------- router */
  function render() {
    const u = S.currentUser();
    if (!u) { renderLogin(); return; }
    const parts = (location.hash.replace(/^#\/?/, '') || 'dashboard').split('/');
    const [page, id, sub] = parts;
    let active = page, html;
    if (page === 'dashboard') html = viewDashboard(u);
    else if (page === 'registry') html = viewRegistry(u);
    else if (page === 'record' && sub === 'edit') { html = viewEditor(u, id); active = 'registry'; }
    else if (page === 'record') { html = viewRecord(u, id); active = 'registry'; }
    else if (page === 'new') { html = viewEditor(u, null); active = 'registry'; }
    else if (page === 'requests') html = viewRequests(u);
    else if (page === 'activity' && S.isTeam(u)) html = viewActivity(u);
    else if (page === 'settings' && S.isTeam(u)) html = viewSettings(u);
    else { location.hash = '#/dashboard'; return; }
    shell(u, active, html);
    bindView(u);
  }

  function bindView(u) {
    const filters = document.getElementById('filters');
    if (filters) {
      const apply = () => {
        const pos = filters.q.selectionStart;
        Object.assign(ui.filters, Object.fromEntries(new FormData(filters)));
        render();
        const q = document.querySelector('#filters [name=q]'); if (q && document.activeElement !== q && pos != null && ui._typing) { q.focus(); q.setSelectionRange(pos, pos); }
      };
      filters.addEventListener('change', apply);
      filters.q.addEventListener('input', () => { ui._typing = true; apply(); ui._typing = false; });
      filters.onsubmit = (e) => e.preventDefault();
    }
    const af = document.getElementById('act-filters');
    if (af) {
      const apply = () => { const pos = af.q.selectionStart; Object.assign(ui.actFilter, Object.fromEntries(new FormData(af))); const typing = document.activeElement === af.q; render(); if (typing) { const q = document.querySelector('#act-filters [name=q]'); q.focus(); q.setSelectionRange(pos, pos); } };
      af.addEventListener('change', apply); af.q.addEventListener('input', apply); af.onsubmit = (e) => e.preventDefault();
    }
    const rf = document.getElementById('request-form');
    if (rf) rf.onsubmit = (e) => {
      e.preventDefault(); const fd = new FormData(rf);
      S.requestAccess(u, rf.dataset.id, fd.get('type'), fd.get('reason').trim(), Number(fd.get('durationDays')));
      closeModal(); toast('Request sent to the Records Team for approval.'); render();
    };
    const odf = document.getElementById('od-form');
    if (odf) odf.onsubmit = (e) => {
      e.preventDefault(); Object.assign(S.state.settings.onedrive, Object.fromEntries(new FormData(odf)), { connected: false }); S.save();
      S.log(null, u.id, 'Settings changed', 'OneDrive connection details saved (prototype: not connected)'); S.save();
      openModal(modalShell('OneDrive not connected yet', `<p style="margin-top:0">Your connection details are saved, but this prototype does not sign in to Microsoft 365. The app keeps using mock storage.</p><p class="muted">To go live, hospital IT registers the app in Microsoft Entra ID. After that, the <span class="mono">OneDriveStorage</span> provider in <span class="mono">js/services.js</span> takes over without other changes to the app.</p>`, '<button class="btn btn-primary" data-action="close-modal">OK</button>'));
    };
    const rules = document.getElementById('rules-form');
    if (rules) rules.onsubmit = (e) => {
      e.preventDefault(); const fd = Object.fromEntries(new FormData(rules));
      const days = fd.remindDays.split(/[,\s]+/).map(Number).filter((n) => n > 0);
      if (!days.length) return toast('Enter at least one threshold.');
      Object.assign(S.state.settings, { remindDays: days.sort((a, b) => b - a).slice(0, 3), defaultAccessDays: Math.max(1, Number(fd.defaultAccessDays)) });
      S.log(null, u.id, 'Settings changed', `Monitoring rules updated: ${days.join('/')} days; default access ${fd.defaultAccessDays} days`); S.save(); toast('Monitoring rules saved.'); render();
    };
    bindEditor(u);
  }

  /* --------------------------------------------------- global events */
  document.addEventListener('click', async (e) => {
    const u = S.currentUser();
    if (e.target.matches('[data-close-backdrop]')) return closeModal();
    const kpiAtt = e.target.closest('[data-filter-attention]');
    if (kpiAtt) { ui.filters = { q: '', category: '', dept: '', status: '', attention: kpiAtt.dataset.filterAttention }; }
    const row = e.target.closest('tr[data-href]');
    if (row && !e.target.closest('a, button')) { if (row.dataset.tab) ui.pendingTab = row.dataset.tab, ui.tabRecord = null; return go(row.dataset.href); }
    const drow = e.target.closest('tr[data-dept]');
    if (drow) { ui.filters = { q: '', category: '', dept: drow.dataset.dept, status: '', attention: '' }; return go('#/registry'); }
    const el = e.target.closest('[data-action]'); if (!el) return;
    const act = el.dataset.action; const id = el.dataset.id;
    switch (act) {
      case 'close-modal': closeModal(); break;
      case 'back-to-login': renderLogin(); break;
      case 'edit-user': {
        const x = S.user(id);
        openModal(modalShell('Edit person', `<div class="form-grid" style="grid-template-columns:1fr">
            <p class="mono small muted" style="margin:0">${esc(x.email)}</p>
            <label class="field"><span class="req">Name</span><input type="text" id="eu-name" value="${esc(x.name)}"></label>
            <label class="field">Position<input type="text" id="eu-title" value="${esc(x.title || '')}"></label>
            <label class="field">Department<select id="eu-dept">${deptOptions(x.dept, 'Not set')}</select></label>
            <div id="eu-err" class="error-text"></div></div>`,
          `<button class="btn" data-action="close-modal">Cancel</button><button class="btn btn-primary" id="eu-ok">Save</button>`));
        document.getElementById('eu-ok').onclick = () => {
          try { S.updateUser(u, id, { name: document.getElementById('eu-name').value, title: document.getElementById('eu-title').value, dept: document.getElementById('eu-dept').value }); closeModal(); toast('Saved.'); render(); }
          catch (err) { document.getElementById('eu-err').textContent = err.message; }
        };
        break;
      }
      case 'logout': S.log(null, u.id, 'Signed out', `${u.name} signed out`); S.save(); S.logout(); location.hash = '#/login'; render(); break;
      case 'tab': ui.tab = el.dataset.tab; render(); break;
      case 'req-tab': ui.reqTab = el.dataset.tab; render(); break;
      case 'clear-filters': ui.filters = { q: '', category: '', dept: '', status: '', attention: '' }; render(); break;
      case 'export-csv': exportCsv(u); toast('CSV exported.'); break;
      case 'preview': {
        const r = S.record(id); const f = S.state.files[id];
        openModal(modalShell(esc(r.code), `${f ? `<div class="callout" style="margin-bottom:14px"><b>Uploaded file: ${esc(f.name)}</b>${kb(f.size)}. ${S.canDownload(u, r) ? 'Use Download to open the original.' : 'Viewing the cover summary only; the original file needs download access.'}</div>` : ''}${previewHtml(r)}`,
          `<button class="btn" data-action="close-modal">Close</button>${S.canDownload(u, r) ? `<button class="btn btn-primary" data-action="download" data-id="${id}">Download</button>` : ''}`), true);
        break;
      }
      case 'download': {
        const r = S.record(id); if (!S.canDownload(u, r)) return toast('You need approved download access.');
        try { const blob = await storage.download(r); const info = storage.getFileInfo(r); saveBlob(blob, info.name); S.logDownload(u, r); toast(`Downloaded ${info.name}. Logged to activity history.`); if (location.hash.includes(id)) render(); }
        catch (err) { toast(err.message); }
        break;
      }
      case 'request-modal': {
        const r = S.record(id);
        openModal(modalShell('Request access', `<p style="margin-top:0"><b>${esc(r.title)}</b><br><span class="mono muted">${esc(r.code)}</span></p>${requestFormHtml(r, el.dataset.type || 'view')}`));
        bindView(u); break;
      }
      case 'withdraw': {
        const q = S.state.requests.find((x) => x.id === id); q.status = 'Withdrawn';
        S.log(q.recordId, u.id, 'Request withdrawn', `${u.name} withdrew their access request`); S.save(); toast('Request withdrawn.'); render(); break;
      }
      case 'decide': {
        const approve = el.dataset.approve === '1';
        const q = S.state.requests.find((x) => x.id === id); const r = S.record(q.recordId);
        openModal(modalShell(approve ? 'Approve request' : 'Reject request',
          `<p style="margin-top:0">${approve ? 'Grant' : 'Reject'} <b>${q.type === 'download' ? 'view &amp; download' : 'view'}</b> access for <b>${esc(S.userName(q.userId))}</b> to <b>${esc(r ? r.title : '')}</b>${approve ? ` for ${q.durationDays} day(s)` : ''}?</p>
           <label class="field">${approve ? 'Note to requester (optional)' : '<span class="req">Reason for rejection</span>'}<textarea id="decide-note"></textarea></label>`,
          `<button class="btn" data-action="close-modal">Cancel</button><button class="btn ${approve ? 'btn-primary' : 'btn-danger solid'}" id="decide-ok">${approve ? 'Approve' : 'Reject'}</button>`));
        document.getElementById('decide-ok').onclick = () => {
          const note = document.getElementById('decide-note').value.trim();
          if (!approve && !note) { document.getElementById('decide-note').focus(); return toast('Please give a reason so the requester knows what to do next.'); }
          S.decideRequest(u, id, approve, note); closeModal(); toast(`Request ${approve ? 'approved' : 'rejected'}. The requester sees the decision under My Requests.`); render();
        };
        break;
      }
      case 'revoke': confirmModal('Revoke access', 'The person will lose access to this record immediately.', 'Revoke', () => { S.revokeRequest(u, id); toast('Access revoked.'); render(); }, true); break;
      case 'set-role': {
        const target = S.user(id); const toTeam = el.dataset.role === 'team';
        confirmModal(toTeam ? 'Grant full access' : 'Remove full access',
          toTeam ? `Give <b>${esc(target.name)}</b> full Records Team access? They will be able to create, edit and delete records, view and download everything without approval, approve access requests, and change settings and roles.`
                 : `Change <b>${esc(target.name)}</b> to limited access? They will need approval to view or download records they don't own.`,
          toTeam ? 'Grant full access' : 'Set to limited',
          () => { try { S.setRole(u, id, el.dataset.role); toast(`${target.name} now has ${toTeam ? 'full' : 'limited'} access.`); render(); } catch (err) { toast(err.message); } }, !toTeam);
        break;
      }
      case 'delete-record': {
        const r = S.record(id);
        confirmModal('Delete record', `Permanently delete <b>${esc(r.code)}</b>, “${esc(r.title)}”? This cannot be undone. The deletion is kept in the activity log.`, 'Delete permanently', () => { S.deleteRecord(u, id); toast(`${r.code} deleted.`); go('#/registry'); }, true);
        break;
      }
      case 'status-modal': {
        const r = S.record(id);
        openModal(modalShell('Change status', `<p style="margin-top:0" class="mono">${esc(r.code)}</p><label class="field">New status<select id="new-status">${M.STATUSES.map((s) => `<option ${s === r.status ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
          <p class="small muted">Only Active, Under Review and For Approval records are monitored for due dates.</p>`, `<button class="btn" data-action="close-modal">Cancel</button><button class="btn btn-primary" id="status-ok">Save</button>`));
        document.getElementById('status-ok').onclick = () => { const s = document.getElementById('new-status').value; if (s !== r.status) { S.saveRecord(u, { ...r, status: s }, r.id); toast(`Status changed to ${s}.`); } closeModal(); render(); };
        break;
      }
      case 'upload-modal': {
        const r = S.record(id);
        openModal(modalShell('Upload file', `<p style="margin-top:0">Attach the signed file for <b class="mono">${esc(r.code)}</b>. It replaces the current file.</p>
          <label class="field">File (PDF, DOCX, image; up to 300 KB in the prototype)<input type="file" id="upload-input" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"></label><div id="upload-err" class="error-text"></div>`,
          `<button class="btn" data-action="close-modal">Cancel</button><button class="btn btn-primary" id="upload-ok">Upload</button>`));
        document.getElementById('upload-ok').onclick = async () => {
          const file = document.getElementById('upload-input').files[0];
          if (!file) return (document.getElementById('upload-err').textContent = 'Choose a file first.');
          try { const info = await storage.upload(r, file); S.log(r.id, u.id, 'File uploaded', `${info.name} (${kb(info.size)}) uploaded to ${storage.name}`); S.save(); closeModal(); toast('File uploaded.'); render(); }
          catch (err) { document.getElementById('upload-err').textContent = err.message; }
        };
        break;
      }
      case 'reset-demo': confirmModal('Reset demo data', 'All records, requests and history in this browser will be restored to the original sample data.', 'Reset', () => { const uid = u.id; S.reset(); try { sessionStorage.setItem('mlmc-tracker-v1-session', uid); } catch (x) {} storage = M.createStorage(S); toast('Demo data restored.'); go('#/dashboard'); }, true); break;
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $modal.innerHTML) closeModal(); });
  window.addEventListener('hashchange', () => { closeModal(); render(); window.scrollTo(0, 0); });

  render();
})(window.MLMC);
