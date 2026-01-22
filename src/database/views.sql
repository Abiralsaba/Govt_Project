-- ==========================================
-- DATABASE VIEWS
-- Central Government System
-- ==========================================

-- ==========================================
-- VIEW 1: Comprehensive Citizen Profile
-- Joins multiple tables to show complete user information
-- ==========================================
CREATE OR REPLACE VIEW v_citizen_profile AS
SELECT 
    u.id AS user_id,
    u.name AS full_name,
    u.nid,
    u.email,
    u.mobile,
    u.gender,
    u.dob,
    TIMESTAMPDIFF(YEAR, u.dob, CURDATE()) AS age,
    u.address,
    u.photo_url,
    u.created_at AS registration_date,
    
    -- NID Document Info
    nid_doc.identity_number AS nid_number,
    nid_doc.status AS nid_status,
    nid_doc.file_path AS nid_file,
    
    -- Passport Document Info
    pass_doc.identity_number AS passport_number,
    pass_doc.status AS passport_status,
    
    -- Tax Document Info
    tax_doc.identity_number AS tin_number,
    tax_doc.status AS tax_status,
    
    -- Land Records Summary
    (SELECT COUNT(*) FROM my_land_record WHERE user_id = u.id) AS total_land_records,
    (SELECT COALESCE(SUM(land_size), 0) FROM my_land_record WHERE user_id = u.id) AS total_land_area_decimal,
    
    -- Service Requests Summary
    (SELECT COUNT(*) FROM service_requests WHERE user_id = u.id) AS total_requests,
    (SELECT COUNT(*) FROM service_requests WHERE user_id = u.id AND status = 'pending') AS pending_requests,
    (SELECT COUNT(*) FROM service_requests WHERE user_id = u.id AND status = 'approved') AS approved_requests,
    
    -- Activity Summary
    (SELECT COUNT(*) FROM login_logs WHERE user_id = u.id) AS total_logins,
    (SELECT MAX(login_time) FROM login_logs WHERE user_id = u.id) AS last_login

FROM reg_info u
LEFT JOIN govt_user_documents nid_doc ON u.id = nid_doc.user_id AND nid_doc.doc_category = 'NID'
LEFT JOIN govt_user_documents pass_doc ON u.id = pass_doc.user_id AND pass_doc.doc_category = 'Passport'
LEFT JOIN govt_user_documents tax_doc ON u.id = tax_doc.user_id AND tax_doc.doc_category = 'Tax';


-- ==========================================
-- VIEW 2: Land Ownership Report by Location
-- Aggregates land inventory data by geographic hierarchy
-- ==========================================
CREATE OR REPLACE VIEW v_land_by_location AS
SELECT 
    d.id AS division_id,
    d.name AS division,
    dist.id AS district_id,
    dist.name AS district,
    up.id AS upazila_id,
    up.name AS upazila,
    
    -- Parcel Statistics
    COUNT(l.id) AS total_parcels,
    SUM(CASE WHEN l.status = 'Approved' THEN 1 ELSE 0 END) AS approved_parcels,
    SUM(CASE WHEN l.status = 'Pending' THEN 1 ELSE 0 END) AS pending_parcels,
    SUM(CASE WHEN l.status = 'Rejected' THEN 1 ELSE 0 END) AS rejected_parcels,
    
    -- Value Statistics
    COALESCE(SUM(l.land_size), 0) AS total_land_area,
    COALESCE(SUM(l.land_price), 0) AS total_valuation,
    COALESCE(AVG(l.land_price), 0) AS avg_parcel_value,
    
    -- Time-based stats
    MIN(l.recorded_at) AS first_record_date,
    MAX(l.recorded_at) AS last_record_date

FROM divisions d
LEFT JOIN districts dist ON d.id = dist.division_id
LEFT JOIN upazilas up ON dist.id = up.district_id
LEFT JOIN my_land_record l ON up.id = l.upazila_id
GROUP BY d.id, d.name, dist.id, dist.name, up.id, up.name
HAVING total_parcels > 0
ORDER BY d.name, dist.name, up.name;


