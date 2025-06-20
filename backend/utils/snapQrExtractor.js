const puppeteer = require("puppeteer");

async function getQrisScreenshot(snapUrl) {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  try {
    await page.goto(snapUrl, { waitUntil: "networkidle0", timeout: 60000 });

    // Tunggu canvas QR muncul
    await page.waitForSelector("canvas", { timeout: 10000 });

    const qrElement = await page.$("canvas");

    // Screenshot elemen QR saja
    const qrBuffer = await qrElement.screenshot();

    await browser.close();
    return qrBuffer;
  } catch (error) {
    console.error("❌ Gagal ambil QRIS Snap:", error);
    await browser.close();
    throw error;
  }
}

module.exports = { getQrisScreenshot };
