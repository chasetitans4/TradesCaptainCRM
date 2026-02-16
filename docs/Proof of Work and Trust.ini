# 🔒 PROOF OF WORK™ / TRUST LAYER

## Homeowner-Facing Verification & Job Transparency System

### MASTER BUILD PROMPT (LOCKED v1.1)

**Product:** Proof of Work™  
**Parent Platform:** Trades Captain  
**Audience:** Claude / Trae AI  
**Status:** LOCKED — High-impact differentiator  
**Purpose:** Create a homeowner-facing trust artifact for every completed job  
**Core Principle:**

> *Proof of Work™ turns invisible work into visible trust.*

This system exists to prove that real work was done by a real professional at a real time and place — without becoming a review platform, invoice system, or legal document.

---

## 0. NON-NEGOTIABLE CONSTRAINTS

* Proof of Work™ is **homeowner-facing by default**
* It is **read-only** for homeowners
* It is **not** a review system
* It is **not** a contract
* It is **not** a warranty
* It is **not** editable after finalization
* It is **generated automatically**, not manually written
* Contractors **cannot remove** negative signals once captured
* **Trust > marketing > vanity**

DO NOT:

* Allow contractors to rewrite history
* Allow deletion of arrival or completion logs
* Allow homeowners to edit content
* Turn this into testimonials or reviews
* Turn this into invoices or legal receipts
* Show pricing, payment details, or internal notes

---

## 1. SYSTEM PURPOSE (LOCKED)

Proof of Work™ exists to:

1. Build homeowner trust instantly
2. Reduce skepticism at the door
3. Provide visual proof of professionalism
4. Create shareable trust artifacts
5. Support referrals without asking for reviews
6. Differentiate Trades Captain from Jobber-style CRMs

**Positioning:**

> "Here's what was done, when it was done, and who did it."

---

## 2. CORE OUTPUT: PROOF OF WORK™ PAGE

Each completed job generates a unique Proof of Work™ page.

### Characteristics

* Publicly viewable via unique URL
* Accessible via QR code
* No login required
* Read-only
* Mobile-first
* Timestamped
* Immutable after finalization

### URL Structure

**Primary URL:**
```
https://proof.tradescaptain.com/{public_token}
```

**Short URL (for QR codes):**
```
https://pow.tc/{short_code}
```

* `public_token` = 16-character alphanumeric, unguessable
* `short_code` = 6-character alphanumeric for QR codes
* Example: `https://pow.tc/X7Km9p`

---

## 3. CONTENT SECTIONS (LOCKED)

### 3.1 Header

**Visible Elements:**

* Business name + logo
* "Proof of Work™" badge
* Job type (e.g., "Plumbing Service")
* Job status badge:
  * 🟢 Completed
  * 🟡 In Progress
  * 🔵 Scheduled
* Date of service
* Service location (privacy-safe format)

**Example:**

```
┌─────────────────────────────────────────────────────────────┐
│  [LOGO]  Smith Plumbing                                     │
│                                                             │
│  ═══════════════════════════════════════════════════════   │
│           ✓ PROOF OF WORK™                                  │
│  ═══════════════════════════════════════════════════════   │
│                                                             │
│  Plumbing Service                          🟢 Completed     │
│  June 14, 2026                                              │
│  Austin, TX 78704                                           │
└─────────────────────────────────────────────────────────────┘
```

---

### 3.2 Location Display Format (PRIVACY-SAFE)

**Always Show:**
* City, State (e.g., "Austin, TX")

**Optionally Show (business configurable):**
* ZIP code (e.g., "78704")

**Never Show:**
* Street address
* Unit/apartment number
* Cross streets
* Exact coordinates

**Implementation:**

```
location_display = "{city}, {state}"

IF business.show_zip_on_pow = true:
  location_display += " {zip}"
```

---

### 3.3 Technician Verification (CRITICAL)

**Purpose:** Prove who showed up.

**Display:**

```
┌─────────────────────────────────────────────────────────────┐
│  TECHNICIAN                                                 │
│  ┌──────┐                                                   │
│  │      │  Mike Johnson                                     │
│  │ [📷] │  ✔ Verified Technician                           │
│  │      │  Arrived at 9:42 AM                               │
│  └──────┘                                                   │
└─────────────────────────────────────────────────────────────┘
```

**Rules:**

* Technician identity pulled from CRM user profile
* Cannot be edited post-arrival
* If no photo exists → show initials + colored background
* "Verified Technician" badge = technician is active team member

---

### 3.4 Arrival Log

**Purpose:** Prove when work began and ended.

**Display:**

```
┌─────────────────────────────────────────────────────────────┐
│  ARRIVAL LOG                                                │
│                                                             │
│  📍 Arrived      9:42 AM                                    │
│  🚗 Departed     11:18 AM                                   │
│  ⏱️ Time on Site  1h 36m                                    │
│                                                             │
│  ✔ Location verified at job site                           │
└─────────────────────────────────────────────────────────────┘
```

**Rules:**

* Arrival log auto-generated from check-in
* Cannot be manually altered after capture
* Source: GPS check-in, arrival button, or geofence trigger
* "Location verified" badge shown only if GPS confirms job site (within 500m)

---

### 3.5 Job Timeline (CRITICAL DIFFERENTIATOR)

**Purpose:** Prove what happened in sequence.

**Timeline Events (system-generated only):**

| Event | Icon | Source |
|-------|------|--------|
| Job scheduled | 🕘 | CRM scheduling |
| Technician assigned | 🧑‍🔧 | CRM assignment |
| Technician en route | 🚗 | Mobile app status |
| Technician arrived | 📍 | GPS/check-in |
| Work started | 🔧 | Manual or auto |
| Photos added | 📸 | Photo upload |
| Work completed | ✅ | Job completion |
| Proof of Work™ sent | 📤 | SMS/email delivery |

**Example Display:**

```
┌─────────────────────────────────────────────────────────────┐
│  JOB TIMELINE                                               │
│                                                             │
│  🕘  9:12 AM  ─────  Job scheduled                          │
│       │                                                     │
│  🧑‍🔧  9:40 AM  ─────  Technician assigned                   │
│       │                                                     │
│  📍  9:42 AM  ─────  Technician arrived                     │
│       │              ✔ Location verified                    │
│       │                                                     │
│  🔧  9:50 AM  ─────  Work started                           │
│       │                                                     │
│  📸 10:25 AM  ─────  Job photos added (4)                   │
│       │              ✔ Photos verified at job site          │
│       │                                                     │
│  ✅ 11:18 AM  ─────  Job completed                          │
└─────────────────────────────────────────────────────────────┘
```

