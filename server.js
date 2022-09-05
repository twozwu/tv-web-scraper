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

const url = "http://web.niotv.com/NIO_2017_WEB/i_index.php?cont=day&grp_id=1&way=outter";

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

app.post("/tv-schedule", async (req, res) => {
    // console.log(req.body);
    const formData = new URLSearchParams(req.body)
    const response = await fetch(url, {
        method: "POST",
        body: formData,
    });
    const html = await response.text();

    /** cheerio parse html */
    const $ = cheerio.load(html);
    const results = { list: [] };
    const title = $(".ch_name_title > h2").text();
    results.title = title;
    $(".epg_table tbody > tr").each((index, element) => {
        const time = $(element).find("td.epg_tab_tm").text();
        const show = $(element).find("td > a").text();

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
