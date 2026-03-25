// OneShot — Azure Infrastructure
// Deploys: Container Registry, Container Apps environment, PostgreSQL, Redis, Key Vault, App Insights
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

@description('Docker image tag to deploy')
param imageTag string = 'latest'

// ── App secrets (injected by CD pipeline from GitHub secrets) ─────────────────
@secure()
param jwtSecret string

@secure()
param nextauthSecret string

param azureAdClientId string = ''

@secure()
param azureAdClientSecret string = ''

param azureAdTenantId string = ''

param fspMode string = 'live'
param fspBaseUrl string = 'https://api.flightschedulepro.com'

@secure()
param fspApiKey string = ''

@secure()
param acsConnectionString string = ''

var prefix = 'oneshot-${environmentName}'
// KV names are globally unique and soft-delete prevents reuse; use a stable short suffix
var kvUniqueSuffix = substring(uniqueString(subscription().id, environmentName), 0, 6)
var tags = {
  project: 'oneshot'
  environment: environmentName
  managedBy: 'bicep'
}

// ── Key Vault ─────────────────────────────────────────────────────────────────
module kv 'modules/keyvault.bicep' = {
  name: 'keyvault'
  params: {
    name: '${prefix}-${kvUniqueSuffix}-kv'
    location: location
    tags: tags
  }
}

// ── Container Registry ────────────────────────────────────────────────────────
module registry 'modules/registry.bicep' = {
  name: 'registry'
  params: {
    name: '${prefix}-acr'
    location: location
    tags: tags
  }
}

// ── Container Apps Environment ────────────────────────────────────────────────
module containerAppsEnv 'modules/container-apps.bicep' = {
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

// ── Container Apps (api, workers, web) ────────────────────────────────────────
module apps 'modules/apps.bicep' = {
  name: 'apps'
  params: {
    environmentId: containerAppsEnv.outputs.environmentId
    location: location
    tags: tags
    registryServer: registry.outputs.loginServer
    registryUsername: registry.outputs.name
    registryPassword: registry.outputs.adminPassword
    imageTag: imageTag
    databaseUrl: 'postgresql://${postgresAdminUser}:${postgresAdminPassword}@${postgres.outputs.host}/oneshot?sslmode=require'
    jwtSecret: jwtSecret
    redisUrl: 'rediss://:${redis.outputs.primaryKey}@${redis.outputs.host}:6380'
    fspMode: fspMode
    fspBaseUrl: fspBaseUrl
    fspApiKey: fspApiKey
    acsConnectionString: acsConnectionString
    nextPublicApiUrl: 'https://${prefix}-api.${location}.azurecontainerapps.io'
    nextauthSecret: nextauthSecret
    nextauthUrl: 'https://${prefix}-web.${location}.azurecontainerapps.io'
    azureAdClientId: azureAdClientId
    azureAdClientSecret: azureAdClientSecret
    azureAdTenantId: azureAdTenantId
  }
}

// ── Outputs ───────────────────────────────────────────────────────────────────
output containerAppsEnvironmentId string = containerAppsEnv.outputs.environmentId
output registryLoginServer string = registry.outputs.loginServer
output postgresHost string = postgres.outputs.host
output redisHost string = redis.outputs.host
output keyVaultUri string = kv.outputs.uri
output apiUrl string = apps.outputs.apiUrl
output webUrl string = apps.outputs.webUrl
