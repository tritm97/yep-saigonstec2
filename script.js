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
    "Eighth Prize": 15,
    "Ninth Prize": 20,
    "Tenth Prize": 27,
};

/* ===== 2. QUẢN LÝ DỮ LIỆU ===== */
let dots = [], dotIndex = 0;
let pool = [];
let winners = [];
let winnersGrouped = {
    "First Prize": [],
    "Second Prize": [],
    "Third Prize": [],
    "Fourth Prize": [],
    "Fifth Prize": [],
    "Sixth Prize": [],
    "Seventh Prize": [],
    "Eighth Prize": [],
    "Ninth Prize": [],
    "Tenth Prize": [],
    "Bonus Prize": []
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
    // Không dùng innerHTML để tránh ghi đè thẻ #display
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
function validatePrizeQuota() {
    const currentPrize = prizeSelect.value;
    statusMsg.textContent = "";

    // 1. KIỂM TRA ĐIỀU KIỆN CHO GIẢI PHỤ
    if (currentPrize === "Bonus Prize") {
        // Kiểm tra xem tất cả các giải trong PRIZE_QUOTA đã đủ số lượng chưa
        let isAllMainPrizesDone = true;
        let missingPrizes = [];

        for (const [prizeName, quota] of Object.entries(PRIZE_QUOTA)) {
            const currentCount = (winnersGrouped[prizeName] || []).length;
            if (currentCount < quota) {
                isAllMainPrizesDone = false;
                missingPrizes.push(prizeName);
            }
        }

        if (!isAllMainPrizesDone) {
            startSpinBtn.disabled = true;
            statusMsg.style.color = "#ffd54f";
            statusMsg.textContent = `🚫 Bonus Prize not available yet. Required: ${missingPrizes.join(", ")}`;
            return false;
        }

        // Nếu đã xong hết giải chính
        statusMsg.style.color = "#2e7d32";
        statusMsg.textContent = "🎁 Bonus Prize Mode: Ready!";
        startSpinBtn.disabled = pool.length === 0;
        return true;
    }

    // 2. KIỂM TRA ĐIỀU KIỆN CHO CÁC GIẢI CHÍNH (Giữ nguyên logic cũ của bạn)
    const currentCount = (winnersGrouped[currentPrize] || []).length;
    const maxCount = PRIZE_QUOTA[currentPrize];

    if (currentCount >= maxCount) {
        startSpinBtn.disabled = true;
        statusMsg.style.color = "#ffd54f";
        statusMsg.textContent = `⚠️ ${currentPrize} quota reached. Please change the prize!`;
        return false;
    }

    startSpinBtn.disabled = pool.length === 0;
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
        stopSpinBtn.disabled = false; // Đảm bảo nút dừng được kích hoạt
    } else {
        startSpinBtn.classList.remove("hidden");
        stopSpinBtn.classList.add("hidden");
    }
}

toggleSpinButtons(false);

startSpinBtn.onclick = () => {
    // Hàm này sẽ gọi validatePrizeQuota đã sửa ở trên, 
    // nên nếu là Giải Phụ nó sẽ tự động cho qua
    if (!validatePrizeQuota()) return; 

    toggleSpinButtons(true);
    display.classList.remove("winner");
    display.style.fontSize = "32px";

    spinTimer = setInterval(runDotAnimation, 50);

    // Hiệu ứng nhảy mã NV liên tục của bạn (Giữ nguyên 100%)
    nameTimer = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * pool.length);
        display.textContent = pool[randomIndex].id;
    }, 60);
};

stopSpinBtn.onclick = () => {
    // 1. Dừng ngay lập tức các bộ đếm thời gian
    clearInterval(nameTimer);  // Dừng nhảy tên
    clearInterval(spinTimer);  // Dừng hiệu ứng đèn LED

    // 2. Chốt ngay người đang hiển thị tại thời điểm bấm nút
    const displayedId = display.textContent;
    currentPerson = pool.find(p => p.id === displayedId);

    if (!currentPerson) {
        currentPerson = pool[Math.floor(Math.random() * pool.length)];
    }
    
    // 3. Hiển thị kết quả và bắn pháo hoa ngay
    finalizeWinner();

    // 4. Trả lại trạng thái các nút bấm
    toggleSpinButtons(false);
    // stopSpinBtn.disabled = false;
};

