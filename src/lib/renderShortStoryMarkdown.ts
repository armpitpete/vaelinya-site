const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const inline = (value: string) => escapeHtml(value)
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');

export function renderShortStoryMarkdown(markdown: string): string {
  const blocks = markdown.trimEnd().split(/\n{2,}/);
  const html: string[] = [];
  let listOpen = false;

  const closeList = () => {
    if (listOpen) {
      html.push('</ol>');
      listOpen = false;
    }
  };

  for (const block of blocks) {
    const lines = block.split('\n');
    const numbered = lines.every((line) => /^\d+\.\s+/.test(line));
    if (numbered) {
      if (!listOpen) {
        html.push('<ol>');
        listOpen = true;
      }
      for (const line of lines) {
        html.push(`<li>${inline(line.replace(/^\d+\.\s+/, ''))}</li>`);
      }
      continue;
    }

    closeList();
    html.push(`<p>${lines.map(inline).join('<br />')}</p>`);
  }

  closeList();
  return html.join('\n');
}
