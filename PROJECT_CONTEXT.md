# Project Context

## Architecture

- Frontend: React 19, Vite 7, React Router 7, Tailwind CSS 3, Axios.
- Backend: Node.js, Express 5, MongoDB/Mongoose 9, JWT bearer authentication.
- Existing domain: users, membership requests, posts, admin approval, PDF documents, Resend email.
- Storage: local upload folders for membership documents and generated PDFs; Cloudinary for post media.
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
- Gateway and manual donations share one receipt service and ledger without activating membership.
- Private expenses use the dedicated `Expense` model and owner-only server middleware; edits retain previous values in history and exports are labelled expense reports.

## Added Modules

- Manual donations: `src/routes/donations.js`, `src/routes/adminDonations.js`.
- Donation receipts: `src/services/donationReceiptService.js`, `src/utils/generateDonationReceipt.js`.
- Private accounts: `src/models/Expense.js`, `src/routes/accounts.js`, owner RBAC middleware.
- Private-file safeguards: `src/utils/privateFiles.js`, `src/middleware/privateUpload.js`.

## Configuration Needed

- MongoDB URI and JWT secret.
- Separate membership/donation provider keys and webhook secrets.
- Resend or SMTP credentials and a verified sender.
- Approved tax rates/settings from the organisation's accountant/legal adviser.
- Organisation UPI ID/payee name, final registered address, and accountant-approved receipt acknowledgement.
- An explicitly promoted `owner` account for access to Private Nyas Accounts.

## Testing Status

- Unit tests cover tax independence and payment signature verification.
- Frontend build/lint and backend test results are recorded in `IMPLEMENTATION_STATUS.md`.
- Live gateway, webhook, database migration, and email delivery require external credentials.
