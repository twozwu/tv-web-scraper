import fetch from "node-fetch";
import * as cheerio from "cheerio";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { chromium } from "playwright-core";
import "dotenv/config";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());
app.use(morgan("tiny"));

app.get("/", async function (req, res) {
  res.json("This is my webscraper");
});

app.get("/test", async function (req, res) {
  const browser = await chromium.launch({
    // args: ["--no-sandbox", "--disable-setuid-sandbox"],
    // headless: false,
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 前往目標網站
  await page.goto("https://news.ycombinator.com/", { waitUntil: "domcontentloaded" });

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
});

app.get("/test2", async function (req, res) {
  const browser = await chromium.connect({
    wsEndpoint: `wss://production-sfo.browserless.io/chromium/playwright?token=${process.env.BROWSERLESS_TOKEN}`,
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("https://example.com", { waitUntil: "domcontentloaded" });

  const title = await page.title();
  await browser.close();

  return res.status(200).json({ title });
});

app.post("/", async function (req, res) {
  res.json("test post");
});

app.post("/test", async (req, res) => {
    const targetUrl = req.query.url || "https://example.com";
    let browser;
    let page;
    
    try {
        console.log('Starting browser...');
        
        // 確保臨時目錄存在
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        const tempDir = join(__dirname, 'temp');
        
        if (!existsSync(tempDir)) {
            mkdirSync(tempDir, { recursive: true });
        }
        
        // 簡化啟動參數
        const launchOptions = {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--single-process',
                '--no-zygote',
                '--disable-accelerated-2d-canvas',
                '--disable-webgl',
                '--disable-software-rasterizer',
                '--no-first-run',
                '--disable-breakpad',
                '--font-render-hinting=none',
                '--disable-font-subpixel-positioning',
                '--disable-libwpe',
                '--disable-smooth-scrolling',
                '--disable-threaded-animation',
                '--disable-threaded-scrolling',
                '--disable-in-process-stack-traces',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-back-forward-cache'
            ],
            ignoreDefaultArgs: ['--enable-automation'],
            executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
            timeout: 60000, // 增加超時時間到 60 秒
            viewport: { width: 1920, height: 1080 },
            env: {
                ...process.env,
                // 設置字體緩存目錄
                FONTCONFIG_PATH: '/dev/null',
                FONTCONFIG_FILE: '/dev/null',
                // 禁用字體警告
                QT_LOGGING_RULES: 'qt.qpa.fonts=0',
                // 設置臨時目錄
                TMPDIR: tempDir,
                TEMP: tempDir,
                TMP: tempDir
            }
        };
        
        console.log('Launch options:', JSON.stringify(launchOptions, null, 2));
        
        // 使用 launch 而不是 launchPersistentContext
        browser = await chromium.launch(launchOptions);
        console.log('Browser launched, creating context...');
        
        // 創建新的上下文
        const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
            ignoreHTTPSErrors: true
        });
        
        console.log('Context created, creating page...');
        page = await context.newPage();
        
        console.log(`🌐 Visiting: ${targetUrl}`);
        
        // 設置頁面超時
        page.setDefaultTimeout(30000);
        
        // 設置頁面視窗大小
        await page.setViewportSize({ width: 1920, height: 1080 });
        
        // 啟用請求攔截以優化性能
        await page.route('**/*', (route) => {
            const resourceType = route.request().resourceType();
            // 阻止圖片、字體、樣式表等不必要的請求
            if (['image', 'font', 'stylesheet', 'media'].includes(resourceType)) {
                return route.abort();
            }
            return route.continue();
        });

        const response = await page.goto(targetUrl, {
            waitUntil: 'networkidle',
            timeout: 60000
        });
        
        if (!response || !response.ok()) {
            throw new Error(`Failed to load page: ${response ? response.status() : 'No response'}`);
        }

        // 等待額外時間確保頁面完全加載
        await page.waitForTimeout(2000);

        // 截圖輸出為 base64
        const screenshot = await page.screenshot({ 
            type: 'png',
            fullPage: true
        });
        
        console.log('✅ Screenshot taken successfully');

        res.writeHead(200, {
            'Content-Type': 'image/png',
            'Content-Length': screenshot.length,
        });
        res.end(screenshot);
        
    } catch (err) {
        console.error('❌ Error during scrape:', err);
        res.status(500).json({ 
            error: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    } finally {
        try {
            if (context) {
                console.log('Closing browser context...');
                await context.close().catch(e => console.error('Error closing browser context:', e));
                console.log('Browser context closed');
            }
        } catch (e) {
            console.error('Error in finally block:', e);
        }
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
