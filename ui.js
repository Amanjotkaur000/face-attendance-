// Toast notifications
export function toast(msg, type="info", ms=3500) {
  let box = document.getElementById("toast-container");
  if (!box) { box = document.createElement("div"); box.id="toast-container"; document.body.appendChild(box); }
  const t = document.createElement("div");
  t.className = "toast " + type;
  const icons = {success:"✅",error:"❌",info:"ℹ️",warning:"⚠️"};
  t.innerHTML = `<span style="font-size:1rem">${icons[type]||"ℹ️"}</span><span>${msg}</span>`;
  box.appendChild(t);
  setTimeout(() => { t.classList.add("hide"); setTimeout(()=>t.remove(),300); }, ms);
}

// Page loader
export function showLoader(txt) {
  let el = document.getElementById("page-loader");
  if (!el) { el=document.createElement("div"); el.id="page-loader"; el.innerHTML="<div class='ld-ring'></div><div class='ld-text' id='ld-text'>Loading…</div>"; document.body.appendChild(el); }
  el.classList.remove("hidden");
  if (txt) setLoaderText(txt);
}
export function hideLoader() {
  const el = document.getElementById("page-loader");
  if (el) el.classList.add("hidden");
}
export function setLoaderText(t) {
  const el = document.getElementById("ld-text");
  if (el) el.textContent = t;
}

// Format helpers
export function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});
}
export function fmtTime(t) {
  if (!t) return "—";
  const [h,m] = t.split(":");
  const hr = parseInt(h);
  return (hr%12||12)+":"+m+" "+(hr>=12?"PM":"AM");
}
export function initials(name) {
  return (name||"?").split(" ").map(n=>n[0]).join("").toUpperCase().slice(0,2);
}

// Avatar HTML
export function avatarEl(photo, name, cls="") {
  if (photo && photo.startsWith("data:")) {
    return `<div class="s-avatar ${cls}"><img src="${photo}" alt="${name||""}"/></div>`;
  }
  return `<div class="s-avatar ${cls}">${initials(name)}</div>`;
}

// Empty table row
export function emptyRow(cols, msg) {
  return `<tr><td colspan="${cols}" style="text-align:center;padding:48px;color:var(--fg3)">${msg}</td></tr>`;
}

// Auth check
export function requireAdmin() {
  const token = localStorage.getItem("fa_token");
  const user  = JSON.parse(localStorage.getItem("fa_user")||"null");
  if (!token || !user) { window.location.href="admin-login.html"; return null; }
  if (user.role!=="admin"&&user.role!=="superadmin") { window.location.href="index.html"; return null; }
  return user;
}