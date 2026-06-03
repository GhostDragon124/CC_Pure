/**
 * Strip HTML tags and decode entities, producing plain text.
 * Uses the `he` library for entity decoding (already a dependency).
 */
import he from 'he'

export function stripHtmlToText(html: string): string {
  // Iteratively strip script/style blocks until stable to prevent nested bypass
  // (e.g. <<scr<script>ipt>...</script>)
  let prev = ''
  let content = html
  const scriptStyleRegex = /<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi
  while (content !== prev) {
    prev = content
    content = content.replace(scriptStyleRegex, '')
  }
  return (
    he
      .decode(
        content
          // Replace <br>, <p>, <li>, <tr> with newlines
          .replace(/<(br|p|li|tr)\b[^>]*\/?>/gi, '\n')
          // Replace </p>, </li>, </tr>, </div>, </h[1-6]> with newlines
          .replace(/<\/(p|li|tr|div|h[1-6])>/gi, '\n')
          // Remove remaining HTML tags
          .replace(/<[^>]*>/g, ''),
      )
      // Collapse multiple whitespace/newlines
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim()
  )
}
