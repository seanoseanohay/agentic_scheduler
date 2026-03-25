param name string
param location string
param tags object

resource kv 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: name
  location: location
  tags: tags
  properties: {
    sku: { family: 'A', name: 'standard' }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7  // minimum; enables fast cleanup in pilot
    enablePurgeProtection: false  // allow purge in non-prod; re-enable for prod
    publicNetworkAccess: 'Enabled' // Phase 1+: restrict to VNet
  }
}

output uri string = kv.properties.vaultUri
output id string = kv.id
