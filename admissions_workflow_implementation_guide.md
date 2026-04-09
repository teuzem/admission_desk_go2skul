# Avila University Arizona Admissions Portal — Step-by-Step Implementation Guide

> Purpose: This document is a developer-facing implementation guide and product memory for rebuilding the admissions portal flow shown in the screenshots, with two added business-required steps: **Work Experience** and **Documents**.

> Goal: Implement the flow exactly in the visual and logical order of the screenshots, preserve the same information architecture, and add the new steps without breaking the application experience.

---

## 1) Submit application dynamic popup 

### 1.1 Entry Screen (Pre-Application)
This is the first screen used by an agent before the full application begins.

**Visible fields:**
1. First name
2. Last name
3. Email
4. Phone number (with country code selector; screenshot shows `+237`)
5. Country

**Visible actions:**
- `Complete application here`
- `Send link to applicant to complete`

**Implementation intent:**
- This screen creates or initializes the applicant record.
- The same base applicant identity should prefill downstream steps where applicable.
- Two workflows must be supported:
  - **Agent-completed flow**: clicking `Complete application here`
  - **Applicant-self-service flow**: clicking `Send link to applicant to complete using Resend JS SDK in Supabase sending filled student information and agent identification info`

**Validations:**
- First name: required
- Last name: required
- Email: required, valid email format
- Phone number: required, E.164-compatible storage recommended
- Country: required

**Recommended backend events:**
- `application_created`
- `application_link_sent`
- `agent_started_application`

---

## 2) Application Form Steps Order to Implement for application submission

Use this order in the left sidebar and in the internal step router applying our Brand color palet and typography as shown in the screenshots but refined by your UX/UI skills and creativity.

0. Prospective Applicant Portal (entry / lead intake)
1. Personal Background Information
2. Citizenship Information
3. Representative Details
4. Education History
5. Work Experience **(NEW)**
6. Documents **(NEW)**
7. English Proficiency
8. Program Information
9. Terms & Conditions
10. Review & Submit

> Important: The original screenshots show 10 in-form steps after intake. We are extending that flow by inserting **Work Experience** immediately after **Education History**, then **Documents** immediately after **Work Experience**, before continuing to English Proficiency.

---

## 3) Global UI / UX Rules

### 3.1 Layout
- Keep the same two-column layout:
  - **Left purple sidebar** with partner university or college dynamic logo, progress percentage, and vertical step list.
  - **Right main content panel** with step title, form content, and CTA button(s).
- Maintain a scrollable content area inside the form panel.
- Keep the current program title visible at the top where possible.

### 3.2 Sidebar Behavior
- Show step labels vertically in order.
- Completed steps display a checkmark.
- Current step is highlighted.
- Future steps remain inactive until prior requirements are satisfied.
- Prefer preserving the existing visual rhythm: white text on purple sidebar, stepper dots/checkmarks, progress text such as `45% completed`, `69% completed`, `97% completed`, etc.

### 3.3 Progress Calculation
Recommended formula:

```text
progress_percent = floor((completed_steps / total_form_steps) * 100)
```

Where `total_form_steps` excludes the initial intake screen and includes all actual application steps.

With the new design, the total form steps become 12 (steps 1–12 above).

### 3.4 Form Rules
- Required fields show a red asterisk `*`.
- Valid completed fields may show a green check icon to the right.
- `Next` must remain disabled until all required fields for the current step are valid.
- Persist data automatically on change and also on next-step transition.
- If the user leaves and returns, restore draft state exactly.
- File uploads must support drag-and-drop and `browse` action and also a workable and professional document preview advance viewer to preview the uploaded document before submission and allowing change or delete uploaded document.
- Where screenshots show supported types, support at least:
  - `pdf`
  - `png`
  - `jpg`
  - `docx`
  - `jpeg`

### 3.5 Dates
- Use date picker controls.
- Store as ISO date in backend.
- Render in local display format per portal standards.

### 3.6 Country and phone dropdown
- Country dropdown should be populated with a list of countries using international country list library to support almost all countries in the world.
- Phone number should be populated with a list of countries using international phone number library to support almost all countries in the world.

### 3.7 Validation Pattern
Use the following common validation behavior across the entire flow:
- Empty required field → inline error on blur or on next attempt.
- Invalid format (email, date, phone, numeric score, etc.) → inline error.
- Successfully valid field → optional green check icon.
- File required but missing → step cannot continue.
- Document type selected but file missing → invalid.
- File uploaded but document type missing → invalid.

