import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import { config as dotenvConfig } from "dotenv";
import _ from "lodash";

dotenvConfig(); // Load environment variables from .env file

const app = express();

const port = process.env.PORT || 3000;

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

mongoose.connect(process.env.DATABASE, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const db = mongoose.connection;

db.on("error", (error) => {
    console.error("MongoDB connection error:", error);
});

db.once("open", () => {
    console.log("Connected to MongoDB Atlas");
});

const itemsSchema = new mongoose.Schema({
    name: String,
});

const Item = mongoose.model("Item", itemsSchema);

const item1 = new Item({
    name: "Welcome to your todo list.",
});

const item2 = new Item({
    name: "Hit + button to create a new item.",
});

const item3 = new Item({
    name: "<-- Hit this to delete an item.",
});

const defaultItems = [item1, item2, item3];

const listSchema = new mongoose.Schema({
    name: String,
    items: [itemsSchema]
});

const List = mongoose.model("List", listSchema);


app.get("/", async(req, res) => {
    try {
        const items = await Item.find().lean();

        if (items.length === 0) {
            await Item.insertMany(defaultItems);
            res.redirect("/");
        } else {
            res.render("list", { listTitle: "Today", newListItems: items });
        }
    } catch (error) {
        console.error("Error fetching items:", error);
        res.status(500).json({ error: "An error occurred while fetching items" });
    }
});



app.post("/", (req, res) => {

    const itemName = req.body.newItem;
    const listName = req.body.list;

    const itemN = new Item({
        name: itemName
    });

    if (listName === "Today") {
        itemN.save();
        res.redirect("/");
    } else {
        List.findOne({ name: listName })
            .then((foundList) => {
                foundList.items.push(itemN);
                foundList.save();
                res.redirect("/" + listName);
            });
    }
});

app.post("/delete", async(req, res) => {
    const checkedItemId = req.body.checkbox;
    const listName = req.body.listName;
    try {
        if (listName === "Today") {
            await Item.findByIdAndRemove(checkedItemId);
            res.redirect("/");
        } else {
            List.findOneAndUpdate({ name: listName }, { $pull: { items: { _id: checkedItemId } } })
                .then((foundList) => {
                    if (foundList) {
                        res.redirect("/" + listName);
                    }
                });
        }


    } catch (error) {
        console.error("Error deleting item:", error);
        res.status(500).json({ error: "An error occurred while deleting the item" });
    }
});

app.get("/:listName", async(req, res) => {
    const customListName = _.capitalize(req.params.listName);

    try {
        const foundList = await List.findOne({ name: customListName });
        if (!foundList) {
            const list = new List({
                name: customListName,
                items: defaultItems,
            });
            await list.save();
            res.redirect("/" + customListName);
        } else {
            res.render("list.ejs", { listTitle: foundList.name, newListItems: foundList.items });
        }
    } catch (error) {
        console.error("Error fetching list:", error);
        res.status(500).json({ error: "An error occurred while fetching the list" });
    }
});

app.get("/about", (req, res) => {
    res.render("about");
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});