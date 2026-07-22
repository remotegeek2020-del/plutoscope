import 'server-only';

import { chromium } from 'playwright-core';

// HTML → PDF via headless Chromium (Part VIII §47 Week 17). The executable path is configurable
// (CHROMIUM_EXECUTABLE_PATH): locally it points at the installed Chromium; on Vercel's serverless
// runtime point it at an @sparticuz/chromium binary (or run report generation off-serverless).
export async function htmlToPdf(html: string): Promise<Buffer> {
  const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH;
  const browser = await chromium.launch(executablePath ? { executablePath } : {});
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });
    return await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '24px', bottom: '24px', left: '24px', right: '24px' },
    });
  } finally {
    await browser.close();
  }
}
