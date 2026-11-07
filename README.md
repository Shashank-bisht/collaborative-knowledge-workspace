# Writer

Writer is a collaborative knowledge workspace and note-taking application built for teams, students, and individuals who need to organize notes, manage documents inside workspaces, and collaborate in a structured environment. The project is designed around real-world team workflows similar to Notion and Confluence, but adapted for a full-stack final-year MCA project.

It combines:
- personal note management
- workspace-based collaboration
- folder organization
- member role management
- shared note access
- live presence tracking
- note discussions with threaded replies
- global search and filters
- trash, archive, favorites, and pagination support

---

## Project Objective

The goal of Writer is to create a modern collaborative documentation platform where users can:

- create and manage workspaces
- organize files and notes inside folders
- collaborate with teammates inside a shared workspace
- assign different roles like owner, admin, editor, and viewer
- share notes with controlled access
- see who is viewing or editing a file
- leave feedback using threaded comments and replies
- quickly search notes and files across the workspace

This makes Writer useful for:
- personal knowledge management
- team documentation
- project notes and task tracking
- shared study material
- internal workspace collaboration

---

## Current Application Features

### 1. Authentication and User Management
The application supports:
- user registration
- login
- logout
- session verification through JWT cookies
- protected routes for authenticated users

This ensures that only valid users can access workspace content and personal notes.

### 2. Workspace-Based Collaboration
Users can create workspaces and manage their own collaborative environment.

Each workspace supports:
- workspace creation and deletion by the owner
- invitation of members
- role-based access control
- workspace-specific note and folder visibility
- member management UI

### 3. Role Enforcement
Roles are enforced across the app to prevent misuse of access.

Supported roles:
- owner
- admin
- editor
- viewer

Examples of enforcement:
- viewers cannot edit or create notes
- workspace owner has exclusive control over workspace deletion
- editors can update content, but cannot change the entire workspace permissions structure
- workspace members only see content they are allowed to access

### 4. Folder and Note Management
The app supports:
- creating folders inside workspaces
- creating notes inside folders
- renaming and organizing notes
- favorites
- archive state
- trash state
- soft delete and recovery of deleted notes

Notes are stored with metadata such as:
- title
- content
- version number
- created date
- folder association
- workspace association
- user ownership
- deleted/archive/favorite flags

### 5. Shared Notes
Users can share notes and assign collaboration roles.

Current behavior includes:
- note sharing for selected users
- collaborator list management
- viewer/editor role assignment for shared files
- shared note visibility in the user’s shared workspace section

### 6. Live Presence Tracking
Writer includes presence visibility so users can see whether someone is:
- viewing a note
- editing a note
- active within a workspace

This improves collaboration by making shared workflows feel live and transparent.

### 7. Threaded Commenting System
Users can discuss notes with nested replies.

Features include:
- comments on notes
- threaded replies
- indentation for nested replies
- reply counts
- edit/delete for user-owned comments
- workspace-safe access checks for comments

### 8. Search and Filtering
The app includes a global search experience for faster navigation.

Users can search across:
- notes
- folders
- workspaces
- titles and content-related search terms

Filters allow users to narrow the search to relevant content without manually scanning large lists.

### 9. Pagination and UX Improvements
To avoid large, difficult lists, the app includes pagination for note and folder items.

Current behavior:
- only 10 items are shown per page
- next/previous controls are available
- lists remain manageable even with larger workspace data

### 10. Trash Management
The trash section includes:
- restoring deleted notes
- permanent deletion of individual notes
- bulk removal of all notes in trash

This keeps the app practical and avoids repeated manual deletions.

---

## Tech Stack

### Frontend
- React
- React Router DOM
- Tailwind CSS
- Framer Motion
- Radix UI
- Axios
- React Icons
- React Responsive
- Tiptap Editor

### Backend
- Node.js
- Express.js
- MySQL
- JWT authentication
- bcryptjs
- MySQL2
- dotenv
- multer

---

## Project Architecture

The project is split into two main parts:

- `Client/` — React frontend for the UI
- `Server/` — Express + MySQL backend for business logic and APIs

### Frontend Responsibilities
The frontend handles:
- login/register UI
- workspace switching
- sidebar navigation
- folder management UI
- note editor interface
- note list rendering
- trash/archive/favorites views
- search and filters
- collaborator presence indicators
- comments and replies

### Backend Responsibilities
The backend handles:
- authentication and authorization
- database operations
- workspace and member permissions
- note CRUD operations
- folder and share logic
- comment management
- permission enforcement for shared content
- live presence tracking

---

## Folder Structure

```text
Writer-main/
├── Client/
│   ├── package.json
│   ├── public/
│   └── src/
│       ├── api/
│       ├── components/
│       ├── layouts/
│       ├── lib/
│       ├── pages/
│       ├── application.js
│       ├── index.js
│       └── styles/
│
├── Server/
│   ├── controllers/
│   ├── routes/
│   ├── public/
│   ├── upload/
│   ├── db.js
│   ├── index.js
│   ├── package.json
│   ├── README.md
│   ├── _.sql
│   └── TODO.txt
│
├── README.md
├── .gitignore
└── .env.example
```

---

## Database Design