-- ==========================================
-- VIEW 3: Community Group Analytics
-- Provides insights into group activity and engagement
-- ==========================================
CREATE OR REPLACE VIEW v_community_analytics AS
SELECT 
    g.id AS group_id,
    g.name AS group_name,
    g.description,
    g.status AS group_status,
    g.cover_image,
    g.created_at,
    
    -- Creator Info
    creator.id AS creator_id,
    creator.name AS created_by_name,
    creator.email AS creator_email,
    
    -- Membership Stats (Aggr)
    COALESCE(mem.member_count, 0) AS member_count,
    COALESCE(mem.admin_count, 0) AS admin_count,
    
    -- Post Statistics (Aggr)
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
        WHEN COALESCE(mem.member_count, 0) > 100 THEN 'Very Large'
        WHEN COALESCE(mem.member_count, 0) > 50 THEN 'Large'
        WHEN COALESCE(mem.member_count, 0) > 20 THEN 'Medium'
        WHEN COALESCE(mem.member_count, 0) > 5 THEN 'Small'
        ELSE 'New'
    END AS group_size_category,
    
    -- Engagement Score
    (COALESCE(mem.member_count, 0) * 2 + COALESCE(posts.total_likes, 0) + COALESCE(posts.total_comments, 0) * 2) AS engagement_score

FROM community_groups g
LEFT JOIN reg_info creator ON g.created_by = creator.id
-- Aggregate Members
LEFT JOIN (
    SELECT 
        group_id, 
        COUNT(DISTINCT user_id) AS member_count,
        COUNT(DISTINCT CASE WHEN role = 'admin' THEN user_id END) AS admin_count
    FROM community_members
    GROUP BY group_id
) mem ON g.id = mem.group_id
-- Aggregate Posts
LEFT JOIN (
    SELECT 
        group_id,
        COUNT(id) AS total_posts,
        COUNT(CASE WHEN status = 'approved' THEN id END) AS approved_posts,
        COUNT(CASE WHEN status = 'pending' THEN id END) AS pending_posts,
        SUM(like_count) AS total_likes,
        SUM(comment_count) AS total_comments,
        AVG(like_count) AS avg_likes_per_post,
        AVG(comment_count) AS avg_comments_per_post,
        MAX(created_at) AS last_post_date
    FROM community_posts
    GROUP BY group_id
) posts ON g.id = posts.group_id;


-- ==========================================
-- VIEW 4: Service Request Dashboard
-- Daily aggregated service request statistics
-- ==========================================
CREATE OR REPLACE VIEW v_service_dashboard AS
SELECT 
    DATE(created_at) AS request_date,
    YEAR(created_at) AS year,
    MONTH(created_at) AS month,
    DAYNAME(created_at) AS day_name,
    service_type,
    
    -- Counts
    COUNT(*) AS total_requests,
    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
    SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved_count,
    SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected_count,
    
    -- Percentages
    ROUND(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) AS approval_rate,
    ROUND(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) AS rejection_rate,
    
    -- Unique Users
    COUNT(DISTINCT user_id) AS unique_users

FROM service_requests
GROUP BY DATE(created_at), YEAR(created_at), MONTH(created_at), DAYNAME(created_at), service_type
ORDER BY request_date DESC, service_type;


-- ==========================================
-- VIEW 5: User Activity Summary
-- Comprehensive user engagement metrics
-- ==========================================
CREATE OR REPLACE VIEW v_user_activity AS
SELECT 
    u.id AS user_id,
    u.name,
    u.email,
    u.created_at AS registration_date,
    DATEDIFF(CURDATE(), u.created_at) AS days_since_registration,
    
    -- Login Activity
    COALESCE(login_stats.total_logins, 0) AS total_logins,
    login_stats.last_login,
    login_stats.first_login,
    
    -- Service Requests
    COALESCE(service_stats.total_requests, 0) AS total_service_requests,
    COALESCE(service_stats.pending_requests, 0) AS pending_requests,
    COALESCE(service_stats.approved_requests, 0) AS approved_requests,
    
    -- Task/Todo Activity
    COALESCE(todo_stats.total_todos, 0) AS total_todos,
    COALESCE(todo_stats.completed_todos, 0) AS completed_todos,
    
    -- Community Activity
    COALESCE(community_stats.groups_joined, 0) AS groups_joined,
    COALESCE(community_stats.posts_created, 0) AS posts_created,
    COALESCE(community_stats.comments_made, 0) AS comments_made,
    COALESCE(community_stats.likes_given, 0) AS likes_given,
    
    -- Document Count
    COALESCE(doc_stats.document_count, 0) AS documents_uploaded,
    
    -- Overall Activity Score
    (
        COALESCE(login_stats.total_logins, 0) * 1 +
        COALESCE(service_stats.total_requests, 0) * 3 +
        COALESCE(community_stats.posts_created, 0) * 5 +
        COALESCE(community_stats.comments_made, 0) * 2 +
        COALESCE(community_stats.groups_joined, 0) * 3
    ) AS activity_score,
    
    -- User Classification
    CASE 
        WHEN (
            COALESCE(login_stats.total_logins, 0) * 1 +
            COALESCE(community_stats.posts_created, 0) * 5 +
            COALESCE(community_stats.comments_made, 0) * 2
        ) >= 100 THEN 'Power User'
        WHEN (
            COALESCE(login_stats.total_logins, 0) * 1 +
            COALESCE(community_stats.posts_created, 0) * 5
        ) >= 50 THEN 'Active'
        WHEN COALESCE(login_stats.total_logins, 0) >= 10 THEN 'Regular'
        ELSE 'New'
    END AS user_tier

