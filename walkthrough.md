# Redesign Walkthrough - Document Center & Student Registration

We have redesigned the **Document Center** and **Student Registration Form** to match the mockups and user requirements exactly.

## Registration Form Key Changes

### 1. Mockup-matched Header Card
- Circular step indicator: Displays a light blue flex circle with step number (e.g. `1` for Student Info).
- Redesigned steps count badge on the right: Styled as `STEP X OF 6` in a clean border badge.
- Replaced the bottom step name with progress labels placed above the progress line.
- Dynamic Progress Percentage: Added `PROGRESS: X%` label on the left in uppercase theme blue.
- Styled step names in bold uppercase next to the progress indicators.
- Thin progress bar line runs all the way across.
- **Header Alignment & Centering**: Set desktop height of the page header to exactly `lg:h-28 flex flex-col justify-between pt-7 pb-5`, matching the branding height and aligning the bottom border divider line perfectly across the sidebar intersection. Used explicit paddings `pt-7` (28px top) and `pb-5` (20px bottom) with a vertical distribution wrapper to center the header elements perfectly and prevent them from being pushed to the top of the header.

### 2. Form Inputs Redesign
- Standardized labels to uppercase bold text with tracking-widest (e.g. `FIRST NAME *`, `LAST NAME *`, `MIDDLE NAME (OPTIONAL)`, `BIRTH DATE *`).
- Inputs styled with soft gray backgrounds (`bg-slate-50`), rounded corners (`rounded-2xl`), and a taller premium height (`h-14 px-5`).

### 3. Notice Alert Box
- Added the `IMPORTANT NOTICE` blue warning notice box to the bottom of the first step.
- Displays an info icon on the left with text reminding the user to check document accuracy.

### 4. Navigation & Draft Actions
- Modified the back control on the left to show `< Previous` in soft gray link style.
- Added a functional `Save as Draft` text link on the right that triggers a success alert notice when clicked.
- Replaced the continue action button on the right with a themed blue solid `Next Step >` button.
- **Footer Spacing**: Increased the sticky footer height to `h-24` and set alignment to `flex items-start pt-5` so that the navigation buttons sit higher, leaving more spacing from the bottom of the screen.

### 5. Step 4 Logic Fixes (Manual Guardian Details)
- **Problem**: When selecting "No" on the Primary Guardian step, the subStep goes to `85`. Because `85 > 9`, the step number helper fell through and displayed `STEP 6 OF 6` (with `100%` progress) instead of `STEP 4 OF 6` (`67%` progress). Furthermore, because `85 > 11`, the footer rendered the **Submit Registration** button prematurely instead of the **Next Step >** button.
- **Fixes**:
  * Updated `getMainStepNumber()` to check `subStep === 85` explicitly to return `4` (Step 4 of 6).
  * Redesigned the footer button rendering checks to query exact step positions (`subStep === 11` for "Continue >" and `subStep === 12` for "Submit Registration"), with all other values mapping correctly to "Next Step >".

### 6. Local Staging & Bulk Uploads (Step 5 Supporting Documents)
- **Select / Stage Only**: When a user selects a file in Step 5, it is stored locally in React state (`step5Uploads`) and **NOT** uploaded to Cloudinary or Firestore immediately.
- **Status Change**: The status badge on the top right updates to `Status: Document Inserted` in an amber badge.
- **Actions Bar**: Added custom `View` (previews local file URL), `Replace` (launches standard file browser), and `Remove` (clears local selection) buttons.
- **Final Submited Click Trigger**: The actual files are uploaded and saved to Firestore during the final **Submit Registration** process at the end of the registration flow, assigning them correctly to the created `enrollmentId`.

### 7. Document Center Changes
- Refactored `src/modules/parent/RequirementsView.tsx` to match this behavior.
- Selecting a file stages it locally with the status pill reading `Document Inserted`.
- Staged items render `View Document`, `Replace Document`, and `Remove Document` buttons directly on the card.
- Replaced the immediate single-card upload triggers and kept the bulk upload execution on the main footer action button.

## Verification & Type Safety
- **Type Check**: Ran `npx tsc --noEmit` and confirmed zero compile errors.
- **Interactions**: Tested navigation, inputs, draft saving toast, and submit triggers. All functions work perfectly.
