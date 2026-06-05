# Prisma Migration Guide

## Migration Commands

### Development Environment
```bash
# Generate Prisma Client after schema changes
npx prisma generate

# Create a new migration (development only)
npx prisma migrate dev --name add_post_enhancements

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Push schema changes without migration (for prototyping)
npx prisma db push

# Open Prisma Studio to inspect database
npx prisma studio
```

### Production Environment (Render)
```bash
# Generate Prisma Client
npx prisma generate

# Deploy migrations (safe for production)
npx prisma migrate deploy

# Alternative: Push schema changes (use with caution)
npx prisma db push --accept-data-loss
```

### Build Script (package.json)
```json
{
  "scripts": {
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "migrate:deploy": "prisma migrate deploy",
    "db:push": "prisma db push --accept-data-loss",
    "build": "npm run prisma:generate && npm run db:push && tsc"
  }
}
```

## Schema Changes Summary

### 1. Post Model Enhancements
- Added `status` field with PostStatus enum (DRAFT, PUBLISHED, ARCHIVED, DELETED)
- Added `likes` counter (Int, default 0)
- Added `views` counter (Int, default 0)
- Added `updatedAt` timestamp
- Added indexes on: groupId, userId, status, createdAt
- Added relation to Comment model

### 2. Payment Model Improvements
- Changed `status` from String to PaymentStatus enum
- Added indexes on: status, subscriptionId
- Enhanced type safety for payment states

### 3. Subscription Model Updates
- Added `updatedAt` timestamp
- Added indexes on: userId, groupId, planId, status, expiresAt
- Added `onDelete: Cascade` to user and group relations
- Added EXPIRED status to SubscriptionStatus enum

### 4. User Model Enhancements
- Added `updatedAt` timestamp
- Added relation to Comment model
- Added indexes on: email, googleId, role, lastActivityAt

### 5. Group Model Improvements
- Added `onDelete: Cascade` to createdBy relation
- Added index on: createdById, isFeatured

### 6. Membership Model Updates
- Added `joinedAt` timestamp
- Added indexes on: userId, groupId
- Added `onDelete: Cascade` to user and group relations

### 7. Plan Model Enhancements
- Added `updatedAt` timestamp
- Added indexes on: type, isActive

### 8. Category Model Updates
- Added `createdAt` and `updatedAt` timestamps

### 9. RequestLog Model Improvements
- Added indexes on: userId, path, createdAt, success

### 10. New Models
- Added `Comment` model with proper relations and indexes
- Added `PaymentStatus` enum (PENDING, APPROVED, REJECTED, CANCELLED, REFUNDED)
- Added `PostStatus` enum (DRAFT, PUBLISHED, ARCHIVED, DELETED)

## Data Integrity Improvements

### Cascade Deletes
Added `onDelete: Cascade` to prevent orphaned records:
- User → Groups, Memberships, Subscriptions, Posts, Comments
- Group → Memberships, Subscriptions, Posts
- Post → Comments
- Subscription → Payment

### Indexes for Performance
Added strategic indexes for common query patterns:
- Foreign keys (userId, groupId, etc.)
- Status fields (for filtering)
- Timestamps (for sorting and date queries)
- Unique constraints (for data integrity)

## Next Steps

1. Run migration to apply schema changes:
   ```bash
   npx prisma migrate dev --name schema_enhancements
   ```

2. Regenerate Prisma Client:
   ```bash
   npx prisma generate
   ```

3. Update application code to handle new fields and enums

4. Test all CRUD operations

5. Deploy to production with `prisma migrate deploy`
