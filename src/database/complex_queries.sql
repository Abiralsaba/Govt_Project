-- ==========================================
-- COMPLEX SQL QUERIES
-- Central Government System - DBMS Project
-- ==========================================
-- This file contains advanced SQL queries demonstrating:
-- - Common Table Expressions (CTEs)
-- - Window Functions (RANK, NTILE, ROW_NUMBER, SUM OVER)
-- - ROLLUP and CUBE aggregations
-- - UNION operations
-- - Pivot tables
-- - Recursive CTEs
-- - Correlated subqueries
-- ==========================================


-- ========================================
-- QUERY 1: Hierarchical Location Report with ROLLUP
-- Shows land mutations aggregated by division > district with subtotals
-- ========================================
SELECT 
    COALESCE(d.name, '=== GRAND TOTAL ===') AS division,
    COALESCE(dist.name, CONCAT('--- ', d.name, ' Total ---')) AS district,
    COUNT(DISTINCT m.id) AS total_mutations,
    SUM(CASE WHEN m.status = 'Approved' THEN 1 ELSE 0 END) AS approved,
    SUM(CASE WHEN m.status = 'Pending' THEN 1 ELSE 0 END) AS pending,
    SUM(CASE WHEN m.status = 'Rejected' THEN 1 ELSE 0 END) AS rejected,
    COALESCE(SUM(m.land_price), 0) AS total_value,
    COALESCE(AVG(m.land_price), 0) AS avg_value,
    GROUP_CONCAT(DISTINCT m.status ORDER BY m.status) AS status_list
FROM divisions d
LEFT JOIN districts dist ON d.id = dist.division_id
LEFT JOIN upazilas u ON dist.id = u.district_id
LEFT JOIN land_mutations_v2 m ON u.id = m.upazila_id
GROUP BY d.name, dist.name WITH ROLLUP
HAVING total_mutations > 0 OR d.name IS NULL
ORDER BY 
    CASE WHEN d.name IS NULL THEN 1 ELSE 0 END,
    d.name,
    CASE WHEN dist.name IS NULL THEN 1 ELSE 0 END,
    dist.name;


-- ========================================
-- QUERY 2: Running Totals with Window Functions
-- Daily service requests with running totals and rankings
-- ========================================
SELECT 
    DATE(created_at) AS request_date,
    service_type,
    COUNT(*) AS daily_count,
    
    -- Running total per service type
    SUM(COUNT(*)) OVER (
        PARTITION BY service_type 
        ORDER BY DATE(created_at)
        ROWS UNBOUNDED PRECEDING
    ) AS running_total,
    
    -- Daily rank within each date
    RANK() OVER (
        PARTITION BY DATE(created_at) 
        ORDER BY COUNT(*) DESC
    ) AS daily_rank,
    
    -- Percentage of daily total
    ROUND(
        COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY DATE(created_at)),
        2
    ) AS pct_of_daily,
    
    -- Difference from previous day (same service)
    COUNT(*) - LAG(COUNT(*), 1, 0) OVER (
        PARTITION BY service_type 
        ORDER BY DATE(created_at)
    ) AS change_from_prev_day,
    
    -- 7-day moving average
    ROUND(
        AVG(COUNT(*)) OVER (
            PARTITION BY service_type 
            ORDER BY DATE(created_at)
            ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
        ), 2
    ) AS moving_avg_7d

FROM service_requests
WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
GROUP BY DATE(created_at), service_type
ORDER BY request_date DESC, daily_rank;


