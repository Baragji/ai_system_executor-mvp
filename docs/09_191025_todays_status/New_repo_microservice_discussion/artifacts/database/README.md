# Database Migration Strategy

## Tool: golang-migrate

**Why golang-migrate?**
- Simple, SQL-first approach
- Works great in CI/CD
- Zero-downtime migration support
- Active community, stable

## Setup

```bash
# Install golang-migrate
brew install golang-migrate

# Create migration
migrate create -seq -ext sql -dir db/migrations <name>

# Apply migrations
migrate -path db/migrations -database "$DATABASE_URL" up

# Rollback
migrate -path db/migrations -database "$DATABASE_URL" down 1
```

## CI Integration

Add to GitHub Actions:

```yaml
- name: Run migrations
  run: |
    curl -L https://github.com/golang-migrate/migrate/releases/download/v4.16.2/migrate.linux-amd64.tar.gz | tar xz
    ./migrate -path db/migrations -database "${{ secrets.DATABASE_URL }}" up
```

## Zero-Downtime Patterns

### 1. Add Column (Nullable)
```sql
-- up
ALTER TABLE users ADD COLUMN phone TEXT NULL;

-- Deploy code that writes to phone (optional)
-- Backfill existing rows
-- Deploy code that reads from phone

-- Later migration:
ALTER TABLE users ALTER COLUMN phone SET NOT NULL;
```

### 2. Rename Column
```sql
-- Step 1: Add new column
ALTER TABLE users ADD COLUMN full_name TEXT;

-- Deploy code that dual-writes (name → full_name)
-- Backfill: UPDATE users SET full_name = name WHERE full_name IS NULL;

-- Deploy code that reads from full_name
-- Drop old column in next migration:
ALTER TABLE users DROP COLUMN name;
```

### 3. Change Type
```sql
-- Add new typed column
ALTER TABLE runs ADD COLUMN timeout_seconds INT;

-- Dual-write + convert
-- UPDATE runs SET timeout_seconds = timeout_sec WHERE timeout_seconds IS NULL;

-- Switch reads to timeout_seconds
-- Drop old column
ALTER TABLE runs DROP COLUMN timeout_sec;
```

### 4. Add Foreign Key
```sql
-- Add FK without validation (fast)
ALTER TABLE deployments ADD CONSTRAINT fk_run 
  FOREIGN KEY (run_id) REFERENCES runs(id) NOT VALID;

-- Validate in background (doesn't block writes)
ALTER TABLE deployments VALIDATE CONSTRAINT fk_run;
```

## Cascade Behavior

| Parent Delete | Child Action | Reasoning |
|--------------|--------------|-----------|
| Tenant | CASCADE all children | Tenant removal = complete cleanup |
| User | RESTRICT if owns projects | Prevent accidental data loss |
| Project | CASCADE files/runs/envs | Project scope |
| Run | SET NULL in deployments | Deployment outlives run |
| File | SET NULL in collab_documents | Document may persist |

## Best Practices

1. **Always test rollback** - Every `up` must have a working `down`
2. **Small, incremental changes** - One logical change per migration
3. **Never modify committed migrations** - Create new migration to fix
4. **Include comments** - Explain WHY, not just WHAT
5. **Version control** - Migrations are code, treat as such
