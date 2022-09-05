const PORT = 8000;
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import express from "express";
const app = express();
// const cors = require("cors");
// app.use(cors());

const url = "https://www.theguardian.com/uk";

app.get("/", function (req, res) {
    res.json("This is my webscraper");
});

app.get("/results", async (req, res) => {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const articles = [];

    $(".fc-item__title", html).each(function () {
        //<-- cannot be a function expression
        const title = $(this).text();
        const url = $(this).find("a").attr("href");
        articles.push({
            title,
            url,
        });
    });
    res.json(articles);
    // console.log(articles);
})

// app.get("/results", (req, res) => {
//     fetch(url)
//         .then((response) => {
//             const html = response.data;
//             console.log(html);
//             const $ = cheerio.load(html);
//             const articles = [];

//             $(".fc-item__title", html).each(function () {
//                 //<-- cannot be a function expression
//                 const title = $(this).text();
//                 const url = $(this).find("a").attr("href");
//                 articles.push({
//                     title,
//                     url,
//                 });
//             });
//             res.json(articles);
//         })
//         .catch((err) => console.log(err));
// });