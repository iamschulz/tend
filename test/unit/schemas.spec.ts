import { describe, it, expect } from 'vitest'
import { categorySchema } from '~~/shared/schemas/category'
import { entrySchema, entryUpdateSchema } from '~~/shared/schemas/entry'
import { activitySchema } from '~~/shared/schemas/activity'
import { importDataSchema } from '~~/shared/schemas/importData'
import { daySchema, dayUpdateSchema, dayDateParamSchema } from '~~/shared/schemas/day'

const UUID = '00000000-0000-4000-8000-000000000001'
const UUID2 = '00000000-0000-4000-8000-000000000002'

const validActivity = { title: 'Work', icon: 'briefcase', emoji: '💼' }

const validCategory = {
    id: UUID,
    title: 'Work',
    activity: validActivity,
    color: '#ff0000',
    goals: [],
    hidden: false,
    comment: '',
}

const validEntry = {
    id: UUID2,
    start: 1000,
    end: 2000,
    running: false,
    categoryId: UUID,
    comment: '',
}

// ---------------------------------------------------------------------------
// UUID validation
// ---------------------------------------------------------------------------

describe('UUID validation', () => {
    it('rejects non-UUID id on category', () => {
        expect(() => categorySchema.parse({ ...validCategory, id: 'not-a-uuid' })).toThrow()
    })

    it('rejects non-UUID id on entry', () => {
        expect(() => entrySchema.parse({ ...validEntry, id: 'abc' })).toThrow()
    })

    it('rejects non-UUID categoryId on entry', () => {
        expect(() => entrySchema.parse({ ...validEntry, categoryId: '123' })).toThrow()
    })

    it('accepts valid UUID v4', () => {
        expect(() => categorySchema.parse(validCategory)).not.toThrow()
        expect(() => entrySchema.parse(validEntry)).not.toThrow()
    })
})

// ---------------------------------------------------------------------------
// SQL injection payloads
// ---------------------------------------------------------------------------

describe('SQL injection rejection', () => {
    const sqlPayloads = [
        "'; DROP TABLE categories; --",
        "1 OR 1=1",
        "' UNION SELECT * FROM entries --",
        "'; DELETE FROM entries WHERE '1'='1",
        "Robert'); DROP TABLE entries;--",
    ]

    it('rejects SQL injection in category id', () => {
        for (const payload of sqlPayloads) {
            expect(() => categorySchema.parse({ ...validCategory, id: payload })).toThrow()
        }
    })

    it('rejects SQL injection in entry id', () => {
        for (const payload of sqlPayloads) {
            expect(() => entrySchema.parse({ ...validEntry, id: payload })).toThrow()
        }
    })

    it('rejects SQL injection in entry categoryId', () => {
        for (const payload of sqlPayloads) {
            expect(() => entrySchema.parse({ ...validEntry, categoryId: payload })).toThrow()
        }
    })

    it('allows SQL-like strings in comment (free text, safe via parameterized queries)', () => {
        for (const payload of sqlPayloads) {
            expect(() => entrySchema.parse({ ...validEntry, comment: payload })).not.toThrow()
        }
    })

    it('allows SQL-like strings in category title (free text)', () => {
        for (const payload of sqlPayloads) {
            expect(() => categorySchema.parse({ ...validCategory, title: payload })).not.toThrow()
        }
    })
})

// ---------------------------------------------------------------------------
// Color validation
// ---------------------------------------------------------------------------

describe('color validation', () => {
    it('accepts valid 6-digit hex color', () => {
        expect(() => categorySchema.parse({ ...validCategory, color: '#aaBB00' })).not.toThrow()
    })

    it('rejects 3-digit hex shorthand', () => {
        expect(() => categorySchema.parse({ ...validCategory, color: '#abc' })).toThrow()
    })

    it('rejects missing hash', () => {
        expect(() => categorySchema.parse({ ...validCategory, color: 'ff0000' })).toThrow()
    })

    it('rejects 8-digit hex (with alpha)', () => {
        expect(() => categorySchema.parse({ ...validCategory, color: '#ff0000ff' })).toThrow()
    })

    it('rejects color names', () => {
        expect(() => categorySchema.parse({ ...validCategory, color: 'red' })).toThrow()
    })

    it('rejects script injection in color', () => {
        expect(() => categorySchema.parse({ ...validCategory, color: '<script>' })).toThrow()
    })
})