FROM reg_info u

LEFT JOIN (
    SELECT user_id, 
           COUNT(*) AS total_logins,
           MAX(login_time) AS last_login,
           MIN(login_time) AS first_login
    FROM login_logs GROUP BY user_id
) login_stats ON u.id = login_stats.user_id

LEFT JOIN (
    SELECT user_id,
           COUNT(*) AS total_requests,
           SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_requests,
           SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved_requests
    FROM service_requests GROUP BY user_id
) service_stats ON u.id = service_stats.user_id

LEFT JOIN (
    SELECT user_id,
           COUNT(*) AS total_todos,
           SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS completed_todos
    FROM todos GROUP BY user_id
) todo_stats ON u.id = todo_stats.user_id

LEFT JOIN (
    SELECT 
        cm.user_id,
        COUNT(DISTINCT cm.group_id) AS groups_joined,
        COUNT(DISTINCT cp.id) AS posts_created,
        COUNT(DISTINCT pc.id) AS comments_made,
        COUNT(DISTINCT pl.id) AS likes_given
    FROM community_members cm
    LEFT JOIN community_posts cp ON cm.user_id = cp.user_id
    LEFT JOIN post_comments pc ON cm.user_id = pc.user_id
    LEFT JOIN post_likes pl ON cm.user_id = pl.user_id
    GROUP BY cm.user_id
) community_stats ON u.id = community_stats.user_id

LEFT JOIN (
    SELECT user_id, COUNT(*) AS document_count
    FROM user_documents GROUP BY user_id
) doc_stats ON u.id = doc_stats.user_id;


-- ==========================================
-- VIEW 6: User Land Summary
-- Shows aggregated land holdings for each user (one row per user)
-- ==========================================
CREATE OR REPLACE VIEW v_user_land_details AS
SELECT 
    -- User Information
    u.id AS user_id,
    u.name AS owner_name,
    u.nid AS owner_nid,
    u.email AS owner_email,
    u.mobile AS owner_mobile,
    
    -- Aggregated Land Statistics
    COUNT(l.id) AS total_land_parcels,
    COALESCE(SUM(l.land_size), 0) AS total_land_area,
    COALESCE(SUM(l.land_price), 0) AS total_land_value,
    
    -- Land Status Breakdown
    SUM(CASE WHEN l.status = 'Approved' THEN 1 ELSE 0 END) AS approved_parcels,
    SUM(CASE WHEN l.status = 'Pending' THEN 1 ELSE 0 END) AS pending_parcels,
    
    -- Location Summary (comma-separated list of unique divisions)
    GROUP_CONCAT(DISTINCT COALESCE(d.name, l.division) SEPARATOR ', ') AS divisions_owned,
    GROUP_CONCAT(DISTINCT COALESCE(dist.name, l.district) SEPARATOR ', ') AS districts_owned,
    
    -- Khatian/Dag Summary
    GROUP_CONCAT(DISTINCT l.khatian_no SEPARATOR ', ') AS khatian_numbers,
    GROUP_CONCAT(DISTINCT l.dag_no SEPARATOR ', ') AS dag_numbers,
    
    -- Timeline
    MIN(l.recorded_at) AS first_record_date,
    MAX(l.recorded_at) AS last_record_date
    
FROM reg_info u
LEFT JOIN my_land_record l ON u.id = l.user_id
LEFT JOIN divisions d ON l.division_id = d.id
LEFT JOIN districts dist ON l.district_id = dist.id
LEFT JOIN upazilas up ON l.upazila_id = up.id
GROUP BY u.id, u.name, u.nid, u.email, u.mobile
HAVING COUNT(l.id) > 0
ORDER BY total_land_area DESC;

