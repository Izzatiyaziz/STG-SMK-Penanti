================================================================================
                    EXAMINER'S MANUAL & GUIDELINE
               Automated Student Grading System - Demonstration Guide
================================================================================

Dear Examiner,

This document provides step-by-step instructions on how to:
1. Access and view the demonstration video
2. Run and explore the system/application
3. Test key features

================================================================================
SECTION 1: VIEWING THE DEMONSTRATION VIDEO
================================================================================

OPTION A: ONLINE VIDEO PLAYBACK
--------------------------------
1. Navigate to the project documentation folder
2. Look for video files in the media or documentation folder
3. Open video in your preferred media player or browser
4. Video covers:
   - System overview and architecture
   - Login process for different user roles
   - Key feature demonstrations
   - Navigation and functionality walkthrough

OPTION B: VIDEO LOCATION
------------------------
Videos are typically stored in:
  - docs/ folder
  - Or check the PRODUCT.md file for video links
  - Cloud storage link (if provided)

Video Duration: Approximately 10-15 minutes
Recommended: Watch the full video before running the system

================================================================================
SECTION 2: PREREQUISITES FOR RUNNING THE SYSTEM
================================================================================

SYSTEM REQUIREMENTS
-------------------
✓ Windows 10+ OR macOS OR Linux
✓ Modern web browser (Chrome, Firefox, Safari, Edge)
✓ Stable internet connection (for Supabase cloud services)
✓ 2GB RAM minimum
✓ 500MB free disk space

SOFTWARE REQUIREMENTS
---------------------
✓ Node.js v18.0 or higher
  Download from: https://nodejs.org/

✓ Python 3.8+ (required for OMR feature testing)
  Download from: https://www.python.org/

✓ npm (comes with Node.js)

✓ Code editor (optional, for file inspection):
  - Visual Studio Code recommended
  - Download from: https://code.visualstudio.com/

================================================================================
SECTION 3: STEP-BY-STEP SETUP & EXECUTION
================================================================================

STEP 1: DOWNLOAD/ACCESS PROJECT FILES
--------------------------------------
a) Extract the project folder to your preferred location
   Example: C:\stg-penanti or ~/projects/stg-penanti

b) Open terminal/command prompt
   - Windows: Press Windows Key + R, type 'cmd', press Enter
   - macOS: Press Cmd + Space, type 'terminal', press Enter
   - Linux: Open your preferred terminal

c) Navigate to project folder:
   cd C:\stg-penanti    (Windows)
   cd ~/stg-penanti     (macOS/Linux)

STEP 2: INSTALL DEPENDENCIES
-----------------------------
a) Install Node.js packages:
   npm install

   This may take 2-5 minutes. Wait for completion.

b) Install Python OMR service (optional, for OMR testing):
   cd omr-service
   pip install -r requirements.txt
   cd ..

   If pip fails on Windows, try: python -m pip install -r requirements.txt

STEP 3: CONFIGURE ENVIRONMENT
------------------------------
a) Contact the project administrator for .env.local file
   OR create a new .env.local file with these variables:

   NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<your-service-key>

b) Place the .env.local file in the root project directory
   (Same level as package.json)

STEP 4: START THE APPLICATION
------------------------------
a) In the root project directory, run:
   npm run dev

b) You should see output similar to:
   ▲ Next.js 14.x.x
   - Local: http://localhost:3000

c) Open your web browser and go to:
   http://localhost:3000

d) You should see the login page

STEP 5: ACCESS WITH TEST ACCOUNTS
----------------------------------
Use the following test accounts to explore different roles:

ADMIN ACCOUNT
  Admin id: admin1
  Password: 246810
  Features: System management, user control, usage monitoring

PRINCIPAL ACCOUNT
  Staff id: staff4
  Password: Staffempat4_
  Features: Class assignments, dashboard, approvals

COORDINATOR ACCOUNT
  Staff id: staff7, PNT-D031E0
  Password: 123456, Gurusejarah1_
  Features: Answer schemes, approvals, reporting

SUBJECT TEACHER ACCOUNT
  Email: PNT-AF6D79
  Password: 123456
  Features: Class management, OMR evaluation, analytics

CLASS TEACHER ACCOUNT
  Email: staff8
  Password: 123456
  Features: Manage student class, AI-Assisted Comment, Report Card

