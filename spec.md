# Rezumate - Product Specification

> Version: 1.0  
> Platform: iOS + Android  
> Tech Stack: React Native + FastAPI  
> Product Stage: Indie MVP  
> Goal: Launch fast, validate demand, iterate sustainably

---

# 1. Vision

Rezumate is a mobile-first AI-assisted resume optimization app designed to help job seekers improve their resumes for specific roles quickly and effectively.

The app focuses on one core problem:

> Most people send generic resumes that fail ATS filters and undersell their actual skills.

Rezumate helps users:
- understand resume weaknesses
- tailor resumes for job descriptions
- improve bullet points
- optimize ATS compatibility
- export better resumes faster

The product is intentionally narrow and focused.

It is NOT:
- a full career platform
- a social network
- an AI chatbot product
- a complex resume builder
- a recruiter SaaS

The initial goal is:
> Build a highly polished and genuinely useful workflow around resume optimization.

---

# 2. Product Direction

The app should feel:
- modern
- calm
- fast
- intelligent
- focused

Avoid:
- corporate HR aesthetics
- enterprise dashboards
- overwhelming feature sets
- excessive AI gimmicks

The experience should feel closer to:
- Linear
- Arc
- Raycast
- Perplexity
- modern mobile productivity apps

rather than traditional resume builders.

---

# 3. Core Problem

Most applicants:
- use one resume everywhere
- don’t know ATS expectations
- write weak bullet points
- lack measurable impact statements
- cannot tailor resumes quickly
- get rejected without feedback

Current resume apps are usually:
- template-heavy
- bloated
- outdated
- visually cluttered
- desktop-first

Rezumate focuses specifically on:
- optimization
- tailoring
- clarity
- speed
- actionable feedback

---

# 4. Target Audience

## Primary Audience

### Students & Fresh Graduates
Need:
- ATS-safe resumes
- guidance
- stronger wording

---

### Software Engineers & Tech Professionals
Need:
- tailored resumes
- role-specific optimization
- faster iteration

---

### Active Job Seekers
Need:
- better interview conversion
- quick resume adjustments
- AI-assisted improvements

---

# 5. Core Product Philosophy

# AI-Assisted, Not AI-Replacing

AI should:
- improve
- optimize
- guide

NOT:
- fabricate careers
- generate fake experience
- over-automate everything

---

# Mobile-First Experience

The app should avoid:
- giant forms
- complicated builders
- desktop-like workflows

Instead focus on:
- quick actions
- smart suggestions
- card-based editing
- lightweight interactions

---

# Fast Value Delivery

The user should get meaningful feedback within:
- 30-60 seconds

after uploading a resume.

---

# Sustainable Architecture

The product should be:
- inexpensive to operate
- realistic for an indie developer
- optimized for low AI costs

---

# 6. MVP Scope

The MVP intentionally focuses on one narrow workflow:

txt id="ckjmws" Upload Resume       ↓ Paste Job Description       ↓ Get ATS Analysis       ↓ Improve Resume       ↓ Export Better Resume 

Everything else is secondary.

---

# 7. MVP Features

# 7.1 Resume Import

Supported Formats:
- PDF
- DOCX
- TXT

The app extracts:
- skills
- experience
- projects
- education
- keywords

---

# 7.2 ATS Resume Analysis

Core feature of the app.

The analysis includes:
- ATS score
- keyword match %
- missing skills
- weak bullet detection
- readability feedback
- formatting warnings
- measurable impact detection

Examples:
- “This bullet lacks measurable results.”
- “Missing Kubernetes keyword from JD.”
- “Project descriptions are too generic.”
- “Resume summary is weak for backend roles.”

---

# 7.3 Job Description Tailoring

User pastes:
- LinkedIn job descriptions
- company job posts
- raw JD text

The app:
- compares resume against JD
- identifies missing keywords
- suggests improvements
- recommends better alignment

This is the primary retention feature.

---

# 7.4 AI Bullet Rewriter

Examples:

Before:
> “Worked on backend APIs.”

After:
> “Built scalable REST APIs using Go and PostgreSQL serving 50k+ daily requests.”

Capabilities:
- stronger action verbs
- concise rewrites
- measurable impact
- role-specific wording
- seniority adjustments

---

# 7.5 Resume Variants

Users can create multiple tailored resumes.

Examples:
- Backend Resume
- AI Resume
- Flutter Resume
- Startup Resume

Free tier limits apply.

---

# 7.6 Export

Supported:
- PDF export

Goals:
- ATS-safe formatting
- clean typography
- minimal layout issues

Avoid:
- over-designed templates
- graphics-heavy resumes

---

# 8. Features Explicitly NOT Included In MVP

To maintain focus and reduce costs, the following are intentionally excluded initially:

- AI career chat
- interview preparation
- cover letters
- recruiter platform
- job board integrations
- LinkedIn integrations
- cloud collaboration
- social/community features
- complex resume builders
- multi-agent AI systems
- autonomous AI workflows

These can be explored only after validation.

---

# 9. Monetization

# Free Plan

The free tier must feel genuinely useful.

Included:
- resume upload
- ATS analysis
- keyword matching
- basic feedback
- limited AI rewrites/day
- PDF export
- limited resume variants

