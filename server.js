const express = require("express");
const session = require("express-session");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();

const PORT = process.env.PORT || 10000;

const DATA_DIR = path.join(__dirname, "data");
const MANUALS_DIR = path.join(DATA_DIR, "manuals");
const LIBRARY_FILE = path.join(DATA_DIR, "library.json");
const PUBLIC_DIR = path.join(__dirname, "public");

// Maak mappen automatisch aan
fs.mkdirSync(MANUALS_DIR, { recursive: true });

// Maak library.json aan als die nog niet bestaat
if (!fs.existsSync(LIBRARY_FILE)) {
    fs.writeFileSync(
        LIBRARY_FILE,
        JSON.stringify(
            {
                aircraft: []
            },
            null,
            2
        )
    );
}


// ============================================================
// LIBRARY
// ============================================================

function loadLibrary() {
    try {
        return JSON.parse(
            fs.readFileSync(
                LIBRARY_FILE,
                "utf8"
            )
        );
    } catch (error) {

        console.error(
            "Library kon niet worden gelezen:",
            error
        );

        return {
            aircraft: []
        };
    }
}


function saveLibrary(library) {

    fs.writeFileSync(
        LIBRARY_FILE,
        JSON.stringify(
            library,
            null,
            2
        )
    );

}


// ============================================================
// EXPRESS
// ============================================================

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);


// ============================================================
// SESSIONS
// ============================================================

app.use(
    session({

        secret:
            process.env.SESSION_SECRET ||
            "VLOCX_CHANGE_THIS_SECRET",

        resave: false,

        saveUninitialized: false,

        cookie: {
            httpOnly: true,

            secure:
                process.env.NODE_ENV === "production",

            maxAge:
                1000 * 60 * 60 * 8
        }

    })
);


// ============================================================
// ADMIN LOGIN
// ============================================================

function requireAdmin(req, res, next) {

    if (!req.session.admin) {

        return res.status(401).json({
            error: "Niet ingelogd."
        });

    }

    next();

}


// ============================================================
// FILE UPLOAD
// ============================================================

const storage =
    multer.diskStorage({

        destination:
            function(req, file, cb) {

                cb(
                    null,
                    MANUALS_DIR
                );

            },

        filename:
            function(req, file, cb) {

                const extension =
                    path.extname(
                        file.originalname
                    ).toLowerCase();

                const randomName =
                    crypto
                        .randomBytes(16)
                        .toString("hex");

                cb(
                    null,
                    randomName + extension
                );

            }

    });


const upload =
    multer({

        storage,

        limits: {

            fileSize:
                300 * 1024 * 1024

        },

        fileFilter:
            function(req, file, cb) {

                const extension =
                    path.extname(
                        file.originalname
                    ).toLowerCase();

                if (extension !== ".pdf") {

                    return cb(
                        new Error(
                            "Alleen PDF-bestanden zijn toegestaan."
                        )
                    );

                }

                cb(null, true);

            }

    });


// ============================================================
// PUBLIC API
// ============================================================

app.get(
    "/api/library",
    function(req, res) {

        const library =
            loadLibrary();

        const publicLibrary = {

            aircraft:
                library.aircraft.map(
                    aircraft => ({

                        id: aircraft.id,

                        name: aircraft.name,

                        manuals:
                            aircraft.manuals.map(
                                manual => ({

                                    id: manual.id,

                                    name: manual.name,

                                    url:
                                        "/manuals/" +
                                        encodeURIComponent(
                                            manual.filename
                                        )

                                })
                            )

                    })
                )

        };

        res.json(
            publicLibrary
        );

    }
);


// ============================================================
// PDF BESTANDEN BESCHIKBAAR MAKEN
// ============================================================

app.get(
    "/manuals/:filename",
    function(req, res) {

        const filename =
            path.basename(
                req.params.filename
            );

        const filePath =
            path.join(
                MANUALS_DIR,
                filename
            );

        if (!fs.existsSync(filePath)) {

            return res.status(404).send(
                "Manual niet gevonden."
            );

        }

        res.sendFile(
            filePath
        );

    }
);


