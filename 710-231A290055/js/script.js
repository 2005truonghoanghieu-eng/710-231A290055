// =======================
// Helper chung
// =======================
function qs(sel, root=document){ return root.querySelector(sel); }
function qsa(sel, root=document){ return [...root.querySelectorAll(sel)]; }

function safeNormalize(str){
  // tránh lỗi null/undefined + chuẩn hoá input
  return String(str ?? "").trim().toLowerCase();
}

function formatVND(n){
  return new Intl.NumberFormat("vi-VN").format(n) + " đ";
}

// Debounce tối ưu tìm kiếm (tránh chạy liên tục mỗi ký tự)
function debounce(fn, delay=250){
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

// SHA-256 hash password (demo bảo mật local)
async function sha256(text){
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,"0")).join("");
}

// =======================
// Router theo page
// =======================
const page = document.body.dataset.page;

if(page === "bt1") initBT1();
if(page === "bt2") initBT2();
if(page === "bt3") initBT3();

// =======================
// BÀI 1: Products + Search
// =======================
function initBT1(){
  const products = [
    { name: "Đèn LED âm trần 9W", price: 59000, category: "Đèn" },
    { name: "Ổ cắm điện 3 lỗ chống giật", price: 89000, category: "Ổ cắm" },
    { name: "Tai nghe Bluetooth TWS", price: 299000, category: "Âm thanh" },
    { name: "Dây điện Cadivi 2x1.5", price: 215000, category: "Dây điện" },
    { name: "Sạc nhanh USB-C 20W", price: 149000, category: "Phụ kiện" },
  ];

  const grid = qs("#productGrid");
  const input = qs("#searchInput");
  const btn = qs("#searchBtn");
  const clearBtn = qs("#clearBtn");
  const msg = qs("#bt1Msg");

  function render(list){
    grid.innerHTML = "";
    list.forEach(p => {
      const div = document.createElement("article");
      div.className = "product";
      // Tránh injection: dùng textContent, không nhét HTML từ input
      const b = document.createElement("b");
      b.textContent = p.name;

      const c = document.createElement("div");
      c.className = "muted";
      c.textContent = "Loại: " + p.category;

      const price = document.createElement("div");
      price.className = "price";
      price.textContent = formatVND(p.price);

      div.appendChild(b);
      div.appendChild(c);
      div.appendChild(price);
      grid.appendChild(div);
    });
  }

  function setMsg(text, type){
    msg.textContent = text;
    msg.className = "msg " + (type || "");
  }

  function doSearch(){
    const key = safeNormalize(input.value);

    // Tối ưu: nếu rỗng => hiện full
    if(!key){
      render(products);
      setMsg("Đang hiển thị tất cả sản phẩm.", "ok");
      return;
    }

    const result = products.filter(p => safeNormalize(p.name).includes(key));

    if(result.length === 0){
      render([]);
      setMsg("Không tìm thấy sản phẩm phù hợp!", "err");
    }else{
      render(result);
      setMsg(`Tìm thấy ${result.length} sản phẩm.`, "ok");
    }
  }

  render(products);
  setMsg("Đang hiển thị tất cả sản phẩm.", "ok");

  btn.addEventListener("click", doSearch);
  clearBtn.addEventListener("click", () => {
    input.value = "";
    render(products);
    setMsg("Đã xóa tìm kiếm.", "ok");
    input.focus();
  });

  // search realtime có debounce (tối ưu hiệu suất)
  input.addEventListener("input", debounce(doSearch, 250));
}

