/* ============================================================
   Red by TVXQ — Order form logic
   ============================================================ */

// ⚠️ CONFIG — after deploying the Google Apps Script web app
// (see google-apps-script.gs), paste its /exec URL here.
const CONFIG = {
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycby2_S2yOnrGZAHG3Ce8iDzE9Mjypy_P_8wX5PKv8IL-h3-8t3xR0BhdVWCBXzN8cYa_bA/exec",
};

const PRODUCTS = [
  { id: "R1",  name: "Khô heo",                       price: 60000, unit: "200gr", icon: "🥩" },
  { id: "R2",  name: "Khô gà",                         price: 60000, unit: "200gr", icon: "🍗" },
  { id: "R3",  name: "Bánh gấu",                       price: 50000, unit: "200gr", icon: "🐻" },
  { id: "R4",  name: "Khoai mật sấy",                  price: 50000, unit: "200gr", icon: "🍠" },
  { id: "R5",  name: "Ngô cay",                        price: 35000, unit: "200gr", icon: "🌽" },
  { id: "R6",  name: "Khô mix 3 vị",                   price: 80000, unit: "01 hũ", icon: "🍱" },
  { id: "R7",  name: "Mực xé tẩm vị",                  price: 85000, unit: "01 hũ", icon: "🦑" },
  { id: "R8",  name: "Cá bống tẩm vị",                 price: 70000, unit: "01 hũ", icon: "🐟" },
  { id: "R9",  name: "Da cá trứng muối",               price: 60000, unit: "01 hũ", icon: "🥚" },
  { id: "R10", name: "Rong biển cháy tỏi",              price: 70000, unit: "01 hũ", icon: "🌿" },
];

const cart = {}; // { R1: qty }

const fmtVND = (n) => n.toLocaleString("vi-VN") + "đ";

/* ---------------- render menu ---------------- */

const menuGrid = document.getElementById("menuGrid");

function renderMenu() {
  menuGrid.innerHTML = "";
  PRODUCTS.forEach((p) => {
    const card = document.createElement("div");
    card.className = "dish";
    card.innerHTML = `
      <div class="dish__roundel" aria-hidden="true">${p.icon}</div>
      <div class="dish__body">
        <p class="dish__name">${p.id} - ${p.name}</p>
        <span class="dish__price">${fmtVND(p.price)}</span><span class="dish__unit">/ ${p.unit}</span>
      </div>
      <div class="qty-stepper">
        <button type="button" class="qty-btn" data-action="dec" data-id="${p.id}" aria-label="Giảm số lượng ${p.name}">–</button>
        <span class="qty-value" id="qty-${p.id}" data-qty-nonzero="false">0</span>
        <button type="button" class="qty-btn" data-action="inc" data-id="${p.id}" aria-label="Tăng số lượng ${p.name}">+</button>
      </div>
    `;
    menuGrid.appendChild(card);
  });
}

menuGrid.addEventListener("click", (e) => {
  const btn = e.target.closest(".qty-btn");
  if (!btn) return;
  const id = btn.dataset.id;
  const current = cart[id] || 0;
  const next = btn.dataset.action === "inc" ? current + 1 : Math.max(0, current - 1);
  cart[id] = next;
  document.getElementById(`qty-${id}`).textContent = next;
  document.getElementById(`qty-${id}`).dataset.qtyNonzero = next > 0 ? "true" : "false";
  renderReceipt();
});

/* ---------------- receipt ---------------- */

const receiptItems = document.getElementById("receiptItems");
const receiptTotal = document.getElementById("receiptTotal");

function renderReceipt() {
  const chosen = PRODUCTS.filter((p) => cart[p.id] > 0);
  if (chosen.length === 0) {
    receiptItems.innerHTML = `<p class="receipt__empty">Chưa có món nào được chọn</p>`;
    receiptTotal.textContent = fmtVND(0);
    return;
  }
  let total = 0;
  receiptItems.innerHTML = chosen
    .map((p) => {
      const qty = cart[p.id];
      const sub = qty * p.price;
      total += sub;
      return `
        <div class="receipt__item">
          <span class="receipt__item-name">${p.id} - ${p.name}</span>
          <span class="receipt__item-qty">×${qty}</span>
          <span class="receipt__item-sub">${fmtVND(sub)}</span>
        </div>`;
    })
    .join("");
  receiptTotal.textContent = fmtVND(total);
}