**Rules:**

* Timeline is **system-generated only**
* No free-text entries
* No manual event creation
* Immutable after job completion
* Events ordered chronologically

---

### 3.6 Job Photos (HIGH TRUST SIGNAL)

**Purpose:** Visual proof that work occurred.

**Display:**

```
┌─────────────────────────────────────────────────────────────┐
│  JOB PHOTOS                                                 │
│                                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │         │  │         │  │         │  │         │        │
│  │  [📷]   │  │  [📷]   │  │  [📷]   │  │  [📷]   │        │
│  │         │  │         │  │         │  │         │        │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
│    Before       Before       After        After             │
│    📍 ✓         📍 ✓         📍 ✓         📍 ✓              │
│                                                             │
│  ✔ All photos verified at job site                         │
└─────────────────────────────────────────────────────────────┘
```

**Photo Categories:**

* **Before** (optional but encouraged)
* **During** (optional)
* **After** (strongly encouraged)
* **Issue** (for diagnostic jobs)

**Rules:**

* Photos uploaded by technician via mobile app only
* Timestamped at capture (EXIF) or upload
* Cannot be deleted after job completion
* Max photo count: 10 (configurable)
* See **Section 7** for detailed verification logic

---

### 3.7 Work Summary (TEMPLATE-GENERATED)

**Purpose:** Simple explanation without liability.

**Display:**

```
┌─────────────────────────────────────────────────────────────┐
│  WORK SUMMARY                                               │
│                                                             │
│  The technician inspected the reported plumbing issue,      │
│  performed the necessary repair, and verified proper        │
│  operation before completion.                               │
│                                                             │
│  Service Category: Drain Cleaning                           │
└─────────────────────────────────────────────────────────────┘
```

**Rules:**

* Generated from template library (see **Section 8**)
* Selected based on job type + service category
* **No custom contractor text** in public summary
* **No pricing** included
* **No guarantees** included
* Internal notes remain internal
* Locked after job completion

---

### 3.8 Trust Badges (LOCKED)

**Display:**

```
┌─────────────────────────────────────────────────────────────┐
│  ✔ Verified Business    ✔ Verified Technician              │
│  ✔ Location Verified    ✔ Photo Evidence                   │
│  ✔ Timestamped Activity                                    │
└─────────────────────────────────────────────────────────────┘
```

**Badge Definitions:**

| Badge | Requirement |
|-------|-------------|
| ✔ Verified Business | Active subscription + license number on file |
| ✔ Verified Technician | Active team member with profile |
| ✔ Location Verified | GPS check-in within 500m of job address |
| ✔ Photo Evidence | At least 1 verified photo (Level 2+) |
| ✔ Timestamped Activity | Complete timeline with system timestamps |

**No ratings. No stars. No reviews.**

---

### 3.9 Service Record Footer (NOT AN INVOICE)

**Included:**

* Service type
* Date
* Technician name
* Completion confirmation
* Reference number

**Explicitly EXCLUDED:**

* Pricing
* Payment details
* Warranties
* Legal language

**Footer Disclaimer (LOCKED):**

```
┌─────────────────────────────────────────────────────────────┐
│  This is a service record, not an invoice or warranty.      │
│  For billing or warranty questions, contact the provider.   │
│                                                             │
│  This record reflects system-observed activity.             │
│  It does not represent a quality assessment or endorsement. │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. QR CODE SYSTEM (NEW)

### 4.1 Purpose

QR codes enable:

* Physical artifacts left at job site
* Easy sharing without typing URLs
* Professional presentation
* Stickers, door hangers, receipts

### 4.2 QR Code Specifications

```
Format:          PNG and SVG
Size:            300x300 px (default), scalable
Error Correction: Level H (30% - high durability)
Content:         Short URL (pow.tc/{code})
Border:          4 module quiet zone
Colors:          Black on white (maximum contrast)
```

### 4.3 Short URL System

**Format:** `pow.tc/{short_code}`

**Short Code Generation:**

```
short_code = generate_alphanumeric(6)
  - Characters: A-Z, 0-9 (no lowercase for clarity)
  - No ambiguous characters: 0/O, 1/I removed
  - Alphabet: 2-9, A-H, J-N, P-Z (32 chars)
  - Combinations: 32^6 = 1+ billion unique codes
```

**Example:** `pow.tc/X7KM9P`

### 4.4 QR Code Generation Logic

```
ON proof_of_work_created:
  
  1. Generate short_code (6 chars)
  2. Verify uniqueness in database
  3. Create short URL: pow.tc/{short_code}
  4. Generate QR code image:
     - PNG: 300x300 px
     - SVG: vector (for print)
  5. Store QR code URL in record
  6. Create print-ready assets
```

### 4.5 Print-Ready Assets

#### QR Sticker (2" x 2")

```
┌─────────────────────────────────────┐
│                                     │
│      ✓ PROOF OF WORK™               │
│                                     │
│         ┌─────────┐                 │
│         │         │                 │
│         │   QR    │                 │
│         │  CODE   │                 │
│         │         │                 │
│         └─────────┘                 │
│                                     │
│     Scan to verify this service     │
│         pow.tc/X7KM9P               │
│                                     │
│     [Business Name]                 │
│     [Service Date]                  │
│                                     │
└─────────────────────────────────────┘
```

**Use Cases:**
* Leave on equipment serviced (HVAC unit, water heater)
* Attach to maintenance log
* Place near work area

#### Door Hanger

```
┌─────────────────────────────────────────┐
│              [Door Hole]                │
│                                         │
│                                         │
│         [BUSINESS LOGO]                 │
│                                         │
│    ════════════════════════════════     │
│         SERVICE COMPLETED               │
│    ════════════════════════════════     │
│                                         │
│    Date:       June 14, 2026            │
│    Service:    Plumbing                 │
│    Technician: Mike J.                  │
│                                         │
│            ┌─────────┐                  │
│            │   QR    │                  │
│            │  CODE   │                  │
│            └─────────┘                  │
│                                         │
│      Scan for your Proof of Work™       │
│          pow.tc/X7KM9P                  │
│                                         │
│    Questions? (512) 555-1234            │
│                                         │
└─────────────────────────────────────────┘
```

**Use Case:** Leave on door when homeowner not present

#### Receipt Add-On

```
════════════════════════════════════════
         ✓ PROOF OF WORK™
          
         Scan for verified
         service record:
         
            [QR CODE]
            
         pow.tc/X7KM9P
