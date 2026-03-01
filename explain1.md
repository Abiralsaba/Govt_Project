# Community Module — Full Architecture Walkthrough (Frontend → Backend → Database)

---

## 1. HIGH-LEVEL OVERVIEW

The Community module is a **social platform** within the government portal that lets citizens:
1. **Discover communities** (Discover tab)
2. **View joined groups** (My Groups tab)
3. **Create new community groups** (Create Group tab)
4. **Interact within groups** — post content, like posts, comment, edit/delete own content (Group Detail view)

The entire system uses an **admin approval workflow** — all new groups and posts start as `pending` and require admin approval before becoming visible.

### File Map

| Layer | File |
|---|---|
| Frontend HTML | `public/community.html` |
| Frontend JS | `public/js/community.js` |
| Frontend CSS | `public/css/community.css` + `public/css/style.css` + `public/css/sidebar.css` |
| Backend Routes | `src/routes/communityRoutes.js` (655 lines) |
| Route Mounting | `src/app.js` (line 79) |
| Upload Middleware | `src/middleware/uploadMiddleware.js` |
| Auth Middleware | `src/middleware/authMiddleware.js` |
| Database Schema | `src/database/schema_full.sql` (tables at lines 152, 166, 180, 536, 550) |
| Database Triggers | `src/database/triggers.sql` (triggers 2–5, lines 30–74) |
| Database Views | `src/database/views.sql` (`v_community_analytics`, line 115) |
| Complex Queries | `src/database/complex_queries.sql` (Query 3: User Engagement Score, line 97; Query 7: Member Activity, line 350) |

---

## 2. FRONTEND — `public/community.html` + `public/js/community.js`

The page is a **single-page app with 4 views**, switched via JavaScript. HTML is 259 lines (structure + modals), JS is 598 lines (all logic).

### Tab/View Navigation — `showTab()` function (community.js line 19)

```js
function showTab(tab) {
    ['discover', 'my-groups', 'create', 'group-detail'].forEach(s => {
        const el = document.getElementById(s + '-section');
        if (el) el.style.display = 'none';
    });
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    const navEl = document.getElementById('nav-' + tab);
    if (navEl) navEl.classList.add('active');
    const targetEl = document.getElementById(tab + '-section');
    if (targetEl) targetEl.style.display = 'block';
    if (tab === 'discover') loadGroups();
    if (tab === 'my-groups') loadMyGroups();
}
```

The sidebar has 3 navigation links + 1 hidden detail view:
- **Discover** → `#discover-section` — all approved community groups
- **My Groups** → `#my-groups-section` — groups the user has joined
- **Create Group** → `#create-section` — form to create a new group
- **Group Detail** → `#group-detail-section` — opened when clicking a group card (no sidebar link)

### Authentication Check (community.js line 1)

```js
const token = localStorage.getItem('token');
if (!token) window.location.href = 'index.html';
```

All API calls include `Authorization: Bearer ${token}` header. The backend applies `verifyToken` middleware to all community routes.

### User Info Loading — `loadUserInfo()` (community.js line 7)

```
Frontend: fetch('/api/dashboard/summary')
       → Returns user's name and ID
       → Sets currentUserName, currentUserId (used for avatar initials and ownership checks)
```

### CSS Styling — `public/css/community.css`

The CSS file (366 lines) defines a **purple-themed dark design** with:
- Groups displayed in responsive grid: `grid-template-columns: repeat(auto-fill, minmax(300px, 1fr))`
- Card hover effects: `translateY(-5px)` + purple border glow (`#8b5cf6`)
- Group covers: gradient fallback `linear-gradient(135deg, #667eea, #764ba2)`
- Glassmorphism card backgrounds: `rgba(30, 41, 59, 0.6)` with subtle borders
- Post feed: centered `max-width: 600px` layout (social media style)
- Like button state: `.post-action-btn.liked` → red (`#ef4444`)
- Comment bubbles with dark backgrounds and rounded corners
- Modals with blurred backdrop: `backdrop-filter: blur(5px)`
- Primary buttons: gradient `linear-gradient(135deg, #8b5cf6, #ec4899)` (purple to pink)

---

## 3. VIEW-BY-VIEW: Frontend → API → Backend → Database

---

### VIEW A: DISCOVER (`#discover-section`)

**What it shows:** A responsive grid of all approved community groups.

**Dynamic data — `loadGroups()` (community.js line 34):**

