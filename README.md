# AppSpec Compiler

An AI-powered schema compiler that transforms natural language product requirements into structured full-stack application specifications, including system architecture, database schemas, API contracts, UI definitions, authentication policies, and validation reports.

## Overview

Building software applications typically requires translating business requirements into multiple engineering artifacts such as database schemas, API specifications, UI structures, and system architecture diagrams.

Natural Language to Full-Stack App Generator automates this workflow by leveraging Large Language Models (LLMs) and deterministic validation pipelines to convert plain-English requirements into production-ready design artifacts.

The system acts as a compiler for software requirements, transforming high-level descriptions into structured engineering outputs while enforcing consistency across generated components.

---

## Key Features

### Requirement Understanding

- Extracts application type, features, entities, roles, and assumptions from natural language prompts
- Identifies authentication and payment requirements automatically

### System Design Generation

- Generates core entities and relationships
- Produces workflow definitions and role-based access models
- Creates architecture-level specifications

### Database Schema Generation

- Generates normalized relational database schemas
- Supports primary keys, foreign keys, and entity relationships
- Includes automatic schema normalization and repair

### API Specification Generation

- Creates REST API definitions
- Generates request and response contracts
- Supports authentication and role-based access control

### UI Schema Generation

- Produces application pages and navigation structures
- Maps UI routes to backend capabilities
- Defines component-level layouts and interactions

### Validation & Repair Engine

- API ↔ Database consistency validation
- UI ↔ API consistency validation
- Role-permission consistency validation
- Automated deterministic repair mechanisms

### Execution Analytics

- Runtime monitoring
- Validation metrics
- Repair statistics
- Schema generation summaries

---

## System Architecture

```text
Natural Language Prompt
           │
           ▼
Intent Extraction
           │
           ▼
System Design Generation
           │
           ▼
Schema Generation
 ┌─────────┼─────────┐
 ▼         ▼         ▼
DB      API      UI
Schema  Schema   Schema
 └─────────┼─────────┘
           ▼
Validation & Repair
           ▼
Schema Normalization
           ▼
Final Artifacts
```

---

## Technology Stack

### Frontend

- React
- Vite
- Tailwind CSS

### AI Layer

- Google Gemini API

### Core Engine

- JavaScript (ES6+)
- Custom Schema Compiler
- Deterministic Validation Engine
- Schema Normalization Framework

### Deployment

- Vercel

---

## Example

### Input

```text
Task manager with teams, tags, due dates, and email notifications
```

### Generated Outputs

- Entity Model
- Database Schema
- REST API Contracts
- UI Structure
- Authentication Rules
- Execution Plan
- Validation Report

---

## Validation Framework

| Validation Type | Purpose |
|----------------|----------|
| API-DB Consistency | Ensures API fields map to database columns |
| UI-API Consistency | Ensures UI routes have backend support |
| Role Consistency | Verifies access permissions across the system |
| Schema Normalization | Removes duplication and enforces relationships |

---

## Local Setup

```bash
git clone https://github.com/hkaushik14/Natural-Language-to-Full-Stack-App-Generator.git

cd Natural-Language-to-Full-Stack-App-Generator

npm install

npm run dev
```

### Environment Variables

```env
VITE_GEMINI_API_KEY=YOUR_API_KEY
```

---

## Future Work

- OpenAPI Specification Export
- SQL Migration Generation
- Backend Code Generation
- Frontend Boilerplate Generation
- Architecture Diagram Generation
- Multi-LLM Support
- Agentic Validation Pipelines

---

## Project Highlights

- Designed and implemented a multi-stage AI compiler pipeline
- Built automated schema validation and repair mechanisms
- Developed deterministic normalization algorithms
- Created an end-to-end requirement-to-specification workflow
- Deployed as a publicly accessible web application

---

## Author

**Harsh Kaushik**

B.Tech, Computer Science & Engineering

GitHub: https://github.com/hkaushik14

LinkedIn: https://www.linkedin.com/in/harsh-kaushik-41ab09289/

---

## License

MIT License
