# Project Context

## Architecture

- Frontend: React 19, Vite 7, React Router 7, Tailwind CSS 3, Axios.
- Backend: Node.js, Express 5, MongoDB/Mongoose 9, JWT bearer authentication.
- Existing domain: users, membership requests, posts, admin approval, PDF documents, Resend email.
- Storage: local upload folders for membership documents and generated PDFs; Cloudinary for post media, examination identity documents, and authenticated private UPI payment proofs.
- No pre-existing migrations, queues, payment provider, automated tests, or background worker.

## Important Modules

- Authentication: `backend/src/routes/authRoutes.js`, `frontend/src/context/AuthContext.jsx`.
- Membership: `backend/src/routes/membership.js`, `backend/src/models/MembershipRequest.js`.
- Payments: `backend/src/services/paymentService.js`, provider adapters in `backend/src/payments/`.
- Fulfillment: `backend/src/services/membershipActivationService.js`.
- Documents: `backend/src/utils/generateIdCard.js`, `generateCertificate.js`.
- Email: `backend/src/utils/sendMail.js`.
- Admin monitoring: `frontend/src/pages/AdminPayments.jsx`, `backend/src/routes/admin.js`.

## Decisions

- Local acceptance uses `VITE_API_URL=http://127.0.0.1:5000/api`; pointing the local frontend at the older hosted API hides or breaks locally added Admin endpoints and private files.
- All authenticated Admin pages share `AdminLayout`, which exposes role-appropriate module navigation. `owner` sees Private Nyas Accounts; ordinary `admin` does not.
- Membership identity documents and donation proofs/receipts use authenticated inline previews instead of asynchronous popup windows, avoiding popup blocking while preserving private API access.

- Reused the existing user and membership-request models; added backward-compatible fields.
- Membership and donation are separate transaction purposes and configuration namespaces.
- Razorpay is isolated behind a provider interface; disabled is the safe default.
- Amount and tax are calculated on the server. Donation GST is disabled by default.
- Membership activates only after cryptographic provider verification.
- Payment event IDs and transaction idempotency keys prevent duplicate processing.
- Email delivery failure does not undo verified membership; it is tracked and can be retried by an admin.
- Password reset tokens are random, stored only as SHA-256 hashes, expire after 30 minutes, and are single use.
- Membership uploads are private; Admin document viewing uses authenticated endpoints rather than static URLs.
- Manual QR donations reuse `PaymentTransaction` with `verificationType=manual`, remain pending until Admin review, and use deterministic receipt identities for idempotent approval/retry.
- Manual UPI configuration is database-backed and Owner/Admin-controlled. A versioned UPI/payee snapshot binds each exact-amount QR to its original destination, and settings changes are audit logged.
- Donation amounts are donor-selected but server-validated; membership fees remain server-authoritative. Neither flow adds fees or fulfils before Admin proof approval.
- Payment-proof images are signature-checked and stored as Cloudinary `authenticated` assets in purpose-specific membership/donation folders. Only authenticated Admin/Owner retrieval endpoints stream them with `no-store` headers.
- Gateway and manual donations share one receipt service and ledger without activating membership.
- Private expenses use the dedicated `Expense` model and owner-only server middleware; edits retain previous values in history and exports are labelled expense reports.

## Added Modules

- Manual donations: `src/routes/donations.js`, `src/routes/adminDonations.js`.
- Donation receipts: `src/services/donationReceiptService.js`, `src/utils/generateDonationReceipt.js`.
- Private accounts: `src/models/Expense.js`, `src/routes/accounts.js`, owner RBAC middleware.
- Private-file safeguards: `src/utils/privateFiles.js`, `src/middleware/privateUpload.js`.
- Annual examinations: `src/models/ExamCycle.js`, `ExamRegistration.js`, `src/routes/exams.js`, with server-derived registration states and isolated candidate records.
- Examination uploads: `src/middleware/examUpload.js` and `src/services/examDocumentStorage.js`; student photographs and Aadhaar copies are stored as Cloudinary `authenticated` assets and exposed only through authenticated Admin endpoints that issue short-lived signed downloads. They do not depend on Render's ephemeral filesystem.
- Website announcements: `src/models/Announcement.js`, `src/routes/announcements.js`; active exam notices derive from the linked cycle dates as the single source of truth.
- Frontend examination routes: public `/exam-registration/:slug`; Admin dashboard, registrations, Admit Cards handoff, settings and announcements under `/admin/exams*` and `/admin/announcements`.

## Examination Decisions

- Examination registration is public and separate from Membership applications and identities.
- Application numbers are issued at submission; roll numbers and Admit Cards remain separate and are not fabricated before approval.
- Approval is idempotent and currently records `pending_design`; the Admit Card generator will be implemented only after the separately approved design is supplied.
- Duplicate protection uses examination cycle + normalized student name + date of birth, allowing siblings to share contact details.
- Registration open/upcoming/closed decisions are enforced by the backend, not only hidden in the frontend.

## Configuration Needed

- MongoDB URI and JWT secret.
- Separate membership/donation provider keys and webhook secrets.
- Resend or SMTP credentials and a verified sender.
- Approved tax rates/settings from the organisation's accountant/legal adviser.
- Organisation UPI ID remains pending and must be entered in Admin → Payment Settings before UPI is enabled. Gateway credentials remain unavailable and both gateway toggles must stay disabled. The registered office address is `T-135, G.F, Rajpura Gurmandi, Rana Pratap Bagh, North Delhi - 07`.
- An explicitly promoted `owner` account for access to Private Nyas Accounts.
- The approved Admit Card design asset/specification before final generator, PDF and email-delivery integration.

## Testing Status

- Unit tests cover tax independence and payment signature verification.
- Frontend build/lint and backend test results are recorded in `IMPLEMENTATION_STATUS.md`.
- Live UPI proof/approval, gateway, webhook, database migration, and email delivery require the real organisation UPI ID and/or external credentials.
