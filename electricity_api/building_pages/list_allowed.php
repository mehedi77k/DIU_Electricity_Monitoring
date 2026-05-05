SELECT id, building_name
FROM building_catalog
WHERE campus_table = 'daffodil_smart_city'
AND is_active = 1
ORDER BY building_name ASC;