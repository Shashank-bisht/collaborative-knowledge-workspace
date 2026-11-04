from pathlib import Path

try:
    from docx import Document
except ImportError as exc:
    raise SystemExit("python-docx is not installed. Run: py -m pip install python-docx") from exc

ROOT = Path(__file__).resolve().parent
REFERENCE_FILE = Path(r"c:\Users\shash\Downloads\Finished - SECURE v2.docx")
OUTPUT_FILE = ROOT / "Writer_Synopsis_Draft.docx"


def load_reference_text():
    if not REFERENCE_FILE.exists():
        print(f"Reference file not found: {REFERENCE_FILE}")
        return None

    doc = Document(str(REFERENCE_FILE))
    paragraphs = []
    for paragraph in doc.paragraphs:
        text = paragraph.text.strip()
        if text:
            paragraphs.append(text)

    if paragraphs:
        return paragraphs[:80]
    return None


DEFAULT_TEXT = [
    "Writer - Collaborative Knowledge Workspace",
    "",
    "Synopsis",
    "",
    "The project titled 'Writer' is a collaborative knowledge workspace and note-taking application designed to help users organize notes, create workspaces, collaborate with team members, share information securely, and manage content in a structured digital environment.",
    "",
    "The main objective of the system is to provide a modern workspace where users can create projects or workspaces, organize folders, write notes, share them with others, assign roles such as owner, admin, editor, and viewer, and maintain a clear collaborative structure.",
    "",
    "Traditional note-taking applications usually focus on storing personal information and do not provide collaborative features such as workspace-based access control, shared note editing, permission management, or real-time presence tracking. Writer fills this gap by enabling users to create workspaces for different teams or projects and manage notes within them in a more organized and controlled way.",
    "",
    "The proposed system supports user authentication, workspace creation, folder and note management, note sharing, collaborator access control, bookmarks, workspace-level member management, threaded discussions, and search across notes, folders, and workspaces. The system also includes activity awareness features such as active viewing and editing presence.",
    "",
    "The application is implemented using a full-stack architecture. The frontend is developed using React.js and Tailwind CSS, providing a modern and responsive user interface. The backend is built using Node.js and Express.js, and data is stored in MySQL.",
    "",
    "One of the major strengths of the project is the permission model. Users can create workspaces and assign access to other members based on roles. Owners and admins can manage workspace members, editors can modify content, and viewers can access content with restrictions.",
    "",
    "The note management system allows users to create, update, archive, favorite, and delete notes. Notes can be organized inside folders and workspaces for better structure. Users can also share notes with collaborators and search for content efficiently using global search and filter options.",
    "",
    "Another important feature is the threaded reply system. Users can discuss and comment on a note, reply to a specific thread, and maintain nested discussions in a structured way. This feature improves collaboration and supports communication around ideas and updates.",
    "",
    "The application also provides search and filtering capabilities. Users can search by note title, workspace name, folder name, and content. They can also filter results based on workspace, folder, user, date, and status.",
    "",
    "The project is relevant to the modern digital workspace ecosystem and demonstrates practical understanding of software engineering concepts such as full-stack development, role-based access control, database design, API integration, and frontend UI design.",
    "",
    "In conclusion, Writer is a collaborative knowledge workspace that addresses the limitations of traditional personal note applications. It provides a secure and structured environment for users to manage information, collaborate with teams, and maintain shared knowledge.",
    "",
    "This project is highly suitable for a final-year MCA project because it combines technical depth, real-world application value, and a strong product-oriented design approach.",
]


def build_document():
    texts = load_reference_text() or DEFAULT_TEXT
    document = Document()

    for line in texts:
        if not line.strip():
            document.add_paragraph("")
        else:
            document.add_paragraph(line)

    document.save(str(OUTPUT_FILE))
    print(f"Synopsis draft saved to: {OUTPUT_FILE}")


if __name__ == "__main__":
    build_document()
