# **Executor AI — Platform Policy Matrix**

This document provides the specific, non-negotiable rules the Executor AI must follow for different application types. It is the source of truth for **how** the AI implements changes in a secure, compliant, and maintainable way.

| Platform | Network Boundary | Secrets & Config | Logging & PII | Dependencies & Build | Security Baseline |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **web\_service** | Inbound via HTTP(S)/RPC; egress via strict allowlist. | Env variables ONLY per 12-Factor; secrets via mounted volume or platform's secret manager. | OTel logs; redact PII (email, name, tokens) at the source. | Pinned versions; CI vulnerability scan (e.g., Trivy, Snyk). | SSDF \+ OWASP ASVS 5.0 |
| **frontend\_web** | Browser APIs; no direct secrets; backend communication via designated API Gateway. | No secrets in client bundle; config exposed via NEXT\_PUBLIC\_ or equivalent. | Client-side errors forwarded to a collector; no sensitive data in logs. | Subresource Integrity (SRI), Content Security Policy (CSP), supply chain audit. | OWASP ASVS 5.0 |
| **desktop\_app** | Local IPC only; all network access must be proxied through the main service layer. | OS Keychain / secure element for storing secrets; no plaintext tokens on disk. | Local logs with rotation; optional OTel export. Redact all user input. | Signed builds; contextIsolation enabled; secure auto-updates. | SSDF |
| **mobile\_app** | HTTPS only; certificate pinning where possible for critical endpoints. | OS Keystore / Secure Enclave. | Privacy-safe analytics; no logging of user-entered text or location data. | App store guidelines; R8/ProGuard for code obfuscation. | SSDF \+ OWASP MASVS |
| **data\_ml** | Restricted data paths; isolated runners/VPCs for training and inference. | Vault / KMS for keys; short-lived credentials for data access. | Log data lineage and span context; do not log raw data payloads. | Reproducible environments (e.g., locked conda/pip files). | SSDF |
| **library/sdk** | No direct network calls within library code; must be initiated by the host application. | N/A. The library must not manage secrets. | Minimal logging; opt-in for verbose debugging. | Must follow SemVer; maintain Application Binary Interface (ABI) compatibility. | SSDF |

