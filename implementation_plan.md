# Sakhi 🌸 — PCOS AI Companion App
### Final Implementation Plan (All Requirements Confirmed)

---

## ✅ Confirmed Requirements

| Requirement | Decision |
|---|---|
| **AI Model** | Llama-3.1-8B-Instruct via NVIDIA API Catalog (Cloud) |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth — Email & Password (with static reset webpage on Vercel) |
| **Storage** | Supabase Storage (lab reports, profile pics) |
| **Push Notifications** | Yes — via Expo Push Notifications |
| **Languages** | English, Hindi, Telugu (expandable) |
| **Offline Sync** | Yes — Local Async Storage Queueing for low connectivity |
| **Doctor Sharing** | Not included |
| **Pricing** | Fully free |

---

## Core Features

| # | Feature | Description |
|---|---|---|
| 1 | **🤖 AI Chatbot (Sakhi Bot)** | Llama-3.1 powered PCOS companion in user's native language |
| 2 | **📋 Symptom Tracker** | Daily logging of symptoms, cycle, mood, weight, energy |
| 3 | **📶 Offline Reliability** | Fully offline symptom logging with background sync queueing |
| 4 | **🍛 Personalized Meal Planning** | PCOS-friendly plans using regionally available ingredients with interactive swaps |
| 5 | **🧪 Lab Report Analysis** | Upload blood reports → AI extracts markers & flags missing PCOS vitals |

---

## Tech Stack (Final)

| Layer | Technology | Purpose |
|---|---|---|
| **Mobile** | React Native + Expo (SDK 54) | Cross-platform, APK export via EAS Build |
| **Navigation** | Expo Router v3 | File-based routing |
| **State** | React Local State / Context | Screen-level and global state management |
| **UI** | Custom components + React Native Reanimated | Premium animations |
| **i18n** | react-i18next | English / Hindi / Telugu translations |
| **Backend** | FastAPI (Python 3.11) | AI agent orchestration, API |
| **AI Model** | Llama-3.1-8B-Instruct (NVIDIA API Catalog) | Core LLM for all agents |
| **RAG** | pgvector (Supabase RPC) + SentenceTransformers | Semantic knowledge base retrieval |
| **Embeddings** | all-mpnet-base-v2 (local) | Local embeddings, no API cost |
| **OCR (Lab Reports)** | Tesseract / pypdf | Extract text from uploaded PDF/images |
| **Database** | Supabase (PostgreSQL) | All user & health data |
| **Auth** | Supabase Auth (Email/Password) | In-app login and static Vercel reset flow via PKCE |
| **Storage** | Supabase Storage | Lab report uploads, profile photos |
| **Push Notifications** | Expo Push Notifications + Supabase Edge Functions | Reminders, alerts |
| **Landing Website** | Vercel (HTML + CSS + JS) | Hosts APK download and `reset-password.html` |

---

## Project Structure

