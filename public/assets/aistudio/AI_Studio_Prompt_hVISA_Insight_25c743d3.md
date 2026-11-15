# hVISA Insight – AI Studio Prompt Pack (Government-portal redesign)

## How to use
1. Open your hVISA Insight app in AI Studio.
2. Attach the 8 images (01–08) from the `images` folder.
3. Paste **MASTER PROMPT** below. Check the result.
4. If AI Studio does only part, paste the **FOLLOW-UP PROMPTS** one at a time.

Image guide for AI Studio: 01 style guide · 02 public home · 03 login · 04 settings · 05 dashboard after login · 06 overall flow · 07 login/forgot-password flow · 08 lab analysis flow.
The images are **wireframes**, not final art. Layout and colours must be followed; grey "Image:" boxes must be filled with real photos/illustrations.

---

## MASTER PROMPT (copy from here)

Redesign and restructure my existing app "hVISA Insight" so that it looks and behaves like an Indian government information portal (reference style: indiascienceandtechnology.gov.in and india.gov.in). Keep ALL existing calculation logic, database, server code, roles and tests working. Change only navigation, access flow, login, settings, language handling, home page content and visual theme. I have attached 8 images: follow images 02–05 for layout, images 06–08 for flows, image 01 for style.

### 1. What this app is (explain it clearly on the home page)
hVISA Insight is a laboratory tool for trained microbiology staff. It helps check whether a Staphylococcus aureus sample shows "heterogeneous vancomycin-intermediate" (hVISA) behaviour. The lab counts bacterial colonies at increasing vancomycin levels, the app converts counts to CFU/mL, plots a population analysis profile (PAP), calculates the Area Under the Curve (AUC), and divides the test AUC by the AUC of the reference strain Mu3. It also runs quality checks and creates reports.
It is NOT a diagnostic device and gives NO treatment advice. All data is synthetic DEMO data. Keep the existing disclaimers.

### 2. Two zones: Public zone and Logged-in zone
**Public zone (before login/registration)** – one single long information page, no software tabs.
- Top utility strip: "Skip to main content", "Screen reader access", text size A- A A+, **Language dropdown (select box)** with English / हिन्दी / मराठी, Login and Register buttons.
- Tricolour thin stripe (saffron / white / green), white banner with emblem PLACEHOLDER + site name + one-line description, dark charcoal navigation bar.
- Navigation items are only anchor links that scroll the same page: Home, About, What is hVISA, How it works, Who can use, Gallery, FAQ, Contact.
- Sections on the page, in this order: hero (headline, 3-line plain-English description, Login / Register / How it works buttons, lab photo), notice bar (demo + not diagnostic), About the portal, What is hVISA (explain PAP, AUC, Mu3 in simple words), How it works (5 numbered steps matching image 08), Who can use (Lab Analyst, Reviewer/Microbiologist, Auditor – one card each), Gallery (4 images), FAQ (accordion, 6–8 questions), Contact/Helpdesk, Disclaimer, footer.
- **Remove from the public page**: Dashboard, Experiments, PAP-AUC Analysis, QA Review, Reports, Field Outreach tabs and any live data, charts of real records or counts. Public page = information and images only.
- Any attempt to open an internal route while logged out redirects to the Login page and, after login, returns to the page requested.

**Logged-in zone** – shown only after successful login or registration-and-login.
- Same header/banner; navigation bar now shows: Dashboard, Experiments, PAP-AUC Analysis, QA Review, Reports, Field Outreach, Settings.
- User menu at top-right (name + role): Profile, Settings, Logout. Logo click returns to the public information page while staying logged in.
- Keep the existing role switcher but only inside Settings → "Demo role (prototype only)" and label it clearly.
- Dashboard follows image 05.

### 3. Login page (follow image 03)
- Fields: Username / Employee ID.
- A two-option selector (segmented control / radio): **Password** and **Face Lock**. **Password is selected by default.** Show ONLY the selected method's inputs – never both at once.
- Password option: password field with show/hide, a **"Forgot password?"** link, Login button.
- Face Lock option: camera preview and "Scan face" button, plus the link "Use password instead". If the user has not enrolled Face Lock, show a friendly message and switch back to Password automatically. Password login must always remain available as a fallback.
- "Register" is a separate link under the form, not a third login method. "Back to Home" link also present.
- Lockout: after 5 wrong attempts lock for 15 minutes, show a clear message.
- Follow flow image 07.

### 4. Forgot password (follow flow image 07)
Steps: click Forgot password → enter username + registered email → system generates a 6-digit OTP valid for 10 minutes (in this prototype, display the OTP on screen in a box labelled "DEMO – in production this is sent by email/SMS") → enter OTP → set new password + confirm (min 8 characters, at least one letter and one number) → success message → back to Login with Password selected. Allow "Resend OTP" max 3 times. For unknown usernames show the same neutral message: "If the account exists, an OTP has been sent." Hash passwords; never show or store plain text.
Add the needed API routes and database columns/tables (OTP hash, expiry, attempts).

### 5. Settings page (follow image 04) – only after login
Left sub-menu and content panels:
1. **General / Language** – language dropdown (English, हिन्दी, मराठी). Selecting a language changes the whole app immediately and is saved to the user profile and localStorage. Replace the old language buttons with this dropdown everywhere (the utility strip also uses a dropdown).
2. **Change password** – current password, new password, confirm; show success/error.
3. **Face Lock** – status badge (Set up / Not set up), buttons Enable Face Lock (camera enrolment) and Disable. Note: password login always remains available. Store only a numeric face template, never the photo.
4. **Text size & accessibility** – A- A A+ plus high-contrast toggle.
5. **Session** – Logout, and "Logout from this device".
6. **Demo role (prototype)** – existing role switcher.

