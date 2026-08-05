export function getHighResAvatarUrl(url: string | null | undefined): string | null {
  if (!url) return null
  // Google OAuth profile picture high-resolution trick
  if (url.includes('googleusercontent.com')) {
    // Replace "=s96-c" or any "=sXX-c" or "=sXX" at the end of the URL with "=s384-c"
    return url.replace(/=s\d+(?:-c)?$/, '=s384-c')
  }
  return url
}
