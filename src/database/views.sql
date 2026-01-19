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
-- Aggregates land data by geographic hierarchy
-- ==========================================
CREATE OR REPLACE VIEW v_land_by_location AS
SELECT 
    d.id AS division_id,
    d.name AS division,
    dist.id AS district_id,
    dist.name AS district,
    up.id AS upazila_id,
    up.name AS upazila,
    
    -- Mutation Statistics
    COUNT(DISTINCT m.id) AS total_mutations,
    COUNT(DISTINCT CASE WHEN m.status = 'Approved' THEN m.id END) AS approved_mutations,
    COUNT(DISTINCT CASE WHEN m.status = 'Pending' THEN m.id END) AS pending_mutations,
    COUNT(DISTINCT CASE WHEN m.status = 'Rejected' THEN m.id END) AS rejected_mutations,
    
    -- Value Statistics
    COALESCE(SUM(CASE WHEN m.status = 'Approved' THEN CAST(m.land_amount AS DECIMAL(10,2)) ELSE 0 END), 0) AS total_land_traded_decimal,
    COALESCE(SUM(CASE WHEN m.status = 'Approved' THEN m.land_price ELSE 0 END), 0) AS total_transaction_value,
    COALESCE(AVG(CASE WHEN m.status = 'Approved' THEN m.land_price END), 0) AS avg_transaction_value,
    
    -- Time-based stats
    MIN(m.created_at) AS first_mutation_date,
    MAX(m.created_at) AS last_mutation_date

FROM divisions d
LEFT JOIN districts dist ON d.id = dist.division_id
LEFT JOIN upazilas up ON dist.id = up.district_id
LEFT JOIN land_mutations_v2 m ON up.id = m.upazila_id
GROUP BY d.id, d.name, dist.id, dist.name, up.id, up.name
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
    
    -- Membership Stats
    COUNT(DISTINCT m.user_id) AS member_count,
    COUNT(DISTINCT CASE WHEN m.role = 'admin' THEN m.user_id END) AS admin_count,
    
    -- Post Statistics
    COUNT(DISTINCT p.id) AS total_posts,
    COUNT(DISTINCT CASE WHEN p.status = 'approved' THEN p.id END) AS approved_posts,
    COUNT(DISTINCT CASE WHEN p.status = 'pending' THEN p.id END) AS pending_posts,
    
    -- Engagement Metrics
    COALESCE(SUM(p.like_count), 0) AS total_likes,
    COALESCE(SUM(p.comment_count), 0) AS total_comments,
    COALESCE(AVG(p.like_count), 0) AS avg_likes_per_post,
    COALESCE(AVG(p.comment_count), 0) AS avg_comments_per_post,
    
    -- Activity Timeline
    DATEDIFF(CURDATE(), g.created_at) AS days_since_creation,
    (SELECT MAX(cp.created_at) FROM community_posts cp WHERE cp.group_id = g.id) AS last_post_date,
    
    -- Group Classification
    CASE 
        WHEN COUNT(DISTINCT m.user_id) > 100 THEN 'Very Large'
        WHEN COUNT(DISTINCT m.user_id) > 50 THEN 'Large'
        WHEN COUNT(DISTINCT m.user_id) > 20 THEN 'Medium'
        WHEN COUNT(DISTINCT m.user_id) > 5 THEN 'Small'
        ELSE 'New'
    END AS group_size_category,
    
    -- Engagement Score
    (COUNT(DISTINCT m.user_id) * 2 + COALESCE(SUM(p.like_count), 0) + COALESCE(SUM(p.comment_count), 0) * 2) AS engagement_score

FROM community_groups g
LEFT JOIN reg_info creator ON g.created_by = creator.id
LEFT JOIN community_members m ON g.id = m.group_id
LEFT JOIN community_posts p ON g.id = p.group_id
GROUP BY g.id, g.name, g.description, g.status, g.cover_image, g.created_at,
         creator.id, creator.name, creator.email;


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
