import express from "express";
import mongoose from "mongoose";
import Cors from "cors";
import Messages from "./dbMessages.js";
import Pusher from "pusher";
import 'dotenv/config';

//App Config
const app = express();
const port = process.env.PORT || 9000;
const connection_url =
    `mongodb+srv://brianho501:${process.env.MONGO_PASSWORD}@cluster0.wap6ltm.mongodb.net/?retryWrites=true&w=majority`;

//Middleware
app.use(express.json());
app.use(Cors());
const pusher = new Pusher({
    appId: "1675083",
    key: process.env.PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: "us2",
    useTLS: true,
});

//DB Config
mongoose.connect(connection_url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const db = mongoose.connection;
db.once("open", () => {
    console.log("DB Connected");
    const msgCollection = db.collection("messagingmessages");
    const changeStream = msgCollection.watch();
    changeStream.on("change", (change) => {
        console.log(change);
        if (change.operationType === "insert") {
            const messageDetails = change.fullDocument;
            pusher.trigger("messages", "inserted", {
                name: messageDetails.name,
                message: messageDetails.message,
                timestamp: messageDetails.timestamp,
                received: messageDetails.received,
            });
        } else {
            console.log("Error trigerring Pusher");
        }
    });
});

//API Endpoints
app.get("/", (req, res) => res.status(200).send("Hello TheWebDev"));

app.post("/messages/new", async (req, res) => {
    const message = new Messages(req.body);
    try {
        await message.save();
        res.status(201).send(message);
    } catch (err) {
        console.log(err);
        res.status(500).send(err);
    }
});

app.get("/messages/sync", async (_, res) => {
    try {
        const data = await Messages.find({});
        res.status(200).send(data);
    } catch (err) {
        res.status(500).send(err);
    }
});

//Listener
app.listen(port, () => console.log(`Listening on localhost: ${port}`));