```
Frontend: fetch('/api/community/groups')  [GET]
       ↓
Backend: communityRoutes.js line 18
       ↓
SQL: SELECT 
        g.*,
        u.name as creator_name,
        (SELECT COUNT(*) FROM community_members WHERE group_id = g.id) as member_count
     FROM community_groups g
     JOIN reg_info u ON g.created_by = u.id
     WHERE g.status = 'approved'
     ORDER BY g.created_at DESC
       ↓
Returns: Array of groups with name, description, cover_image, member_count
       ↓
Frontend renders group cards in #groupsGrid with:
  - Cover image (or gradient fallback with users icon)
  - Group name
  - Description (clamped to 2 lines via CSS)
  - Member count
  - Click → openGroup(groupId)
```

---

### VIEW B: MY GROUPS (`#my-groups-section`)

**What it shows:** Grid of groups the current user has joined.

**Dynamic data — `loadMyGroups()` (community.js line 56):**

```
Frontend: fetch('/api/community/my-groups')  [GET]
       ↓
Backend: communityRoutes.js line 38
       ↓
SQL: SELECT 
        g.*,
        u.name as creator_name,
        m.role as my_role,
        (SELECT COUNT(*) FROM community_members WHERE group_id = g.id) as member_count
     FROM community_groups g
     JOIN community_members m ON g.id = m.group_id
     JOIN reg_info u ON g.created_by = u.id
     WHERE m.user_id = ? AND g.status = 'approved'
     ORDER BY m.joined_at DESC
       ↓
Returns: Array of groups with member's role (admin/member)
       ↓
Frontend renders cards with role badge and member count
```

**Key difference from Discover:** Uses an INNER JOIN on `community_members` to filter to only joined groups, and includes the user's `role` in each group.

---

### VIEW C: CREATE GROUP (`#create-section`)

**What it shows:** A form to create a new community group.

#### Form Fields:
- **Group Name** (required, min 3 chars)
- **Description** (optional textarea)
- **Cover Image** (optional file upload with preview)

#### Cover Image Upload — Client-side (community.js line 301)

```js
function handleCoverImageUpload(input) {
    // Reads selected file, shows preview via FileReader
    coverImageFile = input.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('coverPreviewImg').src = e.target.result;
        document.getElementById('coverPreview').style.display = 'block';
    };
    reader.readAsDataURL(coverImageFile);
}
```

The cover image is stored in a module-level variable `coverImageFile` and sent as `FormData` (multipart) on submit.

#### Submission Flow (community.js line 325):

```
Frontend: fetch('/api/community/groups')  [POST]
  body: FormData { name, description, cover_image (file) }
       ↓
Backend: communityRoutes.js line 62
  → Middleware: upload.single('cover_image') — multer processes file upload
       ↓
Step 1 — Validate name:
  if (!name || name.trim().length < 3) → 400 error

Step 2 — Handle cover image:
  if (req.file) → cover_image = '/uploads/' + req.file.filename
  else → cover_image = null

Step 3 — Insert group (status = 'pending'):
  SQL: INSERT INTO community_groups (name, description, cover_image, created_by, status)
       VALUES (?, ?, ?, ?, 'pending')

Step 4 — Auto-add creator as admin member:
  SQL: INSERT INTO community_members (group_id, user_id, role)
       VALUES (?, ?, 'admin')

Step 5 — Notify system admin:
  SQL: INSERT INTO notifications (user_id, message)
       SELECT id, ? FROM reg_info WHERE email = 'admin@gov.bd' LIMIT 1
       ↓
Returns: { success: true, message: 'Group created and pending admin approval', groupId }
       ↓
Frontend shows SweetAlert2 success popup, resets form, switches to My Groups tab
```

**Important:** New groups start as `status = 'pending'` and are NOT visible in Discover until an admin approves them.

---

### VIEW D: GROUP DETAIL (`#group-detail-section`)

This is the **richest view** — a full social feed inside a community group.

#### D1. Opening a Group — `openGroup(groupId)` (community.js line 82)