### 3.8 Navigation
- Primary CTA at bottom: `Next`.
- On final step: `Submit`.
- Even if `Back` is not shown in the screenshots, recommended behavior is to support backward navigation from sidebar or internal router without data loss.

---

## 4) Step-by-Step Specification

## Step 0 — Prospective Applicant Portal (Entry / Intake)

### Fields
| Field | Type | Required | Notes |
|---|---|---:|---|
| First name | text | Yes | Initial applicant first name |
| Last name | text | Yes | Initial applicant last name |
| Email | email | Yes | Must be unique enough to locate/re-open draft |
| Phone number | tel | Yes | Country prefix selector + number |
| Country | dropdown | Yes | Applicant country |

### Actions
- `Complete application here`
- `Send link to applicant to complete`

### Business Rules
- Clicking `Complete application here` opens Step 1.
- Clicking `Send link to applicant to complete` sends a unique continuation link to the [go2skuleducationgroup@gmail.com] using Resend JS SDK in Supabase sending filled student information and agent identification info and logs the action.
- If an application already exists for the email, open draft recovery or warn appropriately.

### Validation
- Email regex + uniqueness/dedup logic.
- Phone normalized to full international format.

---

## Step 1 — Personal Background Information

### Personal Information
| Field | Type | Required | Notes |
|---|---|---:|---|
| Prefix | dropdown | Yes | Placeholder shown as `Select` |
| First Name | text | Yes | Green check visible in screenshot |
| Middle Name | text | No | Green check visible in screenshot |
| Last Name | text | Yes | Green check visible in screenshot |
| My legal document does not include a last name | checkbox | No | Toggles last-name requirement behavior |
- Email (email input)
- Primary Phone Number (phone input)
- Secondary Phone Number (phone input)
- Date of Birth (date picker with mm/dd/yyyy format, minimum age 16)
- Gender (radio button: Male, Female, Other)
- Marital Status (radio button: Single, Married, Divorced, Widowed)
- Country of Birth (country dropdown select)
- State of Birth (state dropdown select)
- City of Birth (text input)
- What are your pronouns? (radio button: She/Her, He/Him, They/Them, Other)
- Do you have a preferred name you would like us to call you? (text input)
- How did you hear about us? (dropdown select: Social Media, Search Engine, Friend, Family, Other)
- Select one or more of the following races (checkboxes: American Indian or Alaska Native, Asian, Black or African American, Native Hawaiian or Other Pacific Islander, White, Other)
- Are you of Hispanic, Latino, or Spanish origin? (radio button: Yes, No)

### Home Country Address (Permanent Address)
- Country (country dropdown select)
- State (state dropdown select)
- City (text input)
- Address line 1 (text input)
- Address line 2 (text input)
- Zip code (text input)
- Is Mailing Address same as Permanent Address in Home Country? (radio button yes/no)

### Emergency Contact and Family Information
- Full Name (text input)
- Relationship (dropdown select: Parent, Guardian, Sibling, Relative, Friend, Grandparent, Other)
- Email (email input)
- Phone Number (phone input)
- Country (country dropdown select)
- State (state dropdown select)
- City (text input)
- Address line 1 (text input)
- Address line 2 (text input)
- Zip code (text input)
- Is Mailing Address same as Permanent Address in Home Country? (radio button yes/no)
- Can they communicate fluently in English? (radio button yes/no)

### UX Rules
- If `My legal document does not include a last name` is checked:
  - Disable the Last Name required rule.
  - Persist a boolean flag.
- Show a green info box after legal-name confirmation similar to the screenshot, e.g.:
  - “You confirmed that [Full Legal Name] matches your legal name as it appears on your official documentation.”
- If business wants to lock imported data from the intake form, mark those fields as read-only with an edit pathway.

### Validations
- First Name: letters plus acceptable separators (`-`, apostrophe, spaces if allowed).
- Middle Name: optional.
- Last Name: required unless no-last-name checkbox is checked.
- Legal name confirmation required.
- Email and phone format validation.

---

## Step 2 — Citizenship Information

### Fields
| Field | Type | Required | Notes |
|---|---|---:|---|
| Primary Citizenship | dropdown | Yes | Country list |
| Secondary Citizenship | dropdown | No | Optional second nationality |
| Passport/ID Number | text | Yes | Alphanumeric |
| Passport/ID Expiry Date | date | Yes | Must be future date |
| Attach a copy of Passport/ID below | upload | Yes | `docx, jpg, png, pdf` shown |
| Country Applying From | dropdown | Yes | Country list |

