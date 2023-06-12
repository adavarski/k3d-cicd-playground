var express = require("express");
var app = express();

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.get("/info", (req, res) => {
    res.json([
        {
            "id": "1",
            "country": "london",
            "city": "england"
        },
        {
            "id": "2",
            "country": "mars",
            "city": "unknown"
        },
        {
            "id": "3",
            "country": "here",
            "city": "there"
        },
        {
            "id": "4",
            "country": "time",
            "city": "space"
        }
    ]);
});

app.get("/health", (req, res) => {
    res.json([
        {
            "status": 'we is good'
        }
    ]);
});

app.listen(3000, () => {
    console.log("Offices service running on port 3000");
});