```
Frontend: fetch('/api/community/groups/${groupId}')  [GET]
       ↓
Backend: communityRoutes.js line 101
       ↓
Step 1 — Get group info:
  SQL: SELECT g.*, u.name as creator_name,
       (SELECT COUNT(*) FROM community_members WHERE group_id = g.id) as member_count
       FROM community_groups g
       JOIN reg_info u ON g.created_by = u.id
       WHERE g.id = ? AND g.status = 'approved'

Step 2 — Check membership:
  SQL: SELECT role FROM community_members 
       WHERE group_id = ? AND user_id = ?
  → Sets group.is_member and group.my_role

Step 3 — Get approved posts with like status:
  SQL: SELECT p.*, u.name as author_name, u.photo_url as author_photo,
       EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = ?) as liked_by_me
       FROM community_posts p
       JOIN reg_info u ON p.user_id = u.id
       WHERE p.group_id = ? AND p.status = 'approved'
       ORDER BY p.created_at DESC
       ↓
Returns: Full group object with posts array, membership status, role
       ↓
Frontend renders:
  - Header with cover image (or gradient), group name, description, member count
  - Join/Leave button (based on is_member)
  - Edit Group button (if admin/creator)
  - Post creation box (only if member)
  - Post feed with likes, comments, edit buttons
```

#### D2. Rendering Posts — `renderPost(post)` (community.js line 117)

Each post card renders:
- **Author avatar** (first letter of name)
- **Author name** + relative timestamp (`formatTimeAgo`)
- **Post content** (escaped HTML for XSS prevention)
- **Post image** (if attached)
- **Like button** (heart icon, toggleable, shows count, red when liked)
- **Comment button** (toggles comment section, shows count)
- **Edit button** (only visible if current user is the post author)

#### D3. Join Group — `joinGroup(groupId)` (community.js line 140)

```
Frontend: fetch('/api/community/groups/${groupId}/join')  [POST]
       ↓
Backend: communityRoutes.js line 226
       ↓
Step 1 — Verify group exists and is approved:
  SQL: SELECT id FROM community_groups WHERE id = ? AND status = 'approved'

Step 2 — Check not already a member:
  SQL: SELECT id FROM community_members WHERE group_id = ? AND user_id = ?
  → If exists → 400 "Already a member"

Step 3 — Add membership:
  SQL: INSERT INTO community_members (group_id, user_id, role)
       VALUES (?, ?, 'member')
       ↓
Returns: { success: true }
       ↓
Frontend refreshes the group view (re-calls openGroup)
```

#### D4. Leave Group — `leaveGroup(groupId)` (community.js line 148)

```
Frontend: SweetAlert2 confirmation dialog → fetch('/api/community/groups/${groupId}/leave')  [POST]
       ↓
Backend: communityRoutes.js line 253
       ↓
Step 1 — Check if user is the creator:
  SQL: SELECT created_by FROM community_groups WHERE id = ?
  → If user is creator → 400 "Group creator cannot leave. Transfer ownership first."

Step 2 — Remove membership:
  SQL: DELETE FROM community_members WHERE group_id = ? AND user_id = ?
       ↓
Returns: { success: true }
       ↓
Frontend switches back to Discover tab
```

**Important:** The group creator (admin) cannot leave their own group. This prevents orphaned groups.

#### D5. Create Post (community.js line 354)

```
Frontend: Opens modal → User writes content + optionally attaches image
       → fetch('/api/community/groups/${groupId}/posts')  [POST]
  body: FormData { content, post_image (file) }
       ↓
Backend: communityRoutes.js line 280
  → Middleware: upload.single('post_image') — multer processes file
       ↓
Step 1 — Verify membership:
  SQL: SELECT id FROM community_members WHERE group_id = ? AND user_id = ?
  → If not member → 403 "Must be a member to post"

Step 2 — Insert post (status = 'pending'):
  SQL: INSERT INTO community_posts (group_id, user_id, content, image_url, status)
       VALUES (?, ?, ?, ?, 'pending')

Step 3 — Notify admin:
  SQL: INSERT INTO notifications (user_id, message)
       SELECT id, ? FROM reg_info WHERE email = 'admin@gov.bd' LIMIT 1
       ↓
Returns: { success: true, message: 'Post created and pending admin approval' }
```

**Posts also require admin approval** before appearing in the feed.

#### D6. Edit Post (community.js line 420)