════════════════════════════════════════
```

**Use Case:** Print at bottom of paper receipts

### 4.6 Mobile App QR Display

**Technician sees after job completion:**

```
┌─────────────────────────────────────────┐
│                                         │
│      ✅ Job Completed!                  │
│                                         │
│      Show this to the homeowner:        │
│                                         │
│            ┌─────────┐                  │
│            │   QR    │                  │
│            │  CODE   │                  │
│            └─────────┘                  │
│                                         │
│         pow.tc/X7KM9P                   │
│                                         │
│    [Send to Customer]  [Print Sticker]  │
│                                         │
└─────────────────────────────────────────┘
```

### 4.7 QR Code Data Model

```
proof_of_work:
  ...
  short_code: string (6 chars, unique)
  qr_code_png_url: string
  qr_code_svg_url: string
  sticker_pdf_url: string | null
  ...
```

---

## 5. DELIVERY SYSTEM (DEFAULT ON)

### 5.1 Default Behavior

Proof of Work™ is sent to homeowner **by default** after job completion.

**Rationale:** The value is in homeowners seeing it. Optional delivery = low adoption.

### 5.2 Delivery Configuration

| Setting | Default | Options |
|---------|---------|---------|
| Auto-send | **ON** | On / Off |
| Channel | **SMS** | SMS / Email / Both |
| Timing | **15 min after completion** | Immediate / 15m / 1hr / 24hr |
| Include QR | **Yes** | Yes / No (email only) |

### 5.3 SMS Template (LOCKED)

```
Your service from {business_name} is complete!

View your Proof of Work™:
pow.tc/{short_code}

This record shows who came, when they arrived, and what was done.
```

**Character count:** ~160 chars (single SMS)

### 5.4 Email Template

**Subject:** Your Service Record from {business_name}

```
Hi {customer_first_name},

Your service is complete! Here's your Proof of Work™ — a verified 
record of the work performed.

         ┌─────────────────────────┐
         │                         │
         │    VIEW PROOF OF WORK   │
         │                         │
         └─────────────────────────┘

This record includes:
• Technician verification
• Arrival and completion times  
• Job photos
• Work summary

      ┌─────────┐
      │   QR    │  Scan anytime to
      │  CODE   │  view your record
      └─────────┘
      pow.tc/{short_code}

Questions about your service? Contact {business_name}:
{business_phone}

────────────────────────────────────────
This is a service record, not an invoice.
{business_name} • Powered by Trades Captain
```

### 5.5 Opt-Out

* Business must explicitly toggle OFF to disable auto-send
* Setting is per-business, not per-job
* Warning shown when disabling: "Homeowners won't automatically receive their service records"

---

## 6. VERIFICATION BADGE DETAILS

### 6.1 Verified Business

**Requirements:**

| Criterion | Required? | Source |
|-----------|-----------|--------|
| Active Trades Captain subscription | ✅ Required | Billing status |
| Business license number on file | ✅ Required | Business profile |
| License verified against state DB | ⚠️ Phase 2 | API integration |
| Insurance certificate on file | ⚠️ Phase 2 | Document upload |

**Current (v1.1):** Badge awarded if active + license on file

**Future (v2.0):** Badge requires license verification

### 6.2 Verified Technician

**Requirements:**

| Criterion | Required? | Source |
|-----------|-----------|--------|
| Active team member | ✅ Required | Team roster |
| Profile exists | ✅ Required | User record |
| Photo on file | ⚠️ Encouraged | User profile |
| Background check | ⚠️ Phase 2 | Integration |

### 6.3 Location Verified

**Requirements:**

| Criterion | Required? | Source |
|-----------|-----------|--------|
| GPS check-in recorded | ✅ Required | Mobile app |
| Within 500m of job address | ✅ Required | Haversine calculation |
| Check-in during job window | ✅ Required | Timestamp comparison |

**Calculation:**

```
distance = haversine(
  checkin.latitude, checkin.longitude,
  job.address_latitude, job.address_longitude
)

IF distance <= 500 meters AND checkin.time >= job.scheduled_start - 30min:
  location_verified = true
```

### 6.4 Photo Evidence

**Requirements:**

| Criterion | Required? | Source |
|-----------|-----------|--------|
| At least 1 photo | ✅ Required | Photo count |
| Photo verification Level 2+ | ✅ Required | Verification system |

See **Section 7** for photo verification levels.

---

## 7. PHOTO VERIFICATION LOGIC (DETAILED)

### 7.1 Verification Levels

| Level | Name | Criteria | Badge |
|-------|------|----------|-------|
| **Level 3** | Fully Verified | Mobile + GPS + Time + Direct capture | 📍✓ Verified at job site |
| **Level 2** | Location Verified | Mobile + GPS + Time | 📍 Location verified |
| **Level 1** | Time Verified | Mobile + Time (no GPS) | 🕐 Time verified |
| **Level 0** | Unverified | Missing criteria or post-completion | (no badge) |
| **Rejected** | Invalid | Uploaded after finalization | Not displayed |

### 7.2 Verification Criteria

**A. Mobile Upload (Source Check)**

```
IF upload_source = "MOBILE_APP"
  AND upload_device IN business.registered_devices:
  → source_verified = true
ELSE:
  → source_verified = false (desktop, web, API)
```

**B. Time Window (Temporal Check)**

```
capture_time = photo.exif.DateTimeOriginal
  OR photo.upload_timestamp

job_window_start = job.arrival_time - 30 minutes
job_window_end = job.completion_time + 30 minutes

IF capture_time >= job_window_start
  AND capture_time <= job_window_end:
  → time_verified = true
ELSE:
  → time_verified = false
```

**C. Location Match (Spatial Check)**

```
photo_coords = photo.exif.GPSLatitude, photo.exif.GPSLongitude
job_coords = job.address.latitude, job.address.longitude

distance = haversine(photo_coords, job_coords)

IF distance <= 500 meters:
  → location_verified = true
ELSE:
  → location_verified = false
```

**D. Direct Capture (Freshness Check)**

```
IF photo.exif.DateTimeOriginal EXISTS
  AND (photo.upload_timestamp - photo.exif.DateTimeOriginal) <= 5 minutes:
  → direct_capture = true