```
Demo project/
│
├── mobile/                            ← React Native (Expo) App
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── welcome.tsx            ← Splash / language select
│   │   │   ├── email.tsx              ← Email/Password sign in, sign up, forgot password
│   │   │   └── onboarding.tsx         ← PCOS profile setup
│   │   ├── (tabs)/
│   │   │   ├── home.tsx               ← Dashboard
│   │   │   ├── tracker.tsx            ← Symptom + cycle tracker
│   │   │   ├── nutrition.tsx          ← Meal plan hub
│   │   │   └── profile.tsx            ← Profile + settings
│   │   ├── chat.tsx                   ← Sakhi AI Chat
│   │   ├── lab-report.tsx             ← Upload + analyze lab report
│   │   └── _layout.tsx
│   ├── components/
│   │   ├── ui/                        ← Buttons, Cards, Inputs, Badges
│   │   ├── tracker/                   ← Symptom cards, cycle calendar
│   │   ├── nutrition/                 ← Meal cards, ingredient chips
│   │   └── chat/                      ← Message bubbles, typing indicator
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useTracker.ts
│   │   ├── useMealPlan.ts
│   ├── services/
│   │   ├── api.ts                     ← FastAPI client (axios)
│   │   ├── supabase.ts                ← Supabase client
│   │   └── notifications.ts           ← Expo push notification setup
│   ├── store/
│   │   ├── authStore.ts
│   │   └── appStore.ts
│   ├── i18n/
│   │   ├── en.json                    ← English strings
│   │   ├── hi.json                    ← Hindi strings
│   │   └── te.json                    ← Telugu strings
│   └── constants/
│       ├── colors.ts                  ← Design tokens
│       └── theme.ts
│
├── backend/                           ← FastAPI Python Backend
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py                  ← Env vars, Supabase URL/key
│   │   ├── agents/
│   │   │   ├── orchestrator.py        ← Routes user query to correct agent
│   │   │   ├── companion.py           ← Sakhi Bot (general PCOS Q&A)
│   │   │   ├── symptom_analyst.py     ← Symptom pattern analysis
│   │   │   ├── meal_planner.py        ← Regional meal plan generator
│   │   │   ├── lab_analyzer.py        ← Lab report interpreter
│   │   ├── routers/
│   │   │   ├── chat.py                ← POST /chat
│   │   │   ├── tracker.py             ← CRUD /symptoms, /cycles
│   │   │   ├── nutrition.py           ← GET/POST /meal-plan
│   │   │   ├── lab_reports.py         ← POST /lab-report/analyze
│   │   │   └── notifications.py       ← POST /notify
│   │   ├── services/
│   │   │   ├── ollama_client.py       ← BioMistral via Ollama
│   │   │   ├── rag_service.py         ← pgvector (Supabase) RAG retrieval
│   │   │   ├── ocr_service.py         ← Lab report OCR
│   │   │   ├── translation.py         ← Hindi/Telugu prompt adapters
│   │   │   └── supabase_client.py     ← Supabase Python client
│   │   ├── models/                    ← Pydantic schemas
│   │   └── knowledge_base/
│   │       ├── pcos_guidelines.pdf    ← Medical PCOS docs for RAG
│   │       ├── indian_foods_db.json   ← Regional ingredient database
│   │       └── hormones_reference.json
│   ├── requirements.txt
│   └── .env.example
│
├── website/                           ← Static Landing Page (Hosted on Vercel)
│   ├── index.html                     ← APK Download page
│   ├── reset-password.html            ← Secure PKCE Password Reset page
│   ├── styles.css                     ← Vanilla CSS
│   └── assets/                        
│       └── sakhi.apk                  ← Auto-deployed Android Build
│
├── build_and_deploy.ps1               ← Automation script for EAS Build & Version Bumping
└── implementation_plan.md
```

---

## Supabase Schema

### Tables

```sql
-- Users (extends Supabase Auth)
profiles
  id (uuid, FK auth.users)
  phone_number
  display_name
  age
  language (en | hi | te)
  pcos_diagnosed (bool)
  diagnosis_year
  goals (text[])
  avatar_url
  expo_push_token
  created_at

-- Symptom & Cycle Tracking
symptom_logs
  id, user_id, date
  energy_level (1-5), mood (1-5), pain_level (1-5)
  acne (bool), hair_loss (bool), bloating (bool)
  notes, created_at

cycle_logs
  id, user_id
  period_start, period_end
  flow_intensity (light|medium|heavy)
  notes

weight_logs
  id, user_id, date, weight_kg

-- Nutrition
meal_plans
  id, user_id, week_start_date
  language, region (south_indian | north_indian | other)
  plan_data (jsonb)   ← full 7-day plan with ingredients
  generated_by_ai (bool)

-- Lab Reports
lab_reports
  id, user_id
  file_url (Supabase Storage)
  report_date
  ai_analysis (text)       ← BioMistral explanation
  extracted_values (jsonb) ← LH, FSH, AMH, Testosterone, etc.
  language
  created_at

-- Chat History
chat_messages
  id, user_id
  role (user | assistant)
  content, language
  agent_used (companion | symptom | nutrition | lab)
  created_at

-- Notifications
notification_logs
  id, user_id
  type (period_reminder | medication | community_reply | weekly_summary)
  title, body
  sent_at, read_at
```

---

## AI Agents — Final Design

### 🧠 Agent 1: Orchestrator
- Receives raw user message + user language + user profile context
- Uses BioMistral to classify intent → routes to correct agent
- Handles fallback for out-of-scope queries

### 💬 Agent 2: Sakhi Companion Bot
- Multilingual PCOS Q&A (English / Hindi / Telugu)
- Responds in user's chosen language
- RAG over PCOS medical guidelines + PubMed papers
- Warm, empathetic tone — "knowledgeable best friend"
- System prompt adapts to user's diagnosis stage and goals

### 📊 Agent 3: Symptom Analyst
- Reads last 30 days of symptom logs from Supabase
- Identifies patterns (e.g., pain peaks, mood cycles)
- Generates weekly summaries and alerts
- Triggers push notification if unusual pattern detected

