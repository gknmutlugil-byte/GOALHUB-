require("dotenv").config();

const express = require("express");
const path = require("path");
const webpush = require("web-push");

const app = express();
const PORT = Number(process.env.PORT) || 3000;;

const API_KEY = process.env.API_FOOTBALL_KEY;

if (!API_KEY) {
    console.error("❌ API_FOOTBALL_KEY bulunamadı.");
    console.error("❌ .env dosyanı kontrol et.");
    process.exit(1);
}

const API_BASE = "https://v3.football.api-sports.io";

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

/* =========================================================
   VAPID
========================================================= */

const VAPID_PUBLIC_KEY =
    process.env.VAPID_PUBLIC_KEY;

const VAPID_PRIVATE_KEY =
    process.env.VAPID_PRIVATE_KEY;

if (
    !VAPID_PUBLIC_KEY ||
    !VAPID_PRIVATE_KEY
) {
    console.error("❌ VAPID anahtarları bulunamadı.");
    console.error("VAPID_PUBLIC_KEY gerekli.");
    console.error("VAPID_PRIVATE_KEY gerekli.");
    process.exit(1);
}

webpush.setVapidDetails(
    "mailto:goalhub@example.com",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
);

/* =========================================================
   MEMORY DATA
========================================================= */

/*
   endpoint -> {
       subscription,
       teams: [123,456]
   }
*/

const subscriptions = new Map();

/*
   fixtureId -> {
       home,
       away
   }
*/

const knownGoals = new Map();

/* =========================================================
   API HELPER
========================================================= */

async function footballAPI(
    endpoint,
    params = {}
) {

    const url =
        new URL(
            API_BASE + endpoint
        );

    Object.entries(params)
        .forEach(([key, value]) => {

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
        });

    console.log(
        "API:",
        url.pathname +
        url.search
    );

    const response =
        await fetch(
            url,
            {
                headers: {
                    "x-apisports-key":
                        API_KEY
                }
            }
        );

    let data;

    try {

        data =
            await response.json();

    } catch {

        throw new Error(
            "API-Football geçersiz cevap verdi."
        );
    }

    if (!response.ok) {

        throw new Error(
            data?.message ||
            `API-Football HTTP ${response.status}`
        );
    }

    if (
        data.errors &&
        Object.keys(data.errors).length
    ) {

        throw new Error(
            Object.entries(data.errors)
                .map(
                    ([key, value]) =>
                        `${key}: ${value}`
                )
                .join(" | ")
        );
    }

    return data;
}

/* =========================================================
   HEALTH
========================================================= */

app.get(
    "/api/health",
    (req, res) => {

        res.json({
            ok: true,
            name: "GOALHUB",
            node: process.version
        });

    }
);

/* =========================================================
   API TEST
========================================================= */

app.get(
    "/api/test",
    async (req, res) => {

        try {

            const data =
                await footballAPI(
                    "/status"
                );

            res.json({
                ok: true,
                message:
                    "GOALHUB API is working",
                api:
                    data.response
            });

        } catch (error) {

            res.status(500).json({
                ok: false,
                error:
                    error.message
            });

        }

    }
);

/* =========================================================
   LIVE
========================================================= */

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

            res.json({
                ok: true,
                response:
                    data.response || []
            });

        } catch (error) {

            console.error(
                "LIVE ERROR:",
                error.message
            );

            res.status(500).json({
                ok: false,
                error:
                    "LIVE_API_ERROR",
                details:
                    error.message
            });

        }

    }
);

/* =========================================================
   LEAGUE SEARCH
========================================================= */

app.get(
    "/api/leagues",
    async (req, res) => {

        const name =
            String(
                req.query.name || ""
            ).trim();

        if (!name) {

            return res.status(400).json({
                ok: false,
                error:
                    "Lig adı gerekli."
            });

        }

        try {

            const data =
                await footballAPI(
                    "/leagues",
                    {
                        search: name
                    }
                );

            const leagues =
                (data.response || [])
                    .map(item => ({

                        id:
                            item.league?.id,

                        name:
                            item.league?.name,

                        type:
                            item.league?.type,

                        country:
                            item.country?.name,

                        seasons:
                            item.seasons || []

                    }));

            res.json({
                ok: true,
                response:
                    leagues
            });

        } catch (error) {

            res.status(500).json({
                ok: false,
                error:
                    error.message
            });

        }

    }
);