ELSE:
  → direct_capture = false (likely from gallery)
```

### 7.3 Verification Assignment Logic

```
ON photo_upload(photo, job):

  # Reject if job already finalized
  IF job.finalized_at IS NOT NULL:
    → REJECT photo
    → Return error "Job already completed"
  
  # Extract metadata
  exif = extract_exif(photo)
  
  # Run checks
  source_ok = check_mobile_source(photo)
  time_ok = check_time_window(exif, job)
  location_ok = check_location_match(exif, job)
  direct_ok = check_direct_capture(exif, photo.upload_time)
  
  # Assign level
  IF source_ok AND time_ok AND location_ok AND direct_ok:
    → verification_level = 3  # Fully Verified
  ELSE IF source_ok AND time_ok AND location_ok:
    → verification_level = 2  # Location Verified
  ELSE IF source_ok AND time_ok:
    → verification_level = 1  # Time Verified
  ELSE:
    → verification_level = 0  # Unverified
  
  # Store results
  photo.verification_level = level
  photo.verification_details = {
    source_verified: source_ok,
    time_verified: time_ok,
    location_verified: location_ok,
    direct_capture: direct_ok,
    distance_meters: calculated_distance,
    time_delta_seconds: calculated_delta
  }
```

### 7.4 Display Logic

```
FOR photo IN proof_of_work.photos:
  
  IF photo.verification_level >= 2:
    → Show on Proof of Work™ page
    → Display verification badge
    → Priority position in gallery
  
  ELSE IF photo.verification_level = 1:
    → Show on Proof of Work™ page
    → Display time badge only
    → Standard position
  
  ELSE IF photo.verification_level = 0:
    → Show on Proof of Work™ page
    → No verification badge
    → Lower position
  
  ELSE (rejected):
    → Do NOT show on Proof of Work™
    → Available in CRM only
```

### 7.5 Anti-Gaming Measures

**Stock Photo Detection:**

```
# Flag if EXIF stripped AND common dimensions
IF photo.exif IS EMPTY
  AND photo.dimensions IN [1920x1080, 1280x720, 1000x1000, ...]:
  → Flag for review
  → verification_level = max(0, calculated_level - 1)
```

**Duplicate Photo Detection:**

```
photo_hash = perceptual_hash(photo)

IF photo_hash EXISTS IN business.photo_hashes
  AND photo_hash.job_id != current_job.id:
  → Flag "Duplicate from job #{job_id}"
  → verification_level = 0
```

**Post-Completion Prevention:**

```
# Hard block after finalization
IF job.finalized_at IS NOT NULL:
  → REJECT all uploads
  → Cannot add photos to finalized job
```

### 7.6 Photo Immutability Rules

| Action | Before Finalization | After Finalization |
|--------|---------------------|-------------------|
| Upload photo | ✅ Allowed | ❌ Blocked |
| Delete photo | ✅ Allowed | ❌ Blocked |
| Change category | ✅ Allowed | ❌ Blocked |
| Edit/crop photo | ❌ Never | ❌ Never |
| Replace photo | ❌ Never | ❌ Never |

---

## 8. WORK SUMMARY TEMPLATE LIBRARY (LOCKED)

### 8.1 Template Selection Logic

```
ON job_completion:
  
  trade = job.service_type      # e.g., "Plumbing"
  category = job.service_category  # e.g., "Drain Cleaning"
  outcome = job.outcome         # e.g., "COMPLETED"
  
  # Find matching template
  template = SELECT FROM summary_templates
    WHERE trade = job.trade
    AND (category = job.category OR category IS NULL)
    AND outcome = job.outcome
    ORDER BY category NULLS LAST  # Prefer specific match
    LIMIT 1
  
  # Fallback to universal if no match
  IF template IS NULL:
    template = SELECT FROM summary_templates
      WHERE trade IS NULL AND outcome = job.outcome
  
  # Generate summary
  summary_text = template.text