// =======================
// BÀI 2: Register form + Validate + LocalStorage
// =======================
function initBT2(){
  const form = qs("#registerForm");
  const nameEl = qs("#name");
  const emailEl = qs("#email");
  const passEl = qs("#password");
  const termsEl = qs("#terms");

  const errName = qs("#errName");
  const errEmail = qs("#errEmail");
  const errPass = qs("#errPass");
  const errTerms = qs("#errTerms");

  const msg = qs("#bt2Msg");
  const loadBtn = qs("#loadBtn");
  const clearBtn = qs("#clearStorageBtn");
  const box = qs("#savedBox");
  const pre = qs("#savedPre");

  function setMsg(text, type){
    msg.textContent = text;
    msg.className = "msg " + (type || "");
  }
  function clearErrors(){
    [errName, errEmail, errPass, errTerms].forEach(e => e.textContent = "");
  }

  function validEmail(email){
    // regex đủ dùng cho bài tập
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);
  }

  function validPassword(p){
    // >= 8, có hoa, thường, số
    if(p.length < 8) return false;
    if(!/[A-Z]/.test(p)) return false;
    if(!/[a-z]/.test(p)) return false;
    if(!/[0-9]/.test(p)) return false;
    return true;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault(); // xử lý submit bằng JS
    clearErrors();

    const name = nameEl.value.trim();
    const email = emailEl.value.trim();
    const pass = passEl.value;

    let ok = true;

    if(name.length < 2){
      errName.textContent = "Tên phải có ít nhất 2 ký tự.";
      ok = false;
    }
    if(!validEmail(email)){
      errEmail.textContent = "Email không hợp lệ.";
      ok = false;
    }
    if(!validPassword(pass)){
      errPass.textContent = "Mật khẩu ≥ 8 ký tự và có chữ hoa, chữ thường, số.";
      ok = false;
    }
    if(!termsEl.checked){
      errTerms.textContent = "Bạn phải đồng ý điều khoản.";
      ok = false;
    }

    if(!ok){
      setMsg("Vui lòng kiểm tra lỗi và nhập lại!", "err");
      return;
    }

    // Bảo mật dữ liệu cục bộ: không lưu plaintext password
    const passHash = await sha256(pass);

    const data = {
      name,
      email,
      passHash,
      createdAt: new Date().toISOString()
    };

    localStorage.setItem("bt2_user", JSON.stringify(data));
    setMsg("Đăng ký thành công! Đã lưu LocalStorage (password đã hash).", "ok");

    form.reset();
    box.hidden = true;
  });

  loadBtn.addEventListener("click", () => {
    const raw = localStorage.getItem("bt2_user");
    if(!raw){
      setMsg("Chưa có dữ liệu trong LocalStorage.", "err");
      box.hidden = true;
      return;
    }
    pre.textContent = raw;
    box.hidden = false;
    setMsg("Đã tải dữ liệu từ LocalStorage.", "ok");
  });

  clearBtn.addEventListener("click", () => {
    localStorage.removeItem("bt2_user");
    setMsg("Đã xóa dữ liệu LocalStorage.", "ok");
    box.hidden = true;
  });
}

// =======================
// BÀI 3: Countdown 10 phút + urgent animation + modal
// =======================
function initBT3() {
    const timerEl = qs("#timer");
    const startBtn = qs("#startBtn");
    const pauseBtn = qs("#pauseBtn");
    const resetBtn = qs("#resetBtn");
    const msg = qs("#bt3Msg");

    const modal = qs("#modal");
    const closeModal = qs("#closeModal");

    let totalSeconds = 10 * 60;
    let intervalId = null;

    // ✅ ÉP ẩn modal ngay khi vào trang
    modal.hidden = true;

    function setMsg(text, type) {
        msg.textContent = text;
        msg.className = "msg " + (type || "");
    }

    function render() {
        const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
        const ss = String(totalSeconds % 60).padStart(2, "0");
        timerEl.textContent = `${mm}:${ss}`;

        // dưới 1 phút thì bật animation
        if (totalSeconds > 0 && totalSeconds <= 60) {
            timerEl.classList.add("urgent");
        } else {
            timerEl.classList.remove("urgent");
        }

        // ✅ còn thời gian thì tuyệt đối không hiện modal
        if (totalSeconds > 0) modal.hidden = true;
    }

    function stopInterval() {
        if (intervalId !== null) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }

    function openModal() {
        modal.hidden = false;
    }

    function closeModalFn() {
        modal.hidden = true;
    }

    function tick() {
        if (totalSeconds <= 0) {
            stopInterval();
            totalSeconds = 0;
            render();
            openModal();
            setMsg("Hết giờ!", "err");
            return;
        }
        totalSeconds--;
        render();
    }

    function start() {
        if (intervalId !== null) return;
        closeModalFn(); // ✅ start thì đóng modal
        setMsg("Đang chạy...", "ok");
        intervalId = setInterval(tick, 1000);
    }

    function pause() {
        stopInterval();
        setMsg("Đã tạm dừng.", "ok");
    }

    function reset() {
        stopInterval();
        totalSeconds = 10 * 60;
        closeModalFn(); // ✅ reset thì đóng modal
        render();
        setMsg("Đã reset về 10:00.", "ok");
    }

    startBtn.addEventListener("click", start);
    pauseBtn.addEventListener("click", pause);
    resetBtn.addEventListener("click", reset);
    closeModal.addEventListener("click", closeModalFn);

    // an toàn: rời trang thì clear interval
    window.addEventListener("beforeunload", stopInterval);

    render();
    setMsg("Nhấn Start để bắt đầu.", "ok");
}
