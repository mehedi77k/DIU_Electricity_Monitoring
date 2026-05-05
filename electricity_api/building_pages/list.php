SELECT id, building_name, verification_table, page_link, created_at
FROM building_pages
WHERE campus_table = 'daffodil_smart_city'
AND is_active = 1
ORDER BY created_at DESC;