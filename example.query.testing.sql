-- Contoh 1: Admin Akun (Password: admin123, Role: ADMIN, Status: ACTIVE)
INSERT INTO "users" (
    "id", 
    "email", 
    "password_hash", 
    "name", 
    "role", 
    "status", 
    "must_change_password",
    "failed_login_attempts",
    "created_at", 
    "updated_at"
) VALUES (
    gen_random_uuid()::text,
    'admin@widya.com',
    '$2b$10$b/yZu/4JFtO5P/7SL4fqFu14y795p/r307/TQxlkHfxROhbuqVM3e', -- Hash dari: admin123
    'Super Admin',
    'ADMIN'::"Role",
    'ACTIVE'::"UserStatus",
    false,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Contoh 2: Viewer / Operator Akun (Password: password123, Role: VIEWER, Status: ACTIVE)
INSERT INTO "users" (
    "id", 
    "email", 
    "password_hash", 
    "name", 
    "role", 
    "status", 
    "must_change_password",
    "failed_login_attempts",
    "created_at", 
    "updated_at"
) VALUES (
    gen_random_uuid()::text,
    'viewer@widya.com',
    '$2b$10$f12/.vT3tMI4tkiAxVYzOO7wot0EErTy07fMRE53DB5rifYa.Tcwm', -- Hash dari: password123
    'Operator Viewer',
    'VIEWER'::"Role",
    'ACTIVE'::"UserStatus",
    false,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