/* =========================================================
   FIND LEAGUE
========================================================= */

async function findLeague(
    leagueName
) {

    const data =
        await footballAPI(
            "/leagues",
            {
                search:
                    leagueName
            }
        );

    const list =
        data.response || [];

    if (!list.length) {
        return null;
    }

    const exact =
        list.find(item =>

            String(
                item.league?.name || ""
            )
            .toLowerCase()
            ===
            leagueName.toLowerCase()

        );

    return exact || list[0];
}

/* =========================================================
   FIXTURES
========================================================= */

app.get(
    "/api/fixtures",
    async (req, res) => {

        const date =
            String(
                req.query.date || ""
            ).trim();

        const leagueName =
            String(
                req.query.league || ""
            ).trim();

        const season =
            String(
                req.query.season || "2026"
            ).trim();

        if (!date) {

            return res.status(400).json({
                ok: false,
                error:
                    "Tarih gerekli."
            });

        }

        try {

            const params = {
                date
            };

            if (
                leagueName &&
                leagueName !== "all"
            ) {

                const found =
                    await findLeague(
                        leagueName
                    );

                if (!found?.league?.id) {

                    return res.status(404).json({
                        ok: false,
                        error:
                            `"${leagueName}" adlı lig bulunamadı.`
                    });

                }

                params.league =
                    found.league.id;

                params.season =
                    season;
            }

            const data =
                await footballAPI(
                    "/fixtures",
                    params
                );

            res.json({
                ok: true,
                response:
                    data.response || []
            });

        } catch (error) {

            console.error(
                "FIXTURES ERROR:",
                error.message
            );

            res.status(500).json({
                ok: false,
                error:
                    "FIXTURES_API_ERROR",
                details:
                    error.message
            });

        }

    }
);

/* =========================================================
   STANDINGS
========================================================= */

app.get(
    "/api/standings",
    async (req, res) => {

        const leagueName =
            String(
                req.query.league || ""
            ).trim();

        const season =
            String(
                req.query.season || "2026"
            ).trim();

        if (!leagueName) {

            return res.status(400).json({
                ok: false,
                error:
                    "Lig adı gerekli."
            });

        }

        try {

            const found =
                await findLeague(
                    leagueName
                );

            if (!found?.league?.id) {

                return res.status(404).json({
                    ok: false,
                    error:
                        `"${leagueName}" adlı lig bulunamadı.`
                });

            }

            const data =
                await footballAPI(
                    "/standings",
                    {
                        league:
                            found.league.id,
                        season
                    }
                );

            res.json({
                ok: true,
                response:
                    data.response || []
            });

        } catch (error) {

            console.error(
                "STANDINGS ERROR:",
                error.message
            );

            res.status(500).json({
                ok: false,
                error:
                    "STANDINGS_API_ERROR",
                details:
                    error.message
            });

        }

    }
);

/* =========================================================
   TEAM SEARCH
========================================================= */

app.get(
    "/api/team-search",
    async (req, res) => {

        const name =
            String(
                req.query.name || ""
            ).trim();

        if (!name) {

            return res.status(400).json({
                ok: false,
                error:
                    "Takım adı gerekli."
            });

        }

        try {

            const data =
                await footballAPI(
                    "/teams",
                    {
                        search: name
                    }
                );

            const teams =
                (data.response || [])
                    .map(item => ({

                        team:
                            item.team,

                        venue:
                            item.venue

                    }));

            res.json({
                ok: true,
                response:
                    teams
            });

        } catch (error) {

            console.error(
                "TEAM SEARCH ERROR:",
                error.message
            );

            res.status(500).json({
                ok: false,
                error:
                    "TEAM_SEARCH_API_ERROR",
                details:
                    error.message
            });

        }

    }
);

/* =========================================================
   PLAYERS
========================================================= */

