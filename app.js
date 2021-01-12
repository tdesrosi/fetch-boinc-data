const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const request = require('request')
const parseString = require('xml2js').parseString;
require('dotenv').config()

//express
const port = 4001
const app = express()
app.set('view engine', 'ejs')
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: true }))

//Mongoose
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.9ehbo.mongodb.net/${process.env.DB_NAME}`;
mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
//read only collections from mongoose
const DataSchema = {
    total_credit: Number,
    recent_avg_credit: Number,
    estimated_flops: Number,
    date: String,
    timestamp: Date
};
const Data = mongoose.model("Data", DataSchema, "data");

//logic, get the data xml from boinc
async function getData() {
    var uri = `https://boinc.bakerlab.org/rosetta/userw.php?id=${process.env.BOINC_ID}`;
    request(uri, (err0, response, body) => {
        if (err0) return console.log(err);
        parseString(body, function (err1, result) {
            if (err1) return console.log(error)
            var result_string = result.wml.card[0].p[0]._;
            //find index of total credit and isolate the number
            var n = result_string.indexOf("User TotCred:");
            var o = result_string.indexOf("User AvgCred:");
            var p = result_string.indexOf("Team: ");
            if (n === -1 || o === -1 || p === -1) return console.log("xml changed, check endpoint");
            var total_credit = parseFloat(result_string.substring(n + 13, o).replace(',', ''));
            var recent_avg_credit = parseFloat(result_string.substring(o + 13, p).replace(',', ''));
            var estimated_flops = total_credit / 200;
            var date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
            var object = new Data({
                total_credit: total_credit,
                recent_avg_credit: recent_avg_credit,
                estimated_flops: estimated_flops,
                date: date,
                timestamp: Date.now()
            });
            object.save((err2) => {
                if (err2) return console.log(err2);
                console.log("\n --------------- \n\n" + object + "\n\n --------------- \n");
            });
        });
    });
}

//get data upon program startup
getData();

//set interval job to get data once every day
setInterval(() => {
    getData();
},
    1000 * 60 * 60 * 24 //every day, the command is run
);


app.listen(port, () => {
    console.log(`App listening on port: ${port}`);
})