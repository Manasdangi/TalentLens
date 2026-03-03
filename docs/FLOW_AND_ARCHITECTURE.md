# TalentLens – Flow & Component Architecture

## HLD – High Level Design (box diagram)

```mermaid
flowchart TB
  subgraph Presentation["Presentation Layer (UI)"]
    direction TB
    subgraph Auth_UI["Auth / Onboarding"]
      Login["CandidateLoginScreen"]
      UserType["UserTypeSelection"]
    end
    subgraph Candidate_UI["Candidate View"]
      CV["CandidateView"]
      Header_C["Header"]
      Input["InputSection"]
      Analysis["AnalysisResults"]
      JobsScreen_C["JobOpportunitiesScreen"]
    end
    subgraph Recruiter_UI["Recruiter View"]
      RV["RecruiterView"]
      Header_R["Header"]
      JobUploader["JobOpportunityUploader"]
      JobsScreen_R["JobOpportunitiesScreen"]
      Ranked["RankedCandidates"]
    end
    subgraph Shared_UI["Shared Components"]
      Sidebar["Sidebar"]
      SavedResumes["SavedResumes"]
      ResumeUploader["ResumeUploader"]
      JobsList["JobOpportunitiesList"]
    end
  end

  subgraph Application["Application Layer"]
    App["App.tsx"]
  end

  subgraph State["State Layer"]
    Store["AppStore"]
    UserSlice["User Slice"]
    ResumeSlice["Resume Slice"]
    Store --- UserSlice
    Store --- ResumeSlice
  end

  subgraph Services["Services Layer"]
    UserSvc["userService"]
    ResumeSvc["resumeService"]
    JobSvc["jobOpportunityService"]
    ResumeByRoleSvc["resumeByRoleService"]
  end

  subgraph Utils["Utils"]
    LLM["llmScorer"]
    PDF["pdfExtractor"]
  end

  subgraph External["External"]
    Firebase["Firebase\n(Auth + Firestore)"]
  end

  Presentation --> Application
  Application --> State
  State --> Services
  State --> External
  Application --> Utils
  Presentation --> State
  Services --> External
  JobSvc --> External
  ResumeByRoleSvc --> External
```

**Layer summary:**

| Layer | Boxes | Responsibility |
|-------|--------|----------------|
| **Presentation** | Auth UI, Candidate View, Recruiter View, Shared Components | Screens & reusable UI; user input & display |
| **Application** | App.tsx | Routing logic (login → user type → candidate vs recruiter); orchestrates views |
| **State** | AppStore (User Slice, Resume Slice) | Single source of truth; auth + resume state; `useAuth` / `useResumes` |
| **Services** | userService, resumeService, jobOpportunityService, resumeByRoleService | API / persistence; Firestore, job CRUD, resume-by-role |
| **Utils** | llmScorer, pdfExtractor | Resume scoring (LLM), PDF text extraction |
| **External** | Firebase | Auth, Firestore |

**Simplified HLD (one box per layer):**

```mermaid
flowchart TB
  subgraph UI["Presentation"]
    A[Auth UI · Candidate View · Recruiter View · Shared Components]
  end

  subgraph APP["Application"]
    B[App.tsx]
  end

  subgraph STORE["State"]
    C[AppStore\nUser Slice · Resume Slice]
  end

  subgraph SVC["Services"]
    D[userService · resumeService\njobOpportunityService · resumeByRoleService]
  end

  subgraph EXT["External / Utils"]
    E[Firebase · llmScorer · pdfExtractor]
  end

  UI --> APP
  APP --> STORE
  STORE --> SVC
  SVC --> EXT
```

---

## 1. Application entry & flow (high level)

