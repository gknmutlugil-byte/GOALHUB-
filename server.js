
const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();

const PORT = 3000;
const API_BASE = "https://v3.football.api-sports.io";
const API_KEY = process.env.API_KEY;

// ======================================================
// API KEY KONTROL
// ======================================================

if (!API_KEY) {
    console.error("");
    console.error("❌ API_KEY bulunamadı!");
    console.error("📌 .env dosyanı kontrol et.");
    console.error("");
    process.exit(1);
}

// ======================================================
// EXPRESS
// ======================================================

app.use(express.json());

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);

// ======================================================
// API HELPER
// ======================================================

async function footballAPI(endpoint, params = {}) {

    const url = new URL(
        API_BASE + endpoint
    );

    for (const [key, value] of Object.entries(params)) {

        if (
            value !== undefined &&
            value !== null &&
            value !== ""
        ) {

            url.searchParams.set(
                key,
                value
            );
        }
    }

    console.log(
        "➡️ API:",
        endpoint,
        Object.fromEntries(
            url.searchParams.entries()
        )
    );

    const response = await fetch(
        url,
        {
            method: "GET",
            headers: {
                "x-apisports-key": API_KEY
            }
        }
    );

    const text =
        await response.text();

    let data;

    try {

        data = JSON.parse(text);

    } catch {

        throw new Error(
            "API geçersiz JSON döndürdü: " +
            text.substring(0, 500)
        );

    }

    if (!response.ok) {

        throw new Error(
            `API HTTP ${response.status}`
        );

    }

    if (
        data.errors &&
        Object.keys(data.errors).length > 0
    ) {

        throw new Error(
            JSON.stringify(
                data.errors
            )
        );

    }

    return data;
}

// ======================================================
// API TEST
// ======================================================

app.get(
    "/api/test",
    async (req, res) => {

        try {

            const data =
                await footballAPI(
                    "/status"
                );

            res.json({

                success: true,

                message:
                    "GOALHUB API bağlantısı çalışıyor.",

                api: data

            });

        } catch (error) {

            console.error(
                "❌ TEST:",
                error
            );

            res.status(500).json({

                success: false,

                error:
                    error.message

            });

        }

    }
);

// ======================================================
// STATUS
// ======================================================

app.get(
    "/api/status",
    async (req, res) => {

        try {

            const data =
                await footballAPI(
                    "/status"
                );

            res.json(data);

        } catch (error) {

            res.status(500).json({

                success: false,

                error:
                    error.message

            });

        }

    }
);

// ======================================================
// LIVE MATCHES
// ======================================================

app.get(
    "/api/live",
    async (req, res) => {

        try {

            const data =
                await footballAPI(
                    "/fixtures",
                    {
                        live: "all"
                    }
                );

            res.json(data);

        } catch (error) {

            console.error(
                "❌ LIVE:",
                error
            );

            res.status(500).json({

                success: false,

                error:
                    error.message

            });

        }

    }
);

// ======================================================
// FIXTURES
// ======================================================

app.get(
    "/api/fixtures",
    async (req, res) => {

        try {

            const date =
                req.query.date;

            const league =
                req.query.league;

            const season =
                req.query.season ||
                2026;

            if (!date) {

                return res.status(400).json({

                    success: false,

                    error:
                        "date parametresi gerekli."

                });

            }

            const params = {

                date,
                season

            };

            if (league) {

                params.league =
                    league;

            }

            const data =
                await footballAPI(
                    "/fixtures",
                    params
                );

            res.json(data);

        } catch (error) {

            console.error(
                "❌ FIXTURES:",
                error
            );

            res.status(500).json({

                success: false,

                error:
                    error.message

            });

        }

    }
);

// ======================================================
// LEAGUES SEARCH
// ======================================================

app.get(
    "/api/leagues",
    async (req, res) => {

        try {

            const search =
                (
                    req.query.search ||
                    ""
                ).trim();

            if (!search) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Lig adı gerekli."

                });

            }

            const data =
                await footballAPI(
                    "/leagues",
                    {
                        search
                    }
                );

            res.json(data);

        } catch (error) {

            console.error(
                "❌ LEAGUES:",
                error
            );

            res.status(500).json({

                success: false,

                error:
                    error.message

            });

        }

    }
);

// ======================================================
// TEAMS SEARCH
// ======================================================

