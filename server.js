const PORT = 8000;
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import express from "express";
import cors from 'cors'
import morgan from 'morgan';
const app = express();
app.use(express.urlencoded({ extended: false }))
app.use(express.json())
app.use(cors());
app.use(morgan("tiny"));

// const url = "http://web.niotv.com/NIO_2017_WEB/i_index.php?cont=day&grp_id=1&way=outter";

app.get("/", function (req, res) {
    res.json("This is my webscraper");
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
    // const formData = new URLSearchParams(req.body)
    // console.log(req.body);
    const url = `http://www.niotv.com/i_index.php?cont=day&ch_id=${req.body.sch_id}&chgrp_id=1`;
    const response = await fetch(url, {
        method: "POST",
        body: req.body,
    });
    const html = await response.text();

    /** cheerio parse html */
    const $ = cheerio.load(html);
    const results = { list: [] }; // 準備資料集空物件
    const title = $(".ch_name_title > h2").text(); // 取得標題
    results.title = title;
    $(".epg_table tbody > tr").each((index, element) => {
        const time = $(element).find("td.epg_col_time").text(); // 取得時間
        const show = $(element).find("td > a").text(); // 取得節目

        results.list.push({
            time: time.trim(),
            show: show.trim(),
        });
    });
    results.list.splice(0, 2)
    res.json(results);
    // res.json(req.body);
})

app.listen(PORT, () => console.log(`server running on PORT： http://localhost:${PORT}`));