```

### 8.2 Template Rules (LOCKED)

Templates must NOT include:

* ❌ Pricing or cost references
* ❌ Warranty language
* ❌ Guarantees or promises
* ❌ Technical specifications
* ❌ Brand names
* ❌ Negative language about previous work
* ❌ Customer-specific details

Templates must:

* ✅ Use past tense
* ✅ Use third person ("The technician...")
* ✅ Be generic enough for any job in category
* ✅ Be liability-safe

---

### 8.3 PLUMBING TEMPLATES

**Drain Cleaning — Completed:**
```
The technician cleared the reported drain blockage and verified proper drainage before completion.
```

**Drain Cleaning — Diagnosed:**
```
The technician inspected the reported drain issue and identified the cause. A follow-up service may be recommended.
```

**Leak Repair — Completed:**
```
The technician located and repaired the reported leak. The area was tested and confirmed to be functioning properly.
```

**Leak Repair — Partial:**
```
The technician addressed the immediate leak concern. Additional work may be recommended to fully resolve the issue.
```

**Water Heater Service — Completed:**
```
The technician serviced the water heater and verified proper operation before completion.
```

**Water Heater Service — Diagnosed:**
```
The technician inspected the water heater and assessed its condition. Recommendations were provided to the homeowner.
```

**Fixture Installation — Completed:**
```
The technician installed the requested fixture and confirmed proper operation.
```

**Sewer Line Service — Completed:**
```
The technician addressed the reported sewer line issue and verified proper function.
```

**Sewer Line Service — Diagnosed:**
```
The technician inspected the sewer line and identified the issue. A detailed assessment was provided.
```

**Gas Line Service — Completed:**
```
The technician serviced the gas line and verified safe operation before completion.
```

**General Plumbing — Completed:**
```
The technician inspected the reported plumbing issue and completed the necessary service to resolve it.
```

**General Plumbing — Diagnosed:**
```
The technician assessed the reported plumbing concern and provided recommendations.
```

---

### 8.4 HVAC TEMPLATES

**AC Repair — Completed:**
```
The technician diagnosed and repaired the air conditioning system. Proper cooling operation was verified before completion.
```

**AC Repair — Diagnosed:**
```
The technician inspected the air conditioning system and identified the issue. Repair options were discussed with the homeowner.
```

**Heating Repair — Completed:**
```
The technician diagnosed and repaired the heating system. Proper heating operation was verified before completion.
```

**Heating Repair — Diagnosed:**
```
The technician inspected the heating system and identified the issue. Repair options were discussed with the homeowner.
```

**HVAC Maintenance — Completed:**
```
The technician performed routine maintenance on the HVAC system, including inspection and cleaning of key components.
```

**HVAC Installation — Completed:**
```
The technician installed the HVAC equipment and verified proper operation before completion.
```

**Ductwork Service — Completed:**
```
The technician addressed the reported ductwork issue and verified proper airflow.
```

**Thermostat Service — Completed:**
```
The technician installed or serviced the thermostat and confirmed proper system communication.
```

**General HVAC — Completed:**
```
The technician serviced the HVAC system and verified operation before completion.
```

**General HVAC — Diagnosed:**
```
The technician inspected the HVAC system and provided an assessment of its condition.
```

---

### 8.5 ELECTRICAL TEMPLATES

**Panel Service — Completed:**
```
The technician completed the electrical panel service and verified safe operation.
```

**Panel Service — Diagnosed:**
```
The technician inspected the electrical panel and provided a safety assessment.
```

**Outlet/Switch — Completed:**
```
The technician installed or repaired the electrical outlet or switch and confirmed proper function.
```

**Lighting — Completed:**
```
The technician installed or repaired the lighting fixture and verified operation.
```

**Wiring Service — Completed:**
```
The technician addressed the reported wiring issue and confirmed safe operation.
```

**Wiring Service — Diagnosed:**
```
The technician inspected the wiring and provided an assessment. Recommendations were discussed.
```

**Generator Service — Completed:**
```
The technician serviced the generator and verified proper operation.
```

**EV Charger Installation — Completed:**
```
The technician installed the EV charging station and confirmed proper operation.
```

**General Electrical — Completed:**
```
The technician addressed the reported electrical concern and confirmed safe operation.
```

**General Electrical — Diagnosed:**
```
The technician inspected the electrical system and provided recommendations.
```

---

### 8.6 APPLIANCE REPAIR TEMPLATES

**Refrigerator — Completed:**
```
The technician diagnosed and repaired the refrigerator. Proper cooling operation was confirmed.
```

**Refrigerator — Diagnosed:**
```
The technician inspected the refrigerator and identified the issue. Repair options were discussed.
```

**Washer/Dryer — Completed:**
```
The technician diagnosed and repaired the appliance. Proper operation was verified through a test cycle.
```

**Dishwasher — Completed:**
```
The technician diagnosed and repaired the dishwasher. A test cycle was completed successfully.
```

**Oven/Range — Completed:**
```
The technician diagnosed and repaired the oven or range. Proper heating operation was verified.
```

**Garbage Disposal — Completed:**
```
The technician serviced or installed the garbage disposal and verified proper operation.
```

**General Appliance — Completed:**
```
The technician diagnosed and repaired the appliance. Proper operation was verified before completion.
```

**General Appliance — Diagnosed:**
```
The technician inspected the appliance and identified the issue. Repair options were discussed.
```

---

### 8.7 LOCKSMITH TEMPLATES

**Lockout Service — Completed:**
```
The technician provided lockout assistance and restored access to the property.
```

**Rekey — Completed:**
```
The technician rekeyed the locks as requested. New keys were provided.
```

**Lock Installation — Completed:**
```
The technician installed the new lock hardware and verified proper function.
```

**Lock Repair — Completed:**
```
The technician repaired the lock mechanism and confirmed proper operation.
```

**General Locksmith — Completed:**
```
The technician completed the requested lock service.
```

---

### 8.8 GARAGE DOOR TEMPLATES

**Garage Door Repair — Completed:**
```
The technician diagnosed and repaired the garage door. Proper operation was verified before completion.
```

**Garage Door Installation — Completed:**
```
The technician installed the garage door and verified proper operation.
```

**Opener Service — Completed:**
```
The technician serviced or installed the garage door opener and confirmed proper operation.
```

**Spring Replacement — Completed:**
```
The technician replaced the garage door springs and verified proper balance and operation.
```

**General Garage Door — Completed:**
```
The technician serviced the garage door system and verified proper operation.
```

---

### 8.9 PEST CONTROL TEMPLATES

**General Pest Control — Completed:**
```
The technician inspected the property and applied pest control treatment. Follow-up recommendations were provided.
```

**Termite Treatment — Completed:**
```
The technician inspected for termite activity and applied treatment as needed.
```

**Rodent Control — Completed:**
```
The technician inspected for rodent activity and applied appropriate control measures.
```

**Bed Bug Treatment — Completed:**
```
The technician treated the affected areas for bed bugs. Follow-up instructions were provided.
```

---

### 8.10 HANDYMAN / GENERAL TEMPLATES

**Assembly — Completed:**
```
The technician assembled the requested item and verified stability.
```

**Mounting/Hanging — Completed:**
```
The technician mounted or hung the requested item and verified secure installation.
```

**Minor Repair — Completed:**
```
The technician completed the requested repair and verified the result.
```

**Drywall Repair — Completed:**
```
The technician repaired the drywall and prepared the surface for finishing.
```

**Painting — Completed:**
```
The technician completed the requested painting work.
```

**General Handyman — Completed:**
```
The technician completed the requested service.
```

**General Handyman — Diagnosed:**
```
The technician assessed the reported issue and provided recommendations.
```

---

### 8.11 UNIVERSAL DEFAULT TEMPLATES

**Completed:**
```
The technician inspected the reported issue and completed the necessary service. The work was verified before completion.
```

**Diagnosed:**
```
The technician inspected the reported issue and provided an assessment. Recommendations were discussed with the homeowner.
```

**Partial:**
```
The technician addressed the immediate concern. Additional work may be recommended to fully resolve the issue.
```

**Deferred:**
```
The technician assessed the situation. The service has been scheduled for a future visit.
```

---

## 9. HOMEOWNER PAGE WIREFRAME SPECIFICATION

### 9.1 Mobile Layout (Primary)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                     HEADER                           │   │
│  │                                                      │   │
│  │  [LOGO]  Smith Plumbing                              │   │
│  │                                                      │   │
│  │  ═════════════════════════════════════════════════  │   │
│  │          ✓ PROOF OF WORK™                            │   │
│  │  ═════════════════════════════════════════════════  │   │
│  │                                                      │   │
│  │  Plumbing Service               🟢 Completed         │   │
│  │  June 14, 2026 • Austin, TX 78704                   │   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   TECHNICIAN                         │   │
│  │                                                      │   │
│  │  ┌──────┐  Mike Johnson                              │   │
│  │  │ [📷] │  ✔ Verified Technician                    │   │
│  │  └──────┘  Arrived at 9:42 AM                        │   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   ARRIVAL LOG                        │   │
│  │                                                      │   │
│  │  📍 Arrived       9:42 AM                            │   │
│  │  🚗 Departed      11:18 AM                           │   │
│  │  ⏱️  Time on Site  1h 36m                            │   │
│  │                                                      │   │
│  │  ✔ Location verified at job site                    │   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   JOB TIMELINE                       │   │
│  │                                                      │   │
│  │  🕘 9:12 AM ─── Job scheduled                        │   │
│  │     │                                                │   │
│  │  🧑‍🔧 9:40 AM ─── Technician assigned                 │   │
│  │     │                                                │   │
│  │  📍 9:42 AM ─── Technician arrived                   │   │
│  │     │           ✔ Location verified                  │   │
│  │     │                                                │   │
│  │  🔧 9:50 AM ─── Work started                         │   │
│  │     │                                                │   │
│  │  📸 10:25 AM ── Photos added (4)                     │   │
│  │     │           ✔ Verified at job site               │   │
│  │     │                                                │   │
│  │  ✅ 11:18 AM ── Job completed                        │   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   JOB PHOTOS                         │   │
│  │                                                      │   │
│  │  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐             │   │
│  │  │      │  │      │  │      │  │      │             │   │
│  │  │ [📷] │  │ [📷] │  │ [📷] │  │ [📷] │             │   │
│  │  │      │  │      │  │      │  │      │             │   │
│  │  └──────┘  └──────┘  └──────┘  └──────┘             │   │
│  │  Before    Before    After     After                │   │
│  │  📍✓       📍✓       📍✓       📍✓                   │   │
│  │                                                      │   │
│  │  ✔ All photos verified at job site                  │   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   WORK SUMMARY                       │   │
│  │                                                      │   │
│  │  The technician cleared the reported drain           │   │
│  │  blockage and verified proper drainage before        │   │
│  │  completion.                                         │   │
│  │                                                      │   │
│  │  Service: Drain Cleaning                             │   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   TRUST BADGES                       │   │
│  │                                                      │   │
│  │  ✔ Verified Business    ✔ Verified Technician       │   │
│  │  ✔ Location Verified    ✔ Photo Evidence            │   │
│  │  ✔ Timestamped Activity                             │   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   SHARE                              │   │
│  │                                                      │   │
│  │         ┌───────────┐                                │   │
│  │         │    QR     │                                │   │
│  │         │   CODE    │                                │   │
│  │         └───────────┘                                │   │
│  │         pow.tc/X7KM9P                                │   │
│  │                                                      │   │
│  │  ┌─────────────┐  ┌─────────────┐                   │   │
│  │  │  Copy Link  │  │    Share    │                   │   │
│  │  └─────────────┘  └─────────────┘                   │   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   FOOTER                             │   │
│  │                                                      │   │
│  │  Reference: POW-2026-0614-X7KM                       │   │
│  │                                                      │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  This is a service record, not an invoice.          │   │
│  │  For billing questions, contact Smith Plumbing.     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                      │   │
│  │         Powered by Trades Captain                    │   │
│  │    Professional job verification & transparency      │   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 Desktop Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                           HEADER (full width)                        │   │
│  │  [LOGO]  Smith Plumbing              ✓ PROOF OF WORK™               │   │
│  │  Plumbing Service • June 14, 2026 • Austin, TX      🟢 Completed    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌───────────────────────────────┐  ┌───────────────────────────────────┐  │
│  │                               │  │                                   │  │
│  │         TECHNICIAN            │  │          ARRIVAL LOG              │  │
│  │                               │  │                                   │  │
│  │  ┌──────┐  Mike Johnson       │  │  📍 Arrived      9:42 AM          │  │
│  │  │ [📷] │  ✔ Verified Tech    │  │  🚗 Departed     11:18 AM         │  │
│  │  └──────┘  Arrived 9:42 AM    │  │  ⏱️ Time on Site  1h 36m          │  │
│  │                               │  │                                   │  │
│  │                               │  │  ✔ Location verified              │  │
│  │                               │  │                                   │  │
│  └───────────────────────────────┘  └───────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                           JOB TIMELINE                               │   │
│  │                                                                      │   │
│  │  🕘 9:12 AM ── 🧑‍🔧 9:40 AM ── 📍 9:42 AM ── 🔧 9:50 AM ── 📸 10:25 ── ✅ 11:18 │
│  │  Scheduled    Assigned      Arrived      Started     Photos    Completed│
│  │                              ✔ Loc                    ✔ Verified        │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                           JOB PHOTOS                                 │   │
│  │                                                                      │   │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐                     │   │
│  │  │ [📷]   │  │ [📷]   │  │ [📷]   │  │ [📷]   │                     │   │
│  │  │ Before │  │ Before │  │ After  │  │ After  │                     │   │
│  │  │ 📍✓    │  │ 📍✓    │  │ 📍✓    │  │ 📍✓    │                     │   │
│  │  └────────┘  └────────┘  └────────┘  └────────┘                     │   │
│  │                                                                      │   │
│  │  ✔ All photos verified at job site                                  │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌───────────────────────────────┐  ┌───────────────────────────────────┐  │
│  │                               │  │                                   │  │
│  │        WORK SUMMARY           │  │         SHARE & VERIFY            │  │
│  │                               │  │                                   │  │
│  │  The technician cleared the   │  │       ┌───────────┐               │  │
│  │  reported drain blockage and  │  │       │    QR     │               │  │
│  │  verified proper drainage     │  │       │   CODE    │               │  │
│  │  before completion.           │  │       └───────────┘               │  │
│  │                               │  │       pow.tc/X7KM9P               │  │
│  │  Service: Drain Cleaning      │  │                                   │  │
│  │                               │  │  [Copy Link]  [Share]             │  │
│  │                               │  │                                   │  │
│  └───────────────────────────────┘  └───────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ✔ Verified Business  ✔ Verified Technician  ✔ Location Verified   │   │
│  │  ✔ Photo Evidence     ✔ Timestamped Activity                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                           FOOTER                                     │   │
│  │  Reference: POW-2026-0614-X7KM                                      │   │
│  │  This is a service record, not an invoice or warranty.              │   │
│  │  Powered by Trades Captain                                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 9.3 Design System

**Colors:**

```
--color-bg-primary:      #FFFFFF
--color-bg-secondary:    #F8FAFC
--color-text-primary:    #0F172A
--color-text-secondary:  #64748B
--color-accent-green:    #22C55E
--color-accent-blue:     #3B82F6
--color-border:          #E2E8F0
--color-badge-bg:        #ECFDF5
--color-badge-text:      #166534
```

**Typography:**

```
--font-family:           'Inter', system-ui, sans-serif
--font-size-xs:          12px
--font-size-sm:          14px
--font-size-base:        16px
--font-size-lg:          18px
--font-size-xl:          24px
--font-weight-normal:    400
--font-weight-medium:    500
--font-weight-semibold:  600
```

**Spacing:**

```
--space-1:  4px
--space-2:  8px
--space-3:  12px
--space-4:  16px
--space-5:  20px
--space-6:  24px
--space-8:  32px
```

### 9.4 Component States

**Photo Lightbox (on tap):**

```
┌─────────────────────────────────────────────────────────────┐
│                                                    [✕]      │
│                                                             │
│                                                             │
│                   ┌───────────────────┐                     │
│                   │                   │                     │
│                   │                   │                     │
│                   │    [FULL SIZE     │                     │
│                   │      PHOTO]       │                     │
│                   │                   │                     │
│                   │                   │                     │
│                   └───────────────────┘                     │
│                                                             │
│                   After • 10:25 AM                          │
│                   📍 Verified at job site                   │
│                                                             │
│              [◀ Previous]    [Next ▶]                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Loading State:**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ████████████  ░░░░░░░░░░░░░░                        │   │
│  │                                                      │   │
│  │  ████████████████████████░░░░░░░░░░░░░░░░░░░░░░     │   │
│  │  ████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Skeleton loading animation...]                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Error State (404):**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                      ⚠️                                     │
│                                                             │
│              Record Not Found                               │
│                                                             │
│   This Proof of Work™ doesn't exist or has been removed.   │
│                                                             │
│   If you believe this is an error, contact the service     │
│   provider directly.                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 9.5 Responsive Breakpoints

