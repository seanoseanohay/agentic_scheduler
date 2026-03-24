param name string
param location string
param tags object

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: replace(name, '-', '') // ACR names must be alphanumeric
  location: location
  tags: tags
  sku: { name: 'Basic' }
  properties: {
    adminUserEnabled: true // used by Container Apps pull; rotate to managed identity in prod
  }
}

output loginServer string = acr.properties.loginServer
output id string = acr.id
output name string = acr.name
output adminPassword string = listCredentials(acr.id, '2023-07-01').passwords[0].value
