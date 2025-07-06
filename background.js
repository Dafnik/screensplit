// Listen for the toolbar button click (MV2 uses browser.browserAction)
browser.browserAction.onClicked.addListener((tab) => {
    browser.tabs.sendMessage(tab.id, { action: "start" });
});

browser.runtime.onMessage.addListener((message, sender) => {
    if (message.action === "capture") {
        // Return a promise resolving to { dataUrl }
        return browser.tabs
            .captureVisibleTab(sender.tab.windowId, { format: "png" })
            .then((dataUrl) => ({ dataUrl }));
    }

    if (message.action === "download") {
        const { dataUrl, filename = "split_screenshot.png" } = message;

        // If it's already a blob: URL, just download
        if (dataUrl.startsWith("blob:")) {
            return browser.downloads.download({ url: dataUrl, filename });
        }

        // Otherwise it's a data: URL – fetch it, make a blob, then a blob: URL
        return fetch(dataUrl)
            .then((res) => res.blob())
            .then((blob) => {
                const blobUrl = URL.createObjectURL(blob);
                return browser.downloads
                    .download({ url: blobUrl, filename })
                    .finally(() => {
                        // revoke after a bit to free memory
                        setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
                    });
            });
    }
});
