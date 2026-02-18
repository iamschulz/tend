import { expect } from 'vitest'
import type { Page } from 'puppeteer'
import { ensureCategoriesOpen } from './_setup'

/** Open menu if not already open. */
export async function openMenu(page: Page): Promise<void> {
  const isOpen = await page.$('dialog.menu[open]')
  if (!isOpen) {
    await page.click('header button.nobutton')
    await page.waitForSelector('dialog.menu[open]', { timeout: 3000 })
  }
}

/** Close menu if open. */
export async function closeMenu(page: Page): Promise<void> {
  const isOpen = await page.$('dialog.menu[open]')
  if (isOpen) {
    await page.click('dialog.menu .closeButton')
    await page.waitForFunction(() => !document.querySelector('dialog.menu[open]'), { timeout: 3000 })
  }
}

/**
 * Add a category via the menu form.
 * By default closes the menu afterwards. Pass `keepMenuOpen: true` to leave it open.
 */
export async function addCategory(page: Page, title: string, { keepMenuOpen = false } = {}): Promise<void> {
  await openMenu(page)
  await ensureCategoriesOpen(page)

  const textInput = await page.$('dialog.menu .categoryForm input[type="text"][placeholder]')
  expect(textInput).not.toBeNull()
  await textInput!.click({ clickCount: 3 })
  await textInput!.type(title)
  await page.click('dialog.menu .categoryForm button[type="submit"]')

  await page.waitForFunction(
    (t: string) => {
      const inputs = document.querySelectorAll('dialog.menu li .categoryForm input[type="text"]')
      return Array.from(inputs).some((el) => (el as HTMLInputElement).value === t)
    },
    { timeout: 5000 },
    title,
  )

  if (!keepMenuOpen) {
    await closeMenu(page)
  }
}

/** Quick-click a trigger button to create an instant entry. */
export async function quickClickTrigger(page: Page, index = 0): Promise<void> {
  const triggers = await page.$$('[data-avatar] button')
  expect(triggers.length).toBeGreaterThan(index)
  await triggers[index]!.click()
  await page.waitForSelector('article.track', { timeout: 5000 })
}

/** Hold-click on a trigger button to start a running timer. */
export async function holdTrigger(page: Page, index = 0): Promise<void> {
  const triggers = await page.$$('[data-avatar] button')
  const btn = triggers[index]!
  const box = await btn.boundingBox()
  if (!box) throw new Error('Trigger button not visible')

  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2

  await page.mouse.move(cx, cy)
  await page.mouse.down()
  await new Promise((r) => setTimeout(r, 900))
  await page.mouse.up()
}

/** Get current ISO week string (YYYY-Www). */
export function getCurrentWeekStr(): string {
  const d = new Date()
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = utc.getUTCDay() || 7
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${utc.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

export function getCurrentMonthStr(): string {
  return new Date().toISOString().slice(0, 7)
}

export function getCurrentYearStr(): string {
  return String(new Date().getFullYear())
}
