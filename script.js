/* ===== 1. CẤU HÌNH HỆ THỐNG & ĐỊNH MỨC GIẢI ===== */
const DOT_COUNT = 48;
const WHEEL_SIZE = 450; 
const CENTER = WHEEL_SIZE / 2;
const HALF = 180; 

const PRIZE_QUOTA = {
    "First Prize": 1,
    "Second Prize": 2,
    "Third Prize": 3,
    "Fourth Prize": 4,
    "Fifth Prize": 5,
    "Sixth Prize": 6,
    "Seventh Prize": 5,
    "Eighth Prize": 20,
    "Ninth Prize": 25,
    "Tenth Prize": 2,
    "Eleventh Prize": 15,
};

/* ===== 2. QUẢN LÝ DỮ LIỆU ===== */
let dots = [], dotIndex = 0;
let pool = [];
let winners = [];
let winnersGrouped = {
    "First Prize": [], "Second Prize": [], "Third Prize": [], "Fourth Prize": [],
    "Fifth Prize": [], "Sixth Prize": [], "Seventh Prize": [], "Eighth Prize": [],
    "Ninth Prize": [], "Tenth Prize": [], "Eleventh Prize": [], "Bonus Prize": []
};

let spinTimer = null;
let nameTimer = null;
let currentPerson = null;

/* ===== 3. CÁC PHẦN TỬ DOM ===== */
const wheel = document.getElementById("wheel");
const display = document.getElementById("display");
const startSpinBtn = document.getElementById("startSpinBtn");
const stopSpinBtn = document.getElementById("stopSpinBtn");
const exportBtn = document.getElementById("exportBtn");
const excelInput = document.getElementById("excelInput");
const prizeSelect = document.getElementById("prizeSelect");
const statusMsg = document.getElementById("statusMsg");
const uploadContainer = document.getElementById("uploadContainer");

// Popups
const winnerListDiv = document.getElementById("winnerList");
const playerListDiv = document.getElementById("playerList");
const openWinnersBtn = document.getElementById("openWinners");
const openPlayersBtn = document.getElementById("openPlayersList");
const closeWinnerBtn = document.getElementById("closeWinnerPopupBtn");
const closePlayerBtn = document.getElementById("closePlayerPopupBtn");

/* ===== 4. KHỞI TẠO VỊ TRÍ HÌNH THOI ===== */
function diamondPosition(t) {
    if (t < 0.25) return { x: CENTER + HALF * (t * 4), y: CENTER - HALF + HALF * (t * 4) };
    if (t < 0.5) return { x: CENTER + HALF - HALF * ((t - 0.25) * 4), y: CENTER + HALF * ((t - 0.25) * 4) };
    if (t < 0.75) return { x: CENTER - HALF * ((t - 0.5) * 4), y: CENTER + HALF - HALF * ((t - 0.5) * 4) };
    return { x: CENTER - HALF + HALF * ((t - 0.75) * 4), y: CENTER - HALF * ((t - 0.75) * 4) };
}

function createDots() {
    dots = [];
    for (let i = 0; i < DOT_COUNT; i++) {
        const d = document.createElement("div");
        d.className = "dot";
        const p = diamondPosition(i / DOT_COUNT);
        d.style.left = p.x - 5 + "px";
        d.style.top = p.y - 5 + "px";
        wheel.appendChild(d);
        dots.push(d);
    }
}
createDots();

/* ===== 5. VALIDATE GIẢI THƯỞNG ===== */
const PRIZE_ORDER = [
    "Sixth Prize", "Fifth Prize", "Fourth Prize", "Third Prize", 
    "Second Prize", "First Prize", "Ninth Prize", "Eighth Prize", 
    "Seventh Prize", "Tenth Prize", "Bonus Prize", "Eleventh Prize"
];

