# Writer

Writer is a collaborative knowledge workspace and note-taking application inspired by Notion. It allows users to create workspaces, organize notes in folders, collaborate with teammates, assign access roles, share notes, track who is viewing or editing a file, and discuss ideas through nested threaded replies.

The project is designed for real-time collaborative knowledge management, where users can work together inside shared workspaces without exposing data to everyone blindly. Every note and folder can be managed under a workspace, and users can be assigned roles such as owner, admin, editor, or viewer.

## Project Overview

The application is divided into two major parts:

- `Client/` — React frontend for the user interface
- `Server/` — Express + MySQL backend for APIs, authentication, and data storage

Writer combines personal note management with team collaboration features, making it suitable for:

- individual note organization
- project knowledge management
- collaborative documentation
- shared workspace notes and discussions
- internal team knowledge bases

## Core Features

### 1. User Authentication
The system supports:

- user registration
- login
- session verification
- logout
- protected routes using JWT cookies

This ensures that only authenticated users can access their data and collaborative workspace content.

### 2. Workspaces
Users can create workspaces to organize their notes and collaboration groups.

Each workspace includes:

- workspace name and description
- owner and admins
- member invitations
- role-based permissions
- workspace-specific folder and note access

A workspace acts as the main collaboration boundary for notes and folders.

### 3. Workspace Members and Roles
The app supports role-based access control inside workspaces.

Roles include:

- owner
- admin
- editor
- viewer

Permissions are enforced for:

- creating notes and folders
- editing workspace content
- deleting workspace items
- sharing notes
- inviting and managing members

This prevents unauthorized access and ensures controlled collaboration.

### 4. Folder and Note Management
Users can create and manage:

- folders inside workspaces
- notes inside folders
- favorite notes
- archived notes
- deleted notes
- note titles and content updates

Each note belongs to a workspace and a user, and each folder is associated with a user and workspace.

### 5. Shared Notes and Collaborators
Users can share notes with others and assign access roles.

Supported sharing roles:

- viewer
- editor

Shared notes appear in the collaborator’s shared section and can be opened with the correct permission profile.

### 6. Bookmarks
Users can bookmark shared notes to quickly access important files.

This provides a lightweight method for pinning useful resources without moving them between folders.

### 7. Live Presence Tracking
The app shows who is currently:

- viewing a note
- editing a note
- active in a workspace

This makes collaboration more visible and helps users understand whether a file is being worked on by someone else.

### 8. Threaded Replies and Discussions
Each note supports threaded discussion comments.

Features include:

- posting comments on notes
- replying to an existing comment
- nested indentation for reply hierarchy
- reply count badges
- commenting by individual users
- edit/delete permissions for user-owned comments

This feature supports collaborative feedback without turning the system into a general chat app.

### 9. Responsive UI
The frontend is built using React and Tailwind CSS and supports:

- desktop-friendly workspace layouts
- responsive note editor UI
- sidebar navigation
- share and member management screens
- folder and note management flows

## Tech Stack

### Frontend

- React
- React Router
- Tailwind CSS
- Tiptap editor
- Radix UI components
- Axios
- Zustand
- React Responsive
- Lucide Icons
- React Icons

### Backend

- Node.js
- Express.js
- MySQL
- JWT authentication
- bcryptjs
- multer
- dotenv
- mysql2

## Project Architecture

The application follows a client-server architecture:

- the frontend sends requests to the backend through API calls
- the backend validates user identity and permissions
- MySQL stores system data such as users, workspaces, folders, notes, shares, and comments
- the frontend renders dynamic screens using state and API responses

The architecture supports modular development:

- `Client/src/api` handles API communication
- `Client/src/components` contains all reusable UI components
- `Client/src/pages` contains routes and page screens
- `Server/controllers` contains business logic
- `Server/routes` contains API endpoints
- `Server/db.js` initializes database tables

## Folder Structure

