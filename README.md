# AppSpec Compiler

An AI-powered schema compiler that transforms natural language product requirements into structured full-stack application specifications, including database schemas, API contracts, UI definitions, authentication policies, architecture designs, validation reports, and execution plans.

## 🚀 Live Demo

https://natural-language-to-full-stack-app.vercel.app

---

# Overview

Building modern software applications requires translating business requirements into multiple engineering artifacts such as:

- Database schemas
- API specifications
- UI structures
- Authentication policies
- System architecture
- Validation reports

AppSpec Compiler automates this workflow using a multi-stage AI-powered compiler pipeline.

Instead of generating raw code directly, the system first converts natural language requirements into structured engineering specifications and then validates, repairs, and normalizes them to ensure consistency across the entire application stack.

The project follows a compiler-inspired architecture:

```text
Natural Language Input
        │
        ▼
Intent Extraction
        │
        ▼
System Design Generation
        │
        ▼
Schema Generation
 ┌──────┼──────┐
 ▼      ▼      ▼
DB     API     UI
Schema Schema Schema
 └──────┼──────┘
        ▼
Validation Engine
        ▼
Deterministic Repairs
        ▼
Schema Normalization
        ▼
Final Artifacts
```

---

# Why AppSpec Compiler?

Traditional AI application generators often produce disconnected outputs.

AppSpec Compiler focuses on consistency and engineering correctness by introducing:

- Multi-stage compilation pipeline
- Schema validation
- Deterministic repair mechanisms
- Schema normalization
- Cross-artifact consistency checks

This allows generated specifications to remain aligned across:

- Database layer
- API layer
- UI layer
- Authentication layer
- Role-permission model

---

# Key Features

## 1. Requirement Understanding

Extracts structured information from natural language prompts:

- Application type
- Features
- Entities
- User roles
- Assumptions
- Authentication requirements
- Payment requirements

### Example Input

```text
Task manager with teams, tags, due dates, and email notifications
```

### Extracted Output

```json
{
  "app_type": "Task Management System",
  "entities": ["Users", "Tasks", "Teams", "Tags"],
  "roles": ["Admin", "Member"],
  "auth_required": true
}
```

---

## 2. System Design Generation

Generates:

- Entity relationships
- Business workflows
- Role permissions
- Service architecture

Outputs:

- Entity models
- Workflow definitions
- Access-control structures
- Architecture metadata

---

## 3. Database Schema Generation

Generates normalized relational database structures.

Supports:

- Primary keys
- Foreign keys
- Relationship mapping
- Junction tables
- Schema normalization

Example:

```sql
users
tasks
teams
tags
team_members
task_assignments
task_tags
```

---

## 4. API Specification Generation

Automatically creates REST API contracts.

Features:

- CRUD endpoints
- Request schemas
- Response schemas
- Authentication rules
- Role-based access control

Example:

```http
GET    /tasks
POST   /tasks
PUT    /tasks/:id
DELETE /tasks/:id
```

---

## 5. UI Schema Generation

Generates:

- Application pages
- Route structures
- Navigation trees
- UI component definitions

Example:

```text
Dashboard
Tasks
Teams
Tags
Settings
Profile
```

---

## 6. Validation & Repair Engine

One of the core differentiators of the project.

Performs:

### API ↔ Database Validation

Ensures:

- API fields exist in database schemas
- Endpoints map correctly to entities

### UI ↔ API Validation

Ensures:

- Every UI route has backend support
- Page actions map to available endpoints

### Role Validation

Ensures:

- Permissions remain consistent across the system

### Deterministic Repairs

Automatically repairs:

- Missing tables
- Missing columns
- Invalid mappings
- Broken references

---

## 7. Schema Normalization Engine

Normalizes generated schemas by:

- Merging duplicates
- Enforcing naming consistency
- Creating foreign-key relationships
- Removing invalid structures

Example:

```text
Teams  → teams
Tasks  → tasks
Users  → users
```

---

## 8. Execution Analytics

Tracks compilation performance.

Metrics include:

- Runtime
- Validation errors
- Repair attempts
- API calls
- Cache hits
- Token usage
- Normalization statistics

Example Dashboard Metrics:

```text
Total Runtime: 4773ms
API Calls: 3
Validation Errors: 0
Repair Attempts: 0
Status: SUCCESS
```

---

# Technology Stack

## Frontend

- React
- Vite
- Tailwind CSS

## AI Layer

- Grok API

## Core Engine

- JavaScript (ES6+)
- Custom Schema Compiler
- Validation Engine
- Deterministic Repair Engine
- Schema Normalization Framework

## Deployment

- Vercel

---

# Project Architecture

```text
src/
├── components/
├── constants/
├── features/
│   └── compiler/
├── hooks/
├── services/
│   ├── ai/
│   └── compiler/
├── utils/
├── App.jsx
└── main.jsx
```

---

# Generated Artifacts

Each compilation produces:

### Database Schema

```json
db_schema.json
```

### API Schema

```json
api_schema.json
```

### UI Schema

```json
ui_schema.json
```

### Authentication Rules

```json
auth_rules.json
```

### Execution Plan

```json
execution_plan.json
```

### Complete Output Bundle

```json
all_schemas.json
```

---

# Engineering Challenges Solved

- Maintaining API ↔ Database consistency
- Maintaining UI ↔ API consistency
- Handling incomplete LLM responses
- Deterministic schema repair
- Schema normalization
- Role-permission verification
- Multi-stage compilation workflow orchestration

---

# Example Workflow

### Input

```text
Hospital management system with doctors, patients,
appointments, prescriptions, billing,
inventory, email notifications, admin dashboard,
role based access control
```

### Generated Outputs

✅ Entity Model

✅ Database Schema

✅ REST API Contracts

✅ UI Structure

✅ Authentication Policies

✅ Validation Report

✅ Execution Plan

---

# Local Setup

Clone the repository:

```bash
git clone https://github.com/hkaushik14/Natural-Language-to-Full-Stack-App-Generator.git
```

Move into project directory:

```bash
cd Natural-Language-to-Full-Stack-App-Generator
```

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

---

# Environment Variables

Create a `.env` file:

```env
VITE_GROK_API_KEY=YOUR_API_KEY
```

---

# Future Roadmap

- OpenAPI Specification Export
- SQL Migration Generation
- Backend Code Generation
- Frontend Boilerplate Generation
- Architecture Diagram Generation
- Multi-LLM Support
- Agentic Validation Pipelines
- Code Quality Analysis
- Infrastructure Specification Generation

---

# Project Highlights

- Designed and implemented a multi-stage AI compiler pipeline.
- Built automated validation and repair mechanisms.
- Developed deterministic schema normalization algorithms.
- Created an end-to-end requirement-to-specification workflow.
- Implemented execution analytics and runtime monitoring.
- Deployed as a publicly accessible web application.

---

# Author

**Harsh Kaushik**

B.Tech — Computer Science & Engineering

GitHub: https://github.com/hkaushik14

LinkedIn: https://www.linkedin.com/in/harsh-kaushik-41ab09289/

---

# License

MIT License

---

## ⭐ Star the Repository

If you found the project useful, consider giving it a star on GitHub. It helps improve visibility and supports future development.
