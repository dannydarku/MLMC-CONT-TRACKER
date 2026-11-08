/* =========================================================================
   MLMC Contract & Document Tracker — seed / mock data (PROTOTYPE ONLY)
   - Demo accounts below are test credentials for this local prototype.
   - Production should replace login with Microsoft Entra ID (Office 365) SSO.
   - Dates are generated relative to "today" so the demo always shows a mix
     of healthy, expiring and overdue items.
   ========================================================================= */
window.MLMC = window.MLMC || {};

(function (M) {
  const DAY = 86400000;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = (offset) => new Date(today.getTime() + offset * DAY).toISOString().slice(0, 10);
  const ts = (offsetDays, hour = 9) => {
    const t = new Date(today.getTime() + offsetDays * DAY); t.setHours(hour, 15, 0, 0); return t.toISOString();
  };

  M.DEMO_PASSWORD = 'demo123';

  M.ROLES = {
    team:    { label: 'Records Team', desc: 'Full access: create, edit, delete, approve requests' },
    limited: { label: 'Limited Access', desc: 'View/download only after approval from the Records Team' },
  };

  M.DEPARTMENTS = [
    { code: 'MBD', name: 'Marketing and Business Development' },
    { code: 'NSG', name: 'Nursing Services' },
    { code: 'RAD', name: 'Radiology' },
    { code: 'LAB', name: 'Clinical Laboratory (Medical Technology)' },
    { code: 'BIL', name: 'Billing and Collection' },
    { code: 'ADM', name: 'Admissions' },
    { code: 'PHA', name: 'Pharmacy' },
    { code: 'HRD', name: 'Human Resources' },
    { code: 'FIN', name: 'Finance' },
    { code: 'ENG', name: 'Engineering and Facilities' },
    { code: 'ITD', name: 'Information Technology' },
    { code: 'COO', name: 'Office of the Chief Operating Officer' },
  ];

  // category: Document = controlled hospital documents (reviewed periodically)
  //           Contract = agreements with an external party (expire / renew)
  M.DOC_TYPES = [
    { code: 'WIN', name: 'Work Instruction', category: 'Document' },
    { code: 'POL', name: 'Policy', category: 'Document' },
    { code: 'SOP', name: 'Standard Operating Procedure', category: 'Document' },
    { code: 'FRM', name: 'Form', category: 'Document' },
    { code: 'MAN', name: 'Manual', category: 'Document' },
    { code: 'CSA', name: 'Service Agreement', category: 'Contract' },
    { code: 'SUP', name: 'Supply Agreement', category: 'Contract' },
    { code: 'MNT', name: 'Maintenance Contract', category: 'Contract' },
    { code: 'LSE', name: 'Lease Agreement', category: 'Contract' },
    { code: 'MOA', name: 'Memorandum of Agreement', category: 'Contract' },
    { code: 'NDA', name: 'Non-Disclosure Agreement', category: 'Contract' },
  ];

  M.STATUSES = ['Draft', 'For Approval', 'Active', 'Under Review', 'Superseded', 'Expired', 'Terminated'];
  M.TRACKED_STATUSES = ['Active', 'Under Review', 'For Approval'];

  M.seed = function () {
    const users = [
      { id: 'u1', name: 'Andrea Santos',   title: 'Contracts & Records Officer',  dept: 'COO', role: 'team',    email: 'andrea.santos@mlmc.test' },
      { id: 'u2', name: 'Miguel Reyes',    title: 'Records Analyst',              dept: 'COO', role: 'team',    email: 'miguel.reyes@mlmc.test' },
      { id: 'u3', name: 'Patricia Lim',    title: 'Records Supervisor',           dept: 'COO', role: 'team',    email: 'patricia.lim@mlmc.test' },
      { id: 'u4', name: 'Joanna Cruz',     title: 'Nurse Supervisor',             dept: 'NSG', role: 'limited', email: 'joanna.cruz@mlmc.test' },
      { id: 'u5', name: 'Ramon Dizon',     title: 'Chief Radiologic Technologist', dept: 'RAD', role: 'limited', email: 'ramon.dizon@mlmc.test' },
      { id: 'u6', name: 'Liza Mendoza',    title: 'Billing Supervisor',           dept: 'BIL', role: 'limited', email: 'liza.mendoza@mlmc.test' },
      { id: 'u7', name: 'Carlo Navarro',   title: 'Chief Medical Technologist',   dept: 'LAB', role: 'limited', email: 'carlo.navarro@mlmc.test' },
      { id: 'u8', name: 'Grace Villanueva', title: 'Admitting Supervisor',        dept: 'ADM', role: 'limited', email: 'grace.villanueva@mlmc.test' },
    ];

    const coo = { name: 'ERMIN EDGARDO R. ONA, MD', title: 'Executive Vice President & COO, Office of the Chief Operating Officer' };

    const r = (o) => Object.assign({
      category: 'Document', status: 'Active', lastRevisedDate: '', expiryDate: '', reviewDate: '',
      noticeDays: 0, counterparty: '', value: '', notes: '', file: null,
      createdAt: ts(-60), updatedAt: ts(-5),
    }, o);

    const records = [
      r({ id: 'r1', code: 'MLMC-MBD-WIN-001-1.0', title: 'Media Consent and Release Form', type: 'WIN', dept: 'MBD', ownerDept: 'MBD',
          ownerId: 'u2', version: '1.0', effectiveDate: '2026-10-22', lastRevisedDate: '', reviewDate: '2027-10-22',
          preparedBy: { name: 'CHESTER P. CAMUNAYAN', title: 'Assistant Vice President, Marketing & Business Development' },
          approvedBy: coo, createdAt: ts(-17), updatedAt: ts(-17),
          notes: 'Signed original on file. Annual review per document control policy.' }),
      r({ id: 'r2', code: 'MLMC-NSG-SOP-004-2.1', title: 'Patient Fall Prevention Protocol', type: 'SOP', dept: 'NSG', ownerDept: 'NSG',
          ownerId: 'u4', version: '2.1', effectiveDate: d(-400), lastRevisedDate: d(-35), reviewDate: d(330),
          preparedBy: { name: 'JOANNA CRUZ, RN', title: 'Nurse Supervisor, Nursing Services' }, approvedBy: coo }),
      r({ id: 'r3', code: 'MLMC-NSG-POL-002-1.3', title: 'Nurse-to-Patient Ratio and Staffing Policy', type: 'POL', dept: 'NSG', ownerDept: 'NSG',
          ownerId: 'u4', version: '1.3', effectiveDate: d(-377), lastRevisedDate: d(-377), reviewDate: d(-12),
          preparedBy: { name: 'JOANNA CRUZ, RN', title: 'Nurse Supervisor, Nursing Services' }, approvedBy: coo }),
      r({ id: 'r4', code: 'MLMC-RAD-MNT-003-1.0', title: 'MRI Scanner Preventive Maintenance Contract', type: 'MNT', category: 'Contract', dept: 'RAD', ownerDept: 'RAD',
          ownerId: 'u5', version: '1.0', effectiveDate: d(-340), expiryDate: d(25), noticeDays: 60,
          counterparty: 'Northpoint Imaging Services Inc. (sample)', value: '4,800,000.00',
          preparedBy: { name: 'RAMON DIZON', title: 'Chief Radiologic Technologist, Radiology' }, approvedBy: coo }),
      r({ id: 'r5', code: 'MLMC-RAD-SOP-011-1.2', title: 'Radiation Safety and Dosimetry Procedure', type: 'SOP', dept: 'RAD', ownerDept: 'RAD',
          ownerId: 'u5', version: '1.2', effectiveDate: d(-317), lastRevisedDate: d(-120), reviewDate: d(48),
          preparedBy: { name: 'RAMON DIZON', title: 'Chief Radiologic Technologist, Radiology' }, approvedBy: coo }),
      r({ id: 'r6', code: 'MLMC-LAB-SUP-007-1.0', title: 'Laboratory Reagent Supply Agreement', type: 'SUP', category: 'Contract', dept: 'LAB', ownerDept: 'LAB',
          ownerId: 'u7', version: '1.0', effectiveDate: d(-307), expiryDate: d(58), noticeDays: 30,
          counterparty: 'Meridian Diagnostics Supply Corp. (sample)', value: '2,150,000.00',
          preparedBy: { name: 'CARLO NAVARRO, RMT', title: 'Chief Medical Technologist, Clinical Laboratory' }, approvedBy: coo }),
      r({ id: 'r7', code: 'MLMC-LAB-WIN-015-1.1', title: 'Specimen Rejection Criteria', type: 'WIN', dept: 'LAB', ownerDept: 'LAB',
          ownerId: 'u7', version: '1.1', effectiveDate: d(-165), lastRevisedDate: d(-90), reviewDate: d(200),
          preparedBy: { name: 'CARLO NAVARRO, RMT', title: 'Chief Medical Technologist, Clinical Laboratory' }, approvedBy: coo }),
      r({ id: 'r8', code: 'MLMC-BIL-CSA-002-1.0', title: 'HMO Claims Processing Service Agreement', type: 'CSA', category: 'Contract', dept: 'BIL', ownerDept: 'BIL',
          ownerId: 'u6', version: '1.0', effectiveDate: d(-225), expiryDate: d(140), noticeDays: 90,
          counterparty: 'ClearPath Claims Solutions (sample)', value: '1,200,000.00',
          preparedBy: { name: 'LIZA MENDOZA', title: 'Billing Supervisor, Billing and Collection' }, approvedBy: coo }),
      r({ id: 'r9', code: 'MLMC-BIL-POL-001-2.0', title: 'Patient Billing and Discount Policy', type: 'POL', dept: 'BIL', ownerDept: 'BIL',
          ownerId: 'u6', version: '2.0', effectiveDate: d(-350), lastRevisedDate: d(-350), reviewDate: d(15),
          preparedBy: { name: 'LIZA MENDOZA', title: 'Billing Supervisor, Billing and Collection' }, approvedBy: coo }),
      r({ id: 'r10', code: 'MLMC-ADM-FRM-003-1.0', title: 'Patient Admission Consent Form', type: 'FRM', dept: 'ADM', ownerDept: 'ADM',
          ownerId: 'u8', version: '1.0', effectiveDate: d(-105), reviewDate: d(260),
          preparedBy: { name: 'GRACE VILLANUEVA', title: 'Admitting Supervisor, Admissions' }, approvedBy: coo }),
      r({ id: 'r11', code: 'MLMC-ADM-MOA-001-1.0', title: 'Memorandum of Agreement — HMO Partner Admissions', type: 'MOA', category: 'Contract', dept: 'ADM', ownerDept: 'ADM',
          ownerId: 'u8', version: '1.0', effectiveDate: d(-374), expiryDate: d(-9), noticeDays: 30,
          counterparty: 'Unity Health Plans (sample)', value: '',
          preparedBy: { name: 'GRACE VILLANUEVA', title: 'Admitting Supervisor, Admissions' }, approvedBy: coo }),
      r({ id: 'r12', code: 'MLMC-ENG-LSE-001-1.0', title: 'Annex Parking Building Lease', type: 'LSE', category: 'Contract', dept: 'ENG', ownerDept: 'ENG',
          ownerId: 'u3', version: '1.0', effectiveDate: d(-695), expiryDate: d(400), noticeDays: 180,
          counterparty: 'Bel-Air Realty Holdings (sample)', value: '9,600,000.00',
          preparedBy: { name: 'ENGR. PAOLO TAN (sample)', title: 'Head, Engineering and Facilities' }, approvedBy: coo }),
      r({ id: 'r13', code: 'MLMC-PHA-SUP-004-1.0', title: 'Pharmaceutical Supply Agreement', type: 'SUP', category: 'Contract', status: 'Draft', dept: 'PHA', ownerDept: 'PHA',
          ownerId: 'u1', version: '1.0', effectiveDate: d(30), expiryDate: d(395), noticeDays: 60,
          counterparty: 'Southbridge Pharma Distribution (sample)', value: '6,300,000.00',
          preparedBy: { name: 'MARIA DELA PAZ, RPh (sample)', title: 'Chief Pharmacist, Pharmacy' }, approvedBy: { name: '', title: '' } }),
      r({ id: 'r14', code: 'MLMC-ITD-NDA-002-1.0', title: 'Software Vendor Non-Disclosure Agreement', type: 'NDA', category: 'Contract', dept: 'ITD', ownerDept: 'ITD',
          ownerId: 'u2', version: '1.0', effectiveDate: d(-280), expiryDate: d(85), noticeDays: 0,
          counterparty: 'Lumen Health IT Inc. (sample)',
          preparedBy: { name: 'JOSEPH UY (sample)', title: 'IT Manager, Information Technology' }, approvedBy: coo }),
      r({ id: 'r15', code: 'MLMC-HRD-POL-006-1.0', title: 'Employee Code of Conduct (2024 edition)', type: 'POL', status: 'Superseded', dept: 'HRD', ownerDept: 'HRD',
          ownerId: 'u3', version: '1.0', effectiveDate: d(-700), reviewDate: d(-335),
          preparedBy: { name: 'HR DIRECTOR (sample)', title: 'Human Resources' }, approvedBy: coo,
          notes: 'Superseded by version 2.0. Kept for audit trail.' }),
      r({ id: 'r16', code: 'MLMC-NSG-WIN-009-1.0', title: 'Peripheral IV Line Insertion and Care', type: 'WIN', status: 'Under Review', dept: 'NSG', ownerDept: 'NSG',
          ownerId: 'u4', version: '1.0', effectiveDate: d(-372), reviewDate: d(-7),
          preparedBy: { name: 'JOANNA CRUZ, RN', title: 'Nurse Supervisor, Nursing Services' }, approvedBy: coo }),
    ];

    const activity = [];
    let n = 1;
    const log = (recordId, userId, action, detail, at) => activity.push({ id: 'a' + (n++), recordId, userId, action, detail, ts: at });
    records.forEach((rec, i) => log(rec.id, i % 2 ? 'u1' : 'u2', 'Created', `Record registered (${rec.code})`, rec.createdAt));
    log('r4', 'u1', 'Owner assigned', 'Owner set to Ramon Dizon', ts(-50));
    log('r2', 'u2', 'Version updated', 'Version 2.0 → 2.1 (revised fall-risk scoring)', ts(-35, 11));
    log('r15', 'u3', 'Status changed', 'Active → Superseded', ts(-30, 16));
    log('r16', 'u1', 'Status changed', 'Active → Under Review', ts(-8, 10));
    log('r9', 'u4', 'Access requested', 'View access requested by Joanna Cruz', ts(-1, 15));
    log('r1', 'u6', 'Access requested', 'Download access requested by Liza Mendoza', ts(0, 8));
    log('r2', 'u3', 'Access approved', 'View access granted to Carlo Navarro (7 days)', ts(-3, 13));
    log('r12', 'u3', 'Access rejected', 'Request by Grace Villanueva rejected', ts(-6, 9));

    const requests = [
      { id: 'q1', recordId: 'r9', userId: 'u4', type: 'view', reason: 'Need to reference discount rules for charity patients in the ward.', durationDays: 7, status: 'Pending', ts: ts(-1, 15) },
      { id: 'q2', recordId: 'r1', userId: 'u6', type: 'download', reason: 'Attach the consent form to a patient testimonial billing package.', durationDays: 3, status: 'Pending', ts: ts(0, 8) },
      { id: 'q3', recordId: 'r2', userId: 'u7', type: 'view', reason: 'Cross-check fall-risk protocol for phlebotomy rounds.', durationDays: 7, status: 'Approved', ts: ts(-3, 10), decidedBy: 'u3', decidedTs: ts(-3, 13), expiresAt: ts(4, 13), note: '' },
      { id: 'q4', recordId: 'r12', userId: 'u8', type: 'download', reason: 'Parking arrangements for patients.', durationDays: 7, status: 'Rejected', ts: ts(-7, 9), decidedBy: 'u3', decidedTs: ts(-6, 9), note: 'Lease terms are confidential. Please coordinate with Engineering for parking info.' },
    ];

    return { users, records, activity, requests, settings: {
      remindDays: [90, 60, 30], defaultAccessDays: 7,
      onedrive: { connected: false, tenantId: '', clientId: '', rootFolder: '/MLMC Contracts' },
    }, files: {} };
  };
})(window.MLMC);