// ============================================================
// LOGIN
// ============================================================

app.post(
    "/api/login",
    function(req, res) {

        const username =
            process.env.ADMIN_USERNAME;

        const password =
            process.env.ADMIN_PASSWORD;

        if (!username || !password) {

            return res.status(500).json({

                error:
                    "ADMIN_USERNAME en ADMIN_PASSWORD zijn nog niet ingesteld in Render."

            });

        }

        if (
            req.body.username !== username ||
            req.body.password !== password
        ) {

            return res.status(401).json({

                error:
                    "Gebruikersnaam of wachtwoord is fout."

            });

        }

        req.session.admin = true;

        res.json({
            success: true
        });

    }
);


// ============================================================
// LOGOUT
// ============================================================

app.post(
    "/api/logout",
    function(req, res) {

        req.session.destroy(
            function() {

                res.json({
                    success: true
                });

            }
        );

    }
);


// ============================================================
// CHECK LOGIN
// ============================================================

app.get(
    "/api/me",
    function(req, res) {

        res.json({

            loggedIn:
                !!req.session.admin

        });

    }
);


// ============================================================
// AIRCRAFT TOEVOEGEN
// ============================================================

app.post(
    "/api/admin/aircraft",
    requireAdmin,
    function(req, res) {

        const name =
            String(
                req.body.name || ""
            ).trim();

        if (!name) {

            return res.status(400).json({

                error:
                    "Naam van het vliegtuig ontbreekt."

            });

        }

        const library =
            loadLibrary();

        const aircraft = {

            id:
                crypto
                    .randomBytes(8)
                    .toString("hex"),

            name,

            manuals: []

        };

        library.aircraft.push(
            aircraft
        );

        saveLibrary(
            library
        );

        res.json({
            success: true,
            aircraft
        });

    }
);


// ============================================================
// AIRCRAFT NAAM WIJZIGEN
// ============================================================

app.put(
    "/api/admin/aircraft/:id",
    requireAdmin,
    function(req, res) {

        const library =
            loadLibrary();

        const aircraft =
            library.aircraft.find(
                item =>
                    item.id ===
                    req.params.id
            );

        if (!aircraft) {

            return res.status(404).json({

                error:
                    "Vliegtuig niet gevonden."

            });

        }

        const name =
            String(
                req.body.name || ""
            ).trim();

        if (!name) {

            return res.status(400).json({

                error:
                    "Naam mag niet leeg zijn."

            });

        }

        aircraft.name =
            name;

        saveLibrary(
            library
        );

        res.json({
            success: true,
            aircraft
        });

    }
);


// ============================================================
// AIRCRAFT VERWIJDEREN
// ============================================================

app.delete(
    "/api/admin/aircraft/:id",
    requireAdmin,
    function(req, res) {

        const library =
            loadLibrary();

        const index =
            library.aircraft.findIndex(
                item =>
                    item.id ===
                    req.params.id
            );

        if (index === -1) {

            return res.status(404).json({

                error:
                    "Vliegtuig niet gevonden."

            });

        }

        const aircraft =
            library.aircraft[index];

        // Verwijder alle PDF's
        for (
            const manual
            of aircraft.manuals
        ) {

            const filePath =
                path.join(
                    MANUALS_DIR,
                    manual.filename
                );

            if (
                fs.existsSync(
                    filePath
                )
            ) {

                fs.unlinkSync(
                    filePath
                );

            }

        }

        library.aircraft.splice(
            index,
            1
        );

        saveLibrary(
            library
        );

        res.json({
            success: true
        });

    }
);


// ============================================================
// MANUALS UPLOADEN
// ============================================================

