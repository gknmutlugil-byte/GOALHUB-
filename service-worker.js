self.addEventListener("install", event => {

    self.skipWaiting();

});

self.addEventListener("activate", event => {

    event.waitUntil(
        self.clients.claim()
    );

});

self.addEventListener(
    "push",
    event => {

        let data = {};

        try {

            data =
                event.data
                    ? event.data.json()
                    : {};

        } catch {

            data = {
                title: "GOALHUB",
                body: "Yeni bildirim"
            };

        }

        const title =
            data.title ||
            "⚽ GOALHUB";

        const options = {

            body:
                data.body ||
                "Yeni gol bildirimi",

            icon:
                data.icon ||
                "/icon-192.png",

            badge:
                data.badge ||
                "/icon-192.png",

            tag:
                data.tag ||
                "goalhub",

            renotify:true,

            vibrate:[
                200,
                100,
                200,
                100,
                300
            ],

            data:
                data.data ||
                {
                    url:"/"
                }
        };

        event.waitUntil(

            self.registration
                .showNotification(
                    title,
                    options
                )

        );

    }
);

self.addEventListener(
    "notificationclick",
    event => {

        event.notification.close();

        const url =
            event.notification.data?.url ||
            "/";

        event.waitUntil(

            clients.matchAll({
                type:"window",
                includeUncontrolled:true
            }).then(
                clientList => {

                    for(
                        const client
                        of clientList
                    ){

                        if(
                            "focus" in client
                        ){

                            client.navigate(url);

                            return client.focus();
                        }
                    }

                    if(
                        clients.openWindow
                    ){

                        return clients.openWindow(
                            url
                        );
                    }

                }
            )

        );

    }
);