```
Frontend: Click edit icon on own post → Opens edit modal with current content/image
       → fetch('/api/community/posts/${postId}')  [PUT]
  body: FormData { content, post_image (file) OR keep_existing_image='true' }
       ↓
Backend: communityRoutes.js line 325
       ↓
Step 1 — Verify post exists and user is author:
  SQL: SELECT id, user_id, image_url FROM community_posts WHERE id = ?
  → If user_id !== req.user.id → 403 "You can only edit your own posts"

Step 2 — Handle image (3 cases):
  - New file uploaded → image_url = '/uploads/' + filename
  - keep_existing_image = 'true' → image_url = existing URL
  - Neither → image_url = null (image removed)

Step 3 — Update post (status reset to 'pending'):
  SQL: UPDATE community_posts 
       SET content = ?, image_url = ?, status = 'pending', updated_at = NOW()
       WHERE id = ?

Step 4 — Notify admin for re-approval:
  SQL: INSERT INTO notifications ... 'Community post edited and pending re-approval'
       ↓
Returns: { success: true, message: 'Post updated and pending admin re-approval' }
```

**Critical design choice:** Edited posts are **reset to pending** and require re-approval. This prevents users from getting a post approved and then changing it to inappropriate content.

#### D7. Toggle Like — `toggleLike(postId, btn)` (community.js line 157)

```
Frontend: fetch('/api/community/posts/${postId}/like')  [POST]
       ↓
Backend: communityRoutes.js line 392
       ↓
Step 1 — Check if already liked:
  SQL: SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?

Step 2a — If already liked → UNLIKE:
  SQL: DELETE FROM post_likes WHERE post_id = ? AND user_id = ?
  SQL: UPDATE community_posts SET like_count = like_count - 1 WHERE id = ?

Step 2b — If not liked → LIKE:
  SQL: INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)
  SQL: UPDATE community_posts SET like_count = like_count + 1 WHERE id = ?
       ↓
Returns: { success: true, liked: true/false }
       ↓
Frontend toggles 'liked' class (red heart) and updates count ±1
```

**Note:** The route manually updates `like_count` on `community_posts`. Additionally, triggers `tr_like_insert` and `tr_like_delete` in `triggers.sql` ALSO update the count. This creates a **double-counting issue** — both the route AND the trigger increment/decrement the counter. This is a bug.

#### D8. Comments — Load, Add, Edit, Delete

**Load Comments — `loadComments(postId)` (community.js line 171):**

```
Frontend: fetch('/api/community/posts/${postId}/comments')  [GET]
       ↓
Backend: communityRoutes.js line 422
       ↓
SQL: SELECT c.*, u.name as author_name, u.photo_url as author_photo
     FROM post_comments c
     JOIN reg_info u ON c.user_id = u.id
     WHERE c.post_id = ?
     ORDER BY c.created_at ASC
       ↓
Frontend renders comment list with:
  - Avatar (first letter), author name, comment text
  - Edit/Delete buttons (only for own comments)
```

**Add Comment — `handleCommentKeypress()` (community.js line 263):**

```
User presses Enter in comment input
       ↓
Frontend: fetch('/api/community/posts/${postId}/comments')  [POST]
  body: { content }
       ↓
Backend: communityRoutes.js line 439
       ↓
Step 1 — Insert comment:
  SQL: INSERT INTO post_comments (post_id, user_id, content) VALUES (?, ?, ?)

Step 2 — Update comment count:
  SQL: UPDATE community_posts SET comment_count = comment_count + 1 WHERE id = ?

Step 3 — Return new comment with author info:
  SQL: SELECT c.*, u.name as author_name ... WHERE c.id = ?
       ↓
Frontend reloads comments and increments count display
```

**Note:** Same double-counting risk as likes — the route and trigger `tr_comment_insert` both increment `comment_count`.

**Edit Comment — `editComment(commentId, postId)` (community.js line 196):**

```
Frontend: SweetAlert2 textarea prompt with current content
       → fetch('/api/community/comments/${commentId}')  [PUT]
  body: { content }
       ↓
Backend: communityRoutes.js line 476
       ↓
Step 1 — Verify comment exists and user is author:
  SQL: SELECT id, user_id FROM post_comments WHERE id = ?
  → If user_id !== req.user.id → 403

Step 2 — Update:
  SQL: UPDATE post_comments SET content = ? WHERE id = ?
       ↓
Frontend reloads comments for that post
```

**Delete Comment — `deleteComment(commentId, postId)` (community.js line 230):**

```
Frontend: SweetAlert2 confirmation → fetch('/api/community/comments/${commentId}')  [DELETE]
       ↓
Backend: communityRoutes.js line 513
       ↓
Step 1 — Verify ownership (same as edit)

Step 2 — Delete:
  SQL: DELETE FROM post_comments WHERE id = ?

Step 3 — Update count (safe decrement):
  SQL: UPDATE community_posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = ?
       ↓
Frontend reloads comments and decrements count display
```

