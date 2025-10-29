// 中嘉寬頻
app.post("/program-list", async (req, res) => {
  try {
    // console.log('Received request body:', req.body);

    if (!req.body.sch_id) {
      return res.status(400).json({ error: "Missing sch_id in request body" });
    }

    const url = `https://www.homeplus.net.tw/cable/product-introduce/digital-tv/digital-program-cont/${req.body.sch_id}`;

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // 前往目標網站
    await page.goto(url);

    // 等待頁面載入完成（確保內容已渲染）
    await page.waitForSelector(".channel_list");

    const html = await page.content();

    // 檢查是否有返回有效的 HTML 內容
    if (!html) {
      throw new Error("No content returned from the server");
    }

    /** cheerio parse html */
    const $ = cheerio.load(html);
    const results = {
      title: $(".program-title").text().trim(),
      list: [],
    };

    results.list = await page.$$eval("tbody .info-table_tr", (rows) =>
      rows.map((row) => {
        const time = row.querySelector(".info-table_td")?.innerText ?? "";
        const title = row.querySelector(".mobile-title")?.innerText ?? "";
        return { time, title };
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
