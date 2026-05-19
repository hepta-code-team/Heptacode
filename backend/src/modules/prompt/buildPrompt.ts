type PromptSections = {
  role: string[]
  inputBoundaries: string[]
  safety: string[]
  output: string[]
  rules: string[]
  style?: string[]
}

/** Baut System-Prompts nach dem Team-Template (propmtsTemplate.md). */
export function buildPrompt(sections: PromptSections): string {
  const blocks = [
    sections.role.join('\n'),
    sections.inputBoundaries.join('\n'),
    sections.safety.join('\n'),
    sections.output.join('\n'),
    sections.rules.join('\n'),
  ]

  if (sections.style && sections.style.length > 0) {
    blocks.push(sections.style.join('\n'))
  }

  return blocks.join('\n\n')
}