function finalizeWinner() {
    const p = currentPerson; // Người may mắn hiện tại
    const selectedPrize = prizeSelect.value; // Giải thưởng đang chọn
    
    // 1. Dừng mọi hiệu ứng quay số (Phòng hờ nếu chưa dừng)
    clearInterval(nameTimer);
    clearInterval(spinTimer);

    // 2. Kiểm tra và khởi tạo nhóm giải thưởng trong winnersGrouped (Đặc biệt cho Giải Phụ)
    if (!winnersGrouped[selectedPrize]) {
        winnersGrouped[selectedPrize] = [];
    }

    // 3. Lưu thông tin trúng thưởng
    p.prize = selectedPrize; // Gán tên giải vào đối tượng người trúng
    winners.push(p); // Lưu vào danh sách tổng
    winnersGrouped[selectedPrize].push(p); // Lưu vào nhóm giải riêng biệt

    // 4. Xóa người trúng khỏi danh sách quay tiếp theo (Pool)
    pool = pool.filter((x) => x.id !== p.id);

    // 5. Hiệu ứng ăn mừng
    fireConfetti(); // Bắn pháo hoa

    // 6. Hiển thị thông tin người thắng lên màn hình chính (Display)
    const honor = p.gender.toLowerCase().includes("nữ") ? "Ms." : "Mr.";
    
    // Giao diện người thắng (Cỡ chữ to, màu sắc nổi bật)
    display.innerHTML = `
        <span style="font-size: 0.6em; color: #ffd54f; text-transform: uppercase;">${selectedPrize}</span><br/>
        <span style="color: #fff; font-size: 1.2em;">🎉 ${p.id}</span><br/>
        <span style="font-size: 0.9em; font-weight: bold;">${honor} ${p.name}</span><br/>
        <small style="font-size: 0.5em; opacity: 0.9;">${p.dept}</small>
    `;
    display.classList.add("winner");

    // 7. Cập nhật lại trạng thái các nút và thông báo định mức
    validatePrizeQuota();
}

/* ===== 8. POPUPS ===== */
function renderWinnerList() {
    const listDiv = document.getElementById('winnerList');
    listDiv.innerHTML = ''; 
    
    // Thêm "Giải Phụ" vào danh sách các giải cần hiển thị
    const order = ["First Prize", "Second Prize", "Third Prize", "Fourth Prize", "Fifth Prize", "Sixth Prize", "Seventh Prize", "Eighth Prize", "Ninth Prize", "Tenth Prize", "Bonus Prize"];
    
    let hasAnyWinner = false;

    order.forEach(prizeName => {
        const group = winnersGrouped[prizeName];
        if (group && group.length > 0) {
            hasAnyWinner = true;
            
            // Tạo tiêu đề nhóm giải (Ví dụ: Giải Phụ)
            const title = document.createElement('div');
            title.className = 'prize-group-title';
            title.innerHTML = `🏆 ${prizeName} (${group.length})`;
            listDiv.appendChild(title);
            
            // Liệt kê danh sách người trúng trong nhóm đó
            group.forEach((person, index) => {
                const item = document.createElement('div');
                item.className = 'winner-item';
                item.innerHTML = `
                    <span class="stt">${index + 1}.</span>
                    <span><strong>${person.id}</strong> - ${person.name} (${person.dept})</span>
                `;
                listDiv.appendChild(item);
            });
        }
    });

    if (!hasAnyWinner) {
        listDiv.innerHTML = "<p style='text-align:center; padding-top:20px; color:#000;'>No one has won the prize yet 🧧</p>";
    }
}

function renderPlayerList() {
    const listDiv = document.getElementById('playerList');
    listDiv.innerHTML = '';
    
    if (pool.length === 0) {
        listDiv.innerHTML = "<p style='text-align:center; font-size:20px;'>Empty List!</p>";
        return;
    }
    
    pool.forEach((person, index) => {
        const item = document.createElement('div');
        item.className = 'winner-item';
        // Đánh số thứ tự từ 1 đến hết danh sách
        item.innerHTML = `
            <span class="stt">${index + 1}.</span>
            <span><strong>${person.id}</strong> - ${person.name} (${person.dept})</span>
        `;
        listDiv.appendChild(item);
    });
}