```
Mobile:   < 640px   (single column, stacked)
Tablet:   640-1024px (some 2-column sections)
Desktop:  > 1024px  (full 2-column layout, max-width: 1200px)
```

### 9.6 Performance Requirements

| Metric | Target |
|--------|--------|
| Time to First Byte | < 200ms |
| First Contentful Paint | < 1.0s |
| Largest Contentful Paint | < 2.0s |
| Total Page Weight | < 500KB |
| Photo lazy loading | Yes |
| CDN cached | Yes |

---

## 10. DATA MODEL (COMPLETE)

### 10.1 proof_of_work

```sql
CREATE TABLE proof_of_work (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id),
  business_id UUID NOT NULL REFERENCES businesses(id),
  technician_id UUID NOT NULL REFERENCES users(id),
  
  -- Identifiers
  public_token VARCHAR(16) UNIQUE NOT NULL,
  short_code VARCHAR(6) UNIQUE NOT NULL,
  reference_number VARCHAR(20) NOT NULL,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  -- DRAFT, IN_PROGRESS, COMPLETED, FINALIZED
  
  -- Service Details
  service_type VARCHAR(100) NOT NULL,
  service_category VARCHAR(100),
  service_date DATE NOT NULL,
  location_city VARCHAR(100) NOT NULL,
  location_state VARCHAR(2) NOT NULL,
  location_zip VARCHAR(10),
  
  -- Time Tracking
  arrival_time TIMESTAMPTZ,
  departure_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  
  -- Content
  summary_template_id UUID REFERENCES summary_templates(id),
  summary_text TEXT NOT NULL,
  
  -- Verification Badges
  badge_verified_business BOOLEAN DEFAULT FALSE,
  badge_verified_technician BOOLEAN DEFAULT FALSE,
  badge_location_verified BOOLEAN DEFAULT FALSE,
  badge_photo_evidence BOOLEAN DEFAULT FALSE,
  badge_timestamped BOOLEAN DEFAULT FALSE,
  
  -- Delivery
  delivery_enabled BOOLEAN DEFAULT TRUE,
  delivery_channel VARCHAR(10), -- SMS, EMAIL, BOTH
  delivery_sent_at TIMESTAMPTZ,
  
  -- QR Code
  qr_code_png_url TEXT,
  qr_code_svg_url TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  finalized_at TIMESTAMPTZ,
  
  CONSTRAINT valid_status CHECK (status IN ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'FINALIZED'))
);

CREATE INDEX idx_pow_public_token ON proof_of_work(public_token);
CREATE INDEX idx_pow_short_code ON proof_of_work(short_code);
CREATE INDEX idx_pow_job_id ON proof_of_work(job_id);
CREATE INDEX idx_pow_business_id ON proof_of_work(business_id);
```

