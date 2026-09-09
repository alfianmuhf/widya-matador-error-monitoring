INSERT INTO "users" (
    "id", 
    "email", 
    "password", 
    "name", 
    "role", 
    "isActive", 
    "isVerified", 
    "createdAt", 
    "updatedAt"
) VALUES (
    gen_random_uuid()::text,
    'admin@widya.com',
    '$2b$10$b/yZu/4JFtO5P/7SL4fqFu14y795p/r307/TQxlkHfxROhbuqVM3e', -- Hash dari: admin123
    'Super Admin',
    'ADMIN'::"Role",
    true,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);







INSERT INTO "users" (
    "id", 
    "email", 
    "password", 
    "name", 
    "role", 
    "isActive", 
    "isVerified", 
    "createdAt", 
    "updatedAt"
) VALUES (
    gen_random_uuid()::text,
    'operator@widya.com',
    '$2b$10$f12/.vT3tMI4tkiAxVYzOO7wot0EErTy07fMRE53DB5rifYa.Tcwm', -- Hash dari: password123
    'Operator Robot',
    'USER'::"Role",
    true,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
