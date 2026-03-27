// Deploys the three OneShot container apps: api, workers, web
param environmentId string
param location string
param tags object
param registryServer string
param registryUsername string
@secure()
param registryPassword string
param imageTag string = 'latest'

// ── Shared env secrets passed to api + workers ────────────────────────────────
param databaseUrl string
@secure()
param jwtSecret string
param redisUrl string
param fspMode string = 'live'
param fspBaseUrl string
@secure()
param fspApiKey string
@secure()
param acsConnectionString string

// ── Web-specific ──────────────────────────────────────────────────────────────
param nextPublicApiUrl string
@secure()
param nextauthSecret string
param nextauthUrl string
param azureAdClientId string
@secure()
param azureAdClientSecret string
param azureAdTenantId string

// ── Demo credentials (pilot phase) ────────────────────────────────────────────
param demoUser string = 'admin'
@secure()
param demoPassword string
param demoOperatorId string = 'demo-operator-alpha'

// ── API Container App ─────────────────────────────────────────────────────────
resource apiApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'oneshot-api'
  location: location
  tags: tags
  properties: {
    environmentId: environmentId
    configuration: {
      ingress: {
        external: true
        targetPort: 3002
        transport: 'http'
      }
      registries: [
        {
          server: registryServer
          username: registryUsername
          passwordSecretRef: 'registry-password'
        }
      ]
      secrets: [
        { name: 'registry-password', value: registryPassword }
        { name: 'database-url', value: databaseUrl }
        { name: 'jwt-secret', value: jwtSecret }
        { name: 'fsp-api-key', value: fspApiKey }
        { name: 'acs-connection-string', value: acsConnectionString }
      ]
    }
    template: {
      containers: [
        {
          name: 'api'
          image: '${registryServer}/oneshot-api:${imageTag}'
          resources: { cpu: json('0.5'), memory: '1Gi' }
          env: [
            { name: 'NODE_ENV', value: 'production' }
            { name: 'API_PORT', value: '3002' }
            { name: 'API_HOST', value: '0.0.0.0' }
            { name: 'DATABASE_URL', secretRef: 'database-url' }
            { name: 'JWT_SECRET', secretRef: 'jwt-secret' }
            { name: 'REDIS_URL', value: redisUrl }
            { name: 'FSP_MODE', value: fspMode }
            { name: 'FSP_BASE_URL', value: fspBaseUrl }
            { name: 'FSP_API_KEY', secretRef: 'fsp-api-key' }
            { name: 'ACS_CONNECTION_STRING', secretRef: 'acs-connection-string' }
            { name: 'ALLOWED_ORIGINS', value: '${nextauthUrl},http://localhost:3000' }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
        rules: [
          {
            name: 'http-rule'
            http: { metadata: { concurrentRequests: '50' } }
          }
        ]
      }
    }
  }
}

// ── Workers Container App ─────────────────────────────────────────────────────
resource workersApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'oneshot-workers'
  location: location
  tags: tags
  properties: {
    environmentId: environmentId
    configuration: {
      ingress: null // no inbound traffic — workers only consume queues
      registries: [
        {
          server: registryServer
          username: registryUsername
          passwordSecretRef: 'registry-password'
        }
      ]
      secrets: [
        { name: 'registry-password', value: registryPassword }
        { name: 'database-url', value: databaseUrl }
        { name: 'fsp-api-key', value: fspApiKey }
        { name: 'acs-connection-string', value: acsConnectionString }
      ]
    }
    template: {
      containers: [
        {
          name: 'workers'
          image: '${registryServer}/oneshot-workers:${imageTag}'
          resources: { cpu: json('0.5'), memory: '1Gi' }
          env: [
            { name: 'NODE_ENV', value: 'production' }
            { name: 'DATABASE_URL', secretRef: 'database-url' }
            { name: 'REDIS_URL', value: redisUrl }
            { name: 'FSP_MODE', value: fspMode }
            { name: 'FSP_BASE_URL', value: fspBaseUrl }
            { name: 'FSP_API_KEY', secretRef: 'fsp-api-key' }
            { name: 'ACS_CONNECTION_STRING', secretRef: 'acs-connection-string' }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 1 // single consumer — prevents duplicate job processing
      }
    }
  }
}

// ── Web Container App ─────────────────────────────────────────────────────────
resource webApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'oneshot-web'
  location: location
  tags: tags
  properties: {
    environmentId: environmentId
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        transport: 'http'
      }
      registries: [
        {
          server: registryServer
          username: registryUsername
          passwordSecretRef: 'registry-password'
        }
      ]
      secrets: [
        { name: 'registry-password', value: registryPassword }
        { name: 'nextauth-secret', value: nextauthSecret }
        { name: 'azure-ad-client-secret', value: azureAdClientSecret }
        { name: 'jwt-secret', value: jwtSecret }
        { name: 'demo-password', value: demoPassword }
      ]
    }
    template: {
      containers: [
        {
          name: 'web'
          image: '${registryServer}/oneshot-web:${imageTag}'
          resources: { cpu: json('0.5'), memory: '1Gi' }
          env: [
            { name: 'NODE_ENV', value: 'production' }
            { name: 'NEXT_PUBLIC_API_URL', value: nextPublicApiUrl }
            { name: 'NEXTAUTH_URL', value: nextauthUrl }
            { name: 'NEXTAUTH_SECRET', secretRef: 'nextauth-secret' }
            { name: 'AZURE_AD_CLIENT_ID', value: azureAdClientId }
            { name: 'AZURE_AD_CLIENT_SECRET', secretRef: 'azure-ad-client-secret' }
            { name: 'AZURE_AD_TENANT_ID', value: azureAdTenantId }
            { name: 'JWT_SECRET', secretRef: 'jwt-secret' }
            { name: 'DEMO_USER', value: demoUser }
            { name: 'DEMO_PASSWORD', secretRef: 'demo-password' }
            { name: 'DEMO_OPERATOR_ID', value: demoOperatorId }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
        rules: [
          {
            name: 'http-rule'
            http: { metadata: { concurrentRequests: '50' } }
          }
        ]
      }
    }
  }
}

output apiUrl string = 'https://${apiApp.properties.configuration.ingress.fqdn}'
output webUrl string = 'https://${webApp.properties.configuration.ingress.fqdn}'
