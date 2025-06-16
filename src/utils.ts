export function normalizeVersion(version: string) {
  if (typeof version === 'string') {
    // Remove commit SHA suffix
    return version.replace(/-.*$/, '')
  } else {
    return version
  }
}

// Utility function to get error messages from responses
export async function getErrorMessage(response: Response) {
  let message = `HTTP ${response.status}: ${response.statusText}`
  try {
    const body = (await response.json()) as any
    if (body.message) {
      message += ` - ${body.message}`
    }
  } catch (_e) {
    // Failed to parse JSON, ignore and use basic message
  }
  return message
}