// Gán sự kiện cho các nút
/* Mở danh sách người trúng */
document.getElementById('openWinners').onclick = () => {
    const listDiv = document.getElementById('winnerList');
    listDiv.innerHTML = ''; // Xóa cũ
    const order = ["First Prize", "Second Prize", "Third Prize", "Fourth Prize", "Fifth Prize", "Sixth Prize", "Seventh Prize", "Eighth Prize", "Ninth Prize", "Tenth Prize", "Bonus Prize"];
    
    let totalWinners = 0;
    order.forEach(prize => {
        const group = winnersGrouped[prize];
        if (group && group.length > 0) {
            const title = document.createElement('div');
            title.className = 'prize-group-title';
            title.innerHTML = `🏆 ${prize}`;
            listDiv.appendChild(title);
            
            group.forEach((p, index) => {
                totalWinners++;
                const item = document.createElement('div');
                item.className = 'winner-item';
                item.innerHTML = `<span class="stt">${index + 1}.</span> <span>${p.id} - ${p.name} (${p.dept})</span>`;
                listDiv.appendChild(item);
            });
        }
    });
    
    if(totalWinners === 0) listDiv.innerHTML = "<p style='text-align:center; margin-top:50px; color:#000 '>No one has won the prize yet 🧧</p>";
    renderWinnerList();
    document.querySelector('.winnerPopupPage').style.display = 'flex';
};

/* Mở danh sách người chơi */
document.getElementById('openPlayersList').onclick = () => {
    const listDiv = document.getElementById('playerList');
    listDiv.innerHTML = ''; // Xóa cũ
    
    if (pool.length === 0) {
        listDiv.innerHTML = "<p style='text-align:center; margin-top:50px;'>Empty List!</p>";
    } else {
        pool.forEach((p, index) => {
            const item = document.createElement('div');
            item.className = 'winner-item';
            item.innerHTML = `<span class="stt">${index + 1}.</span> <span>${p.id} - ${p.name} (${p.dept})</span>`;
            listDiv.appendChild(item);
        });
    }
    document.querySelector('.playerPopupPage').style.display = 'flex';
};

// Sự kiện đóng
document.getElementById('closeWinnerPopupBtn').onclick = () => {
    document.querySelector('.winnerPopupPage').style.display = 'none';
};

document.getElementById('closePlayerPopupBtn').onclick = () => {
    document.querySelector('.playerPopupPage').style.display = 'none';
};

/* ===== 9. IMPORT EXCEL ===== */
excelInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const wb = XLSX.read(evt.target.result, { type: "binary" });
            const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });

            if (rows.length < 2) {
                alert("❌ Blank Excel file!");
                return;
            }

            const seenIds = new Set();
            const uniquePool = [];
            rows.slice(1).forEach((r) => {
                const id = r[0]?.toString().trim();
                if (id && !seenIds.has(id)) {
                    seenIds.add(id);
                    uniquePool.push({ id, name: r[1], gender: r[2], dept: r[3] });
                }
            });

            if (uniquePool.length > 0) {
                pool = uniquePool;
                // Hiển thị thông báo nạp thành công ngay tại display
                display.innerHTML = `<span style="color: #ffd54f; font-size: 1.5em;">${pool.length}</span> PLAYERS <br>HAVE BEEN SUCCESSFULLY ADDED`;
                
                validatePrizeQuota();
                uploadContainer.classList.add("hidden");
            }
        } catch (err) {
            alert("Error: " + err.message);
        }
    };
    reader.readAsBinaryString(file);
};

exportBtn.onclick = () => {
    if (winners.length === 0) return alert("No one has won the prize yet!");
    const ws = XLSX.utils.json_to_sheet(winners.map(w => ({
        "Prize": w.prize, "Employee ID": w.id, "Full Name": w.name, "Department": w.dept
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "results");
    XLSX.writeFile(wb, "Lucky_Spin_Results.xlsx");
};