### 10.2 proof_of_work_photos

```sql
CREATE TABLE proof_of_work_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proof_of_work_id UUID NOT NULL REFERENCES proof_of_work(id),
  
  -- Photo Data
  photo_url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  category VARCHAR(20) NOT NULL, -- BEFORE, DURING, AFTER, ISSUE
  display_order INTEGER NOT NULL DEFAULT 0,
  
  -- Verification
  verification_level INTEGER NOT NULL DEFAULT 0, -- 0-3
  upload_source VARCHAR(20) NOT NULL, -- MOBILE_APP, DESKTOP, API
  upload_time TIMESTAMPTZ NOT NULL,
  capture_time TIMESTAMPTZ,
  gps_latitude DECIMAL(10, 8),
  gps_longitude DECIMAL(11, 8),
  distance_meters INTEGER,
  
  -- Verification Results
  source_verified BOOLEAN DEFAULT FALSE,
  time_verified BOOLEAN DEFAULT FALSE,
  location_verified BOOLEAN DEFAULT FALSE,
  direct_capture BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  
  CONSTRAINT valid_category CHECK (category IN ('BEFORE', 'DURING', 'AFTER', 'ISSUE')),
  CONSTRAINT valid_verification_level CHECK (verification_level BETWEEN 0 AND 3)
);

CREATE INDEX idx_pow_photos_pow_id ON proof_of_work_photos(proof_of_work_id);
```

### 10.3 proof_of_work_timeline

