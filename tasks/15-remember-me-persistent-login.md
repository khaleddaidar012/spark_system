# Task 15 — Remember Me: persistent login on device & phone

## Task Description (all_plan.md last edit)
The owner wants the **Remember Me** checkbox to genuinely keep him logged in
after closing the program/browser — on his desktop and on his phone — so he
does not have to type the password every time he opens the app.

Currently `login.js` only *prefills* the username when Remember Me is checked.
There is no real session: any page can be opened directly, and every browser
restart always shows the login form.

## Required Implementation Steps
1. `frontend/assets/js/modules/auth.js`
   - Add session helpers:
     - `createSession(remember)` — when `remember` is true save the session in
       `localStorage` (survives closing the program / restarting the phone
       browser); when false save it in `sessionStorage` (single-browser-life).
     - `getSession()` — read the session (local first, fall back to session).
     - `logout()` — remove both session storages.
     - `requireAuth()` — if there is no session, redirect to `login.html`.
2. `frontend/assets/js/pages/login.js`
   - Call `createSession(rememberMe.checked)` on valid credentials.
   - If a session already exists on load, redirect straight to `dashboard.html`
     (so returning users skip the login form).
3. `frontend/assets/js/modules/layout.js`
   - Call `requireAuth()` at the top of `initLayout()` so every page using the
     shared layout is protected.
4. `frontend/assets/js/pages/statement.js`
   - The statement page is standalone (no `initLayout`) — call `requireAuth()`
     on load too.
5. `frontend/components/navbar.html` + `frontend/assets/js/modules/layout.js`
   - Add a **Logout** button (uses existing `nav.logout` i18n key) that calls
     `logout()` and redirects to `login.html`.

## Expected Files to Modify
- `frontend/assets/js/modules/auth.js`
- `frontend/assets/js/pages/login.js`
- `frontend/assets/js/modules/layout.js`
- `frontend/assets/js/pages/statement.js`
- `frontend/components/navbar.html`

## Completion Criteria
- Checking "Remember me" and logging in → closing the browser → reopening the
  app → lands directly on the dashboard without typing the password again.
- Unchecking it → a normal session (protected pages still require login after
  the browser closes).
- Every protected page redirects to login when there is no session.
- Logout button returns to the login form and clears the saved session.