app.get(
    "/api/players",
    async (req, res) => {

        const search =
            String(
                req.query.search || ""
            ).trim();

        if (!search) {

            return res.status(400).json({
                ok: false,
                error:
                    "Oyuncu adı gerekli."
            });

        }

        try {

            /*
               API-Football bazı hesaplarda
               search parametresiyle beraber
               league/team istiyor.

               Bu yüzden birkaç büyük ligde
               arama yapıyoruz.
            */

            const leagues = [
                39,  // Premier League
                140, // La Liga
                135, // Serie A
                78,  // Bundesliga
                61,  // Ligue 1
                203, // Süper Lig
                253  // MLS
            ];

            let allPlayers = [];

            for (
                const leagueId
                of leagues
            ) {

                try {

                    const data =
                        await footballAPI(
                            "/players",
                            {
                                search,
                                league:
                                    leagueId,
                                season:
                                    2026
                            }
                        );

                    if (
                        Array.isArray(
                            data.response
                        )
                    ) {

                        allPlayers =
                            allPlayers.concat(
                                data.response
                            );
                    }

                } catch (error) {

                    console.log(
                        "PLAYER LEAGUE SKIP:",
                        leagueId,
                        error.message
                    );

                }

            }

            /*
               Aynı oyuncuları temizle.
            */

            const unique =
                new Map();

            for (
                const item
                of allPlayers
            ) {

                const id =
                    item.player?.id;

                if(id){
                    unique.set(
                        id,
                        item
                    );
                }

            }

            res.json({
                ok: true,
                response:
                    [...unique.values()]
            });

        } catch (error) {

            console.error(
                "PLAYERS ERROR:",
                error.message
            );

            res.status(500).json({
                ok: false,
                error:
                    "PLAYERS_API_ERROR",
                details:
                    error.message
            });

        }

    }
);

/* =========================================================
   TRANSFERS
========================================================= */

app.get(
    "/api/transfers",
    async (req, res) => {

        const teamName =
            String(
                req.query.teamName ||
                req.query.team ||
                ""
            ).trim();

        if (!teamName) {

            return res.status(400).json({
                ok: false,
                error:
                    "Takım adı gerekli."
            });

        }

        try {

            const teamData =
                await footballAPI(
                    "/teams",
                    {
                        search:
                            teamName
                    }
                );

            const team =
                (teamData.response || [])
                    .find(item =>

                        String(
                            item.team?.name || ""
                        )
                        .toLowerCase()
                        ===
                        teamName.toLowerCase()

                    )
                    ||
                    (teamData.response || [])[0];

            if (!team?.team?.id) {

                return res.status(404).json({
                    ok: false,
                    error:
                        `"${teamName}" adlı takım bulunamadı.`
                });

            }

            const data =
                await footballAPI(
                    "/transfers",
                    {
                        team:
                            team.team.id
                    }
                );

            let transfers =
                data.response || [];

            /*
               API-Football transfer yapısı:

               {
                   player: {...},
                   update: "...",
                   transfers: [
                       {
                           date,
                           type,
                           teams: {
                               in,
                               out
                           }
                       }
                   ]
               }
            */

            transfers.sort(
                (a, b) => {

                    const aDate =
                        new Date(
                            a.transfers?.[0]?.date ||
                            0
                        );

                    const bDate =
                        new Date(
                            b.transfers?.[0]?.date ||
                            0
                        );

                    return (
                        bDate - aDate
                    );
                }
            );

            res.json({
                ok: true,

                team:
                    team.team,

                response:
                    transfers
            });

        } catch (error) {

            console.error(
                "TRANSFERS ERROR:",
                error.message
            );

            res.status(500).json({
                ok: false,
                error:
                    "TRANSFERS_API_ERROR",
                details:
                    error.message
            });

        }

    }
);

/* =========================================================
   PUSH PUBLIC KEY
========================================================= */

app.get(
    "/api/push/public-key",
    (req, res) => {

        res.json({
            ok: true,
            publicKey:
                VAPID_PUBLIC_KEY
        });

    }
);

/* =========================================================
   PUSH SUBSCRIBE
========================================================= */

app.post(
    "/api/push/subscribe",
    (req, res) => {

        const {
            subscription,
            teams
        } = req.body;

        if (!subscription?.endpoint) {

            return res.status(400).json({
                ok: false,
                error:
                    "Push subscription gerekli."
            });

        }

        const cleanTeams =
            Array.isArray(teams)
                ? teams
                    .map(Number)
                    .filter(
                        Number.isInteger
                    )
                : [];

        subscriptions.set(
            subscription.endpoint,
            {
                subscription,
                teams:
                    cleanTeams
            }
        );

        console.log(
            "📱 PUSH KAYDEDİLDİ"
        );

        console.log(
            "Takımlar:",
            cleanTeams
        );

        res.json({
            ok: true,
            message:
                "Push subscription kaydedildi.",
            teams:
                cleanTeams
        });

    }
);

