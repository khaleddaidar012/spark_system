# Task: 03 - Message Parser & Normalization Engine

Status: pending
Priority: high

## 1. Overview & Objectives

Develop a fault-tolerant message parsing and data normalization engine capable of tokenizing unstructured or semi-structured incoming WhatsApp text in the format `"Name | Phone | Program | Status"`. The engine must sanitize and normalize phone numbers, integrate country detection (Task 1), map Arabic/English status strings into system status IDs (Task 5), and handle formatting variations without crashing.

---

## 2. Dependencies
- Requires: Task 1 (Phone & Country Detection logic), Task 5 (Customer Status Mapping IDs).
- Blocks: `04-backend-api.md`, `07-testing-verification.md`.

---

## 3. Subtasks

- [ ] **Subtask 3.1: Delimiter Tokenizer & Text Sanitizer**
- [ ] **Subtask 3.2: Phone Number Normalization & Sanitization Utility**
- [ ] **Subtask 3.3: Country Detection Integration (`detectCountryFromPhone`)**
- [ ] **Subtask 3.4: Arabic Status String Translation & Mapping Engine**
- [ ] **Subtask 3.5: Master `parseWhatsAppMessage` Utility with Validation & Error Packaging**

---

## 4. Detailed Subtask Specifications

### Subtask 3.1 — Delimiter Tokenizer & Text Sanitizer

#### Objective
Parse a single text string into 4 distinct tokens (`name`, `phone`, `program`, `status`) separated by the pipe character `|`, accounting for arbitrary whitespace, newline characters, and Unicode variations.

#### Implementation Details
- **File Location**: `backend/utils/messageParser.js`.
- Logic:
  1. Check if input is a valid non-empty string.
  2. Normalize Unicode (e.g. `String.prototype.normalize('NFC')`) and remove non-printable / zero-width characters (`\u200B-\u200D\uFEFF`).
  3. Split string by delimiter `|`.
  4. Ensure at least the minimum required fields (`name` and `phone` or all 4 tokens) are present.
  5. Trim leading and trailing whitespace from every extracted token.
  6. Return structured tokens or validation errors.

#### Expected Result
Incoming string `"خالد هشام |  01092919124   | برنامج المعلين |  مشترك "` is cleanly parsed into `{ rawName: "خالد هشام", rawPhone: "01092919124", rawProgram: "برنامج المعلين", rawStatus: "مشترك" }`.

---

### Subtask 3.2 — Phone Number Normalization & Sanitization Utility

#### Objective
Sanitize raw phone strings by stripping decorative characters (dashes, spaces, brackets) and formatting them into a standard canonical form.

#### Implementation Details
- **File Location**: `backend/utils/phoneUtils.js` (or extend existing helper).
- Logic:
  1. Remove all characters except digits and optional leading `+`.
  2. Convert Arabic-Indic numerals (`٠١٢٣٤٥٦٧٨٩`) to standard ASCII digits (`0123456789`).
  3. Normalize leading double zeros (`00...`) to international standard prefix.
  4. Validate minimum/maximum digit length (between 8 and 15 digits).

#### Expected Result
Inputs like `"٠١٠٩٢٩١٩١٢٤"`, `"00201092919124"`, or `"+20 10-929-19124"` are normalized consistently.

---

### Subtask 3.3 — Country Detection Integration (`detectCountryFromPhone`)

#### Objective
Determine the customer's country code based on the normalized phone number prefix using the unified country detection rules established in Task 1.

#### Implementation Details
- **File Location**: `backend/utils/countryDetector.js` (or import from Task 1 shared utility).
- Prefix matching rules:
  - Egypt (`egypt`): `+20`, `0020`, `20`, or local `010`/`011`/`012`/`015` formats.
  - Saudi Arabia (`saudi_arabia`): `+966`, `00966`, `966`, or `05...`.
  - Oman (`oman`): `+968`, `00968`, `968`.
  - Libya (`libya`): `+218`, `00218`, `218`.
  - Other (`other`): Any unlisted international prefix.