function validatePrizeQuota() {
    const currentPrize = prizeSelect.value;
    statusMsg.textContent = "";

    const currentIndex = PRIZE_ORDER.indexOf(currentPrize);
    let missingPrizes = [];
    for (let i = 0; i < currentIndex; i++) {
        const prevPrizeName = PRIZE_ORDER[i];
        const quota = PRIZE_QUOTA[prevPrizeName];
        const currentCount = (winnersGrouped[prevPrizeName] || []).length;
        if (quota && currentCount < quota) missingPrizes.push(prevPrizeName);
    }

    if (missingPrizes.length > 0) {
        startSpinBtn.disabled = true;
        statusMsg.style.color = "#ffd54f";
        statusMsg.textContent = `🚫 Not available. Must finish: ${missingPrizes[0]} first!`;
        return false;
    }

    if (currentPrize !== "Bonus Prize") {
        const currentCount = (winnersGrouped[currentPrize] || []).length;
        const maxCount = PRIZE_QUOTA[currentPrize];
        if (currentCount >= maxCount) {
            startSpinBtn.disabled = true;
            statusMsg.style.color = "#ffd54f";
            statusMsg.textContent = `⚠️ ${currentPrize} reached. Change to next prize!`;
            return false;
        }
    }

    startSpinBtn.disabled = pool.length === 0;
    if (currentPrize === "Bonus Prize") {
        statusMsg.style.color = "#2e7d32";
        statusMsg.textContent = "🎁 Bonus Prize Mode: Ready!";
    }
    return true;
}
prizeSelect.onchange = validatePrizeQuota;

/* ===== 6. HIỆU ỨNG PHÁO HOA ===== */
function fireConfetti() {
    var duration = 5 * 1000;
    var animationEnd = Date.now() + duration;
    var defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
    function randomInRange(min, max) { return Math.random() * (max - min) + min; }
    var interval = setInterval(function() {
        var timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);
        var particleCount = 50 * (timeLeft / duration);
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }, zIndex: 999 }));
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }, zIndex: 999 }));
    }, 250);
}

/* ===== 7. LOGIC QUAY SỐ ===== */
function runDotAnimation() {
    dots.forEach((d) => d.classList.remove("active"));
    dots[dotIndex].classList.add("active");
    dotIndex = (dotIndex + 1) % DOT_COUNT;
}

function toggleSpinButtons(isSpinning) {
    if (isSpinning) {
        startSpinBtn.classList.add("hidden");
        stopSpinBtn.classList.remove("hidden");
        stopSpinBtn.disabled = false;
    } else {
        startSpinBtn.classList.remove("hidden");
        stopSpinBtn.classList.add("hidden");
    }
}

toggleSpinButtons(false);

startSpinBtn.onclick = () => {
    if (!validatePrizeQuota()) return; 

    toggleSpinButtons(true);
    display.classList.remove("winner");
    display.style.fontSize = "32px";

    spinTimer = setInterval(runDotAnimation, 50);

    nameTimer = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * pool.length);
        display.textContent = pool[randomIndex].id;
    }, 60);
};

stopSpinBtn.onclick = () => {
    clearInterval(nameTimer);
    clearInterval(spinTimer);

    const displayedId = display.textContent;
    // currentPerson = pool[Math.floor(Math.random() * pool.length)];
    currentPerson = pool.find(p => p.id === displayedId);

    if (!currentPerson) {
        currentPerson = pool[Math.floor(Math.random() * pool.length)];
    }
    
    finalizeWinner();

    toggleSpinButtons(false);
};

let spaceLock = false;