-- ========================================
-- QUERY 3: User Engagement Score with CTE
-- Comprehensive user activity scoring with multiple metrics
-- ========================================
WITH login_stats AS (
    SELECT user_id, COUNT(*) AS cnt FROM login_logs GROUP BY user_id
),
post_stats AS (
    SELECT user_id, COUNT(*) AS cnt FROM community_posts WHERE status = 'approved' GROUP BY user_id
),
comment_stats AS (
    SELECT user_id, COUNT(*) AS cnt FROM post_comments GROUP BY user_id
),
like_stats AS (
    SELECT user_id, COUNT(*) AS cnt FROM post_likes GROUP BY user_id
),
group_stats AS (
    SELECT user_id, COUNT(*) AS cnt FROM community_members GROUP BY user_id
),
request_stats AS (
    SELECT user_id, COUNT(*) AS cnt FROM service_requests GROUP BY user_id
),
user_metrics AS (
    SELECT 
        u.id AS user_id,
        u.name,
        u.email,
        u.created_at AS join_date,
        DATEDIFF(CURDATE(), u.created_at) AS days_since_join,
        COALESCE(l.cnt, 0) AS login_count,
        COALESCE(p.cnt, 0) AS post_count,
        COALESCE(c.cnt, 0) AS comment_count,
        COALESCE(lk.cnt, 0) AS like_count,
        COALESCE(g.cnt, 0) AS group_count,
        COALESCE(r.cnt, 0) AS request_count
    FROM reg_info u
    LEFT JOIN login_stats l ON u.id = l.user_id
    LEFT JOIN post_stats p ON u.id = p.user_id
    LEFT JOIN comment_stats c ON u.id = c.user_id
    LEFT JOIN like_stats lk ON u.id = lk.user_id
    LEFT JOIN group_stats g ON u.id = g.user_id
    LEFT JOIN request_stats r ON u.id = r.user_id
),
scored_users AS (
    SELECT 
        *,
        -- Weighted engagement score
        (login_count * 1 + post_count * 10 + comment_count * 3 + 
         like_count * 1 + group_count * 5 + request_count * 2) AS engagement_score,
        -- Activity per day ratio
        ROUND(
            (login_count + post_count + comment_count) / GREATEST(days_since_join, 1),
            4
        ) AS activity_per_day
    FROM user_metrics
)
SELECT 
    user_id,
    name,
    email,
    join_date,
    login_count,
    post_count,
    comment_count,
    group_count,
    engagement_score,
    activity_per_day,
    
    -- Quartile ranking
    NTILE(4) OVER (ORDER BY engagement_score DESC) AS quartile,
    
    -- Percentile rank
    ROUND(PERCENT_RANK() OVER (ORDER BY engagement_score) * 100, 2) AS percentile,
    
    -- User tier classification
    CASE 
        WHEN engagement_score >= 200 THEN 'Champion'
        WHEN engagement_score >= 100 THEN 'Power User'
        WHEN engagement_score >= 50 THEN 'Active'
        WHEN engagement_score >= 20 THEN 'Regular'
        WHEN engagement_score >= 5 THEN 'Beginner'
        ELSE 'Inactive'
    END AS user_tier,
    
    -- Row number for ranking
    ROW_NUMBER() OVER (ORDER BY engagement_score DESC) AS rank_position

FROM scored_users
ORDER BY engagement_score DESC;


-- ========================================
-- QUERY 4: Document Expiry Alert System
-- Union query combining multiple document types with expiry analysis
-- ========================================
SELECT * FROM (
    SELECT 
        u.id AS user_id,
        u.name,
        u.email,
        u.mobile,
        'NID' AS document_type,
        g.identity_number AS doc_number,
        g.expiry_date,
        DATEDIFF(g.expiry_date, CURDATE()) AS days_until_expiry,
        CASE 
            WHEN g.expiry_date < CURDATE() THEN 'EXPIRED'
            WHEN DATEDIFF(g.expiry_date, CURDATE()) <= 7 THEN 'CRITICAL - 1 WEEK'
            WHEN DATEDIFF(g.expiry_date, CURDATE()) <= 30 THEN 'WARNING - 1 MONTH'
            WHEN DATEDIFF(g.expiry_date, CURDATE()) <= 90 THEN 'NOTICE - 3 MONTHS'
            ELSE 'OK'
        END AS alert_level,
        CASE 
            WHEN g.expiry_date < CURDATE() THEN 5
            WHEN DATEDIFF(g.expiry_date, CURDATE()) <= 7 THEN 4
            WHEN DATEDIFF(g.expiry_date, CURDATE()) <= 30 THEN 3
            WHEN DATEDIFF(g.expiry_date, CURDATE()) <= 90 THEN 2
            ELSE 1
        END AS priority_order
    FROM reg_info u
    JOIN govt_user_documents g ON u.id = g.user_id AND g.doc_category = 'NID'
    WHERE g.expiry_date IS NOT NULL

    UNION ALL

    SELECT 
        u.id, u.name, u.email, u.mobile,
        'Passport', g.identity_number, g.expiry_date,
        DATEDIFF(g.expiry_date, CURDATE()),
        CASE 
            WHEN g.expiry_date < CURDATE() THEN 'EXPIRED'
            WHEN DATEDIFF(g.expiry_date, CURDATE()) <= 7 THEN 'CRITICAL - 1 WEEK'
            WHEN DATEDIFF(g.expiry_date, CURDATE()) <= 30 THEN 'WARNING - 1 MONTH'
            WHEN DATEDIFF(g.expiry_date, CURDATE()) <= 90 THEN 'NOTICE - 3 MONTHS'
            ELSE 'OK'
        END,
        CASE 
            WHEN g.expiry_date < CURDATE() THEN 5
            WHEN DATEDIFF(g.expiry_date, CURDATE()) <= 7 THEN 4
            WHEN DATEDIFF(g.expiry_date, CURDATE()) <= 30 THEN 3
            WHEN DATEDIFF(g.expiry_date, CURDATE()) <= 90 THEN 2
            ELSE 1
        END
    FROM reg_info u
    JOIN govt_user_documents g ON u.id = g.user_id AND g.doc_category = 'Passport'
    WHERE g.expiry_date IS NOT NULL
) AS expiry_report
WHERE alert_level != 'OK'
ORDER BY priority_order DESC, days_until_expiry ASC;


