# Vaelinya site zero-billed CI policy — 2026-09-09

The GitHub repository `armpitpete/vaelinya-site` is public. Standard GitHub-hosted Actions used by a public repository are a zero-billed route and are therefore not the private Actions cost exposure that affected private projects.

## Allowed repository runner target

`ubuntu-latest`

Any different hosted label, runner matrix or custom/larger target requires deliberate review. Self-hosted runners remain allowed when explicitly configured.

The guard is `scripts/validate-ci-cost-policy.mjs`.

## Language acceptance

Normal site PR validation may use the zero-billed public runner. For the grammar-reconciliation candidate, the final language/publication boundary, site tests and site build are also executed from the private canon repository on the owned Vaelinya runner against the exact site commit SHA.

This gives both:
- ordinary public CI;
- owned exact-head acceptance for the language programme.
