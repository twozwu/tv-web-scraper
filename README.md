# web scraper
此為撈取網頁節目表的爬蟲實作，使用 `cherrio` 套件。

資料來源：[nio電視網](http://www.niotv.com/i_index.php?cont=day)

前端DEMO：https://twozwu.github.io/taiwan-live-news/

重點程式碼：
```javascript
app.post("/program-list", async (req, res) => {
    const formData = new URLSearchParams(req.body)
    const response = await fetch(url, {
        method: "POST",
        body: formData,
    });
    const html = await response.text();

    /** cheerio parse html */
    const $ = cheerio.load(html);
    const results = { list: [] }; // 準備資料集空物件
    const title = $(".ch_name_title > h2").text(); // 取得標題
    results.title = title;
    $(".epg_table tbody > tr").each((index, element) => {
        const time = $(element).find("td.epg_tab_tm").text(); // 取得時間
        const show = $(element).find("td > a").text(); // 取得節目

        results.list.push({
            time: time.trim(),
            show: show.trim(),
        });
    });
    results.list.splice(0, 2)
    res.json(results);
})
```