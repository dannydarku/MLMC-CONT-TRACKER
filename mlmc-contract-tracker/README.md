# MLMC Contract & Document Tracker (prototype)

A central place to monitor hospital contracts and controlled documents, and to hold people accountable for them. Every record has an owner, a status, key dates and a full activity history. The Records Team can grant or remove full access from Settings → Users & roles.

## Run it

From the `CLAUDE CODE` folder:

```bash
python -m http.server 8765 --directory mlmc-contract-tracker
```

Open http://localhost:8765. Demo password for every account: `demo123`.

| Account | Role |
|---|---|
| andrea.santos@mlmc.test, miguel.reyes@mlmc.test, patricia.lim@mlmc.test | Records Team (full access) |
| joanna.cruz@ (Nursing), ramon.dizon@ (Radiology), liza.mendoza@ (Billing), carlo.navarro@ (Laboratory), grace.villanueva@ (Admissions) | Limited (approval needed) |

## What is mocked, and how each piece goes to production

| Area | Prototype | Production path |
|---|---|---|
| Login | Demo accounts in `js/seed.js` | Microsoft 365 / Entra ID single sign-on (MSAL) |
| Data | Browser localStorage | Server database (e.g. SQL Server / SharePoint list) |
| Files | Generated ~2 KB sample PDFs; uploads up to 300 KB | `OneDriveStorage` in `js/services.js` through Microsoft Graph |
| Email notifications | Removed for now; due dates are shown as on-screen flags only | Graph `sendMail` from a shared mailbox, run by a daily server job |

## Files
- `js/seed.js`: departments, document types, statuses, sample records and users
- `js/store.js`: permissions, monitoring rules, actions and the audit log
- `js/services.js`: storage providers (mock + OneDrive stub), PDF generator
- `js/app.js`: screens and routing
- `css/styles.css`: MLMC brand styling