```mermaid
flowchart TB
  subgraph Entry[" "]
    main["main.tsx"]
    StoreProvider["StoreProvider (AppStore)"]
    App["App.tsx"]
  end

  main --> StoreProvider
  StoreProvider --> App

  subgraph Auth["Auth flow"]
    A1{user?}
    A2[CandidateLoginScreen]
    A3{userType?}
    A4[UserTypeSelection]
    A5{userType}
  end

  App --> A1
  A1 -->|no| A2
  A2 -->|login| A1
  A1 -->|yes| A3
  A3 -->|no| A4
  A4 -->|select type| A5
  A3 -->|yes| A5

  subgraph Views["Main views"]
    V1[CandidateView]
    V2[RecruiterView]
  end

  A5 -->|candidate| V1
  A5 -->|recruiter| V2
```

---

## 2. Screen flow (what the user sees)

```mermaid
flowchart LR
  subgraph Unauthenticated
    Login[CandidateLoginScreen]
  end

  subgraph FirstLogin
    UserType[UserTypeSelection]
  end

  subgraph Candidate["Candidate path"]
    CV[CandidateView]
    CV_Home[Input + Analyze]
    CV_Jobs[JobOpportunitiesScreen]
  end

  subgraph Recruiter["Recruiter path"]
    RV[RecruiterView]
    RV_Home[Home + Post job]
    RV_List[JobOpportunitiesScreen\nYour listings]
    RV_Modal[Modal: JobOpportunityUploader]
  end

  Login -->|signed in| UserType
  UserType -->|candidate| CV
  UserType -->|recruiter| RV

  CV --> CV_Home
  CV -->|"See latest openings"| CV_Jobs
  CV_Jobs -->|Back| CV

  RV --> RV_Home
  RV -->|"POST NEW JOB"| RV_Modal
  RV -->|"View my listings"| RV_List
  RV_List -->|Back| RV
  RV_Modal -->|job posted| RV
```

---

## 3. Component tree (parent → children)

```
main.tsx
└── StrictMode
    └── StoreProvider (AppStore)
        └── App
            ├── [if !user] CandidateLoginScreen
            │   └── (login UI only)
            │
            ├── [if showUserTypeModal] UserTypeSelection
            │   └── (Candidate | Recruiter picker)
            │
            ├── [if userType === 'recruiter'] RecruiterView
            │   ├── Header
            │   │   └── HamburgerMenu
            │   │       └── Sidebar
            │   │           └── SavedResumes
            │   │               └── SavedResumeCard (per resume)
            │   ├── "POST NEW JOB" button
            │   ├── main
            │   │   ├── [if showJobOpportunitiesScreen] JobOpportunitiesScreen
            │   │   │   └── JobOpportunitiesList
            │   │   │       ├── (job cards with Expand)
            │   │   │       └── RankedCandidates (per expanded job)
            │   │   └── [else] hint + "View my listings"
            │   ├── Footer
            │   └── Modal
            │       └── JobOpportunityUploader
            │           └── RoleFilters
            │
            └── [else candidate] CandidateView
                ├── Header
                │   └── HamburgerMenu
                │       └── Sidebar
                │           └── SavedResumes
                │               └── SavedResumeCard (per resume)
                ├── "See latest openings" bar
                ├── main
                │   ├── [if showJobOpportunitiesScreen] JobOpportunitiesScreen
                │   │   └── JobOpportunitiesList
                │   └── [else]
                │       ├── InputSection
                │       │   ├── RoleFilters
                │       │   ├── ResumeUploader
                │       │   ├── JobDescriptionInput
                │       │   ├── AnalyzeButton
                │       │   └── ErrorMessage (if error)
                │       └── [if result] AnalysisResults
                │           └── ScoreDisplay
                └── Footer
```

---

## 4. Data flow & context usage

### 4.1 Single store (AppStore)

- **Provider:** `StoreProvider` in `main.tsx` wraps the whole app.
- **Keys:** `user` (auth slice), `resume` (resume slice).
- **Hooks:** `useStore()`, `useAuth()`, `useResumes()`.

### 4.2 Who uses AppStore

