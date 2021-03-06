const express = require("express");
const models = require("../models");
const router = express.Router();
const fileUpload = require("../lib/index.js");

let connection = models.sequelize;
connection.sync();

// Encrypts the user's password.

let crypto = require("crypto"),
    algorithm = "aes-256-ctr",
    key = "d6F3Efeq!pkHeji65$iok";

function encrypt(text) {
    let cipher = crypto.createCipher(algorithm, key);
    let crypted = cipher.update(text, "utf8", "hex");
    crypted += cipher.final("hex");
    return crypted;
}

// Redirects the user to the login page from root.
router.get("/", function(req, res) {
    res.redirect("/login");
});

// Renders the login page.
router.get("/login", function(req, res) {
    res.render("login");
});

// Renders the signup page.
router.get("/signup", function(req, res) {
    res.render("signup");
});

// Renders the filter page if the user has been authenticated.
let userAuthenticated = false;
router.get("/index/:id", function(req, res) {
    let type = req.params.id;
    console.log(req.params.id);
    if (type === "Main") {
        if (userAuthenticated === true) {
            models.items
                .findAll({
                    // blah, blah, blah...
                })
                .then(function(data) {
                    let hbsObject = { items: data };
                    res.render("index", hbsObject);
                })
                .catch(function(err) {
                    console.log(err);
                });
        } else {
            res.redirect("/login");
        }
    } else {
        let filter = { where: { category: type } };
        if (userAuthenticated === true) {
            models.items
                .findAll(filter)
                .then(function(data) {
                    let hbsObject = { items: data };
                    res.render("index", hbsObject);
                })
                .catch(function(err) {
                    console.log(err);
                });
        }
    }
});

// Create a new user.
router.post("/users/createUser", function(req, res) {
    let email = req.body.emailInput;
    let encryptedPass = encrypt(req.body.passInput);

    if (email && encryptedPass) {
        // Check if the user already exists.
        models.users
            .findOne({
                where: { user: req.body.emailInput }
            })
            .then(function(data) {
                if (data === null) {
                    models.users
                        .create({
                            user: email,
                            pass: encryptedPass
                        })
                        .then(function() {
                            res.redirect("/login");
                        });
                } else if (data.dataValues.user === req.body.emailInput) {
                    console.log("That user already exists!");
                    res.redirect("/signup");
                }
            });
    } else {
        console.log("The user must enter both an email and password.");
        res.redirect("/signup");
    }
});

// Authenticate the user.
let authUserEmail = "";
router.post("/users/authUser", function(req, res) {
    models.users
        .findOne({
            where: { user: req.body.emailInput1 }
        })
        .then(function(data) {
            console.log(data);
            let userEmail = data.dataValues.user;
            if (userEmail === req.body.emailInput1) {
                console.log("That user exists!");

                if (encrypt(req.body.passInput1) === data.dataValues.pass) {
                    userAuthenticated = true;
                    authUserEmail = req.body.emailInput1;
                    res.redirect("/index/Main");
                } else {
                    console.log("The password the user entered is incorrect.");
                    res.redirect("/login");
                }
            }
        })
        .catch(function(err) {
            console.log(err);
            console.log("The email entered doesn't exist.");
            res.redirect("/login");
        });
});

// Render the create item page.
router.get("/create", function(req, res) {
    res.render("create");
});

// Upload the item's picture to the server.
router.use(fileUpload());
router.post("/upload", function(req, res) {
    let imageId = "0000000000";

    if (Object.keys(req.files).length === 0) {
        console.log("No file was uploaded.");
    } else {
        // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
        imageId = Math.floor(Math.random() * 1000000000).toString();

        let sampleFile = req.files.sampleFile;
        // Use the mv() method to place the file somewhere on your server
        sampleFile.mv("./public/uploads/" + imageId + ".jpg", function(err) {
            if (err) {
                return res.status(500).send(err);
            }
            console.log("File uploaded!");
        });
    }

    if (
        req.body.titleInput === "" ||
        req.body.priceInput === "" ||
        req.body.categoryInput === "" ||
        req.body.infoInput === "" ||
        req.body.zipInput === ""
    ) {
        console.log("Not all fields have input, try again!");
        res.redirect("/create");
    } else {
        // Add the item's info into the database.
        models.items
            .create({
                user: authUserEmail,
                title: req.body.titleInput,
                price: req.body.priceInput,
                category: req.body.categoryInput,
                info: req.body.infoInput,
                zipCode: req.body.zipInput,
                imageUrl: "../uploads/" + imageId + ".jpg"
            })
            .then(function() {
                console.log("Info added to database!");
                res.redirect("/index/Main");
            })
            .catch(function(err) {
                console.log(err);
                console.log("I don't know what went wrong...");
                res.redirect("/index");
            });
    }
});

// Export routes.
module.exports = router;