The app uses MySQL and initializes the necessary tables in `Server/db.js`.

### Main Tables

#### `users`
Stores basic login and user profile information:
- `user_id`
- `username`
- `email`
- `password`
- `created_date`

#### `workspaces`
Stores collaborative spaces:
- `workspace_id`
- `name`
- `description`
- `created_by`
- `created_at`

#### `workspace_members`
Stores membership and roles for each workspace:
- `workspace_id`
- `user_id`
- `role`
- `joined_at`

#### `folders`
Stores folder metadata and workspace association:
- `folder_id`
- `name`
- `user_id`
- `workspace_id`
- `created_date`

#### `notes`
Stores note content and metadata:
- `note_id`
- `name`
- `content`
- `version`
- `created_date`
- `deleted`
- `archive`
- `favorite`
- `folder_id`
- `user_id`
- `workspace_id`

#### `shares`
Stores note-sharing information:
- `share_id`
- `note_id`
- `user_id`

#### `note_collaborators`
Stores share access for collaborators:
- `share_id`
- `user_id`
- `role`
- `created_at`

#### `bookmarks`
Stores bookmarked notes or shared content:
- `bookmark_id`
- `share_id`
- `user_id`

#### `comments`
Stores discussion threads for notes:
- `comment_id`
- `note_id`
- `user_id`
- `parent_comment_id`
- `message`
- `created_at`

---

## Core Modules

### Authentication Module
Handles:
- register
- login
- logout
- JWT verification
- protected access routes

### Workspace Module
Handles:
- workspace creation
- workspace deletion by owner
- member addition/removal
- role assignment
- workspace access control

### Folder Module
Handles:
- folder creation
- folder listing
- folder-level organization
- note-to-folder assignment

### Note Module
Handles:
- note creation
- note updating
- note deletion and trash state
- archive/favorite behavior
- version control
- permission checks
- live presence syncing
- threaded comments

### Share Module
Handles:
- sharing notes
- collaborator roles
- note visibility access

### Bookmark Module
Handles:
- bookmarking important shared content
- fetching bookmarks
- removing bookmarks

---

## User Workflow

A typical user flow in Writer is:

1. Register and log in.
2. Create a workspace.
3. Invite members and assign roles.
4. Create folders for organization.
5. Add notes inside folders.
6. Share notes with collaborators.
7. Edit or view based on permission.
8. Track presence and discussion activity.
9. Use global search to find content quickly.
10. Restore or permanently delete notes from trash when needed.

---

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Writer-main
```

### 2. Install Server Dependencies

```bash
cd Server
npm install
```

### 3. Install Client Dependencies

```bash
cd ../Client
npm install
```

### 4. Configure Environment Variables
Create a `.env` file inside the `Server/` folder with your database settings.

Example:

```env
DB_HOST=localhost
DB_USER=root
DB_KEY=your_password
DB_NAME=writer_db
JWT_SECRET=your_secret_key
```

### 5. Start the Backend

```bash
cd Server
npm start
```

### 6. Start the Frontend

```bash
cd Client
npm start
```

Then open the app in the browser and start using the application.

---

## Production Build

To create a production build for the client:

```bash
cd Client
npm run build
```

---

## Notes for Developers

The app is designed for a clean frontend/backend separation.

Key frontend files:
- `Client/src/api/fetch.js` — API layer
- `Client/src/api/useGlobalContext.js` — global app state
- `Client/src/components/noteList.js` — paginated note listing
- `Client/src/components/sidebar/searchNote.js` — search and filtering UI
- `Client/src/components/trash/trashMenu.js` — trash restore and bulk clear actions

Key backend files:
- `Server/db.js` — MySQL initialization and schema setup
- `Server/index.js` — server bootstrap and route registration
- `Server/controllers/notes.js` — notes, comments, presence, and permission logic
- `Server/controllers/folder.js` — folder and workspace-related business logic
- `Server/routes/notes.js` — note API routes

---

## Advantages of This Project

- strong full-stack architecture
- team collaboration logic
- real-world note management workflow
- secure role-based access
- modern UI design
- practical workspace-based product model
- strong final-year MCA / BCA / engineering project fit

---

## Challenges Addressed

Writer solves common limitations of a basic note app:
- lack of workspace-level organization
- no role-based permissions
- no team collaboration model
- no visible presence tracking
- no threaded discussion feature
- poor search experience
- difficult note management during large data growth

---

## Future Improvements

Potential enhancements for future versions:
- notifications for mentions and replies
- activity feed and audit logs
- advanced search ranking and filters
- PDF/Markdown export
- AI-powered summaries
- drag-and-drop file organization
- dashboard analytics for team activity
- version history restore for notes

---

## Summary

Writer is a modern collaborative knowledge workspace that goes beyond simple note-taking. It brings together:
- workspaces
- folders
- notes
- collaboration
- permissions
- presence tracking
- discussion threads
- search
- pagination
- trash management

This makes it a practical and professional full-stack project suitable for academic and real-world demonstrations.

---

## Final Note

This project is structured to be easily understandable, extensible, and demo-friendly. It demonstrates important engineering concepts including:
- authentication
- database modeling
- REST API design
- role-based authorization
- frontend state management
- real-time collaboration awareness
- modern web application UX