STUDENT ACCOUNT
  Ic Number: 130212-03-2102
  Features: Dashboard, results, report card

================================================================================
SECTION 4: TESTING KEY FEATURES
================================================================================

FEATURE 1: AUTHENTICATION & ROLE-BASED ACCESS
----------------------------------------------
Test Steps:
1. Log in with Admin account
2. Verify you see Admin dashboard
3. Log out and log in with Teacher account
4. Verify different interface and features
5. Repeat with other roles

Expected Result: Each role should have different features and navigation

FEATURE 2: STUDENT MANAGEMENT
-----------------------------
Test Steps (As Admin):
1. Go to Admin Dashboard
2. Navigate to Users/Student Management section
3. View list of students
4. Click on a student to view profile
5. Verify student information is displayed

FEATURE 3: CLASS & SUBJECT MANAGEMENT
--------------------------------------
Test Steps (As Teacher):
1. Log in as Teacher
2. Go to "My Class" section
3. View assigned classes and subjects
4. Navigate through students in class
5. Verify data is correctly displayed

FEATURE 4: ASSIGNMENT MANAGEMENT
---------------------------------
Test Steps (Coordinator Teacher):
1. Log in as Teacher
2. Go to "Assignments" section
3. Create a new assignment (if permission available)
4. Assign to students/classes
5. Verify assignment appears in student view

FEATURE 5: OMR (OPTICAL MARK RECOGNITION)
------------------------------------------
Test Steps (As Subject Teacher):
1. Log in as Teacher
2. Navigate to "OMR" section
3. Upload a test template
4. Upload student answer sheet image
5. System should process and show results

FEATURE 6: REPORTING & ANALYTICS
---------------------------------
Test Steps (As Teacher/Coordinator):
1. Go to Reports section
2. Select date range and class
3. View student performance analytics
4. Check charts and statistics
5. Export report (if available)

FEATURE 7: ANSWER SCHEMES
--------------------------
Test Steps (As Coordinator):
1. Log in as Coordinator
2. Go to "Answer Schemes" section
3. View existing answer schemes
4. Review marking criteria
5. Check approval status

================================================================================
SECTION 5: TROUBLESHOOTING GUIDE
================================================================================

PROBLEM: "Port 3000 already in use"
SOLUTION:
a) Kill the process using port 3000:
   - Windows: netstat -ano | findstr :3000, then taskkill /PID <pid>
   - macOS/Linux: lsof -i :3000, then kill -9 <pid>
b) Or run on different port:
   npm run dev -- -p 3001

PROBLEM: Dependencies installation fails
SOLUTION:
a) Clear npm cache:
   npm cache clean --force
b) Delete node_modules and package-lock.json:
   rm -r node_modules package-lock.json
   npm install
c) Try with yarn instead:
   npm install -g yarn
   yarn install

PROBLEM: ".env.local file not found" errors
SOLUTION:
a) Ensure .env.local is in root directory
b) Restart the dev server after creating file
c) Check file is in correct location (same as package.json)

PROBLEM: Cannot login with test accounts
SOLUTION:
a) Verify internet connection (Supabase is cloud-based)
b) Check .env.local has correct Supabase credentials
c) Wait 30 seconds and refresh page
d) Check browser console for error messages (F12 key)

PROBLEM: OMR feature not working
SOLUTION:
a) Ensure Python 3.8+ is installed
b) Install OMR service dependencies:
   cd omr-service
   pip install -r requirements.txt
c) Restart the application

PROBLEM: Page loads but styles look broken
SOLUTION:
a) Clear browser cache (Ctrl+Shift+Delete)
b) Restart dev server (npm run dev)
c) Try in different browser
d) Check Tailwind CSS build: npm run build

PROBLEM: Cannot view student results
SOLUTION:
a) Ensure you're logged in as Teacher or Student
b) Check student has assigned exams/assignments
c) Verify answer has been submitted
d) Check data exists in database

================================================================================
SECTION 6: NAVIGATION OVERVIEW
================================================================================

LOGIN PAGE (/)
  └─> Admin Dashboard (/admin)
  └─> Principal Dashboard (/principal)
  └─> Coordinator Dashboard (/coordinator)
  └─> Teacher Dashboard (/teacher)
  └─> Student Dashboard (/student)

ADMIN FEATURES:
  - System Usage Dashboard
  - User Management
  - System Settings
  - User Reports

