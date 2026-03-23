// OneShot — Azure Infrastructure
// Deploys: Container Apps environment, PostgreSQL, Redis, Key Vault, App Insights
//
// Usage:
//   az deployment group create \
//     --resource-group rg-oneshot-pilot \
//     --template-file infra/main.bicep \
//     --parameters infra/parameters/pilot.bicepparam

@description('Environment name (pilot, staging, prod)')
param environmentName string = 'pilot'

@description('Azure region — US data residency required (constraints.md #14)')
param location string = 'eastus'

@description('PostgreSQL admin username')
param postgresAdminUser string = 'oneshotadmin'

@secure()
@description('PostgreSQL admin password — store in Key Vault, do not commit')
param postgresAdminPassword string

var prefix = 'oneshot-${environmentName}'
var tags = {
  project: 'oneshot'
  environment: environmentName
  managedBy: 'bicep'
}

// ── Key Vault ─────────────────────────────────────────────────────────────────
module kv 'modules/keyvault.bicep' = {
  name: 'keyvault'
  params: {
    name: '${prefix}-kv'
    location: location
    tags: tags
  }
}

// ── Container Apps Environment ────────────────────────────────────────────────
module containerApps 'modules/container-apps.bicep' = {
  name: 'container-apps'
  params: {
    name: '${prefix}-env'
    location: location
    tags: tags
  }
}

// ── PostgreSQL Flexible Server ────────────────────────────────────────────────
module postgres 'modules/postgres.bicep' = {
  name: 'postgres'
  params: {
    name: '${prefix}-pg'
    location: location
    tags: tags
    adminUser: postgresAdminUser
    adminPassword: postgresAdminPassword
  }
}

// ── Redis Cache ───────────────────────────────────────────────────────────────
module redis 'modules/redis.bicep' = {
  name: 'redis'
  params: {
    name: '${prefix}-redis'
    location: location
    tags: tags
  }
}

// ── Outputs ───────────────────────────────────────────────────────────────────
output containerAppsEnvironmentId string = containerApps.outputs.environmentId
output postgresHost string = postgres.outputs.host
output redisHost string = redis.outputs.host
output keyVaultUri string = kv.outputs.uri
