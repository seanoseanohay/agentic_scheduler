using '../main.bicep'

param environmentName = 'pilot'
param location = 'westus2'
param postgresAdminUser = 'oneshotadmin'
// postgresAdminPassword: inject via az deployment group create --parameters postgresAdminPassword=...
// or reference from Key Vault using: getSecret('rg-oneshot-pilot', 'kv-name', 'postgres-admin-password')
param postgresAdminPassword = ''
