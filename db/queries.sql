-- Query 1: Join query
-- List clothing items with their owner, closet, category, color, and tag.
SELECT
    U.username,
    C.c_name AS closet_name,
    I.item_name,
    I.size,
    COALESCE(K.category, '') AS category,
    COALESCE(L.color, '') AS color,
    COALESCE(T.tag, '') AS tag,
    I.last_worn
FROM CLOTH_ITEM I
JOIN CLOSET C ON I.c_id = C.c_id
JOIN USER U ON C.u_id = U.u_id
LEFT JOIN CLOTH_CATEGORY K ON I.item_id = K.item_id
LEFT JOIN CLOTH_COLOR L ON I.item_id = L.item_id
LEFT JOIN CLOTH_TAG T ON I.item_id = T.item_id
ORDER BY U.username, C.c_name, I.item_name;

-- Query 2: Aggregation and grouping query
-- Count clothing items by category for the wardrobe catalog report.
SELECT
    COALESCE(K.category, 'Uncategorized') AS category,
    COUNT(DISTINCT I.item_id) AS item_count
FROM CLOTH_ITEM I
LEFT JOIN CLOTH_CATEGORY K ON I.item_id = K.item_id
GROUP BY COALESCE(K.category, 'Uncategorized')
ORDER BY item_count DESC, category ASC;

-- Query 3: Subquery
-- Find outfits that contain at least three clothing items.
SELECT
    O.outfit_id,
    O.outfit_name,
    O.created_date
FROM OUTFIT O
WHERE O.outfit_id IN (
    SELECT outfit_id
    FROM INCLUDES
    GROUP BY outfit_id
    HAVING COUNT(item_id) >= 3
)
ORDER BY O.created_date DESC;

-- Query 4: Usage report
-- Rank items by how often they appear in recorded outfits.
SELECT
    I.item_id,
    I.item_name,
    COUNT(R.datetime) AS wear_count,
    MAX(R.datetime) AS last_recorded
FROM CLOTH_ITEM I
LEFT JOIN INCLUDES N ON I.item_id = N.item_id
LEFT JOIN RECORD R ON N.outfit_id = R.outfit_id
GROUP BY I.item_id, I.item_name
ORDER BY wear_count DESC, I.item_name ASC;