### Upload Rules
- Single or multiple file support may be allowed, but minimum = 1 file.
- Accepted MIME/extensions: pdf, png, jpg, jpeg, docx.
- Recommended max size per file configurable (e.g. 10MB–25MB).

### Validations
- Passport/ID Number required.
- Expiry date must be today or later; preferably strictly in the future.
- Passport/ID file mandatory before continuing.
- If primary and secondary citizenship are the same, either block or warn.

---

## Step 3 — Representative Details

### Fields
- Agency counsellor name (text input, required, autofilled by the agent business name for the agent profile)
- Agency counsellor email (email input, autofilled by the agent email for the agent profile)
- Agency counsellor phone number (phone input, autofilled by the agent phone number for the agent profile)
- Agency counsellor address (text input, autofilled by the agent address for the agent profile)
- Agency counsellor city (text input, autofilled by the agent city for the agent profile)
- Agency counsellor state (text input, autofilled by the agent state for the agent profile)
- Agency counsellor zip code (text input, autofilled by the agent zip code for the agent profile)
- Agency counsellor country (country dropdown select, autofilled by the agent country for the agent profile)

### Validations
- Counselor name required.
- Counselor email valid.

## Step 4 — Program Information

### Fields
- Program name (auto fill from Supabase programs table)
- Program level (auto fill from Supabase programs table)
- Program category (auto fill from Supabase programs table)
- Program duration (auto fill from Supabase programs table)
- Program tuition fee (auto fill from Supabase programs table)
- Program start date (e.g. Fall, Spring, Summer, etc., auto fill from Supabase programs table)
- Program campus/country (e.g. Canada, USA, UK, etc., auto fill from Supabase programs table)
- How did you hear about chosen program (optional)? 
- Have you applied to this program before? (optional)

### Recommended Conditional Logic
If transfer = Yes:
- Reveal transfer-specific fields:
  - Current/previous US institution name
  - SEVIS transfer release date
  - Student ID (optional)
  - Transfer document upload (optional or required)

If applied before = Yes:
- Reveal previous application year / ID if available.

### Validations
- Program required.
- Start date required.
- Program list should be sourced from admin-configurable catalog.

---

## Step 5 — Education History

### Fields 
- Level of study (dropdown, required, values: High School, Undergraduate, Graduate)
- School type (dropdown, required, values: None, Secondary, University, College, Vocational School, Post-secondary, Other)
- Country (dropdown, required)
- School Name (text input, required)
- CEEB Code (College Entrance Examination Board) (text input, optional)
- Status (dropdown, required, values: Graduated, In Progress, Withdrawn)
- Graduation date (date picker, required)
- Degree / Certificate obtained (text/dropdown, conditional, required if Status = Graduated)
- GPA / final score (text, optional)
- Transcript upload (upload, optional)
- Certificates/Diploma (upload, optional)
- Start date (date, optional)
- End date (date, optional)

### Validations
- Graduation date required for completed education.
- If `Status = In Progress`, allow expected graduation date instead.
- Country and school name mandatory.
- CEEB optional.

## Step 6 — Work Experience (NEW)

This is a new mandatory step to be inserted immediately after Education History.

### Purpose
Capture the applicant’s professional background and collect employment evidence before moving to Documents and the remaining steps.

### Structure
Implement as one or more repeatable work-experience cards.

### Fields per Work Experience Entry
- Employer / Organization Name (text input, required)
- Job Title / Position (text input, required)
- Employment Type (dropdown, required, values: Full-time, Part-time, Contract, Internship, Volunteer, Self-employed)
- Industry / Sector (dropdown or text, required, values: Healthcare, Education, Finance, NGO, etc.)
- Country (dropdown, required)
- City / State (text input, required)
- Start Date (date, required)
- End Date (date, conditional, required unless currently employed)
- Currently Working Here (checkbox, optional)
- Main Responsibilities (textarea, required)
- Reason for Leaving (textarea, conditional, show only if not currently employed)

### Required Work Documents per Entry
Each work experience entry must contain the following document uploads:
- Recommandation Letter (upload, required)
- Work Attestation / Employment Certificate (upload, required)
- Additional Relevant Employment Document(s) (upload, required)

