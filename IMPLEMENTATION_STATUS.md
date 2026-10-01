# Implementation Status

Last verified: 2026-09-25

| Requirement | Status | Notes |
|---|---|---|
| Login redesign | COMPLETE | Responsive, labelled, keyboard-friendly form with show/hide password, validation, loading and inline errors. |
| Registration redesign | COMPLETE | Responsive fields, phone/email/password validation, confirmation and duplicate handling. |
| Forgot password | PARTIAL | Expiring hashed one-use token, generic response and rate limiting are implemented; live delivery needs configured mail credentials. |
| Forgot login/member ID | PARTIAL | Secure non-enumerating recovery is implemented; live delivery needs configured mail credentials. |
| Membership payment architecture | PARTIAL | Server-owned amount/tax, provider adapter, signed callback/webhook verification, idempotency and failure states are implemented; a live/sandbox transaction needs provider credentials. |
| Donation payment architecture | PARTIAL | Separate transaction purpose, provider/tax configuration and UI are implemented; a live/sandbox transaction needs provider credentials. |
| Tax configuration | COMPLETE | Membership and donation tax are independently configurable; donation GST is disabled by default. |
| Membership activation | COMPLETE | Direct activation is retired; atomic fulfillment runs only after a provider-verified transaction. |
| ID card redesign | COMPLETE | Print-size vector PDF, photo fallback, long-name handling and QR verification reference were rendered and visually checked. |
| Certificate redesign | COMPLETE | A4 landscape print-ready PDF with long-name handling and QR was rendered and visually checked. |
| Automatic email | PARTIAL | Trigger and both attachments are implemented; live send is blocked by mail credentials and a verified sender. |
| Delivery tracking/resend | COMPLETE | Pending/generated/sent/failed logs and an admin resend endpoint/UI are implemented. |
| Payment idempotency | COMPLETE | Unique transaction keys, processed event IDs, amount/currency checks and atomic membership fulfillment prevent duplicate activation. |
| Admin payment configuration | COMPLETE | Admin sees independent, non-secret configuration and payment/delivery status; secrets remain server-side. |
| Content/spelling | COMPLETE | Organisation navigation terminology and stale footer year were corrected. |
| Design consistency | COMPLETE | Auth, donation, admin and generated documents use consistent branding and responsive states. |
| Security review | COMPLETE | Helmet, CORS allowlist, rate limits, fresh-user authorization, upload constraints, safer auth responses and signed payment verification were added. |
| Data-model review | COMPLETE | Existing user/request/post models were preserved and extended; separate payment, reset-token and delivery-log models were added. |
| Provider abstraction | COMPLETE | Provider-specific logic is isolated behind a common adapter/factory, with independent membership and donation selection. |
| Live external verification | BLOCKED | Requires MongoDB, payment sandbox/live credentials, webhook registration and mail-provider credentials. |
| Membership photo integration | COMPLETE | Required application photo remains linked to the membership request; activation now fails explicitly if the submitted photo is missing. |
| Private membership documents | COMPLETE | Photo/Aadhaar/PAN static exposure is blocked; authenticated Admin preview endpoints and UI are implemented. |
| Manual QR donations | PARTIAL | Proof upload, pending state and UI are complete; live QR display requires the organisation's UPI ID. |
| Donation approval and receipts | COMPLETE | Idempotent Admin approve/reject, receipt identity, printable PDF, download and resend are implemented. Live email still needs mail credentials. |
| Private Nyas accounts | COMPLETE | Owner-only expense entry/correction history, vouchers, filters, totals and CSV audit-preparation export are implemented. |
| Financial RBAC | COMPLETE | Owner-only middleware protects accounts APIs, totals, vouchers and exports; ordinary Admin/member/public roles are denied. |
| Annual examination cycles | COMPLETE | Admin can create/edit independent annual cycles; historical years remain available and public state derives from server dates. |
| Public examination registration | COMPLETE | Direct no-login English form, mandatory photo/Aadhaar, validation, unique application number and acknowledgement are implemented. |
| Examination private documents | COMPLETE | File extension, MIME and signature validation plus private storage and authenticated Admin preview are implemented. |
| Examination Admin workflow | COMPLETE | Dashboard, search/filter, candidate detail, protected documents, approve/reject and idempotent approval are implemented. |
| Examination announcements | COMPLETE | Automatic exam notice bar/home card and scheduled reusable Admin announcements are implemented from authoritative dates. |
| Admit Card generator | BLOCKED | Approval handoff is implemented as `pending_design`; exact generator/PDF/email work awaits the separately approved Admit Card design. Membership ID Card code is not reused. |

## Verified checks

- Backend automated tests: 12 passed, 0 failed.
- Backend application module load: passed.
- Frontend ESLint: passed with 0 errors and 0 warnings.
- Frontend production build: passed.
- Dependency audits: 0 vulnerabilities in frontend and backend.
- Frontend development server: HTTP 200 on `http://127.0.0.1:5173/`.
- Responsive browser QA: login desktop/mobile, registration mobile with validation, recovery page, and donation desktop/mobile. The current donation page produced no browser console warnings or errors.
- PDF QA: ID card, certificate and donation receipt rendered to images and visually inspected.
- Admin reality check: normal Admin navigation, Donation Verification, Membership Applications and real protected Photo/Aadhaar/PAN previews verified in the running browser against the local backend.
- Owner reality check: the dedicated test account was temporarily elevated and restored; Owner navigation, Private Accounts, totals and CSV API were verified. Normal Admin received API `403` and a frontend redirect for Private Accounts.
- Public/member authorization: protected membership documents, donation verification and accounts APIs returned `401` for public requests and `403` for a normal member.
- Performance: routes are lazy-loaded; the heavy location dataset loads only with the membership form.

## External setup remaining

- MongoDB connection string and production JWT secret.
- Membership Razorpay public/secret/webhook keys and registered webhook URL.
- Donation gateway public/secret/webhook keys and registered webhook URL (may be a separate account/provider).
- SMTP or Resend credentials plus an approved sender address.
- Production frontend/backend URLs and CORS allowlist.
- Accountant/client confirmation of final membership tax rate and receipt wording.
