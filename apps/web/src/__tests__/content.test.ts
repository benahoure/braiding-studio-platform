import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { formatHours, formatPhone } from '../lib/format'
import { defaultBusinessSettings } from '../lib/mockData'

const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function readSourceFiles(dir: string): string {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.name !== '__tests__' && entry.name !== 'test')
    .map((entry) => {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) return readSourceFiles(fullPath)
      if (!/\.(ts|tsx|css)$/.test(entry.name)) return ''
      return fs.readFileSync(fullPath, 'utf8')
    })
    .join('\n')
}

describe('production content guardrails', () => {
  const source = readSourceFiles(srcDir)

  it('does not ship banned template or typo content', () => {
    const forbidden = [
      ['Grace Hair', ' Beaty'].join(''),
      ['Ser', 'ivces'].join(''),
      ['Health', ' Consultation'].join(''),
      ['Lorem', ' Ipsum'].join(''),
      ['Thomas', ' Muller'].join(''),
      ['Vivi', ' Marian'].join(''),
    ]
    for (const phrase of forbidden) {
      expect(source).not.toContain(phrase)
    }
  })

  it('keeps contact information centralized in mock/API settings only', () => {
    const componentSource = source.replace(fs.readFileSync(path.join(srcDir, 'lib/mockData.ts'), 'utf8'), '')
    expect(componentSource).not.toContain('+12145550192')
    expect(componentSource).not.toContain('bookings@braidsbydeb.com')
    expect(componentSource).not.toContain('2847 Oak Lawn Ave')
  })

  it('does not reference model assets for the hero', () => {
    const forbiddenModelExtension = ['.', 'g', 'l', 'b'].join('')
    expect(source.toLowerCase()).not.toContain(forbiddenModelExtension)
    expect(source.toLowerCase()).not.toContain('spline')
  })

  it('formats default business phone and hours correctly', () => {
    expect(defaultBusinessSettings.businessName).toBe('Braids by Deb')
    expect(formatPhone(defaultBusinessSettings.phone)).toBe('+1 (214)-555-0192')
    expect(formatHours(defaultBusinessSettings)).toBe('Mon–Sun: 9:00 AM – 8:00 PM')
  })
})