#### D9. Edit Group (community.js line 510)

Only visible to group admins/creators.

```
Frontend: Click "Edit Group" → Opens modal with current name, description, cover
       → fetch('/api/community/groups/${groupId}')  [PUT]
  body: FormData { name, description, cover_image (file) OR keep_existing_cover='true' }
       ↓
Backend: communityRoutes.js line 152
       ↓
Step 1 — Verify group exists:
  SQL: SELECT id, created_by, cover_image FROM community_groups WHERE id = ?

Step 2 — Verify authorization:
  SQL: SELECT role FROM community_members WHERE group_id = ? AND user_id = ?
  → Must be creator OR admin member

Step 3 — Handle cover image (same 3-case logic as post images)

Step 4 — Update group (status reset to 'pending'):
  SQL: UPDATE community_groups 
       SET name = ?, description = ?, cover_image = ?, status = 'pending'
       WHERE id = ?

Step 5 — Notify admin for re-approval
       ↓
Returns: { success: true, message: 'Group updated and pending admin re-approval' }
```

**Like edited posts, edited groups are reset to `pending`** and disappear from public view until re-approved.

---

## 4. ADMIN ENDPOINTS

These endpoints are used by the admin panel to moderate community content.

### Admin: List Pending Groups

```
GET /api/community/admin/groups
       ↓
Backend: communityRoutes.js line 553
       ↓
SQL: SELECT g.*, u.name as creator_name, u.email as creator_email
     FROM community_groups g
     JOIN reg_info u ON g.created_by = u.id
     WHERE g.status = 'pending'
     ORDER BY g.created_at ASC
```

### Admin: Approve/Reject Group

```
PUT /api/community/admin/groups/:id
  body: { action: 'approve' | 'reject' }
       ↓
Backend: communityRoutes.js line 572
       ↓
Step 1 — Update status:
  SQL: UPDATE community_groups SET status = ? WHERE id = ?  (status = 'approved' or 'rejected')

Step 2 — Notify the creator:
  SQL: INSERT INTO notifications (user_id, message)
       VALUES (created_by, 'Your group "X" has been approved/rejected')
```

### Admin: List Pending Posts

```
GET /api/community/admin/posts
       ↓
Backend: communityRoutes.js line 599
       ↓
SQL: SELECT p.*, u.name as author_name, g.name as group_name
     FROM community_posts p
     JOIN reg_info u ON p.user_id = u.id
     JOIN community_groups g ON p.group_id = g.id
     WHERE p.status = 'pending'
     ORDER BY p.created_at ASC
```

### Admin: Approve/Reject Post

```
PUT /api/community/admin/posts/:id
  body: { action: 'approve' | 'reject' }
       ↓
Backend: communityRoutes.js line 618
       ↓
Step 1 — Update status:
  SQL: UPDATE community_posts SET status = ? WHERE id = ?

Step 2 — Notify the author:
  SQL: INSERT INTO notifications (user_id, message)
       VALUES (user_id, 'Your community post has been approved/rejected')
```

---

## 5. DATABASE LAYER

### Tables Used

| Table | Purpose |
|---|---|
| `community_groups` | Groups/communities with approval status |
| `community_members` | Membership records (user ↔ group, with role) |
| `community_posts` | Posts within groups, with approval status |
| `post_likes` | Like records (user ↔ post, unique constraint) |
| `post_comments` | Comments on posts |
| `reg_info` | User registration table (author/creator lookup) |
| `notifications` | System notifications (admin alerts, approval notices) |

### `community_groups` Schema — `src/database/schema_full.sql` line 152

```sql
CREATE TABLE IF NOT EXISTS community_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,                -- group name
    description TEXT DEFAULT NULL,              -- optional description
    cover_image VARCHAR(255) DEFAULT NULL,      -- path to uploaded cover image
    created_by INT NOT NULL,                    -- FK → reg_info (creator)
    status ENUM('pending','approved','rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES reg_info(id) ON DELETE CASCADE
);
```

### `community_members` Schema — `src/database/schema_full.sql` line 166

```sql
CREATE TABLE IF NOT EXISTS community_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,                     -- FK → community_groups
    user_id INT NOT NULL,                      -- FK → reg_info
    role ENUM('member','admin') DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_membership (group_id, user_id),  -- prevents duplicate joins
    FOREIGN KEY (group_id) REFERENCES community_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES reg_info(id) ON DELETE CASCADE
);
```

