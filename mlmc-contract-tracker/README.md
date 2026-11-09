# MLMC Contract & Document Tracker (prototype)

A central place to monitor hospital contracts and controlled documents, and to hold people accountable for them. Every record has an owner, a status, key dates and a full activity history. The Records Team can grant or remove full access from Settings → Users & roles.

## Run it

From the `CLAUDE CODE` folder:

```bash
python -m http.server 8765 --directory mlmc-contract-tracker
```

Open http://localhost:8765.

Only two emails can sign in: `full.access@mlmc.test` (Records Team, full access) and `limited.access@mlmc.test` (limited access). They are listed in `js/seed.js`. No passwords are stored in the code: the first time each email signs in, the app asks the tester to create a password, which is kept (hashed) in that browser only. Names are placeholders. A full-access user can change names, positions and departments in Settings → Users & roles.

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