```text
Writer-main/
├── Client/
│   ├── package.json
│   ├── public/
│   └── src/
│       ├── api/
│       ├── application.js
│       ├── components/
│       ├── layouts/
│       ├── lib/
│       ├── pages/
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

## Main Modules

### Authentication Module
Responsible for:

- user registration
- login validation
- cookie-based JWT session management
- access verification on protected endpoints

Files involved:

- `Server/controllers/auth.js`
- `Server/routes/auth.js`

### Workspace Module
Responsible for:

- creating and deleting workspaces
- managing members
- assigning roles
- workspace-level visibility and access rules

Files involved:

- `Server/controllers/workspace.js` (if used in the project structure)
- `Server/routes/workspaces.js`
- `Client/src/components/sidebar/workspaceMembers.js`

### Folder Module
Responsible for:

- creating folders
- viewing folder contents
- moving notes into folders
- updating folder names

Files involved:

- `Server/controllers/folder.js`
- `Server/routes/folders.js`

### Note Module
Responsible for:

- note creation
- content saving
- version tracking
- archive/favorite/delete states
- note-level permission enforcement
- live presence tracking

Files involved:

- `Server/controllers/notes.js`
- `Server/routes/notes.js`

### Share Module
Responsible for:

- sharing notes with other users
- assigning viewer/editor roles
- managing collaborator list
- handling shared note access

Files involved:

- `Server/controllers/shares.js`
- `Server/routes/share.js`

### Bookmark Module
Responsible for:

- bookmark creation
- deletion of bookmarks
- retrieving bookmarked content

Files involved:

- `Server/controllers/bookmarks.js`
- `Server/routes/bookmark.js`

### Comment Module
Responsible for:

- creating comments on notes
- creating replies to existing comments
- nested reply rendering
- count-based thread summary
- edit and delete operations by owner

Files involved:

- `Server/controllers/notes.js`
- `Server/routes/notes.js`
- `Client/src/components/noteEditor/index.js`

## Database Design

The backend uses MySQL and initializes tables automatically in `Server/db.js`.

### Main database tables

#### `users`
Stores user account data:

- `user_id`
- `username`
- `email`
- `password`
- `created_date`

#### `folders`
Stores folder metadata:

- `folder_id`
- `name`
- `created_date`
- `user_id`
- `workspace_id`

#### `notes`
Stores note content and metadata:

- `note_id`
- `name`
- `content`
- `version`
- `created_date`
- `deleted`
- `favorite`
- `archive`
- `folder_id`
- `user_id`
- `workspace_id`

The `version` field protects against concurrent edit conflicts.

#### `workspaces`
Stores workspace-level information:

- `workspace_id`
- `name`
- `description`
- `created_by`
- `created_at`

#### `workspace_members`
Stores workspace access and roles:

- `workspace_id`
- `user_id`
- `role`
- `joined_at`

#### `shares`
Stores note-sharing links:

- `share_id`
- `note_id`
- `user_id`

#### `note_collaborators`
Stores collaborators and their roles for a shared note:

- `share_id`
- `user_id`
- `role`
- `created_at`

#### `bookmarks`
Stores user bookmarks:

- `bookmark_id`
- `share_id`
- `user_id`

#### `comments`
Stores note discussion threads:

- `comment_id`
- `note_id`
- `user_id`
- `parent_comment_id`
- `message`
- `created_at`

## System Workflow

### Standard user workflow

1. User registers and logs in.
2. User creates a workspace.
3. User adds members to the workspace with specific roles.
4. User creates a folder under the workspace.
5. User creates notes inside folders.
6. User can share notes with other users.
7. Collaborators access notes according to permission rules.
8. Collaborators can view, edit, or only read depending on assigned role.
9. Users perform threaded discussions on note content.
10. Users can bookmark important shared notes for quick access.

## Frontend Highlights

`Client/src/api/fetch.js` is the main API bridge between the frontend and backend. It provides helper methods for:

- notes
- folders
- shares
- bookmarks
- presence tracking
- comments
- authentication

The UI is structured around:

- sidebar navigation
- note editor
- folder panel
- bookmark section
- share section
- membership management UI
- collaboration status indicators

## Backend Highlights

`Server/index.js` is the main server entry point and handles:

- environment setup
- CORS configuration
- route mounting
- JSON parsing
- file upload handling
- production static file serving

`Server/db.js` initializes the database and ensures tables exist before runtime use.

## Setup Instructions

### 1. Clone the project

```bash
git clone <repository-url>
cd Writer-main
```

### 2. Install server dependencies

```bash
cd Server
npm install
```

### 3. Install client dependencies

```bash
cd ../Client
npm install
```

### 4. Configure environment variables
Create a `.env` file in the `Server` folder with the required database information:

```env
DB_HOST=localhost
DB_USER=root
DB_KEY=your_password
DB_NAME=writer_db
```

### 5. Start backend

```bash
cd Server
npm start
```

### 6. Start frontend

```bash
cd Client
npm start
```

Then open the client in the browser and use the application.

## Production Notes

The React frontend can also be built for production:

```bash
cd Client
npm run build
```

The built output can be served from the backend or deployed to a hosting platform.

## Key Benefits of the Project

- collaborative workspace model
- secure role-based access control
- user-friendly note organization
- real-time collaboration awareness
- structured knowledge sharing
- comment-based discussion support
- scalable backend architecture

## Challenges Solved

This project addresses common issues in personal note systems:

- no centralized collaboration layer
- no role-based access enforcement
- no way to track active collaborators
- no discussion system for notes
- lack of workspace-based organization

Writer solves these by combining note organization, collaboration, and team knowledge management into one system.

## Future Enhancements

The project can be extended with:

- notification system for replies and mentions
- advanced search and tagging
- version restore/history
- export to PDF or Markdown
- AI-powered note summary
- activity feed and admin analytics
- drag-and-drop folder organization
- richer team dashboard statistics

## Conclusion

Writer is a collaborative knowledge workspace that goes beyond a basic note-taking app. It bridges personal productivity with team-based knowledge sharing, enabling users to organize ideas, assign permissions, collaborate in real time, and discuss updates within notes.

The project demonstrates strong full-stack development concepts, including authentication, database design, role-based access control, API design, UI development, and collaborative feature engineering. It is suitable as a final-year project in software engineering, computer applications, or information technology.

## Summary

Writer is a full-stack collaborative note management system that focuses on:

- workspaces
- folders and notes
- user roles and permissions
- collaboration and sharing
- live presence awareness
- nested note discussions

This makes it a practical and modern solution for digital knowledge management.