Suggested limits:
- 3 analyses/day
- 3 improvements/day
- 2 saved resumes

---

# Rezumate Pro

Unlocks:
- unlimited analyses
- unlimited improvements
- unlimited resume variants
- deeper ATS insights
- full keyword insights
- lifetime App Store restore

---

# Suggested Pricing

## Early launch one-time price
- Fixed worldwide: $7.99

## Regular one-time price
- Fixed worldwide: $14.99

---

# Pricing Philosophy

Avoid:
- aggressive AI pricing
- token systems
- confusing credits
- subscriptions while AI runs on-device

The app should feel:
- fair
- sustainable
- premium
- trustworthy

---

# 10. AI Cost Strategy

AI costs must remain predictable.

The app should NOT:
- constantly stream AI
- run huge prompts
- use expensive models everywhere

---

# Recommended Approach

## Non-AI Logic
Use deterministic systems for:
- ATS scoring
- keyword matching
- formatting checks
- measurable impact detection
- readability checks

This keeps costs low.

---

# AI Usage
Only use AI for:
- bullet rewriting
- tailored suggestions
- summaries

---

# Model Strategy

## Free Users
Use:
- local ATS scoring
- local keyword extraction
- limited local rewrite/improvement runs

---

## Pro Users
Use:
- unlimited local analysis and improvement runs
- full local diagnosis and keyword insight surfaces

---

# Important Cost Rule

Keep all expensive processing local and predictable.

Never regenerate analysis unnecessarily.

---

# 11. Design Direction

# Overall Feel

The UI should feel:
- premium
- modern
- calm
- focused

Avoid:
- generic SaaS styling
- enterprise HR dashboards
- cluttered interfaces

---

# Visual Style

## Theme
Dark-first UI.

---

## Colors
Suggested:
- charcoal backgrounds
- subtle gradients
- soft accent glows

Accent possibilities:
- electric blue
- violet
- cyan
- amber

---

## Typography
Suggested:
- Inter
- Geist
- SF Pro (iOS)

Large spacing.
Readable hierarchy.
Minimal clutter.

---

# UI Characteristics

Use:
- cards
- bottom sheets
- smooth animations
- swipe gestures
- progressive disclosure

Avoid:
- giant forms
- dense tables
- multi-column desktop layouts

---

# 12. Navigation Structure

## Main Tabs

### Home
Quick overview + recent resumes

---

### Analyze
Upload + optimize resumes

---

### Resumes
Manage variants

---

### Profile
Settings + one-time Pro purchase

---

# 13. Technical Architecture

# Frontend

## Framework
React Native

Reason:
- single codebase
- fast iteration
- strong ecosystem
- realistic indie maintenance

---

## Recommended Stack

### Expo
For:
- OTA updates
- build simplicity
- deployment

---

### Navigation
React Navigation

---

### State Management
Zustand

---

### Server State
TanStack Query

---

### Styling
NativeWind + Tailwind

---

### Animations
Reanimated

---

# Backend

## Framework
FastAPI

Good for:
- async APIs
- AI orchestration
- resume processing

---

## Database
PostgreSQL

---

## Storage
Cloudflare R2 or Supabase Storage

---

## Authentication
Supabase Auth

Keep auth simple.

---

# Resume Processing

Suggested:
- PyMuPDF
- python-docx

---

# 14. Suggested Development Roadmap

# Phase 1 - Foundation

Build:
- auth
- upload flow
- resume parsing
- ATS analysis
- JD comparison
- AI rewrites
- export

Goal:
Ship MVP quickly.

---

# Phase 2 - Polish

Improve:
- animations
- onboarding
- resume editing
- analysis quality
- export quality

---

# Phase 3 - Validation

Focus on:
- retention
- analytics
- conversion
- user feedback
- onboarding optimization

NOT feature expansion.

---

# 15. Success Metrics

The MVP should optimize for:

## User Retention
Do users come back?

---

## Resume Rewrites
Are users actually improving resumes?

---

## Conversion Rate
Do users upgrade to Pro?

---

## Interview Impact
Do users feel the app helps them apply better?

---

# 16. Distribution Strategy

The product will require active distribution.

Potential channels:
- LinkedIn posts
- Threads
- Twitter/X
- short-form UI videos
- Reddit
- developer communities
- job-seeker communities

Content can become a major growth lever.

---

# 17. Important Product Constraints

# Do NOT Overbuild

The MVP should remain intentionally small.

---

# Do NOT Chase AI Hype

The value is:
- usefulness
- clarity
- workflow improvement

NOT:
- “AI magic.”

---

# Do NOT Delay Launch Excessively

Shipping early is more valuable than:
- perfect architecture
- perfect branding
- endless features

---

# 18. Long-Term Direction

If the MVP validates successfully, future exploration could include:
- application tracking
- interview prep
- LinkedIn optimization
- cover letters
- career analytics
- desktop companion app

But these are future possibilities, NOT current priorities.

---

# 19. Final Product Goal

Rezumate should become:

> “A fast, modern, mobile-first resume optimization app that genuinely helps people apply better.”

Not:
- a bloated career platform
- a generic AI wrapper
- a feature-heavy resume builder

The initial competitive advantage should come from:
- execution quality
- polish
- clarity
- speed
- focused UX
- sustainable architecture