### 🍛 Agent 4: Regional Meal Planner
- Generates 7-day PCOS-friendly meal plans
- **Region-aware**: Telugu users → South Indian staples (ragi, millets, curry leaves)
- **Region-aware**: Hindi users → North Indian staples (jowar, methi, lauki)
- Anti-inflammatory, low-GI, insulin-sensitizing foods
- Grocery list generation
- All output in user's language

### 🧪 Agent 5: Lab Report Analyzer
- OCR extracts values from uploaded PDF/image
- BioMistral explains each hormone in plain language
- Highlights abnormal values with severity (mild/moderate/high)
- Contextualizes within PCOS (e.g., elevated LH:FSH ratio meaning)
- All in user's language

---

## Multilingual Architecture

```
User selects language (en/hi/te) at onboarding
         ↓
Stored in profiles.language in Supabase
         ↓
Mobile: react-i18next loads correct strings (UI labels, buttons, etc.)
         ↓
API calls include language param
         ↓
Backend: System prompt to BioMistral includes language instruction
  → "Respond in Telugu. Use simple, warm, everyday language."
         ↓
AI response returned in user's chosen language
```

### Translation Files (i18n)
All 5 feature screens fully translated:
- Navigation labels, buttons, form placeholders
- Symptom names (e.g., "bloating" → "पेट फूलना" / "ఉబ్బరం")
- Meal names and ingredient names in regional languages

---

## Push Notifications Plan

| Notification | Trigger | Timing |
|---|---|---|
| **Period Reminder** | Predicted based on last 3 cycles | 2 days before predicted start |
| **Symptom Log Reminder** | If no log for the day | 8:00 PM daily |
| **Weekly Health Summary** | Every Sunday | 10:00 AM |
| **Meal Plan Ready** | New weekly plan generated | Monday 7:00 AM |
| **Lab Report Done** | AI analysis complete | On completion |

---

## APK Distribution Flow

```
1. Developer runs: eas build --platform android
2. EAS Build produces .apk or .aab file
3. APK placed in website/assets/sakhi.apk
4. Landing website has "Download Sakhi" button → downloads APK
5. User enables "Install from Unknown Sources" on Android
6. Installs APK → App connects to hosted FastAPI backend
```

---

## Build Phases

### ✅ Phase 1 — Foundation & Auth (Start Now)
- [x] Supabase project setup (DB tables, Storage buckets, Auth config)
- [x] FastAPI project scaffold + Supabase integration
- [x] Ollama + BioMistral setup script
- [x] React Native + Expo scaffold
- [x] Auth screens: Welcome → Language Select → Phone → OTP → Onboarding
- [x] Landing website (APK download page)

### ✅ Phase 2 — Sakhi Chatbot
- [x] Ollama client service in FastAPI (using NVIDIA OpenAI-compatible client)
- [ ] pgvector (Supabase) RAG with PCOS knowledge base
- [x] Companion agent + Orchestrator
- [x] Multilingual prompt system
- [x] Chat screen in mobile app (real-time streaming responses)

### ✅ Phase 3 — Symptom Tracker + Meal Planner
- [x] Supabase tables: symptom_logs, cycle_logs, weight_logs
- [x] Symptom Tracker screen (daily log form + calendar view)
- [x] Symptom Analyst agent + weekly summary
- [x] Regional meal planner agent (using fast 8B model)
- [x] Nutrition screen with weekly meal plan + grocery list (includes PDF download)

### ✅ Phase 4 — Lab Reports
- [x] Supabase Storage: lab-reports bucket (public config verified)
- [x] OCR service (Tesseract) + Lab Analyzer agent
- [x] Lab report upload + analysis screen (uses native fetch API)

### ✅ Phase 5 — Notifications + Polish + APK
- [ ] Expo push token registration
- [ ] Supabase Edge Function for scheduled notifications
- [ ] i18n translations (Hindi + Telugu complete)
- [ ] Dark mode + animations polish
- [ ] EAS Build → APK
- [ ] Website live with APK download

---

## Verification Plan

### Automated Tests
```bash
# Backend
pytest backend/tests/ -v

# Mobile
npx jest mobile/
```

### Manual Testing Checklist
- [x] OTP login works on real Android device
- [x] Chat responds in Telugu/Hindi correctly
- [x] Meal plan uses South Indian ingredients for Telugu user
- [x] Lab report PDF uploads and analyzes correctly
- [ ] Push notification received on device
- [ ] APK installs and runs from website download link