#### Expected Result
The parser outputs the standardized `country` enum value alongside the normalized phone number.

---

### Subtask 3.4 — Arabic Status String Translation & Mapping Engine

#### Objective
Translate arbitrary Arabic status strings received from WhatsApp into corresponding system status identifiers defined in the database (Task 5).

#### Implementation Details
- **File Location**: `backend/utils/statusMapper.js`.
- Status mapping dictionary:
  - `"مشترك"` / `"اشتراك"` / `"subscribed"` ➔ `'Subscribed'` (or system status ID for Subscribed)
  - `"مهتم"` / `"interested"` ➔ `'Interested'` (or system status ID for Interested)
  - `"غير مهتم"` / `"not interested"` ➔ `'Not Interested'` (or system status ID for Not Interested)
  - `"ملغي"` / `"الغاء"` / `"cancelled"` / `"canceled"` ➔ `'Cancelled'` (or system status ID for Cancelled)
  - Fallback / Unrecognized / Empty ➔ `'New'` (default status)
- Allow flexible matching by trimming, normalizing Arabic alef (`أ`, `إ`, `آ` ➔ `ا`) and ta-marbuta (`ة` ➔ `ه`).

#### Expected Result
Regardless of slight spelling variations, status strings map predictably to valid system status records.

---

### Subtask 3.5 — Master `parseWhatsAppMessage` Utility with Validation & Error Packaging

#### Objective
Combine tokenization, phone normalization, country detection, and status mapping into a single clean utility function `parseWhatsAppMessage(text)`.

#### Implementation Details
- **File Location**: `backend/utils/messageParser.js`.
- Function Signature:
  ```typescript
  interface ParsedWhatsAppMessage {
    success: boolean;
    name?: string;
    phone?: string;
    country?: string;
    program?: string;
    statusText?: string;
    statusName?: string;
    error?: string;
  }
  function parseWhatsAppMessage(text: string): ParsedWhatsAppMessage;
  ```
- If input has fewer than 2 segments or phone is invalid, return `{ success: false, error: "Invalid message format: Expected 'Name | Phone | Program | Status'" }`.
- If valid, return `{ success: true, name, phone, country, program, statusText, statusName }`.

#### Expected Result
A resilient function that either returns a complete sanitized payload object or a descriptive failure explanation.

---

## 5. Edge Cases & Handling
- **Missing Status or Program Field**: If message only has `"Name | Phone"`, populate `name` and `phone`, set `program = null`, and default `statusName = 'New'`.
- **Extra Delimiters in Text**: If message contains more than 3 pipes (e.g. `"Name | Phone | Level 1 | Part 2 | Status"`), gracefully merge middle segments into `program` or treat cleanly.
- **English vs Arabic Names**: Support names in both Latin and Arabic scripts without altering character integrity.
- **Empty / Null Input**: Return `{ success: false, error: 'Empty message text' }` immediately without throwing runtime exceptions.

---

## 6. Regression Requirements
- The country detection rules must be 100% compatible with the manual customer creation form logic in Task 1.
- Status values mapped must correspond directly to predefined statuses in Task 5.

---

## 7. Acceptance Criteria

- [ ] `parseWhatsAppMessage` correctly parses `"خالد هشام | 01092919124 | برنامج المعلين | مشترك"`.
- [ ] Phone numbers with spaces, dashes, or Arabic numerals are normalized to standard ASCII digits.
- [ ] Country is accurately detected for Egypt, Saudi Arabia, Oman, Libya, and Others.
- [ ] Arabic status terms ("مشترك", "مهتم", "غير مهتم", "ملغي") correctly map to system statuses.
- [ ] Unrecognized or missing status values default gracefully to "New".
- [ ] Malformed strings return structured failure objects rather than throwing unhandled exceptions.