-- ========================================
-- QUERY 5: Monthly Service Pivot Table
-- Cross-tabulation of services by month
-- ========================================
SELECT 
    service_type,
    SUM(CASE WHEN MONTH(created_at) = 1 THEN 1 ELSE 0 END) AS `Jan`,
    SUM(CASE WHEN MONTH(created_at) = 2 THEN 1 ELSE 0 END) AS `Feb`,
    SUM(CASE WHEN MONTH(created_at) = 3 THEN 1 ELSE 0 END) AS `Mar`,
    SUM(CASE WHEN MONTH(created_at) = 4 THEN 1 ELSE 0 END) AS `Apr`,
    SUM(CASE WHEN MONTH(created_at) = 5 THEN 1 ELSE 0 END) AS `May`,
    SUM(CASE WHEN MONTH(created_at) = 6 THEN 1 ELSE 0 END) AS `Jun`,
    SUM(CASE WHEN MONTH(created_at) = 7 THEN 1 ELSE 0 END) AS `Jul`,
    SUM(CASE WHEN MONTH(created_at) = 8 THEN 1 ELSE 0 END) AS `Aug`,
    SUM(CASE WHEN MONTH(created_at) = 9 THEN 1 ELSE 0 END) AS `Sep`,
    SUM(CASE WHEN MONTH(created_at) = 10 THEN 1 ELSE 0 END) AS `Oct`,
    SUM(CASE WHEN MONTH(created_at) = 11 THEN 1 ELSE 0 END) AS `Nov`,
    SUM(CASE WHEN MONTH(created_at) = 12 THEN 1 ELSE 0 END) AS `Dec`,
    COUNT(*) AS `Total`,
    ROUND(COUNT(*) / 12.0, 2) AS `Monthly_Avg`
FROM service_requests
WHERE YEAR(created_at) = YEAR(CURDATE())
GROUP BY service_type
WITH ROLLUP
ORDER BY 
    CASE WHEN service_type IS NULL THEN 1 ELSE 0 END,
    `Total` DESC;


-- ========================================
-- QUERY 6: Recursive CTE - Location Hierarchy Path
-- Builds full path for location hierarchy
-- ========================================
WITH RECURSIVE location_tree AS (
    -- Base: All divisions
    SELECT 
        d.id,
        d.name,
        'Division' AS level_type,
        1 AS level_depth,
        CAST(d.name AS CHAR(500)) AS full_path,
        d.id AS division_id,
        NULL AS district_id,
        NULL AS upazila_id
    FROM divisions d
    
    UNION ALL
    
    -- Districts under divisions
    SELECT 
        dist.id,
        dist.name,
        'District',
        2,
        CONCAT(lt.full_path, ' > ', dist.name),
        lt.division_id,
        dist.id,
        NULL
    FROM districts dist
    JOIN location_tree lt ON dist.division_id = lt.id AND lt.level_type = 'Division'
    
    UNION ALL
    
    -- Upazilas under districts
    SELECT 
        u.id,
        u.name,
        'Upazila',
        3,
        CONCAT(lt.full_path, ' > ', u.name),
        lt.division_id,
        lt.district_id,
        u.id
    FROM upazilas u
    JOIN location_tree lt ON u.district_id = lt.id AND lt.level_type = 'District'
)
SELECT 
    id,
    name,
    level_type,
    level_depth,
    full_path,
    -- Count land mutations at this location
    (
        SELECT COUNT(*) FROM land_mutations_v2 m
        WHERE 
            (level_type = 'Division' AND m.division_id = location_tree.division_id) OR
            (level_type = 'District' AND m.district_id = location_tree.district_id) OR
            (level_type = 'Upazila' AND m.upazila_id = location_tree.upazila_id)
    ) AS mutation_count
FROM location_tree
ORDER BY full_path;


-- ========================================
-- QUERY 7: Correlated Subquery - Top Performers per Category
-- Top 3 most active users in each community group
-- ========================================
SELECT 
    g.id AS group_id,
    g.name AS group_name,
    u.id AS user_id,
    u.name AS user_name,
    member_activity.post_count,
    member_activity.comment_count,
    member_activity.like_count,
    member_activity.total_activity,
    member_activity.rank_in_group
