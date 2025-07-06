// Merge two data-URLs along a diagonal from (0,h) to (w,0)
function mergeScreenshots(lightUrl, darkUrl) {
    return new Promise((resolve) => {
        const imgL = new Image();
        const imgD = new Image();
        let loaded = 0;

        function checkDraw() {
            if (++loaded < 2) return;
            const w = imgL.width;
            const h = imgL.height;
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");

            // Draw light on left triangle
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(0, h);
            ctx.lineTo(0, 0);
            ctx.lineTo(w, 0);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(imgL, 0, 0);
            ctx.restore();

            // Draw dark on right triangle
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(0, h);
            ctx.lineTo(w, h);
            ctx.lineTo(w, 0);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(imgD, 0, 0);
            ctx.restore();

            resolve(canvas.toDataURL("image/png"));
        }

        imgL.onload = checkDraw;
        imgD.onload = checkDraw;
        imgL.src = lightUrl;
        imgD.src = darkUrl;
    });
}

// Listen for the start command from background.js
browser.runtime.onMessage.addListener(async (message) => {
    if (message.action !== "start") return;

    // 1) Capture light mode
    const { dataUrl: lightUrl } = await browser.runtime.sendMessage({
        action: "capture"
    });

    // 2) Inject CSS filter to approximate dark mode
    document.getElementById('body').classList.add('dark')

    // Wait for the filter to apply
    await new Promise((r) => setTimeout(r, 500));

    // 3) Capture dark mode
    const { dataUrl: darkUrl } = await browser.runtime.sendMessage({
        action: "capture"
    });

    // 4) Restore original filter
    document.getElementById('body').classList.remove('dark')

    // 5) Merge screenshots
    const merged = await mergeScreenshots(lightUrl, darkUrl);

    // 6) Prompt for filename
    const defaultName = "split_screenshot";
    const filename = window.prompt(
        "Enter filename for the merged screenshot:",
        defaultName
    );
    if (!filename) {
        console.log("Download canceled: no filename provided.");
        return;
    }

    // 7) Send to background to download
    browser.runtime.sendMessage({
        action: "download",
        dataUrl: merged,
        filename: `${filename}.png`
    });
});