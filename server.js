const PORT = 8000;
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { chromium } from "playwright";
const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());
app.use(morgan("tiny"));

app.get("/", function (req, res) {
  res.json("This is my webscraper");
});

app.get("/test", async function (req, res) {
  const browser = await chromium.launch({ headless: true });
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

// 測試用(產生formData)
// const formData = new URLSearchParams({
//     day: new Date().toISOString().split('T')[0],
//     // cont: "not_member",
//     // day_n: 2,
//     // grp_id: 1,
//     sch_id: 17,
//     act: "select"
// })

app.post("/program-list", async (req, res) => {
  try {
    // console.log('Received request body:', req.body);

    if (!req.body.sch_id) {
      return res.status(400).json({ error: "Missing sch_id in request body" });
    }

    const url = `https://www.homeplus.net.tw/cable/product-introduce/digital-tv/digital-program-cont/209-${req.body.sch_id}`;

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // 前往目標網站
    await page.goto(url);

    // 等待頁面載入完成（確保內容已渲染）
    await page.waitForSelector("tbody", { timeout: 60000 });

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
  }
});

app.listen(PORT, () =>
  console.log(`server running on PORT： http://localhost:${PORT}`)
);