app.get(
    "/api/teams",
    async (req, res) => {

        try {

            const search =
                (
                    req.query.search ||
                    ""
                ).trim();

            if (!search) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Takım adı gerekli."

                });

            }

            const data =
                await footballAPI(
                    "/teams",
                    {
                        search
                    }
                );

            res.json(data);

        } catch (error) {

            console.error(
                "❌ TEAMS:",
                error
            );

            res.status(500).json({

                success: false,

                error:
                    error.message

            });

        }

    }
);

// ======================================================
// TEAM DETAIL
// ======================================================

app.get(
    "/api/team/:id",
    async (req, res) => {

        try {

            const data =
                await footballAPI(
                    "/teams",
                    {
                        id:
                            req.params.id
                    }
                );

            res.json(data);

        } catch (error) {

            console.error(
                "❌ TEAM DETAIL:",
                error
            );

            res.status(500).json({

                success: false,

                error:
                    error.message

            });

        }

    }
);

// ======================================================
// TEAM SQUAD
// ======================================================

app.get(
    "/api/team/:id/squad",
    async (req, res) => {

        try {

            const data =
                await footballAPI(
                    "/players/squads",
                    {
                        team:
                            req.params.id
                    }
                );

            res.json(data);

        } catch (error) {

            console.error(
                "❌ SQUAD:",
                error
            );

            res.status(500).json({

                success: false,

                error:
                    error.message

            });

        }

    }
);

// ======================================================
// PLAYER SEARCH
// ======================================================

app.get(
    "/api/players",
    async (req, res) => {

        try {

            const search =
                (
                    req.query.search ||
                    ""
                ).trim();

            const team =
                req.query.team;

            const league =
                req.query.league;

            const season =
                req.query.season ||
                2026;

            if (!search && !team && !league) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Oyuncu adı, takım veya lig gerekli."

                });

            }

            // ------------------------------------------------
            // TEAM / LEAGUE
            // ------------------------------------------------

            if (
                team ||
                league
            ) {

                const params = {

                    season

                };

                if (team) {

                    params.team =
                        team;

                }

                if (league) {

                    params.league =
                        league;

                }

                if (search) {

                    params.search =
                        search;

                }

                console.log(
                    "🔎 PLAYER:",
                    params
                );

                const data =
                    await footballAPI(
                        "/players",
                        params
                    );

                return res.json(data);

            }

            // ------------------------------------------------
            // SADECE OYUNCU ADI
            // ------------------------------------------------

            const leagues = [

                39,
                140,
                135,
                78,
                61,
                203,
                2

            ];

            const results = [];

            for (
                const leagueId
                of leagues
            ) {

                try {

                    const data =
                        await footballAPI(
                            "/players",
                            {
                                league:
                                    leagueId,

                                season:
                                    season,

                                search:
                                    search
                            }
                        );

                    if (
                        data.response &&
                        data.response.length
                    ) {

                        results.push(
                            ...data.response
                        );

                    }

                } catch (e) {

                    console.log(
                        "⚠️ Lig",
                        leagueId,
                        "atlanıyor:",
                        e.message
                    );

                }

            }

            // ------------------------------------------------
            // DUPLICATE TEMİZLE
            // ------------------------------------------------

            const unique = [];

            const seen =
                new Set();

            for (
                const item
                of results
            ) {

                if (
                    !item.player ||
                    !item.player.id
                ) {

                    continue;

                }

                if (
                    seen.has(
                        item.player.id
                    )
                ) {

                    continue;

                }

                seen.add(
                    item.player.id
                );

                unique.push(
                    item
                );

            }

            console.log(
                "✅ Bulunan oyuncu:",
                unique.length
            );

            res.json({

                success: true,

                results:
                    unique.length,

                response:
                    unique

            });

        } catch (error) {

            console.error(
                "❌ PLAYER SEARCH:",
                error
            );

            res.status(500).json({

                success: false,

                error:
                    error.message

            });

        }

    }
);

// ======================================================
// PLAYER DETAIL
// ======================================================

app.get(
    "/api/player/:id",
    async (req, res) => {

        try {

            const id =
                req.params.id;

            const season =
                req.query.season ||
                2026;

            const data =
                await footballAPI(
                    "/players",
                    {
                        id,
                        season
                    }
                );

            res.json(data);

        } catch (error) {

            console.error(
                "❌ PLAYER DETAIL:",
                error
            );

            res.status(500).json({

                success: false,

                error:
                    error.message

            });

        }

    }
);

// ======================================================
// PLAYER TRANSFERS
// ======================================================

app.get(
    "/api/transfers/:id",
    async (req, res) => {

        try {

            const data =
                await footballAPI(
                    "/transfers",
                    {
                        player:
                            req.params.id
                    }
                );

            res.json(data);

        } catch (error) {

            console.error(
                "❌ TRANSFERS:",
                error
            );

            res.status(500).json({

                success: false,

                error:
                    error.message

            });

        }

    }
);