document.addEventListener("keydown", (e) => {
    if (e.code !== "Space" || spaceLock) return;
    if (["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) return;
    e.preventDefault();
    spaceLock = true;

    if (!stopSpinBtn.classList.contains("hidden")) {
        stopSpinBtn.click();
    } else {
        startSpinBtn.click();
    }

    setTimeout(() => spaceLock = false, 100);
});

/* ===== 8. LOCAL STORAGE ===== */
function saveSessionToLocal() {
    const sessionData = { pool, winnersGrouped };
    localStorage.setItem("luckySpinSession", JSON.stringify(sessionData));
}

function loadSessionFromLocal() {
    const data = localStorage.getItem("luckySpinSession");
    if (!data) return null;
    try { return JSON.parse(data); } catch (err) { return null; }
}

function clearSessionFromLocal() {
    localStorage.removeItem("luckySpinSession");
}

/* ===== 9. FINALIZE WINNER ===== */
function finalizeWinner() {
    const p = currentPerson;
    const selectedPrize = prizeSelect.value;
    
    clearInterval(nameTimer);
    clearInterval(spinTimer);

    if (!winnersGrouped[selectedPrize]) winnersGrouped[selectedPrize] = [];

    p.prize = selectedPrize;
    winners.push(p);
    winnersGrouped[selectedPrize].push(p);

    pool = pool.filter((x) => x.id !== p.id);

    fireConfetti();

    display.innerHTML = `
        <span style="font-size: 0.6em; color: #ffd54f; text-transform: uppercase;">${selectedPrize}</span><br/>
        <span style="color: #fff; font-size: 1.2em;">🎉 ${p.id}</span><br/>
        <span style="font-size: 0.9em; font-weight: bold;">${p.name}</span><br/>
        <small style="font-size: 0.5em; opacity: 0.9;">${p.dept}</small>
    `;
    display.classList.add("winner");

    validatePrizeQuota();

    // Lưu phiên làm việc
    saveSessionToLocal();
}

/* ===== 10. POPUPS ===== */
function renderWinnerList() {
    const listDiv = winnerListDiv;
    listDiv.innerHTML = ''; 
    const order = ["First Prize", "Second Prize", "Third Prize", "Fourth Prize", "Fifth Prize", "Sixth Prize", "Seventh Prize", "Eighth Prize", "Ninth Prize", "Tenth Prize", "Eleventh Prize", "Bonus Prize"];
    let hasAnyWinner = false;
    order.forEach(prizeName => {
        const group = winnersGrouped[prizeName];
        if (group && group.length > 0) {
            hasAnyWinner = true;
            const title = document.createElement('div');
            title.className = 'prize-group-title';
            title.innerHTML = `🏆 ${prizeName} (${group.length})`;
            listDiv.appendChild(title);
            group.forEach((person, index) => {
                const item = document.createElement('div');
                item.className = 'winner-item';
                item.innerHTML = `<span class="stt">${index + 1}.</span> <span><strong>${person.id}</strong> - ${person.name} (${person.dept})</span>`;
                listDiv.appendChild(item);
            });
        }
    });
    if (!hasAnyWinner) listDiv.innerHTML = "<p style='text-align:center; padding-top:20px; color:#000;'>No one has won the prize yet 🧧</p>";
}

function renderPlayerList() {
    const listDiv = playerListDiv;
    listDiv.innerHTML = '';
    if (pool.length === 0) {
        listDiv.innerHTML = "<p style='text-align:center; font-size:20px;'>Empty List!</p>";
        return;
    }
    pool.forEach((person, index) => {
        const item = document.createElement('div');
        item.className = 'winner-item';
        item.innerHTML = `<span class="stt">${index + 1}.</span> <span><strong>${person.id}</strong> - ${person.name} (${person.dept})</span>`;
        listDiv.appendChild(item);
    });
}

openWinnersBtn.onclick = () => {
    renderWinnerList();
    document.querySelector('.winnerPopupPage').style.display = 'flex';
};

openPlayersBtn.onclick = () => {
    renderPlayerList();
    document.querySelector('.playerPopupPage').style.display = 'flex';
};

closeWinnerBtn.onclick = () => { document.querySelector('.winnerPopupPage').style.display = 'none'; };
closePlayerBtn.onclick = () => { document.querySelector('.playerPopupPage').style.display = 'none'; };

/* ===== 11. IMPORT EXCEL ===== */
excelInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const wb = XLSX.read(evt.target.result, { type: "binary" });
            const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
            if (rows.length < 2) return alert("❌ Blank Excel file!");
            const seenIds = new Set();
            const uniquePool = [];
            rows.slice(1).forEach(r => {
                const id = r[0]?.toString().trim();
                if (id && !seenIds.has(id)) {
                    seenIds.add(id);
                    uniquePool.push({ id, name: r[1], dept: r[2] });
                }
            });
            if (uniquePool.length > 0) {
                pool = uniquePool;
                display.innerHTML = `<span style="color: #ffd54f; font-size: 1.5em;">${pool.length}</span> PLAYERS <br>HAVE BEEN SUCCESSFULLY ADDED`;
                validatePrizeQuota();
                uploadContainer.classList.add("hidden");
                saveSessionToLocal(); // Lưu phiên làm việc
            }
        } catch (err) { alert("Error: " + err.message); }
    };
    reader.readAsBinaryString(file);
};

