import fetch from "node-fetch";
import * as cheerio from "cheerio";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { chromium } from "playwright-core";
import "dotenv/config";

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());
app.use(morgan("tiny"));

app.get("/", async function (req, res) {
  console.log(req.query);
  res.json("This is my webscraper");
});

app.get("/test", async function (req, res) {
  try {
    const browser = await chromium.launch({
      // args: ["--no-sandbox", "--disable-setuid-sandbox"],
      // headless: false,
    });
    const context = await browser.newContext();
    const page = await context.newPage();

    // 前往目標網站
    await page.goto("https://news.ycombinator.com/", {
      waitUntil: "domcontentloaded",
    });

    // 等待頁面載入完成（確保內容已渲染）
    await page.waitForSelector(".athing");

    // 擷取所有標題
    const articles = await page.$$eval(".athing", (rows) =>
      rows.map((row) => {
        const title = row.querySelector(".titleline a")?.innerText ?? "";
        const link = row.querySelector(".titleline a")?.href ?? "";
        return { title, link };
      })
    );

    await browser.close();
    res.json(articles);
  } catch (error) {
    console.error("Error fetching articles:", error);
    res.status(500).json({ error: "Failed to fetch articles" });
  }
});

app.get("/test2", async function (req, res) {
  const browser = await chromium.connect({
    wsEndpoint: `wss://production-sfo.browserless.io/chromium/playwright?token=${process.env.BROWSERLESS_TOKEN}`,
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(
    "https://www.homeplus.net.tw/cable/product-introduce/digital-tv/digital-program-cont/209-13",
    { waitUntil: "domcontentloaded" }
  );

  const title = await page.title();
  await browser.close();

  return res.status(200).json({ title });
});

app.get("/program-list", async function (req, res) {
  try {
    const browser = await chromium.connect({
      wsEndpoint: `wss://production-sfo.browserless.io/chromium/playwright?token=${process.env.BROWSERLESS_TOKEN}`,
    });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(
      `https://www.homeplus.net.tw/cable/product-introduce/digital-tv/digital-program-cont/209-${req.query.sch_id}`,
      { waitUntil: "domcontentloaded" }
    );

    // 等待頁面載入完成（確保內容已渲染）
    await page.waitForSelector("table");

    const html = await page.content();

    // 檢查是否有返回有效的 HTML 內容
    if (!html) {
      throw new Error("No content returned from the server");
    }

    /** cheerio parse html */
    const $ = cheerio.load(html);
    const results = {
      title: $(".program-title").text().trim(), // 取得標題
      list: [],
    };

    results.list = await page.$$eval("tbody .info-table_tr", (rows) =>
      rows.map((row) => {
        const time = row.querySelector(".info-table_td")?.innerText ?? ""; // 取得時間
        const show = row.querySelector(".mobile-title")?.innerText ?? ""; // 取得節目名稱
        return { time, show };
      })
    );

    res.json(results);
  } catch (error) {
    console.error("Error fetching program list:", error);
    res.status(500).json({ error: "Failed to fetch program list" });
  }
});

app.post("/", async function (req, res) {
  res.json("test post");
});

app.post("/test", async (req, res) => {
  const targetUrl = req.query.url || "https://example.com";
  let browser;

  try {
    // 啟動 Chromium（headless 模式）
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();
    console.log(`🌐 Visiting: ${targetUrl}`);
    await page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // 截圖輸出為 base64
    const screenshot = await page.screenshot({ type: "png" });
    console.log("✅ Screenshot taken.");

    res.writeHead(200, {
      "Content-Type": "image/png",
      "Content-Length": screenshot.length,
    });
    res.end(screenshot);
  } catch (err) {
    console.error("❌ Error during scrape:", err);
    res.status(500).json({ error: err.message });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});

app.post("/program-list", async (req, res) => {
  let browser;
  try {
    if (!req.body.sch_id) {
      return res.status(400).json({ error: "Missing sch_id in request body" });
    }

    const url = `https://www.homeplus.net.tw/cable/product-introduce/digital-tv/digital-program-cont/209-${req.body.sch_id}`;

    // browser = await chromium.launch();
    // browser = await chromium.launch({
    //   headless: false,
    //   args: ["--no-sandbox", "--disable-setuid-sandbox"],
    // });
    // 使用外部瀏覽器版本
    // const browser = await chromium.connect(
    //   `wss://production-sfo.browserless.io/chromium/playwright?token=${process.env.BROWSERLESS_TOKEN}`
    // );
    browser = await chromium.connect({
      wsEndpoint: `wss://production-sfo.browserless.io/chromium/playwright?token=${process.env.BROWSERLESS_TOKEN}`,
    });
    const context = await browser.newContext();
    const page = await context.newPage();

    // 前往目標網站
    await page.goto(url, { waitUntil: "domcontentloaded" });

    // 等待頁面載入完成（確保內容已渲染）
    await page.waitForSelector("table");

    const html = await page.content();

    // 檢查是否有返回有效的 HTML 內容
    if (!html) {
      throw new Error("No content returned from the server");
    }

    /** cheerio parse html */
    const $ = cheerio.load(html);
    const results = {
      title: $(".program-title").text().trim(), // 取得標題
      list: [],
    };

    results.list = await page.$$eval("tbody .info-table_tr", (rows) =>
      rows.map((row) => {
        const time = row.querySelector(".info-table_td")?.innerText ?? ""; // 取得時間
        const show = row.querySelector(".mobile-title")?.innerText ?? ""; // 取得節目名稱
        return { time, show };
      })
    );

    res.json(results);
  } catch (error) {
    console.error("Error in /program-list:", error);
    if (browser) {
      await browser.close();
    }
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  } finally {
    // Ensure the browser is closed after all operations
    if (browser) {
      await browser.close();
    }
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () =>
  console.log(`server running on PORT： http://localhost:${port}`)
);