// ---------------------------------------------------------------------------
// Max length enforcement
// ---------------------------------------------------------------------------

describe('max length enforcement', () => {
    it('rejects category title over 200 characters', () => {
        expect(() => categorySchema.parse({ ...validCategory, title: 'a'.repeat(201) })).toThrow()
    })

    it('accepts category title at exactly 200 characters', () => {
        expect(() => categorySchema.parse({ ...validCategory, title: 'a'.repeat(200) })).not.toThrow()
    })

    it('rejects category comment over 5000 characters', () => {
        expect(() => categorySchema.parse({ ...validCategory, comment: 'x'.repeat(5001) })).toThrow()
    })

    it('accepts category comment at exactly 5000 characters', () => {
        expect(() => categorySchema.parse({ ...validCategory, comment: 'x'.repeat(5000) })).not.toThrow()
    })

    it('rejects entry comment over 5000 characters', () => {
        expect(() => entrySchema.parse({ ...validEntry, comment: 'x'.repeat(5001) })).toThrow()
    })

    it('rejects activity title over 200 characters', () => {
        expect(() => activitySchema.parse({ ...validActivity, title: 'a'.repeat(201) })).toThrow()
    })

    it('rejects activity icon over 100 characters', () => {
        expect(() => activitySchema.parse({ ...validActivity, icon: 'a'.repeat(101) })).toThrow()
    })

    it('rejects activity emoji over 20 characters', () => {
        expect(() => activitySchema.parse({ ...validActivity, emoji: 'a'.repeat(21) })).toThrow()
    })
})

// ---------------------------------------------------------------------------
// Type coercion / wrong types
// ---------------------------------------------------------------------------

describe('type strictness', () => {
    it('rejects string for entry start', () => {
        expect(() => entrySchema.parse({ ...validEntry, start: '1000' })).toThrow()
    })

    it('rejects string for entry end', () => {
        expect(() => entrySchema.parse({ ...validEntry, end: '2000' })).toThrow()
    })

    it('rejects string for running', () => {
        expect(() => entrySchema.parse({ ...validEntry, running: 'true' })).toThrow()
    })

    it('rejects number for category hidden', () => {
        expect(() => categorySchema.parse({ ...validCategory, hidden: 1 })).toThrow()
    })

    it('rejects number for comment', () => {
        expect(() => entrySchema.parse({ ...validEntry, comment: 42 })).toThrow()
    })
})

// ---------------------------------------------------------------------------
// Entry update schema (partial)
// ---------------------------------------------------------------------------

describe('entryUpdateSchema', () => {
    it('requires id', () => {
        expect(() => entryUpdateSchema.parse({ start: 5000 })).toThrow()
    })

    it('accepts partial update with only id and start', () => {
        expect(() => entryUpdateSchema.parse({ id: UUID, start: 5000 })).not.toThrow()
    })

    it('rejects non-UUID id in update', () => {
        expect(() => entryUpdateSchema.parse({ id: 'bad', start: 5000 })).toThrow()
    })

    it('rejects SQL injection in update id', () => {
        expect(() => entryUpdateSchema.parse({ id: "'; DROP TABLE entries;--", running: false })).toThrow()
    })
})

// ---------------------------------------------------------------------------
// Import data schema
// ---------------------------------------------------------------------------

describe('importDataSchema security', () => {
    it('rejects SQL injection in nested category id', () => {
        expect(() => importDataSchema.parse({
            categories: [{ ...validCategory, id: "'; DROP TABLE categories;--", entries: [] }],
        })).toThrow()
    })

    it('rejects SQL injection in nested entry id', () => {
        expect(() => importDataSchema.parse({
            categories: [{
                ...validCategory,
                entries: [{ ...validEntry, id: "' OR 1=1 --" }],
            }],
        })).toThrow()
    })

    it('rejects oversized payload in nested comment', () => {
        expect(() => importDataSchema.parse({
            categories: [{
                ...validCategory,
                comment: 'x'.repeat(5001),
                entries: [],
            }],
        })).toThrow()
    })

    it('rejects invalid color in nested category', () => {
        expect(() => importDataSchema.parse({
            categories: [{ ...validCategory, color: 'javascript:alert(1)', entries: [] }],
        })).toThrow()
    })
})

