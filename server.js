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
  res.json("This is my webscraper");
});

app.get("/test", async function (req, res) {
  const browser = await chromium.launch({
    // args: ["--no-sandbox", "--disable-setuid-sandbox"],
    // headless: false,
  });
  const page = await browser.newPage();

  // 前往目標網站
  await page.goto("https://news.ycombinator.com/");

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

app.post("/program-list", async (req, res) => {
  let browser;
  try {
    if (!req.body.sch_id) {
      return res.status(400).json({ error: "Missing sch_id in request body" });
    }

    const url = `https://www.homeplus.net.tw/cable/product-introduce/digital-tv/digital-program-cont/209-${req.body.sch_id}`;

    browser = await chromium.launch();
    // browser = await chromium.launch({
    //   headless: false,
    //   args: ["--no-sandbox", "--disable-setuid-sandbox"],
    // });
    // 使用外部瀏覽器版本
    // const browser = await chromium.connect(
    //   `wss://production-sfo.browserless.io/chromium/playwright?token=2TMOkxli2szvEgEbebf4874d62f4910ccac32a8dfc850dfd5`
    // );
    // const context = await browser.newContext();
    // const page = await context.newPage();

    const page = await browser.newPage();

    // 前往目標網站
    await page.goto(url);

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