FROM (
    SELECT 
        m.group_id,
        m.user_id,
        COALESCE(post_cnt.cnt, 0) AS post_count,
        COALESCE(comment_cnt.cnt, 0) AS comment_count,
        COALESCE(like_cnt.cnt, 0) AS like_count,
        COALESCE(post_cnt.cnt, 0) * 5 + 
        COALESCE(comment_cnt.cnt, 0) * 2 + 
        COALESCE(like_cnt.cnt, 0) AS total_activity,
        ROW_NUMBER() OVER (
            PARTITION BY m.group_id 
            ORDER BY (
                COALESCE(post_cnt.cnt, 0) * 5 + 
                COALESCE(comment_cnt.cnt, 0) * 2 + 
                COALESCE(like_cnt.cnt, 0)
            ) DESC
        ) AS rank_in_group
    FROM community_members m
    LEFT JOIN (
        SELECT user_id, group_id, COUNT(*) AS cnt 
        FROM community_posts WHERE status = 'approved' 
        GROUP BY user_id, group_id
    ) post_cnt ON m.user_id = post_cnt.user_id AND m.group_id = post_cnt.group_id
    LEFT JOIN (
        SELECT pc.user_id, p.group_id, COUNT(*) AS cnt 
        FROM post_comments pc
        JOIN community_posts p ON pc.post_id = p.id
        GROUP BY pc.user_id, p.group_id
    ) comment_cnt ON m.user_id = comment_cnt.user_id AND m.group_id = comment_cnt.group_id
    LEFT JOIN (
        SELECT pl.user_id, p.group_id, COUNT(*) AS cnt 
        FROM post_likes pl
        JOIN community_posts p ON pl.post_id = p.id
        GROUP BY pl.user_id, p.group_id
    ) like_cnt ON m.user_id = like_cnt.user_id AND m.group_id = like_cnt.group_id
) member_activity
JOIN community_groups g ON member_activity.group_id = g.id
JOIN reg_info u ON member_activity.user_id = u.id
WHERE member_activity.rank_in_group <= 3
ORDER BY g.name, member_activity.rank_in_group;


-- ========================================
-- QUERY 8: Complex Aggregation - Division Performance Dashboard
-- Multi-level aggregation with derived metrics
-- ========================================
WITH division_metrics AS (
    SELECT 
        d.id AS division_id,
        d.name AS division_name,
        
        -- User metrics
        (SELECT COUNT(*) FROM reg_info r 
         JOIN addresses a ON r.id = a.user_id 
         WHERE a.division_id = d.id) AS user_count,
        
        -- Land metrics
        (SELECT COUNT(*) FROM land_mutations_v2 WHERE division_id = d.id) AS total_mutations,
        (SELECT SUM(land_price) FROM land_mutations_v2 WHERE division_id = d.id AND status = 'Approved') AS total_land_value,
        (SELECT COUNT(*) FROM land_mutations_v2 WHERE division_id = d.id AND status = 'Pending') AS pending_mutations,
        
        -- Service metrics
        (SELECT COUNT(*) FROM service_requests sr
         JOIN reg_info r ON sr.user_id = r.id
         JOIN addresses a ON r.id = a.user_id
         WHERE a.division_id = d.id) AS service_requests,
        
        -- District count
        (SELECT COUNT(*) FROM districts WHERE division_id = d.id) AS district_count,
        
        -- Upazila count
        (SELECT COUNT(*) FROM upazilas u 
         JOIN districts di ON u.district_id = di.id 
         WHERE di.division_id = d.id) AS upazila_count
    FROM divisions d
)
SELECT 
    division_name,
    user_count,
    district_count,
    upazila_count,
    total_mutations,
    pending_mutations,
    COALESCE(total_land_value, 0) AS total_land_value,
    service_requests,
    
    -- Derived metrics
    ROUND(COALESCE(total_land_value, 0) / GREATEST(total_mutations, 1), 2) AS avg_land_value,
    ROUND(user_count * 1.0 / GREATEST(upazila_count, 1), 2) AS users_per_upazila,
    ROUND(total_mutations * 100.0 / (SELECT SUM(total_mutations) FROM division_metrics), 2) AS pct_of_total_mutations,
    
    -- Performance rank
    RANK() OVER (ORDER BY COALESCE(total_land_value, 0) DESC) AS value_rank,
    RANK() OVER (ORDER BY total_mutations DESC) AS mutation_rank
    
FROM division_metrics
ORDER BY total_land_value DESC;