// ---------------------------------------------------------------------------
// XSS payloads (stored in free-text fields)
// ---------------------------------------------------------------------------

describe('XSS payloads in free-text fields', () => {
    const xssPayloads = [
        '<script>alert("xss")</script>',
        '<img src=x onerror=alert(1)>',
        '"><svg onload=alert(1)>',
        "javascript:alert('xss')",
    ]

    it('accepts XSS strings in title (rendering must escape)', () => {
        for (const payload of xssPayloads) {
            expect(() => categorySchema.parse({ ...validCategory, title: payload })).not.toThrow()
        }
    })

    it('accepts XSS strings in comment (rendering must escape)', () => {
        for (const payload of xssPayloads) {
            expect(() => entrySchema.parse({ ...validEntry, comment: payload })).not.toThrow()
        }
    })

    it('rejects XSS in color field (regex-validated)', () => {
        for (const payload of xssPayloads) {
            expect(() => categorySchema.parse({ ...validCategory, color: payload })).toThrow()
        }
    })

    it('rejects XSS in id field (UUID-validated)', () => {
        for (const payload of xssPayloads) {
            expect(() => categorySchema.parse({ ...validCategory, id: payload })).toThrow()
        }
    })
})

// ---------------------------------------------------------------------------
// Day schema
// ---------------------------------------------------------------------------

describe('daySchema', () => {
    const validDay = { date: '2026-04-15', notes: 'feeling good' }

    it('accepts a valid day', () => {
        expect(() => daySchema.parse(validDay)).not.toThrow()
    })

    it('accepts empty notes', () => {
        expect(() => daySchema.parse({ ...validDay, notes: '' })).not.toThrow()
    })

    it('rejects notes over 10000 characters', () => {
        expect(() => daySchema.parse({ ...validDay, notes: 'x'.repeat(10001) })).toThrow()
    })

    it('accepts notes at exactly 10000 characters', () => {
        expect(() => daySchema.parse({ ...validDay, notes: 'x'.repeat(10000) })).not.toThrow()
    })

    it('rejects malformed date strings', () => {
        const bad = ['2026-4-1', '2026/04/15', '15-04-2026', 'not-a-date', '', '2026-13-01']
        for (const d of bad) {
            expect(() => daySchema.parse({ ...validDay, date: d })).toThrow()
        }
    })

    it('rejects SQL injection in date', () => {
        expect(() => daySchema.parse({ ...validDay, date: "'; DROP TABLE days;--" })).toThrow()
    })

    it('rejects number for notes', () => {
        expect(() => daySchema.parse({ ...validDay, notes: 42 })).toThrow()
    })

    it('accepts free-text XSS payloads in notes (rendering must escape)', () => {
        const xss = '<script>alert(1)</script>'
        expect(() => daySchema.parse({ ...validDay, notes: xss })).not.toThrow()
    })
})

describe('dayUpdateSchema', () => {
    it('accepts a body with only notes', () => {
        expect(() => dayUpdateSchema.parse({ notes: 'hi' })).not.toThrow()
    })

    it('rejects missing notes field', () => {
        expect(() => dayUpdateSchema.parse({})).toThrow()
    })

    it('rejects oversized notes', () => {
        expect(() => dayUpdateSchema.parse({ notes: 'x'.repeat(10001) })).toThrow()
    })
})

describe('dayDateParamSchema', () => {
    it('accepts a valid date', () => {
        expect(() => dayDateParamSchema.parse({ date: '2026-04-15' })).not.toThrow()
    })

    it('rejects invalid formats', () => {
        expect(() => dayDateParamSchema.parse({ date: 'today' })).toThrow()
        expect(() => dayDateParamSchema.parse({ date: '2026/04/15' })).toThrow()
    })
})
