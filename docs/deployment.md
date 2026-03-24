# Deployment Guide

## Overview

OneShot deploys to Azure Container Apps via GitHub Actions CD.
CI runs on every push; CD runs on pushes to `master` (or manually via workflow_dispatch).

## Architecture

```
GitHub Actions
  └─ Build → push 3 Docker images to Azure Container Registry
  └─ Deploy → az arm-deploy (Bicep) provisions/updates all Azure resources
  └─ Smoke test → curl /health

Azure Resources (rg-oneshot-pilot)
  ├─ Azure Container Registry  (oneshot-pilot-acr)
  ├─ Container Apps Environment (oneshot-pilot-env)
  │   ├─ oneshot-api     (external ingress :3002)
  │   ├─ oneshot-workers (no ingress — queue consumer only)
  │   └─ oneshot-web     (external ingress :3000)
  ├─ PostgreSQL Flexible Server (oneshot-pilot-pg)
  ├─ Azure Cache for Redis      (oneshot-pilot-redis)
  └─ Key Vault                  (oneshot-pilot-kv)
```

## One-time Azure setup

```bash
# 1. Create resource group
az group create --name rg-oneshot-pilot --location eastus

# 2. Create service principal for GitHub Actions
az ad sp create-for-rbac \
  --name "sp-oneshot-github" \
  --role Contributor \
  --scopes /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/rg-oneshot-pilot \
  --sdk-auth
# → copy the JSON output → GitHub secret AZURE_CREDENTIALS

# 3. Register required providers (if not already)
az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.OperationalInsights
az provider register --namespace Microsoft.ContainerRegistry
```

## GitHub repository secrets

Add these under **Settings → Secrets and variables → Actions**:

| Secret | Description |
|--------|-------------|
| `AZURE_CREDENTIALS` | JSON from `az ad sp create-for-rbac --sdk-auth` |
| `ACR_LOGIN_SERVER` | e.g. `oneshotpilotacr.azurecr.io` (set after first Bicep deploy) |
| `ACR_USERNAME` | ACR admin username (from Azure Portal → ACR → Access keys) |
| `ACR_PASSWORD` | ACR admin password |
| `POSTGRES_ADMIN_PASSWORD` | Strong password for PostgreSQL admin user |
| `JWT_SECRET` | Random 64-char string — signs operator JWTs |
| `NEXTAUTH_SECRET` | Random 32-char string — signs NextAuth sessions |
| `AZURE_AD_CLIENT_ID` | App registration client ID |
| `AZURE_AD_CLIENT_SECRET` | App registration client secret |
| `AZURE_AD_TENANT_ID` | Your Azure AD tenant ID |
| `FSP_API_KEY` | FlightSchedulePro API key |
| `ACS_CONNECTION_STRING` | Azure Communication Services connection string |

Generate random secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## First deploy (bootstrap)

Because the ACR must exist before we can push images, bootstrap in two steps:

```bash
# Step 1: deploy infra only (no images yet)
az deployment group create \
  --resource-group rg-oneshot-pilot \
  --template-file infra/main.bicep \
  --parameters infra/parameters/pilot.bicepparam \
  --parameters postgresAdminPassword=<PASSWORD> \
               jwtSecret=<JWT_SECRET> \
               nextauthSecret=<NEXTAUTH_SECRET> \
               imageTag=placeholder

# Step 2: grab ACR creds and add them as GitHub secrets
az acr credential show --name oneshotpilotacr

# Step 3: push to master → CD pipeline builds images + redeploys
git push origin master
```

## Environment promotion

Trigger a manual deploy to a specific environment via GitHub UI:
**Actions → CD → Run workflow → select environment**

## Rollback

```bash
# Redeploy a previous image tag
az containerapp update \
  --name oneshot-api \
  --resource-group rg-oneshot-pilot \
  --image oneshotpilotacr.azurecr.io/oneshot-api:<PREVIOUS_SHA>
```
