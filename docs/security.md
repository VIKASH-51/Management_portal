# Security & Data Privacy: AI Academic Assistant

## 1. Multi-Tenant Data Isolation
- Every database entity is indexed by `tenant_id` and `user_id`.
- The backend enforces strict server-side authorization: Faculty Member A cannot query, update, or export Faculty Member B's courses, notes, question papers, or uploaded documents, even if they manually change request identifiers.

## 2. Authentication & Authorization
- Passwords are encrypted using salted bcrypt (`passlib`).
- JWT tokens signed with HS256 (`python-jose`) transmit user identity and role.
- Role-Based Access Control (RBAC) enforces endpoint permissions:
  - `FACULTY`: Course workspace, notes, question papers, question bank.
  - `ADMIN`: User management, system health, audit logs, AI token monitoring.
  - `SUPER_ADMIN`: Global system configuration, AI provider switching.

## 3. Privacy-First Document Governance
- Uploaded syllabus and textbook PDFs are stored in private isolated vaults and never made publicly accessible.
- Course documents are used exclusively for local RAG chunking and semantic retrieval; they are never sent for external model training.

## 4. Audit Logging
- Security-critical events (Logins, Document Uploads, Question Paper Generations, Exports) are logged into the `audit_logs` table with IP address, timestamp, and action metadata.
