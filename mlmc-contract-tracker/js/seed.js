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
    // ONLY these two emails can sign in. No passwords are stored in the code:
    // each tester creates their own password the first time they sign in. Names are placeholders; testers can set
    // their real name in Settings → Users & roles (full access) after signing in.
    const users = [
      { id: 'u1', name: 'Full Access Tester',    title: 'Tester', dept: '', role: 'team',    email: 'full.access@mlmc.test' },
      { id: 'u2', name: 'Limited Access Tester', title: 'Tester', dept: '', role: 'limited', email: 'limited.access@mlmc.test' },
    ];

    const blank = { name: '', title: '' };

    const r = (o) => Object.assign({
      category: 'Document', status: 'Active', lastRevisedDate: '', expiryDate: '', reviewDate: '',
      noticeDays: 0, counterparty: '', value: '', notes: '', file: null,
      createdAt: ts(-60), updatedAt: ts(-5),
    }, o);

    const records = [
      // Sample records: no people's or company names. Owners point at the two
      // tester accounts; signatories and counterparties are left blank to fill in.
      r({ id: 'r1', code: 'MLMC-MBD-WIN-001-1.0', title: 'Media Consent and Release Form', type: 'WIN', dept: 'MBD', ownerDept: 'MBD',
          ownerId: 'u1', version: '1.0', effectiveDate: '2026-10-22', lastRevisedDate: '', reviewDate: '2027-10-22',
          preparedBy: blank, approvedBy: blank, createdAt: ts(-17), updatedAt: ts(-17),
          notes: 'Annual review per document control policy.' }),
      r({ id: 'r2', code: 'MLMC-NSG-SOP-004-2.1', title: 'Patient Fall Prevention Protocol', type: 'SOP', dept: 'NSG', ownerDept: 'NSG',
          ownerId: 'u2', version: '2.1', effectiveDate: d(-400), lastRevisedDate: d(-35), reviewDate: d(330), preparedBy: blank, approvedBy: blank }),
      r({ id: 'r3', code: 'MLMC-NSG-POL-002-1.3', title: 'Nurse-to-Patient Ratio and Staffing Policy', type: 'POL', dept: 'NSG', ownerDept: 'NSG',
          ownerId: 'u2', version: '1.3', effectiveDate: d(-377), lastRevisedDate: d(-377), reviewDate: d(-12), preparedBy: blank, approvedBy: blank }),
      r({ id: 'r4', code: 'MLMC-RAD-MNT-003-1.0', title: 'MRI Scanner Preventive Maintenance Contract', type: 'MNT', category: 'Contract', dept: 'RAD', ownerDept: 'RAD',
          ownerId: 'u1', version: '1.0', effectiveDate: d(-340), expiryDate: d(25), noticeDays: 60, value: '4,800,000.00', preparedBy: blank, approvedBy: blank }),
      r({ id: 'r5', code: 'MLMC-RAD-SOP-011-1.2', title: 'Radiation Safety and Dosimetry Procedure', type: 'SOP', dept: 'RAD', ownerDept: 'RAD',
          ownerId: 'u1', version: '1.2', effectiveDate: d(-317), lastRevisedDate: d(-120), reviewDate: d(48), preparedBy: blank, approvedBy: blank }),
      r({ id: 'r6', code: 'MLMC-LAB-SUP-007-1.0', title: 'Laboratory Reagent Supply Agreement', type: 'SUP', category: 'Contract', dept: 'LAB', ownerDept: 'LAB',
          ownerId: 'u1', version: '1.0', effectiveDate: d(-307), expiryDate: d(58), noticeDays: 30, value: '2,150,000.00', preparedBy: blank, approvedBy: blank }),
      r({ id: 'r7', code: 'MLMC-LAB-WIN-015-1.1', title: 'Specimen Rejection Criteria', type: 'WIN', dept: 'LAB', ownerDept: 'LAB',
          ownerId: 'u1', version: '1.1', effectiveDate: d(-165), lastRevisedDate: d(-90), reviewDate: d(200), preparedBy: blank, approvedBy: blank }),
      r({ id: 'r8', code: 'MLMC-BIL-CSA-002-1.0', title: 'HMO Claims Processing Service Agreement', type: 'CSA', category: 'Contract', dept: 'BIL', ownerDept: 'BIL',
          ownerId: 'u1', version: '1.0', effectiveDate: d(-225), expiryDate: d(140), noticeDays: 90, value: '1,200,000.00', preparedBy: blank, approvedBy: blank }),
      r({ id: 'r9', code: 'MLMC-BIL-POL-001-2.0', title: 'Patient Billing and Discount Policy', type: 'POL', dept: 'BIL', ownerDept: 'BIL',
          ownerId: 'u1', version: '2.0', effectiveDate: d(-350), lastRevisedDate: d(-350), reviewDate: d(15), preparedBy: blank, approvedBy: blank }),
      r({ id: 'r10', code: 'MLMC-ADM-FRM-003-1.0', title: 'Patient Admission Consent Form', type: 'FRM', dept: 'ADM', ownerDept: 'ADM',
          ownerId: 'u1', version: '1.0', effectiveDate: d(-105), reviewDate: d(260), preparedBy: blank, approvedBy: blank }),
      r({ id: 'r11', code: 'MLMC-ADM-MOA-001-1.0', title: 'Memorandum of Agreement — HMO Partner Admissions', type: 'MOA', category: 'Contract', dept: 'ADM', ownerDept: 'ADM',
          ownerId: 'u1', version: '1.0', effectiveDate: d(-374), expiryDate: d(-9), noticeDays: 30, preparedBy: blank, approvedBy: blank }),
      r({ id: 'r12', code: 'MLMC-ENG-LSE-001-1.0', title: 'Annex Parking Building Lease', type: 'LSE', category: 'Contract', dept: 'ENG', ownerDept: 'ENG',
          ownerId: 'u1', version: '1.0', effectiveDate: d(-695), expiryDate: d(400), noticeDays: 180, value: '9,600,000.00', preparedBy: blank, approvedBy: blank }),
      r({ id: 'r13', code: 'MLMC-PHA-SUP-004-1.0', title: 'Pharmaceutical Supply Agreement', type: 'SUP', category: 'Contract', status: 'Draft', dept: 'PHA', ownerDept: 'PHA',
          ownerId: 'u1', version: '1.0', effectiveDate: d(30), expiryDate: d(395), noticeDays: 60, value: '6,300,000.00', preparedBy: blank, approvedBy: blank }),
      r({ id: 'r14', code: 'MLMC-ITD-NDA-002-1.0', title: 'Software Vendor Non-Disclosure Agreement', type: 'NDA', category: 'Contract', dept: 'ITD', ownerDept: 'ITD',
          ownerId: 'u1', version: '1.0', effectiveDate: d(-280), expiryDate: d(85), noticeDays: 0, preparedBy: blank, approvedBy: blank }),
      r({ id: 'r15', code: 'MLMC-HRD-POL-006-1.0', title: 'Employee Code of Conduct (2024 edition)', type: 'POL', status: 'Superseded', dept: 'HRD', ownerDept: 'HRD',
          ownerId: 'u1', version: '1.0', effectiveDate: d(-700), reviewDate: d(-335), preparedBy: blank, approvedBy: blank,
          notes: 'Superseded by version 2.0. Kept for audit trail.' }),
      r({ id: 'r16', code: 'MLMC-NSG-WIN-009-1.0', title: 'Peripheral IV Line Insertion and Care', type: 'WIN', status: 'Under Review', dept: 'NSG', ownerDept: 'NSG',
          ownerId: 'u2', version: '1.0', effectiveDate: d(-372), reviewDate: d(-7), preparedBy: blank, approvedBy: blank }),
    ];

    const activity = [];
    let n = 1;
    const log = (recordId, userId, action, detail, at) => activity.push({ id: 'a' + (n++), recordId, userId, action, detail, ts: at });
    records.forEach((rec) => log(rec.id, 'u1', 'Created', `Record registered (${rec.code})`, rec.createdAt));

    const requests = [];

    return { users, records, activity, requests, settings: {
      remindDays: [90, 60, 30], defaultAccessDays: 7,
      onedrive: { connected: false, tenantId: '', clientId: '', rootFolder: '/MLMC Contracts' },
    }, files: {} };
  };
})(window.MLMC);