/* =========================================================
   UPDATE TEAMS
========================================================= */

app.post(
    "/api/push/teams",
    (req, res) => {

        const {
            endpoint,
            teams
        } = req.body;

        if (!endpoint) {

            return res.status(400).json({
                ok: false,
                error:
                    "Endpoint gerekli."
            });

        }

        const item =
            subscriptions.get(
                endpoint
            );

        if (!item) {

            return res.status(404).json({
                ok: false,
                error:
                    "Push subscription bulunamadı."
            });

        }

        item.teams =
            Array.isArray(teams)
                ? teams
                    .map(Number)
                    .filter(
                        Number.isInteger
                    )
                : [];

        subscriptions.set(
            endpoint,
            item
        );

        console.log(
            "🔄 TAKIMLAR GÜNCELLENDİ:",
            item.teams
        );

        res.json({
            ok: true,
            teams:
                item.teams
        });

    }
);

/* =========================================================
   UNSUBSCRIBE
========================================================= */

app.post(
    "/api/push/unsubscribe",
    (req, res) => {

        const {
            endpoint
        } = req.body;

        if (endpoint) {

            subscriptions.delete(
                endpoint
            );

        }

        res.json({
            ok: true
        });

    }
);

/* =============================/* =========================================================
   TEST PUSH NOTIFICATION
========================================================= */

app.get(
    "/api/push/test",
    async (req, res) => {

        let sent = 0;
        let failed = 0;

        for (
            const item
            of subscriptions.values()
        ) {

            try {

                await webpush.sendNotification(
                    item.subscription,
                    JSON.stringify({

                        title:
                            "⚽ GOALHUB TEST",

                        body:
                            "Bildirim sistemi çalışıyor! 🔔",

                        icon:
                            "/icon-192.png",

                        badge:
                            "/icon-192.png",

                        tag:
                            "goalhub-test-" +
                            Date.now(),

                        renotify:
                            true,

                        data: {
                            url: "/"
                        }

                    })
                );

                sent++;

                console.log(
                    "🔔 TEST BİLDİRİMİ GÖNDERİLDİ"
                );

            } catch (error) {

                failed++;

                console.error(
                    "❌ TEST PUSH ERROR:",
                    error.statusCode,
                    error.message
                );

                if (
                    error.statusCode === 404 ||
                    error.statusCode === 410
                ) {

                    subscriptions.delete(
                        item.subscription.endpoint
                    );

                }

            }

        }

        res.json({

            ok: true,

            message:
                "Test bildirimi gönderildi.",

            sent,

            failed,

            subscriptions:
                subscriptions.size

        });

    }
);============================
   SEND GOAL NOTIFICATION
========================================================= */

async function sendGoalNotification(
    teamId,
    teamName,
    opponentName,
    scoreHome,
    scoreAway
) {

    if (!teamId) {
        return;
    }

    const users =
        [
            ...subscriptions.values()
        ]
        .filter(item =>
            item.teams.includes(
                Number(teamId)
            )
        );

    if (!users.length) {

        console.log(
            `🔕 ${teamName} için abone yok.`
        );

        return;
    }

    const title =
        `⚽ ${teamName} GOL ATTI!`;

    const body =
        `${teamName} ${scoreHome} - ${scoreAway} ${opponentName}`;

    const payload =
        JSON.stringify({

            title,

            body,

            icon:
                "/icon-192.png",

            badge:
                "/icon-192.png",

            tag:
                `goal-${teamId}-${Date.now()}`,

            renotify:
                true,

            data: {
                teamId:
                    Number(teamId),

                url:
                    "/"
            }

        });

    for (
        const item
        of users
    ) {

        try {

            await webpush.sendNotification(
                item.subscription,
                payload
            );

            console.log(
                `🔔 BİLDİRİM GÖNDERİLDİ: ${teamName}`
            );

        } catch (error) {

            console.error(
                "PUSH ERROR:",
                error.statusCode,
                error.message
            );

            if (
                error.statusCode === 404 ||
                error.statusCode === 410
            ) {

                subscriptions.delete(
                    item.subscription.endpoint
                );

                console.log(
                    "🗑️ Geçersiz abonelik silindi."
                );

            }

        }

    }

}