// ======================================================
// STANDINGS
// ======================================================

app.get(
    "/api/standings",
    async (req, res) => {

        try {

            const league =
                req.query.league;

            const season =
                req.query.season ||
                2026;

            if (!league) {

                return res.status(400).json({

                    success: false,

                    error:
                        "league parametresi gerekli."

                });

            }

            const data =
                await footballAPI(
                    "/standings",
                    {
                        league,
                        season
                    }
                );

            res.json(data);

        } catch (error) {

            console.error(
                "❌ STANDINGS:",
                error
            );

            res.status(500).json({

                success: false,

                error:
                    error.message

            });

        }

    }
);

// ======================================================
// FIXTURE DETAIL
// ======================================================

app.get(
    "/api/fixture/:id",
    async (req, res) => {

        try {

            const data =
                await footballAPI(
                    "/fixtures",
                    {
                        id:
                            req.params.id
                    }
                );

            res.json(data);

        } catch (error) {

            console.error(
                "❌ FIXTURE DETAIL:",
                error
            );

            res.status(500).json({

                success: false,

                error:
                    error.message

            });

        }

    }
);

// ======================================================
// MATCH DETAIL ALIAS
// ======================================================
// Frontend /api/match/:id kullanıyorsa da çalışır.
// ======================================================

app.get(
    "/api/match/:id",
    async (req, res) => {

        try {

            const data =
                await footballAPI(
                    "/fixtures",
                    {
                        id:
                            req.params.id
                    }
                );

            res.json(data);

        } catch (error) {

            console.error(
                "❌ MATCH DETAIL:",
                error
            );

            res.status(500).json({

                success: false,

                error:
                    error.message

            });

        }

    }
);

// ======================================================
// FIXTURE EVENTS
// ======================================================

app.get(
    "/api/fixture/:id/events",
    async (req, res) => {

        try {

            const data =
                await footballAPI(
                    "/fixtures/events",
                    {
                        fixture:
                            req.params.id
                    }
                );

            res.json(data);

        } catch (error) {

            console.error(
                "❌ EVENTS:",
                error
            );

            res.status(500).json({

                success: false,

                error:
                    error.message

            });

        }

    }
);

// ======================================================
// FIXTURE STATISTICS
// ======================================================

app.get(
    "/api/fixture/:id/statistics",
    async (req, res) => {

        try {

            const data =
                await footballAPI(
                    "/fixtures/statistics",
                    {
                        fixture:
                            req.params.id
                    }
                );

            res.json(data);

        } catch (error) {

            console.error(
                "❌ STATISTICS:",
                error
            );

            res.status(500).json({

                success: false,

                error:
                    error.message

            });

        }

    }
);

// ======================================================
// FIXTURE LINEUPS
// ======================================================

app.get(
    "/api/fixture/:id/lineups",
    async (req, res) => {

        try {

            const data =
                await footballAPI(
                    "/fixtures/lineups",
                    {
                        fixture:
                            req.params.id
                    }
                );

            res.json(data);

        } catch (error) {

            console.error(
                "❌ LINEUPS:",
                error
            );

            res.status(500).json({

                success: false,

                error:
                    error.message

            });

        }

    }
);

// ======================================================
// FIXTURE HEAD TO HEAD
// ======================================================

app.get(
    "/api/h2h",
    async (req, res) => {

        try {

            const h2h =
                req.query.h2h;

            if (!h2h) {

                return res.status(400).json({

                    success: false,

                    error:
                        "h2h parametresi gerekli."

                });

            }

            const data =
                await footballAPI(
                    "/fixtures/headtohead",
                    {
                        h2h
                    }
                );

            res.json(data);

        } catch (error) {

            console.error(
                "❌ H2H:",
                error
            );

            res.status(500).json({

                success: false,

                error:
                    error.message

            });

        }

    }
);

// ======================================================
// TEAM FIXTURES
// ======================================================

app.get(
    "/api/team/:id/fixtures",
    async (req, res) => {

        try {

            const team =
                req.params.id;

            const season =
                req.query.season ||
                2026;

            const last =
                req.query.last;

            const next =
                req.query.next;

            const params = {

                team,
                season

            };

            if (last) {

                params.last =
                    last;

            }

            if (next) {

                params.next =
                    next;

            }

            const data =
                await footballAPI(
                    "/fixtures",
                    params
                );

            res.json(data);

        } catch (error) {

            console.error(
                "❌ TEAM FIXTURES:",
                error
            );

            res.status(500).json({

                success: false,

                error:
                    error.message

            });

        }

    }
);

