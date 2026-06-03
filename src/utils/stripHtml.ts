/**
 * Strip HTML tags and decode entities, producing plain text.
 * Uses the `he` library for entity decoding (already a dependency).
 */
import he from 'he'

export function stripHtmlToText(html: string): string {
  return (
    he
      .decode(
        html
          // Remove script/style blocks and their content
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
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