### `community_posts` Schema — `src/database/schema_full.sql` line 180

```sql
CREATE TABLE IF NOT EXISTS community_posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,                     -- FK → community_groups
    user_id INT NOT NULL,                      -- FK → reg_info (author)
    content TEXT NOT NULL,                      -- post text content
    image_url VARCHAR(255) DEFAULT NULL,        -- optional attached image
    status ENUM('pending','approved','rejected') DEFAULT 'pending',
    like_count INT DEFAULT 0,                  -- denormalized counter
    comment_count INT DEFAULT 0,               -- denormalized counter
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL,    -- set on edit
    KEY idx_community_posts_group (group_id, status),  -- composite index for feed queries
    FOREIGN KEY (group_id) REFERENCES community_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES reg_info(id) ON DELETE CASCADE
);
```

### `post_comments` Schema — `src/database/schema_full.sql` line 536

```sql
CREATE TABLE IF NOT EXISTS post_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,                      -- FK → community_posts
    user_id INT NOT NULL,                      -- FK → reg_info (commenter)
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES reg_info(id) ON DELETE CASCADE
);
```

### `post_likes` Schema — `src/database/schema_full.sql` line 550

```sql
CREATE TABLE IF NOT EXISTS post_likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,                      -- FK → community_posts
    user_id INT NOT NULL,                      -- FK → reg_info (liker)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_like (post_id, user_id), -- one like per user per post
    FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES reg_info(id) ON DELETE CASCADE
);
```

**Key design points:**
- `community_members` has a UNIQUE constraint on `(group_id, user_id)` — prevents duplicate joins
- `post_likes` has a UNIQUE constraint on `(post_id, user_id)` — one like per user per post
- `community_posts` uses **denormalized counters** (`like_count`, `comment_count`) for fast feed rendering
- `community_posts` has a **composite index** on `(group_id, status)` for efficient feed queries
- All tables use `ON DELETE CASCADE` — deleting a group cascades to members, posts, likes, and comments

---

### Triggers — `src/database/triggers.sql`

Four triggers manage denormalized counters on `community_posts`:

#### Trigger 2: `tr_like_insert` (line 30)

```sql
CREATE TRIGGER tr_like_insert
AFTER INSERT ON post_likes
FOR EACH ROW
BEGIN
    UPDATE community_posts 
    SET like_count = like_count + 1 
    WHERE id = NEW.post_id;
END
```

#### Trigger 3: `tr_like_delete` (line 39)

```sql
CREATE TRIGGER tr_like_delete
AFTER DELETE ON post_likes
FOR EACH ROW
BEGIN
    UPDATE community_posts 
    SET like_count = GREATEST(like_count - 1, 0)
    WHERE id = OLD.post_id;
END
```

#### Trigger 4: `tr_comment_insert` (line 52)

```sql
CREATE TRIGGER tr_comment_insert
AFTER INSERT ON post_comments
FOR EACH ROW
BEGIN
    UPDATE community_posts 
    SET comment_count = comment_count + 1 
    WHERE id = NEW.post_id;
END
```

#### Trigger 5: `tr_comment_delete` (line 65)

```sql
CREATE TRIGGER tr_comment_delete
AFTER DELETE ON post_comments
FOR EACH ROW
BEGIN
    UPDATE community_posts 
    SET comment_count = GREATEST(comment_count - 1, 0)
    WHERE id = OLD.post_id;
END
```

**Bug: Double-counting** — The backend routes (`communityRoutes.js`) also manually run `UPDATE community_posts SET like_count = like_count + 1` and `comment_count = comment_count + 1` in the like/comment handlers. Since the triggers ALSO fire on INSERT/DELETE, the counters get incremented/decremented **twice**. Either the route-level updates or the triggers should be removed — not both.

---

### Database View — `src/database/views.sql` line 115

#### `v_community_analytics` — Group Analytics Dashboard

