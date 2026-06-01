const textOf = (node) => {
  if (!node) return '';
  if (typeof node.value === 'string') return node.value;
  if (!Array.isArray(node.children)) return '';
  return node.children.map(textOf).join('');
};

const hiddenStorySections = new Set([
  'What this story opens',
  'Illustration slot',
]);

export default function removePublicStoryScaffolding() {
  return (tree, file) => {
    const path = file?.history?.[0] ?? '';

    if (!path.includes('/src/content/stories/')) {
      return;
    }

    const children = tree.children ?? [];
    const cleaned = [];
    let skippingDepth = null;

    for (const node of children) {
      if (skippingDepth !== null) {
        if (node.type === 'heading' && node.depth <= skippingDepth) {
          skippingDepth = null;
        } else {
          continue;
        }
      }

      if (node.type === 'heading' && hiddenStorySections.has(textOf(node).trim())) {
        skippingDepth = node.depth;
        continue;
      }

      cleaned.push(node);
    }

    tree.children = cleaned;
  };
}
