# AIdol S2 submission freeze

- The `final` tag identifies the frozen competition submission. Never move, overwrite, or delete it unless the human explicitly authorizes changing the submitted version.
- After `final` exists, do subsequent development on `post-final-development` or another new branch, not `main`. Do not merge later changes into the frozen main branch without explicit human authorization.
- Preserve the independent `controller/` module and its media provenance. Never commit real `.env` files, database credentials, dependencies, or local runtime data.
- Read `SUBMISSION_FREEZE.md` for the frozen scope and verification limits. The 40-character commit required by the submission form is `git rev-parse 'final^{commit}'`, not the annotated tag object's ID.