```sql
CREATE OR REPLACE VIEW v_community_analytics AS
SELECT 
    g.id AS group_id,
    g.name AS group_name,
    g.description,
    g.status AS group_status,
    g.cover_image,
    g.created_at,
    
    -- Creator Info
    creator.name AS created_by_name,
    creator.email AS creator_email,
    
    -- Membership Stats
    COALESCE(mem.member_count, 0) AS member_count,
    COALESCE(mem.admin_count, 0) AS admin_count,
    
    -- Post Statistics
    COALESCE(posts.total_posts, 0) AS total_posts,
    COALESCE(posts.approved_posts, 0) AS approved_posts,
    COALESCE(posts.pending_posts, 0) AS pending_posts,
    
    -- Engagement Metrics
    COALESCE(posts.total_likes, 0) AS total_likes,
    COALESCE(posts.total_comments, 0) AS total_comments,
    COALESCE(posts.avg_likes_per_post, 0) AS avg_likes_per_post,
    COALESCE(posts.avg_comments_per_post, 0) AS avg_comments_per_post,
    
    -- Activity Timeline
    DATEDIFF(CURDATE(), g.created_at) AS days_since_creation,
    posts.last_post_date,
    
    -- Group Classification
    CASE 
        WHEN member_count > 100 THEN 'Very Large'
        WHEN member_count > 50 THEN 'Large'
        WHEN member_count > 20 THEN 'Medium'
        WHEN member_count > 5 THEN 'Small'
        ELSE 'New'
    END AS group_size_category,
    
    -- Engagement Score
    (member_count * 2 + total_likes + total_comments * 2) AS engagement_score

FROM community_groups g
LEFT JOIN reg_info creator ON g.created_by = creator.id
LEFT JOIN (aggregate members) mem ON g.id = mem.group_id
LEFT JOIN (aggregate posts) posts ON g.id = posts.group_id;
```

This view provides a **single-row-per-group analytics dashboard** with membership stats, post stats, engagement scores, and group size classification.

---

### Complex Queries — `src/database/complex_queries.sql`

#### Query 3: User Engagement Score (line 97)

Uses CTEs to calculate a composite engagement score per user based on:
- Login count, post count, comment count, like count, group count, service request count
- Weighted formula: `(post_count * 10) + (comment_count * 5) + (like_count * 2) + (group_count * 5) + (login_count * 1) + (request_count * 3)`
- Categorizes users as: Expert (80+), Active (50+), Regular (20+), Newcomer

#### Query 7: Top 3 Active Members Per Group (line 350)

Uses `ROW_NUMBER() OVER (PARTITION BY group_id)` window function to rank members within each group by activity:
- Activity score: `posts * 5 + comments * 2 + likes * 1`
- Returns top 3 most active members per group

---

## 6. FILE UPLOAD SYSTEM — `src/middleware/uploadMiddleware.js`

```js
const storage = multer.diskStorage({
    destination: 'public/uploads/',
    filename: function(req, file, cb) {
        let prefix = 'profile';
        if (file.fieldname === 'cover_image') prefix = 'community';
        else if (file.fieldname === 'post_image') prefix = 'post';
        cb(null, prefix + '-' + req.user.id + '-' + Date.now() + '-' + random + ext);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },  // 5MB max
    fileFilter: /\.(jpg|jpeg|png|gif|webp)$/  // images only
});
```

- **Community cover images** → saved as `community-{userId}-{timestamp}.{ext}`
- **Post images** → saved as `post-{userId}-{timestamp}.{ext}`
- All uploaded to `public/uploads/` directory (served statically)

---

## 7. ROUTE MOUNTING — `src/app.js`

```js
// Line 78-79: Community routes
const communityRoutes = require('./routes/communityRoutes');
app.use('/api/community', communityRoutes);
```

All community endpoints are under `/api/community/*`.

---

## 8. COMPLETE API ENDPOINT MAP

| Method | Endpoint | File:Line | Purpose |
|---|---|---|---|
| GET | `/api/community/groups` | communityRoutes.js:18 | Get all approved groups |
| GET | `/api/community/my-groups` | communityRoutes.js:38 | Get user's joined groups |
| POST | `/api/community/groups` | communityRoutes.js:62 | Create new group (pending) |
| GET | `/api/community/groups/:id` | communityRoutes.js:101 | Get group detail + posts |
| PUT | `/api/community/groups/:id` | communityRoutes.js:152 | Edit group (admin only) |
| POST | `/api/community/groups/:id/join` | communityRoutes.js:226 | Join a group |
| POST | `/api/community/groups/:id/leave` | communityRoutes.js:253 | Leave a group |
| POST | `/api/community/groups/:id/posts` | communityRoutes.js:280 | Create post in group (pending) |
| PUT | `/api/community/posts/:id` | communityRoutes.js:325 | Edit own post (reset to pending) |
| POST | `/api/community/posts/:id/like` | communityRoutes.js:392 | Toggle like on a post |
| GET | `/api/community/posts/:id/comments` | communityRoutes.js:422 | Get comments for a post |
| POST | `/api/community/posts/:id/comments` | communityRoutes.js:439 | Add comment to a post |
| PUT | `/api/community/comments/:id` | communityRoutes.js:476 | Edit own comment |
| DELETE | `/api/community/comments/:id` | communityRoutes.js:513 | Delete own comment |
| GET | `/api/community/admin/groups` | communityRoutes.js:553 | Admin: list pending groups |
| PUT | `/api/community/admin/groups/:id` | communityRoutes.js:572 | Admin: approve/reject group |
| GET | `/api/community/admin/posts` | communityRoutes.js:599 | Admin: list pending posts |
| PUT | `/api/community/admin/posts/:id` | communityRoutes.js:618 | Admin: approve/reject post |