/* =========================================================
   GOAL CHECKER
========================================================= */

let goalCheckRunning = false;

async function checkGoals() {

    if (goalCheckRunning) {
        return;
    }

    goalCheckRunning = true;

    try {

        const data =
            await footballAPI(
                "/fixtures",
                {
                    live: "all"
                }
            );

        const matches =
            data.response || [];

        for (
            const match
            of matches
        ) {

            const fixture =
                match.fixture || {};

            const teams =
                match.teams || {};

            const goals =
                match.goals || {};

            const fixtureId =
                fixture.id;

            if (!fixtureId) {
                continue;
            }

            const home =
                Number(
                    goals.home ?? 0
                );

            const away =
                Number(
                    goals.away ?? 0
                );

            const previous =
                knownGoals.get(
                    fixtureId
                );

            /*
               İlk kez gördüğümüz maçın
               mevcut skorunu hafızaya alıyoruz.

               Böylece eski gole bildirim gitmez.
            */

            if (!previous) {

                knownGoals.set(
                    fixtureId,
                    {
                        home,
                        away
                    }
                );

                continue;
            }

            /*
               Ev sahibi golü
            */

            if (
                home >
                previous.home
            ) {

                await sendGoalNotification(

                    teams.home?.id,

                    teams.home?.name ||
                        "Ev sahibi",

                    teams.away?.name ||
                        "Rakip",

                    home,

                    away

                );

            }

            /*
               Deplasman golü
            */

            if (
                away >
                previous.away
            ) {

                await sendGoalNotification(

                    teams.away?.id,

                    teams.away?.name ||
                        "Deplasman",

                    teams.home?.name ||
                        "Rakip",

                    home,

                    away

                );

            }

            knownGoals.set(
                fixtureId,
                {
                    home,
                    away
                }
            );

        }

        console.log(
            `⚽ Gol kontrolü tamamlandı • ${matches.length} canlı maç`
        );

    } catch (error) {

        console.error(
            "❌ GOL KONTROLÜ:",
            error.message
        );

    } finally {

        goalCheckRunning =
            false;

    }

}

/* =========================================================
   AUTO GOAL CHECK
========================================================= */

setInterval(
    checkGoals,
    30000
);

checkGoals();

/* =========================================================
   SERVICE WORKER
========================================================= */

app.get(
    "/service-worker.js",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "service-worker.js"
            )
        );

    }
);

/* =========================================================
   INDEX
========================================================= */

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "index.html"
            )
        );

    }
);

/* =========================================================
   404
========================================================= */

app.use(
    (req, res) => {

        res.status(404).json({
            ok: false,
            error:
                "Endpoint not found"
        });

    }
);

/* =========================================================
   SERVER
========================================================= */
app.get("/api/push/test", async (req, res) => {
    let sent = 0;

    for (const item of subscriptions.values()) {
        try {
            await webpush.sendNotification(
                item.subscription,
                JSON.stringify({
                    title: "⚽ GOALHUB TEST",
                    body: "Bildirim sistemi çalışıyor! 🔔",
                    icon: "/icon-192.png",
                    badge: "/icon-192.png",
                    tag: "goalhub-test",
                    data: {
                        url: "/"
                    }
                })
            );

            sent++;

        } catch (error) {
            console.error(
                "TEST PUSH ERROR:",
                error.statusCode,
                error.message
            );

            if (
                error.statusCode === 404 ||
                error.statusCode === 410
            ) {
                subscriptions.delete(
                    item.subscription.endpoint
                );
            }
        }
    }

    res.json({
        ok: true,
        message: "Test bildirimi gönderildi.",
        sent
    });
});
app.listen(
    PORT,
    () => {

        console.log("");
        console.log(
            "================================"
        );
        console.log(
            "          GOALHUB"
        );
        console.log(
            "================================"
        );
        console.log("");

        console.log(
            `Server: http://localhost:${PORT}`
        );

        console.log(
            `Health: http://localhost:${PORT}/api/health`
        );

        console.log("");

        console.log(
            "⚽ Gerçek gol kontrolü: 30 saniye"
        );

        console.log(
            "🔔 Web Push: AKTİF"
        );

        console.log("");

        console.log(
            "GOALHUB SERVER READY"
        );

        console.log("");

    }
);