// ======================================================
// TEAM STANDINGS
// ======================================================

app.get(
    "/api/team/:id/standings",
    async (req, res) => {

        try {

            const team =
                req.params.id;

            const league =
                req.query.league;

            const season =
                req.query.season ||
                2026;

            if (!league) {

                return res.status(400).json({

                    success: false,

                    error:
                        "league parametresi gerekli."

                });

            }

            const data =
                await footballAPI(
                    "/standings",
                    {
                        league,
                        season,
                        team
                    }
                );

            res.json(data);

        } catch (error) {

            console.error(
                "❌ TEAM STANDINGS:",
                error
            );

            res.status(500).json({

                success: false,

                error:
                    error.message

            });

        }

    }
);

// ======================================================
// COUNTRIES
// ======================================================

app.get(
    "/api/countries",
    async (req, res) => {

        try {

            const data =
                await footballAPI(
                    "/countries"
                );

            res.json(data);

        } catch (error) {

            console.error(
                "❌ COUNTRIES:",
                error
            );

            res.status(500).json({

                success: false,

                error:
                    error.message

            });

        }

    }
);

// ======================================================
// TOP SCORERS
// ======================================================

app.get(
    "/api/topscorers",
    async (req, res) => {

        try {

            const league =
                req.query.league;

            const season =
                req.query.season ||
                2026;

            if (!league) {

                return res.status(400).json({

                    success: false,

                    error:
                        "league parametresi gerekli."

                });

            }

            const data =
                await footballAPI(
                    "/players/topscorers",
                    {
                        league,
                        season
                    }
                );

            res.json(data);

        } catch (error) {

            console.error(
                "❌ TOP SCORERS:",
                error
            );

            res.status(500).json({

                success: false,

                error:
                    error.message

            });

        }

    }
);

// ======================================================
// TOP ASSISTS
// ======================================================

app.get(
    "/api/topassists",
    async (req, res) => {

        try {

            const league =
                req.query.league;

            const season =
                req.query.season ||
                2026;

            if (!league) {

                return res.status(400).json({

                    success: false,

                    error:
                        "league parametresi gerekli."

                });

            }

            const data =
                await footballAPI(
                    "/players/topassists",
                    {
                        league,
                        season
                    }
                );

            res.json(data);

        } catch (error) {

            console.error(
                "❌ TOP ASSISTS:",
                error
            );

            res.status(500).json({

                success: false,

                error:
                    error.message

            });

        }

    }
);

// ======================================================
// API 404
// ======================================================

app.use(
    "/api",
    (req, res) => {

        res.status(404).json({

            success: false,

            error:
                "GOALHUB API endpoint bulunamadı.",

            endpoint:
                req.originalUrl

        });

    }
);

// ======================================================
// FRONTEND FALLBACK
// ======================================================

app.use(
    (req, res, next) => {

        if (
            req.path.startsWith("/api/")
        ) {

            return next();

        }

        res.sendFile(
            path.join(
                __dirname,
                "public",
                "index.html"
            )
        );

    }
);

// ======================================================
// SERVER START
// ======================================================

app.listen(
    PORT,
    () => {

        console.log("");

        console.log(
            "================================"
        );

        console.log(
            "       GOALHUB PRO AKTİF"
        );

        console.log(
            "================================"
        );

        console.log("");

        console.log(
            `🌐 http://localhost:${PORT}`
        );

        console.log("");

        console.log(
            "✓ API KEY OK"
        );

        console.log(
            "✓ LIVE"
        );

        console.log(
            "✓ AUTO REFRESH FRONTEND READY"
        );

        console.log(
            "✓ GOALS / CARDS / SUBSTITUTIONS"
        );

        console.log(
            "✓ FIXTURES"
        );

        console.log(
            "✓ LEAGUES"
        );

        console.log(
            "✓ TEAMS"
        );

        console.log(
            "✓ PLAYERS"
        );

        console.log(
            "✓ TRANSFERS"
        );

        console.log(
            "✓ STANDINGS"
        );

        console.log(
            "✓ TOP SCORERS"
        );

        console.log(
            "✓ TOP ASSISTS"
        );

        console.log(
            "✓ MATCH DETAILS"
        );

        console.log(
            "✓ MATCH STATISTICS"
        );

        console.log(
            "✓ LINEUPS"
        );

        console.log(
            "✓ H2H"
        );

        console.log("");

        console.log(
            "================================"
        );

        console.log("");

    }
);