```sql
CREATE TABLE proof_of_work_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proof_of_work_id UUID NOT NULL REFERENCES proof_of_work(id),
  
  event_type VARCHAR(30) NOT NULL,
  event_time TIMESTAMPTZ NOT NULL,
  event_icon VARCHAR(10) NOT NULL,
  event_label VARCHAR(100) NOT NULL,
  verification_badge VARCHAR(50),
  metadata JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_event_type CHECK (event_type IN (
    'SCHEDULED', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED',
    'WORK_STARTED', 'PHOTOS_ADDED', 'COMPLETED', 'SENT'
  ))
);

CREATE INDEX idx_pow_timeline_pow_id ON proof_of_work_timeline(proof_of_work_id);
```

### 10.4 proof_of_work_audit

```sql
CREATE TABLE proof_of_work_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proof_of_work_id UUID NOT NULL REFERENCES proof_of_work(id),
  
  event_type VARCHAR(30) NOT NULL,
  actor_type VARCHAR(20) NOT NULL, -- SYSTEM, BUSINESS, HOMEOWNER, ANONYMOUS
  actor_id UUID,
  ip_address_hash VARCHAR(64), -- Hashed for privacy
  user_agent TEXT,
  referrer TEXT,
  
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_event_type CHECK (event_type IN (
    'CREATED', 'FINALIZED', 'VIEWED', 'SHARED',
    'DELIVERED', 'DELIVERY_FAILED', 'QR_SCANNED'
  ))
);

CREATE INDEX idx_pow_audit_pow_id ON proof_of_work_audit(proof_of_work_id);
CREATE INDEX idx_pow_audit_timestamp ON proof_of_work_audit(timestamp);
```

### 10.5 summary_templates

```sql
CREATE TABLE summary_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  trade VARCHAR(50), -- NULL = universal
  category VARCHAR(50), -- NULL = trade default
  outcome VARCHAR(20) NOT NULL, -- COMPLETED, DIAGNOSED, PARTIAL, DEFERRED
  
  template_text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_outcome CHECK (outcome IN ('COMPLETED', 'DIAGNOSED', 'PARTIAL', 'DEFERRED'))
);

CREATE INDEX idx_templates_trade_category ON summary_templates(trade, category, outcome);
```

---

## 11. PERMISSIONS & IMMUTABILITY (LOCKED)

| Action | Before Finalization | After Finalization |
|--------|---------------------|-------------------|
| Add photos | ✅ Allowed | ❌ Blocked |
| Delete photos | ✅ Allowed | ❌ Blocked |
| Change photo category | ✅ Allowed | ❌ Blocked |
| Edit/crop photos | ❌ Never | ❌ Never |
| Edit summary | ✅ (template select only) | ❌ Blocked |
| Add timeline event | ✅ (system only) | ❌ Blocked |
| Edit timeline | ❌ Never | ❌ Never |
| Delete timeline event | ❌ Never | ❌ Never |
| Edit arrival time | ❌ Never | ❌ Never |
| Delete Proof of Work™ | ❌ Never | ❌ Never |
| Re-send delivery | ✅ Allowed | ✅ Allowed |
| Regenerate QR | ✅ Allowed | ✅ Allowed |

**Finalization Trigger:**

```
ON job.status = 'COMPLETED':
  WAIT 30 minutes (allow late photo uploads)
  
  SET proof_of_work.status = 'FINALIZED'
  SET proof_of_work.finalized_at = NOW()
  
  FOR photo IN proof_of_work.photos:
    SET photo.locked_at = NOW()
  
  IF proof_of_work.delivery_enabled:
    TRIGGER delivery
```

---

## 12. DISPUTE HANDLING (LOCKED)

### 12.1 Core Position

> Proof of Work™ is a record of **system-observed activity**, not a judgment of quality.

### 12.2 Dispute Rules

| If... | Then... |
|-------|---------|
| Homeowner disputes quality | Record unchanged. Handle offline. |
| Homeowner claims work not done | Record unchanged. Evidence available: timeline, photos, GPS. |
| Contractor wants edit | ❌ Denied. Immutable after finalization. |
| Contractor wants deletion | ❌ Denied. Records are permanent. |
| Legal request | Evaluate. Document. Minimum change if compelled. |

### 12.3 No Disputed Flag

We explicitly do **not** add a "disputed" or "contested" badge because:

* Invites gaming
* Creates review dynamics
* Undermines trust value
* Opens liability questions

If work quality is disputed, that's between homeowner and contractor — outside Proof of Work™.

---

## 13. STOP CONDITIONS

STOP build if:

* Proof of Work™ becomes editable after finalization
* Pricing appears anywhere
* Review/rating features added
* Timeline events become manual/free-text
* Photos editable after completion
* Contractors can delete arrival logs
* Summary becomes contractor-editable
* Full street address displayed
* Verification badges purchasable

---

## 14. SUCCESS METRICS

| Metric | Target | Measurement |
|--------|--------|-------------|
| Generation rate | 100% | Completed jobs with POW |
| Delivery rate | 95% | Sent / Generated |
| View rate | 60% | Viewed / Delivered |
| Share rate | 10% | Shared / Viewed |
| Photo verification rate | 80% | Level 2+ / All photos |
| Page load time | <2s | LCP metric |

**Qualitative Signals:**

* Contractors showing Proof of Work™ at the door
* Referrals mentioning "they sent me a record"
* Sales differentiation vs Jobber/ServiceTitan

---

## CHANGELOG

### v1.1 (Current)

* Added detailed photo verification logic (Section 7)
* Added complete work summary template library (Section 8)
* Added homeowner page wireframe specification (Section 9)
* Added QR code system with short URLs (Section 4)
* Added print-ready asset specifications
* Added delivery system (default ON)
* Added verification badge requirements
* Added partial address format specification
* Added dispute handling policy
* Added comprehensive data model
* Added performance requirements
* Clarified "Verified Business" = license on file

### v1.0

* Initial specification
* Core concept established

---

## FINAL SYSTEM DEFINITION

> Proof of Work™ is a homeowner-facing trust artifact that verifies technician identity, arrival, activity, and completion through GPS-verified timestamps, verified photos, and system-generated timelines. It is immutable after finalization, transparent by design, and built to create trust without becoming a review system, invoice, or legal document.

---

### 🔐 END OF MASTER BUILD PROMPT

**Version:** v1.1  
**Status:** LOCKED