### 6. Visual theme – make it look like a government website, NOT all blue
Replace the current navy/blue-heavy theme with the palette in image 01:
- Saffron #FF9933 (thin accents, active nav item), India Green #138808 (success), Deep Green #0B5D1E (primary buttons and links), Charcoal #222B33 (nav bar, text, footer), Ivory #FAF8F3 (page background), Light grey #E6E2D8 (borders), Chakra Blue #1F3A8A used only in tiny details (less than 5% of the UI).
- Status colours with icon + text (never colour alone): green = complete/reviewed, amber #B26A00 = warning/pending, red #B3261E = blocking error.
- Fonts: Noto Sans and Noto Sans Devanagari, body text at least 16px. Square-ish corners (4–6px), 1–2px borders, no gradients, no glows, no heavy shadows, no fake dashboards, minimal animation.
- Footer in charcoal with Quick links, Accessibility, Terms, Privacy, Help, "Last updated", version, and the line "Prototype – not an official Government of India website".
- Do NOT copy the real State Emblem of India or any official logo; use a clearly marked emblem placeholder. Do not claim to be an official government site.
- Make charts and tables keep the green/saffron/charcoal palette (test = deep green, Mu3 reference = saffron).

### 7. Images
Use real, relevant images in the grey placeholder boxes of image 02: (a) microbiology laboratory, (b) Petri dish with bacterial colonies, (c) sample PAP curve chart generated from the DEMO data, (d) rural sample collection / health workers, (e) lab team. Reuse existing images in /src/assets/images and /public/assets where suitable. Every image needs descriptive alt text. Where no photo is available, generate a simple flat illustration in the palette above. No images of identifiable real patients.

### 8. Multi-language
All new text (home sections, login, forgot password, settings, FAQ, errors) must exist in English, Hindi and Marathi in the existing i18n dictionary. No hard-coded English strings.

### 9. Do not break
- Keep PAP-AUC calculations, QA rules, roles/permissions, database, tests, PDF/CSV export and the DEMO / SYNTHETIC labels.
- No treatment advice or diagnosis wording anywhere.
- Calculations stay deterministic code; AI is never used to compute or classify.

### 10. Acceptance checklist
- [ ] Logged-out user sees only the information home page – no Dashboard/Experiments/Analysis/QA/Reports/Outreach tabs.
- [ ] After login, software tabs and Settings appear; after logout they disappear.
- [ ] Login shows Password by default, Face Lock selectable, never both at once, "Forgot password?" works end to end.
- [ ] Language is a dropdown on the utility strip and in Settings, and persists.
- [ ] Settings allows change password and enable/disable Face Lock.
- [ ] Theme matches image 01 (no dominant blue).
- [ ] A visitor can understand what the app is within 10 seconds of opening the home page.
- [ ] Existing tests still pass.

## END OF MASTER PROMPT

---

## FOLLOW-UP PROMPTS (use only if needed)

**A – Access flow only**
"Using attached flow image 06, restructure routing so Dashboard, Experiments, PAP-AUC Analysis, QA Review, Reports and Field Outreach are only reachable after login, and the public home is a single information page with anchor navigation. Do not change visuals yet."

**B – Login + forgot password only**
"Using images 03 and 07, rebuild the Login page: Password selected by default, a two-option selector for Password / Face Lock showing only one method at a time, a Forgot password link, OTP-based reset (demo OTP shown on screen), and lockout after 5 failed attempts."

**C – Settings + language dropdown**
"Using image 04, add a Settings page with Language dropdown (English/हिन्दी/मराठी), Change password, Face Lock enable/disable, text size and high contrast, and demo role switcher. Replace all language buttons with a dropdown."

**D – Theme**
"Using image 01, restyle the entire app to the saffron / green / charcoal / ivory government-portal palette. Remove dominant blue. Add tricolour stripe, utility strip, charcoal nav bar and charcoal footer as in images 02 and 05."

**E – Home content**
"Write the full home page content using image 02: About, What is hVISA (explain PAP, AUC and Mu3 in simple words), 5 How-it-works steps from image 08, Who can use, 8 FAQs, Contact and Disclaimer, in English, Hindi and Marathi. Keep wording plain, short and non-clinical."

---

## What I found in your current app (so you know what changes)
- Navigation has 7 tabs always visible (Home, Dashboard, Experiments, Analysis, QA, Reports, Outreach) even before login. Clicking them just opens the login screen.
- Login has three tabs (Password / Face Lock / Register) side by side, so it looks like everything is shown at once.
- Language is a 3-button switch (English/हिन्दी/मराठी), not a dropdown.
- Face Lock and account modal exist, but there is no Settings page, no Change password and no Forgot password.
- Theme uses a navy/blue palette (#0F1D2E, #F4F7FA, cyan accents).

## Important notes
- Face recognition in a browser is convenience-level security, not strong authentication. Keep password fallback.
- The OTP is only displayed on screen in this prototype. A real deployment needs email/SMS delivery.
- Using the Government of India emblem or claiming to be an official site without authorisation is not permitted. The design only copies the *style*.