| Component / module        | useAuth | useResumes |
|---------------------------|--------|------------|
| App                       | ✓ (user, setUserType) | — |
| CandidateLoginScreen      | ✓ (login, isLoading)  | — |
| Header                    | ✓ (user, login, logout) | — |
| HamburgerMenu             | — (gets user/login/logout via props from Header) | — |
| Sidebar                   | — (user via props)    | ✓ (savedResumes) |
| SavedResumes              | ✓ (user)             | ✓ (savedResumes, deleteResume, selectedResume, selectResume, isLoading, error) |
| InputSection              | —                    | ✓ (selectResume) |
| ResumeUploader            | ✓ (user)             | ✓ (savedResumes, saveResume, selectedResume) |
| JobOpportunityUploader    | ✓ (user)             | — |

### 4.3 Props flow (key callbacks & state)

- **App → CandidateView:**  
  `resumeText`, `jobDescription`, `selectedRole`, `selectedExperience`, `result`, `isLoading`, `error`, `onResumeSelect`, `onResumeChange`, `onJobDescriptionChange`, `onRoleChange`, `onExperienceChange`, `onAnalyze`, `scrollToResumeSection`, `showJobOpportunitiesScreen`, `onOpenJobOpportunities`, `onCloseJobOpportunitiesScreen`.

- **App → RecruiterView:**  
  `onResumeSelect`, `currentResumeText`, `scrollToResumeSection`, `onOpenJobOpportunities`, `showJobOpportunitiesScreen`, `onCloseJobOpportunitiesScreen`, `recruiterId`, `recruiterJobsRefreshTrigger`, `showPostJobModal`, `onOpenPostJobModal`, `onClosePostJobModal`, `onJobPosted`.

- **CandidateView → Header:**  
  `onResumeSelect`, `currentResumeText` (= resumeText), `scrollToResumeSection`.

- **Header → HamburgerMenu:**  
  `user`, `userType`, `onLogin`, `onLogout`, `onResumeSelect`, `currentResumeText`, `onScrollToResumeSection`.

- **HamburgerMenu → Sidebar:**  
  same + `isOpen`, `onClose`.

- **Sidebar → SavedResumes:**  
  `onSelectResume` (wired to parent `onResumeSelect`), `currentResumeText`, `onScrollToResumeSection`.

- **CandidateView → InputSection:**  
  resume/job/role/experience state, `onResumeChange`, `onJobDescriptionChange`, `onRoleChange`, `onExperienceChange`, `onAnalyze`, `isLoading`, `error`.

- **InputSection → ResumeUploader:**  
  `onTextExtracted`, `extractedText`, `selectedRole`, `selectedExperience`, `jobDescription`.

- **RecruiterView → JobOpportunitiesScreen:**  
  `onBack`, `recruiterId`, `refreshTrigger`, `onEditJob` (opens modal with job to edit).

- **RecruiterView → Modal → JobOpportunityUploader:**  
  `existingJob` (when editing), `onJobPosted`.

- **JobOpportunitiesList → RankedCandidates:**  
  `job` (when a job card is expanded).

```mermaid
flowchart TB
  subgraph Store["AppStore (context)"]
    user["user slice\n(user, login, logout, setUserType)"]
    resume["resume slice\n(savedResumes, saveResume, deleteResume,\nselectResume, selectedResume, refreshResumes)"]
  end

  subgraph Consumers["Components using store"]
    App
    CandidateLoginScreen
    Header
    Sidebar
    SavedResumes
    InputSection
    ResumeUploader
    JobOpportunityUploader
  end

  user --> App
  user --> CandidateLoginScreen
  user --> Header
  user --> Sidebar
  user --> SavedResumes
  user --> ResumeUploader
  user --> JobOpportunityUploader

  resume --> Sidebar
  resume --> SavedResumes
  resume --> InputSection
  resume --> ResumeUploader
```

---

## 5. Services & who calls them

| Service                   | Used by / purpose |
|---------------------------|-------------------|
| **userService**           | AppStore: `getUserProfile`, `createOrUpdateUserProfile` (auth + set user type). |
| **resumeService**         | AppStore: `getUserResumes`, `saveResume`, `deleteResume` (resume slice). |
| **jobOpportunityService** | JobOpportunitiesList: `getJobOpportunities`, `deleteJobOpportunity`. JobOpportunityUploader: `createJobOpportunity`, `updateJobOpportunity`. |
| **resumeByRoleService**   | RankedCandidates: `getResumesByRole` (fetch candidates by role for a job). |
| **llmScorer** (utils)    | App: `scoreResume` (candidate analyze). RankedCandidates: `scoreResume` (rank candidates for a job). |