/* ===== 12. EXPORT EXCEL ===== */
exportBtn.onclick = () => {
    if (winners.length === 0) return alert("No one has won the prize yet!");
    const ws = XLSX.utils.json_to_sheet(winners.map(w => ({
        "Prize": w.prize, "Employee ID": w.id, "Full Name": w.name, "Department": w.dept
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "results");
    XLSX.writeFile(wb, "Lucky_Spin_Results.xlsx");
};

/* ===== 13. WARNING WHEN CLOSING TABS ===== */
window.addEventListener("beforeunload", (e) => {
    const hasData = pool.length > 0 || winners.length > 0;
    if (!hasData) return;
    e.preventDefault();
    e.returnValue = "";
});

/* ===== 14. PHỤC HỒI PHIÊN LÀM VIỆC CŨ ===== */
window.addEventListener("DOMContentLoaded", () => {
    const oldSession = loadSessionFromLocal();
    if (!oldSession) return;

    const restore = confirm(
        "Detected previous session data.\n\nPress OK to export Excel and continue your previous session.\nPress Cancel to start a new session."
    );

    if (restore) {
        // Xuất file Excel
        const allWinners = [];
        Object.values(oldSession.winnersGrouped).forEach(group => {
            if (group && group.length > 0) allWinners.push(...group);
        });
        if (allWinners.length > 0) {
            const ws = XLSX.utils.json_to_sheet(allWinners.map(w => ({
                "Prize": w.prize, "Employee ID": w.id, "Full Name": w.name, "Department": w.dept
            })));
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "results");
            XLSX.writeFile(wb, "Lucky_Spin_Results.xlsx");
        }

        // Nạp lại phiên cũ
        pool = oldSession.pool || [];
        winnersGrouped = oldSession.winnersGrouped || {};
        winners = [];
        Object.values(winnersGrouped).forEach(group => { if (group) winners.push(...group); });

        display.innerHTML = `<span style="color: #ffd54f;">${pool.length}</span> PLAYERS REMAINING`;
        validatePrizeQuota();
        alert("Previous session restored. You can continue spinning!");
        uploadContainer.classList.add("hidden");
    } else {
        const confirmClear = confirm(
            "Are you sure you want to discard previous session and start a new one?\nPress OK to clear old session, Cancel to stay on this prompt."
        );
        if (confirmClear) {
            clearSessionFromLocal();
            pool = [];
            winnersGrouped = {
                "First Prize": [], "Second Prize": [], "Third Prize": [], "Fourth Prize": [],
                "Fifth Prize": [], "Sixth Prize": [], "Seventh Prize": [], "Eighth Prize": [],
                "Ninth Prize": [], "Tenth Prize": [], "Eleventh Prize": [], "Bonus Prize": []
            };
            winners = [];
            display.innerHTML = `Welcome! Please import players list to start.`;
        } else {
            window.location.reload();
        }
    }
});