---

## 9. VISUAL FLOW SUMMARY

```
User opens community.html
  ├── Auth check (JWT token in localStorage)
  ├── loadUserInfo() → GET /api/dashboard/summary → sets currentUserName, currentUserId
  │
  ├── [Discover Tab] → GET /community/groups → community_groups (status='approved') + member count
  │
  ├── [My Groups Tab] → GET /community/my-groups → community_members JOIN community_groups
  │
  ├── [Create Group Tab]
  │   └── Submit form (name, description, cover image file)
  │       → POST /community/groups (multipart FormData)
  │       → INSERT community_groups (status='pending')
  │       → INSERT community_members (role='admin')  ← creator auto-joined
  │       → INSERT notifications (admin notified)
  │
  └── [Group Detail View] — clicked from Discover or My Groups
      │
      ├── Load group: GET /community/groups/:id
      │   → group info + membership check + approved posts with like status
      │
      ├── [Join]  → POST /community/groups/:id/join  → INSERT community_members
      ├── [Leave] → POST /community/groups/:id/leave → DELETE community_members
      │
      ├── [Create Post] → POST /community/groups/:id/posts (multipart)
      │   → INSERT community_posts (status='pending')
      │   → Admin notified
      │
      ├── [Edit Post] → PUT /community/posts/:id (multipart)
      │   → UPDATE community_posts (status reset to 'pending')
      │   → Admin notified for re-approval
      │
      ├── [Edit Group] → PUT /community/groups/:id (multipart, admin only)
      │   → UPDATE community_groups (status reset to 'pending')
      │   → Group disappears from public until re-approved
      │
      ├── [Like/Unlike] → POST /community/posts/:id/like
      │   → INSERT or DELETE post_likes
      │   → UPDATE community_posts.like_count ±1
      │   → TRIGGER also fires (⚠ double-count bug)
      │
      └── [Comments]
          ├── Load:   GET /community/posts/:id/comments → post_comments JOIN reg_info
          ├── Add:    POST /community/posts/:id/comments → INSERT post_comments
          ├── Edit:   PUT /community/comments/:id → UPDATE post_comments
          └── Delete: DELETE /community/comments/:id → DELETE post_comments

  ADMIN PANEL (separate):
      ├── GET /community/admin/groups → pending groups queue
      ├── PUT /community/admin/groups/:id → approve/reject → notify creator
      ├── GET /community/admin/posts → pending posts queue
      └── PUT /community/admin/posts/:id → approve/reject → notify author
```

---

## 10. KNOWN ISSUES / DESIGN NOTES

1. **Double-counting bug on likes and comments:** Both the route handlers AND database triggers increment/decrement `like_count` and `comment_count`. This means every like adds +2 and every unlike subtracts -2 to the counter. Fix: remove the manual `UPDATE` statements from the routes since the triggers handle it.

2. **Admin endpoints lack admin authorization:** The admin routes (`/admin/groups`, `/admin/posts`) use `verifyToken` (applied to all routes) but do **not** check if the user is actually an admin. Any authenticated user could technically call these endpoints.

3. **No pagination:** Both `loadGroups()` and group posts load ALL records. For large communities this could become a performance issue. Consider adding `LIMIT/OFFSET` or cursor-based pagination.

4. **Comments don't require approval:** Unlike posts and groups, comments are published immediately without admin review. This is inconsistent with the approval-based moderation model.

5. **Edit of group resets status to pending:** This means any name/description typo fix by an admin causes the group to disappear from all members' feeds until re-approved.