PRINCIPAL FEATURES:
  - Class Teacher Assignments
  - School Dashboard
  - Reports Overview

COORDINATOR FEATURES:
  - Answer Scheme Management
  - Approvals & Verification
  - Assignment Tracking
  - Comprehensive Reports

TEACHER FEATURES:
  - Class Dashboard
  - My Classes & Subjects
  - OMR Evaluation
  - Assignment Management
  - Student Analytics
  - Report Generation

STUDENT FEATURES:
  - Personal Dashboard
  - View Results
  - Report Card
  - Profile Management

================================================================================
SECTION 7: RECOMMENDED TESTING FLOW
================================================================================

DURATION: 30-45 minutes

1. OVERVIEW (10 minutes)
   - View demonstration video 
   - Read this guide

2. SETUP (5 minutes)
   - Install dependencies
   - Configure environment
   - Start application

3. BASIC TESTING (10 minutes)
   - Test login with different roles
   - Navigate each dashboard
   - Verify role-based access control

4. FEATURE TESTING (15 minutes)
   - Test student management (Admin)
   - Test class management (Teacher)
   - Test OMR feature (Teacher)
   - Test reporting (Coordinator)

5. ADVANCED TESTING (5 minutes)
   - Create new records (if permitted)
   - Export reports
   - Test data consistency across roles

================================================================================
SECTION 8: IMPORTANT NOTES FOR EXAMINERS
================================================================================

INTERNET CONNECTION REQUIRED
- This application uses Supabase (cloud database)
- A stable internet connection is essential for all features
- All data is stored in the cloud, not locally

DATA SECURITY
- Do not share test account credentials
- Logout after testing
- Do not modify production data if in production environment

BROWSER COMPATIBILITY
- Tested on: Chrome, Firefox, Safari, Edge
- Recommended: Use latest version of any modern browser
- Clear browser cache if experiencing issues

RESPONSIVE DESIGN
- Application works on Desktop, Tablet, and Mobile
- Try resizing browser window to test responsiveness

PERFORMANCE
- Initial load: 2-5 seconds
- Dashboard refresh: 1-2 seconds
- Large data queries: Up to 5-10 seconds

================================================================================
SECTION 9: QUICK REFERENCE COMMANDS
================================================================================

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting check
npm run lint

# Format code
npm run format

# Run tests (if configured)
npm run test

# Stop server
Press Ctrl+C in terminal

================================================================================
SECTION 10: CONTACT & SUPPORT
================================================================================

For Technical Issues:
- Check DEVELOPMENT.md for detailed technical setup
- Review error messages in browser console (F12)
- Check Terminal/Command Prompt output for server errors

For System Features:
- See PRODUCT.md for comprehensive system documentation
- Check specific feature folders in app/ directory

For Database Issues:
- Verify Supabase connection in .env.local
- Check internet connectivity
- Contact Supabase support if service is down

Default Support Contacts:
- Technical Support: [contact details]
- System Administrator: [contact details]
- Project Manager: [contact details]

================================================================================
SECTION 11: CHECKLIST FOR EXAMINER
================================================================================

Before Examination:
[ ] Download and extract project files
[ ] Install Node.js and Python
[ ] Run npm install successfully
[ ] Configure .env.local file
[ ] Start application with npm run dev
[ ] Access login page at http://localhost:3000
[ ] Successfully log in with at least one test account
[ ] View at least 2 different role dashboards
[ ] Test basic navigation and features
[ ] Verify all features work as expected

During Examination:
[ ] Document any issues or bugs found
[ ] Test all major features systematically
[ ] Verify role-based access control works
[ ] Test data consistency across roles
[ ] Check responsiveness on different screen sizes
[ ] Verify logout functionality

After Examination:
[ ] Document findings and recommendations
[ ] Note any improvements needed
[ ] Test edge cases if time permits
[ ] Provide feedback to development team

================================================================================
Revision Date: 2026-06-06
Document Version: 1.0
System Version: 1.0
Status: Ready for Examination

================================================================================
                            END OF EXAMINER MANUAL
================================================================================

Thank you for examining this system. Your feedback is valuable for improvement.

For any clarifications or additional information needed, please refer to:
- README.txt (General Project Overview)
- DEVELOPMENT.md (Development Setup)
- PRODUCT.md (System Features & Requirements)

Good luck with your examination!

================================================================================
