# Production Deployment Guide

This document explains how to deploy the menu image changes to production.

## Issue
The new menu images for 8/6 (churrasco) and 8/7 (pizza) work perfectly in local development but are not visible on the production site (https://cheery-dango-2fd190.netlify.app/).

## Root Cause
1. **Deployment Pipeline**: Changes only deploy to production when merged to main branch
2. **Database Separation**: Production uses PostgreSQL, local uses SQLite - they are separate databases
3. **File Storage**: Local `/api/uploads/` files don't automatically sync to production Fly.io backend
4. **Corrupted Production Data**: Production database has corrupted menu entries

## Solution Steps

### 1. Merge PR to Trigger Deployment
The PR #60 needs to be merged to main branch to trigger the production deployment pipeline:
- Frontend deploys to Netlify automatically
- Backend deploys to Fly.io automatically

### 2. Seed Production Database
After PR is merged, run the production seeding script:

```bash
# Set production database URL (get from Fly.io secrets)
export DATABASE_URL="postgresql://..."

# Run the seeding script
cd api
python seed_production_menus.py
```

### 3. Deploy Images to Production
Upload the image files to the production Fly.io backend:

```bash
# Make sure you're authenticated with Fly.io
flyctl auth login

# Run the deployment script
./deploy_images_to_production.sh
```

### 4. Verify Deployment
Test that everything works in production:

```bash
python verify_production_deployment.py
```

## Files Created
- `api/seed_production_menus.py` - Adds menu entries to production database
- `deploy_images_to_production.sh` - Uploads images to production backend
- `verify_production_deployment.py` - Tests production deployment

## Production URLs to Test
- Frontend: https://cheery-dango-2fd190.netlify.app/
- Backend API: https://crowd-lunch.fly.dev/menus/weekly
- Churrasco Image: https://crowd-lunch.fly.dev/uploads/AdobeStock_792531420_Preview_churrasco.jpeg
- Pizza Image: https://crowd-lunch.fly.dev/uploads/AdobeStock_387834369_Preview_pizza.jpeg

## Expected Results
After successful deployment:
- 8/6 should show churrasco background image with "Churrasco Special (30) 1200円"
- 8/7 should show pizza background image with "Wood-Fired Pizza (25) 1100円"
