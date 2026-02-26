function base64UrlEncodeBytes(bytes) {
  let binary = ''
  const len = bytes.length
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i])
  const b64 = btoa(binary)
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlDecodeToBytes(b64url) {
  const b64 = (b64url || '').replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64 + '==='.slice((b64.length + 3) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export function encodeSharePayload(payload) {
  const json = JSON.stringify(payload)
  const bytes = new TextEncoder().encode(json)
  return base64UrlEncodeBytes(bytes)
}

export function decodeSharePayload(payloadStr) {
  const bytes = base64UrlDecodeToBytes(payloadStr)
  const json = new TextDecoder().decode(bytes)
  return JSON.parse(json)
}

export function buildShareUrl(payloadStr) {
  const { origin, pathname } = window.location
  return `${origin}${pathname}#/share/${payloadStr}`
}