### Upload Rules
- Allow multiple files per document bucket.
- Supported formats: pdf, png, jpg, jpeg, docx.
- Each mandatory document bucket must contain at least one uploaded file.

### Repeating Entries
- Provide `Add another work experience`.
- If the applicant has no work experience, business must decide one of these behaviors:
  1. allow `No work experience` checkbox with explanation, or
  2. force at least one placeholder entry.

**Recommended implementation:**
- Add a top-level checkbox: `Applicant has no formal work experience`.
- If checked, require:
  - explanation textarea
  - upload of any alternative experience evidence if applicable (internship, volunteering, leadership, etc.)

### Validations
- Start date required.
- End date required unless currently employed.
- Recommendation letter required.
- Work attestation required.
- Additional relevant document required.
- Cannot continue with partially filled work entry.

---

## Step 7 — Personal Documents 

### Purpose
Centralized document collection area for all remaining application attachments before the user can move forward.

### Core UX Requirement from Business
> The dropdown zone always shows, the agent must select the document type from the dropdown, then upload the corresponding file. All required documents must be uploaded before moving forward.

### Recommended UI Pattern
Implement this as a repeatable document row table or stacked list.

Each row contains:
1. `Document Type` dropdown
2. `Upload File` dropzone
3. `Document Number / Reference` (optional)
4. `Issue Date` (optional)
5. `Expiry Date` (optional, when relevant)
6. `Notes` (optional)
7. `Remove row` action

Button:
- `Add another document`

### Mandatory Document Types
Make these required before the step can be completed:
- Birth Certificate
- CV / Resume
- SOP / Statement of Purpose
- Awards
- Certifications

### Additional Supported Document Types
Add these to the dropdown as supported values:
- Recommendation Letter (academic)
- Professional License
- Internship Certificate
- National ID
- Marriage Certificate / Legal Name Change Document
- Portfolio
- Research Paper / Publication
- Supporting Letter
- Financial Supporting Document
- Other

### Required Completion Logic
To match the business request strictly:
- The step is **not complete** until every mandatory document type has:
  - a selected dropdown value
  - at least one uploaded file
- The agent cannot click `Next` until all mandatory document categories are satisfied.

### Recommended Duplicate Handling
- Prevent duplicate rows for mandatory document types unless multiple files are needed.
- If duplicate document type is allowed, merge into the same logical bucket.

### Upload Rules
- Allow multiple files for each type.
- Accepted types: pdf, png, jpg, jpeg, docx.
- Show file list after upload.
- Allow delete/replace before submission.

### Suggested Validation Messages
- `Please select a document type.`
- `Please upload a file for the selected document type.`
- `Birth Certificate is required before proceeding.`
- `CV / Resume is required before proceeding.`
- `SOP is required before proceeding.`
- `Awards document is required before proceeding.`
- `Certifications document is required before proceeding.`

### Important Product Note
The business requirement says all these documents are obligatory. If there is any chance an applicant does not have Awards or Certifications, the product team must explicitly decide whether to:
- keep them truly mandatory, or
- allow `Not Applicable` with explanation.

For now, implement them as **mandatory** because that is the stated requirement.

---

## Step 8 — English Proficiency

### Fields
| Field | Type | Required | Notes |
|---|---|---:|---|
| Select how will you demonstrate your Level of English? | dropdown | Yes | Screenshot shows test-based option selected |
| Test | dropdown | Yes | e.g. IELTS, TOEFL, Duolingo, PTE |
| Test Report Form (TRF) number | text | Yes | Identifier |
| Test Date | date | Yes | Date picker |
| Overall score | text/number | Yes | Allow decimals where needed |
| Attach a copy of your Test Results | upload | Recommended Yes | Screenshot shows upload block |

### Business Rules
- The first dropdown controls conditional sub-forms.
- Example options may include:
  - Official English proficiency test results
  - Degree taught in English
  - Native English-speaking country
  - Institutional waiver / exemption

### Conditional Logic
If the applicant selects official test results:
- Show Test
- Show TRF number
- Show Test Date
- Show Overall score
- Show Test Results upload

If the applicant selects an exemption pathway:
- Replace the test fields with exemption evidence fields and upload requirements.

### Validations
- Test required for test-based route.
- Test date cannot be future date unless business allows scheduled exam capture.
- Overall score numeric/string format depending on test.
- Upload required for proof-based route.

---

## Step 9 — Financial Proof of Funds