app.post(
    "/api/admin/manuals",
    requireAdmin,
    upload.array(
        "manuals",
        4
    ),
    function(req, res) {

        try {

            const aircraftId =
                req.body.aircraftId;

            const library =
                loadLibrary();

            const aircraft =
                library.aircraft.find(
                    item =>
                        item.id ===
                        aircraftId
                );

            if (!aircraft) {

                // Verwijder reeds geüploade bestanden
                for (
                    const file
                    of req.files || []
                ) {

                    if (
                        fs.existsSync(
                            file.path
                        )
                    ) {

                        fs.unlinkSync(
                            file.path
                        );

                    }

                }

                return res.status(404).json({

                    error:
                        "Vliegtuig niet gevonden."

                });

            }


            const currentCount =
                aircraft.manuals.length;

            const newCount =
                currentCount +
                req.files.length;

            if (newCount > 4) {

                for (
                    const file
                    of req.files
                ) {

                    if (
                        fs.existsSync(
                            file.path
                        )
                    ) {

                        fs.unlinkSync(
                            file.path
                        );

                    }

                }

                return res.status(400).json({

                    error:
                        "Een vliegtuig mag maximaal 4 manuals hebben."

                });

            }


            for (
                const file
                of req.files
            ) {

                aircraft.manuals.push({

                    id:
                        crypto
                            .randomBytes(8)
                            .toString("hex"),

                    name:
                        path.basename(
                            file.originalname,
                            path.extname(
                                file.originalname
                            )
                        ),

                    filename:
                        file.filename

                });

            }

            saveLibrary(
                library
            );

            res.json({

                success: true,

                aircraft

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                error:
                    "Upload mislukt."

            });

        }

    }
);


// ============================================================
// MANUAL VERWIJDEREN
// ============================================================

app.delete(
    "/api/admin/manuals/:id",
    requireAdmin,
    function(req, res) {

        const library =
            loadLibrary();

        let foundManual = null;

        let foundAircraft = null;

        for (
            const aircraft
            of library.aircraft
        ) {

            const manual =
                aircraft.manuals.find(
                    item =>
                        item.id ===
                        req.params.id
                );

            if (manual) {

                foundManual =
                    manual;

                foundAircraft =
                    aircraft;

                break;

            }

        }

        if (
            !foundManual ||
            !foundAircraft
        ) {

            return res.status(404).json({

                error:
                    "Manual niet gevonden."

            });

        }

        const filePath =
            path.join(
                MANUALS_DIR,
                foundManual.filename
            );

        if (
            fs.existsSync(
                filePath
            )
        ) {

            fs.unlinkSync(
                filePath
            );

        }

        foundAircraft.manuals =
            foundAircraft.manuals.filter(
                manual =>
                    manual.id !==
                    req.params.id
            );

        saveLibrary(
            library
        );

        res.json({
            success: true
        });

    }
);


// ============================================================
// PUBLIC WEBSITE
// ============================================================

app.use(
    express.static(
        PUBLIC_DIR
    )
);


// /admin naar admin.html
app.get(
    "/admin",
    function(req, res) {

        res.sendFile(
            path.join(
                PUBLIC_DIR,
                "admin.html"
            )
        );

    }
);


// Andere routes naar index.html
app.get(
    "*",
    function(req, res) {

        res.sendFile(
            path.join(
                PUBLIC_DIR,
                "index.html"
            )
        );

    }
);


// ============================================================
// FOUTAFHANDELING
// ============================================================

app.use(
    function(error, req, res, next) {

        console.error(error);

        if (
            error instanceof multer.MulterError
        ) {

            return res.status(400).json({

                error:
                    "Uploadfout: " +
                    error.message

            });

        }

        res.status(500).json({

            error:
                error.message ||
                "Er is een serverfout opgetreden."

        });

    }
);


// ============================================================
// SERVER STARTEN
// ============================================================

app.listen(
    PORT,
    function() {

        console.log(
            `VlocX Kyran server draait op poort ${PORT}`
        );

    }
);
