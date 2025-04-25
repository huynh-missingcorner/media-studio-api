# Product Requirements Document (PRD)

## Product Name

**Vertex AI Media Studio Wrapper**

---

## Purpose

To provide a simplified user interface for interacting with the Vertex AI Media Studio API, enabling authenticated users to generate media assets (Image, Audio, Music, Video) from text prompts, preview results, and download outputs—all within a clean and intuitive web app.

---

## Background

Vertex AI Media Studio offers powerful APIs for generative media. However, it lacks a streamlined interface for non-technical users or developers looking to integrate it into custom workflows. This project bridges that gap by wrapping its core functionality into a minimal yet extensible frontend with a focus on prompt-based content creation.

---

## Scope

### In Scope

- Basic user authentication (login, signup)
- Role-based authorization (admin and user roles)
- Prompt-based generation of media assets
- Project selection before creating content
- Selection of media type: Image, Audio, Music, Video
- Adjustable parameters and generation settings
- Preview and download of generated content
- History of prompt → result pairs (stateless)
- Responsive, modern frontend interface
- Admin-only project management functionality

### Out of Scope (Initial Version)

- Advanced role management beyond admin/user
- Collaboration tools
- Session history or context-aware prompt chaining
- Fine-grained access control

---

## Target Users

- Content creators and marketers (user role)
- Designers and developers prototyping media workflows (user role)
- Product teams validating generative media ideas (user role)
- System administrators managing projects and users (admin role)

---

## Core Features

### 1. Authentication & Authorization

- Email/password signup and login
- Token-based session management (JWT)
- Role-based authorization (admin and user roles)
- Admin users created via database seeding
- Regular users can self-register
- Forgot password flow (optional in v1)

### 2. Project Management

- Admin users can create, update, and delete projects
- Regular users can only view and select projects
- Dropdown list of available Vertex AI projects
- Projects fetched via API or defined via backend config

### 3. Prompt Input

- Text prompt box with media type selection (tab or dropdown)
- Sidebar with adjustable parameters per media type:
  - Image: size, style, steps, etc.
  - Audio/Music: duration, genre, tempo, etc.
  - Video: resolution, length, frame rate, etc.

### 4. Media Generation

- Trigger API call to Vertex AI Media Studio with selected inputs
- Show loading state and handle errors
- Return result as preview (thumbnail, audio/video player)

### 5. Result Display

- Show the generated media with original prompt
- Include options to download file
- Store each prompt → result as a separate record
- Optional local caching for quicker preview

---

## User Interface (UX/UI)

### Pages

- **Auth Pages**: Login, Signup
- **Dashboard/Main Page**:
  - Project selector
  - Prompt input
  - Media type tabs
  - Settings sidebar
  - Result preview section

### Components

- Navbar (basic logout button)
- Prompt form with validation
- Media viewer
- Settings panel with dynamic controls

---

## Functional Requirements

| ID     | Requirement                                                  | Priority |
| ------ | ------------------------------------------------------------ | -------- |
| FR-001 | User can sign up and log in                                  | High     |
| FR-002 | System supports role-based access control (admin/user)       | High     |
| FR-003 | Admin users can manage projects (CRUD operations)            | High     |
| FR-004 | User can select project from dropdown                        | High     |
| FR-005 | User can choose a media type (Image, Audio, Music, Video)    | High     |
| FR-006 | User can input prompt and generate media                     | High     |
| FR-007 | User can preview and download generated content              | High     |
| FR-008 | User can adjust generation parameters before submission      | Medium   |
| FR-009 | Each prompt → result is independent (no chat session needed) | High     |
| FR-010 | Errors and loading states are handled gracefully             | High     |
| FR-011 | Admin accounts are created via database seeding              | Medium   |

---

## Non-Functional Requirements

- Secure authentication (JWT, HTTPS only)
- Role-based authorization checks on all endpoints
- Responsive design (desktop, tablet, mobile)
- Vertex AI API rate limit handling
- Input validation and output sanitization
- Scalable backend architecture

---

## Technical Stack (Suggestion)

- **Frontend**: React (Vite stack), shadcn/ui
- **Backend**: NestJS
- **Auth**: Custom JWT
- **API Integration**: Google Vertex AI Media Studio API
- **Database**: Postgresql
- **Hosting**: GCP