```mermaid
flowchart LR
  subgraph Components
    App
    AppStore["AppStore"]
    JOL["JobOpportunitiesList"]
    JOU["JobOpportunityUploader"]
    RC["RankedCandidates"]
  end

  subgraph Services
    userService["userService"]
    resumeService["resumeService"]
    jobService["jobOpportunityService"]
    resumeByRole["resumeByRoleService"]
    llmScorer["llmScorer"]
  end

  AppStore --> userService
  AppStore --> resumeService
  App --> llmScorer
  JOL --> jobService
  JOU --> jobService
  RC --> resumeByRole
  RC --> llmScorer
```

---

## 6. File map (quick reference)

| Area        | Files |
|------------|--------|
| Entry      | `main.tsx` |
| App / flow | `App.tsx` |
| Store      | `context/AppStore.tsx`, `context/slices/UserSlice.ts`, `context/slices/ResumeSlice.ts` |
| Screens    | `screens/CandidateView.tsx`, `screens/RecruiterView.tsx`, `screens/JobOpportunitiesScreen.tsx` |
| Auth / onboarding | `components/CandidateLoginScreen`, `components/UserTypeSelection` |
| Layout     | `components/Header`, `components/HamburgerMenu`, `components/Sidebar`, `components/Footer` |
| Resume     | `components/InputSection`, `components/ResumeUploader`, `components/SavedResumes`, `components/SavedResumeCard` |
| Analysis   | `components/AnalysisResults`, `components/ScoreDisplay` |
| Jobs       | `components/JobOpportunitiesList`, `components/JobOpportunityUploader`, `components/RankedCandidates` |
| Shared UI  | `components/RoleFilters`, `components/JobDescriptionInput`, `components/AnalyzeButton`, `components/ErrorMessage`, `components/ui/Modal` |
| Services   | `services/userService`, `services/resumeService`, `services/jobOpportunityService`, `services/resumeByRoleService` |
| Utils      | `utils/llmScorer`, `utils/pdfExtractor`, `utils/getErrorMessage`, etc. |

---

## 7. End-to-end user flows (summary)

1. **Anonymous → Candidate**
   - Open app → CandidateLoginScreen → Sign in with Google → UserTypeSelection (pick Candidate) → CandidateView → upload/paste resume, set role/experience, analyze → see AnalysisResults (ScoreDisplay).

2. **Candidate: see jobs**
   - CandidateView → “See latest openings” → JobOpportunitiesScreen (JobOpportunitiesList, all jobs) → Back → CandidateView.

3. **Anonymous → Recruiter**
   - Open app → CandidateLoginScreen → Sign in → UserTypeSelection (pick Recruiter) → RecruiterView → “POST NEW JOB” → Modal with JobOpportunityUploader → submit → list refreshes.

4. **Recruiter: manage jobs**
   - RecruiterView → “View my listings” → JobOpportunitiesScreen with `recruiterId` → list of recruiter’s jobs; Edit opens Modal (JobOpportunityUploader with `existingJob`); Delete calls jobOpportunityService.

5. **Recruiter: rank candidates**
   - In JobOpportunitiesList, expand a job → RankedCandidates loads resumes by role (resumeByRoleService), runs scoreResume (llmScorer), shows ranked list.

6. **Resume from sidebar (both roles)**
   - Header → HamburgerMenu → Sidebar → SavedResumes → pick a SavedResumeCard → `onResumeSelect` → parent (App) updates resume text/role/experience/jobDescription and optionally scrolls to resume section (CandidateView) or stays on RecruiterView with selected resume text.

This document reflects the refactored single-store (AppStore) and the removal of AuthContext/ResumeContext as separate files.
