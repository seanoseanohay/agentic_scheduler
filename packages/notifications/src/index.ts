export type { INotificationProvider, NotificationMessage, NotificationResult } from './provider.js'
export { ConsoleNotificationProvider } from './provider.js'
export { AzureCommsProvider } from './providers/azure-comms.js'
export { renderTemplate } from './templates.js'
export type { TemplateKey, RenderedTemplate } from './templates.js'

/**
 * Factory: returns ACS provider when ACS_CONNECTION_STRING is set, console otherwise.
 * This keeps the ACS SDK out of test/dev bundles.
 */
export async function createNotificationProvider(): Promise<
  import('./provider.js').INotificationProvider
> {
  const connectionString = process.env['ACS_CONNECTION_STRING']
  if (connectionString) {
    const { AzureCommsProvider } = await import('./providers/azure-comms.js')
    return new AzureCommsProvider(connectionString)
  }
  const { ConsoleNotificationProvider } = await import('./provider.js')
  return new ConsoleNotificationProvider()
}