### Screenshot-Based Content
The screenshot shows an informational block mentioning:
- Affidavit of Support
- Bank Statement
- DSO review for I-20 issuance

### Fields
| Field | Type | Required | Notes |
|---|---|---:|---|
| How do you plan on paying for your studies? | dropdown | Yes | Funding source selector |
| Attach a copy of your Affidavit of Support and Bank Statement | upload | Yes (recommended) | Upload zone visible in screenshot |

### Suggested Funding Options
- Self-funded
- Parent / Family Sponsor
- Employer Sponsor
- Scholarship
- Government Sponsor
- Mixed Funding
- Other

### Conditional Logic
- If sponsor-based funding selected, require affidavit of support.
- Always require bank statement or equivalent proof of available funds.
- Allow multiple files.

### Validations
- Funding source required.
- Required supporting financial files must be uploaded before continuing.

## Step 10 — Terms & Conditions

This page may span more than one scroll view; screenshots show different portions of the same step.

### Visible Content Areas from Screenshots
- Acceptance of Terms
- Eligibility Criteria
- Application Process
- Data Collection and Privacy
- Release Information to Scholarship Organizations
- Amendments to Terms
- Contact Information
- Applicant’s signature
- Date

### Fields / Controls
| Field | Type | Required | Notes |
|---|---|---:|---|
| Scholarship release authorization | radio | Recommended Yes | Two options shown |
| Applicant’s signature | text | Yes | Screenshot shows green check |
| Date | date | Yes | Screenshot shows green check |

### Scholarship Release Options Shown
1. Authorize the release of academic, demographic, and financial information to alumni clubs and organizations for scholarship consideration.
2. Do not authorize release for additional scholarship consideration.

### Required Legal Behavior
- Signature must match applicant full legal name or portal-defined signature rule.
- Date auto-fill allowed but editable if needed.

### Validations
- Signature required.
- Date required.
- Scholarship release choice recommended to be required for explicit consent tracking.

---

## Step 11 — Review & Submit

### Purpose
Present a read-only summary of all collected information for final submission.

### Screenshot-Based Review Content
Visible subsection in screenshot:
- Personal Background Information
- Personal Information
- Prefix
- First Name
- Middle Name
- Name on passport
- Last Name
- My legal document does not include a last name
- Is legal name correct
- Add Preferred Name
- Email
- Primary Phone Number

### Implementation Requirement
Build the review page as collapsible or sectioned summaries for **all** steps:
1. Personal Background Information
2. Citizenship Information
3. Representative Details
4. Program Information
5. Education History
6. Work Experience
7. Documents
8. English Proficiency
9. Financial Aid
10. Certification
11. Terms & Conditions

### Required Actions
- `Submit`
- Recommended secondary actions:
  - `Edit` per section
  - `Back`

### Final Submission Rules
- Run a final full-form validation on submit.
- Block submission if any required field or required document is missing.
- Create immutable submission snapshot + version history.
- Generate confirmation ID/reference.
- Send confirmation email(s) according to business rules.

---

## 5) Data Model Recommendation

## 5.1 Core Entities
- `Applicant`
- `Application`
- `ApplicationStepState`
- `EducationEntry`
- `WorkExperienceEntry`
- `DocumentUpload`
- `ConsentRecord`
- `SubmissionSnapshot`



## 6) QA / Acceptance Criteria

### Global
- Draft survives refresh, logout, and re-entry.
- Sidebar state always matches completion state.
- Progress % updates correctly.
- Required fields block next-step navigation.
- Uploaded files appear in review summary.

### New Step: Work Experience
- Cannot continue unless each work entry has mandatory uploads.
- Add/remove work entries works without corrupting data order.
- `Currently Working Here` correctly disables end date.

### New Step: Documents
- Each document row must have a document type + file.
- Mandatory document types must all be satisfied.
- Duplicate handling works correctly.
- Removing a mandatory document re-invalidates the step.

### Review & Submit
- All data from all steps appears.
- Edit/revisit preserves files and answers.
- Submit blocked if any required field/document missing.

---

## 7) Recommended Visual/Interaction Parity with Screenshots

- Purple left navigation panel.
- White form cards / content area.
- Bold section titles.
- Yellow primary CTA buttons (`Next`, `Submit`).
- Green validation checkmarks on valid inputs.
- Upload blocks that read similarly to:
  - `Drop files to attach, or browse`
- Standard footer/chat presence can be outside the form scope if not core to implementation.

---
