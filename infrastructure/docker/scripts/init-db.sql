-- =============================================================================
-- Restaurant OS — Database initialization script
-- Runs once when postgres container is first created
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- For text search
CREATE EXTENSION IF NOT EXISTS "btree_gin";  -- For composite GIN indexes

-- Create test database for running tests
CREATE DATABASE restaurant_os_test;
GRANT ALL PRIVILEGES ON DATABASE restaurant_os_test TO restaurantuser;