/* ---------------- payment / bill upload ---------------- */

const paymentOptions = document.getElementById("paymentOptions");
const billField = document.getElementById("billField");
const billUpload = document.getElementById("billUpload");
const uploadPrompt = document.getElementById("uploadPrompt");
const uploadPreview = document.getElementById("uploadPreview");

let billBase64 = null;
let billMimeType = null;
let billFileName = null;

paymentOptions.addEventListener("change", (e) => {
  const isBank = e.target.value.startsWith("Chuyển khoản");
  billField.hidden = !isBank;
  billUpload.required = isBank;
  if (!isBank) {
    billUpload.value = "";
    billBase64 = null;
    uploadPreview.hidden = true;
    uploadPrompt.hidden = false;
  }
});

billUpload.addEventListener("change", () => {
  const file = billUpload.files[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) {
    alert("Ảnh bill vượt quá 10MB, bạn chọn ảnh nhỏ hơn giúp Red nhé.");
    billUpload.value = "";
    return;
  }
  billMimeType = file.type;
  billFileName = file.name;
  const reader = new FileReader();
  reader.onload = () => {
    billBase64 = reader.result.split(",")[1]; // strip data: prefix
    uploadPreview.src = reader.result;
    uploadPreview.hidden = false;
    uploadPrompt.hidden = true;
  };
  reader.readAsDataURL(file);
});

/* ---------------- submit ---------------- */

const form = document.getElementById("orderForm");
const submitBtn = document.getElementById("submitBtn");
const submitBtnText = document.getElementById("submitBtnText");
const formStatus = document.getElementById("formStatus");

function setStatus(text, state) {
  formStatus.textContent = text;
  formStatus.dataset.state = state || "";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setStatus("", "");

  const chosen = PRODUCTS.filter((p) => cart[p.id] > 0);
  if (chosen.length === 0) {
    setStatus("Bạn chưa chọn món nào ở phần thực đơn phía trên nhé!", "err");
    document.querySelector(".menu").scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  if (!form.reportValidity()) return;

  const paymentEl = form.querySelector('input[name="payment"]:checked');
  const isBank = paymentEl.value.startsWith("Chuyển khoản");
  if (isBank && !billBase64) {
    setStatus("Bạn chuyển khoản thì nhớ đính kèm ảnh bill giúp Red nhé!", "err");
    billField.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  const total = chosen.reduce((sum, p) => sum + p.price * cart[p.id], 0);
  const itemsText = chosen.map((p) => `${p.id} - ${p.name} x${cart[p.id]}`).join("; ");

  const payload = {
    nameFb: form.nameFb.value.trim(),
    address: form.address.value.trim(),
    phone: form.phone.value.trim(),
    items: itemsText,
    total: total,
    payment: paymentEl.value,
    notes: form.notes.value.trim(),
    billBase64: billBase64 || "",
    billMimeType: billMimeType || "",
    billFileName: billFileName || "",
  };

  if (CONFIG.APPS_SCRIPT_URL.includes("PASTE_YOUR")) {
    setStatus("Chưa cấu hình APPS_SCRIPT_URL trong script.js — xem hướng dẫn trong README.", "err");
    return;
  }

  submitBtn.disabled = true;
  submitBtnText.textContent = "Đang gửi...";
  setStatus("Đang gửi đơn cho Red, đợi bạn một chút nhé...", "busy");

  try {
    // Apps Script web apps don't send CORS headers, so we fire the
    // request in no-cors mode and treat a resolved promise as success.
    await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });

    setStatus("Đã gửi đơn thành công! Red sẽ liên hệ xác nhận sớm nhất 🧡", "ok");
    form.reset();
    Object.keys(cart).forEach((id) => {
      cart[id] = 0;
      const el = document.getElementById(`qty-${id}`);
      if (el) { el.textContent = "0"; el.dataset.qtyNonzero = "false"; }
    });
    renderReceipt();
    billField.hidden = true;
    billBase64 = null;
    uploadPreview.hidden = true;
    uploadPrompt.hidden = false;
  } catch (err) {
    console.error(err);
    setStatus("Có lỗi khi gửi đơn, bạn thử lại hoặc nhắn trực tiếp cho Red nhé.", "err");
  } finally {
    submitBtn.disabled = false;
    submitBtnText.textContent = "Gửi đơn cho Red";
  }
});

/* ---------------- init ---------------- */

renderMenu();
renderReceipt();


