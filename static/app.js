/* =========================================================================
 * NovaTech Portal - App JS
 * Sections:
 *  1) Password change dialog (native <dialog>)
 *  2) Inventory table (CRUD, client render)
 *  3) Charts (Chart.js; dark theme) + auto draw
 *  4) Inbox Drawer (contact messages)
 *  5) Notifications page actions (FIXED read/unread toggle)
 *  6) Import modal (Bootstrap + drag&drop + toast)
 *  7) Notifications: view dialog
 * =======================================================================*/

"use strict";

/* ---------------------------------- 1) Password dialog ---------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("changePwdBtn");
  const dlg = document.getElementById("pwdModal");
  if (!btn || !dlg) return;

  const msgEl = document.getElementById("pwdMsg");
  const oldEl = document.getElementById("oldPwd");
  const newEl = document.getElementById("newPwd");

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    msgEl && (msgEl.textContent = "");
    oldEl && (oldEl.value = "");
    newEl && (newEl.value = "");
    dlg.showModal();
    oldEl?.focus();
  });

  document.getElementById("pwdCancel")?.addEventListener("click", (e) => {
    e.preventDefault();
    dlg.close();
  });

  document.getElementById("pwdSave")?.addEventListener("click", async (e) => {
    e.preventDefault();
    const oldPwd = oldEl?.value || "";
    const newPwd = newEl?.value || "";
    if (!newPwd) {
      msgEl && (msgEl.textContent = "Yeni şifre zorunlu");
      return;
    }
    try {
      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ old: oldPwd, new: newPwd }),
      });
      const j = await res.json().catch(() => ({}));
      if (j.ok) {
        msgEl && (msgEl.textContent = "Şifre güncellendi");
        setTimeout(() => dlg.close(), 900);
      } else {
        msgEl && (msgEl.textContent = j.error || "Hata");
      }
    } catch {
      msgEl && (msgEl.textContent = "İstek başarısız");
    }
  });
});

/* ---------------------------------- 2) Inventory UI ---------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  const invTable = document.getElementById("invTable");
  if (!invTable) return;

  const tbody = invTable.querySelector("tbody");
  const editDlg = document.getElementById("editModal");
  const deleteDlg = document.getElementById("deleteModal");
  const deleteText = document.getElementById("deleteText");
  const editMsg = document.getElementById("editMsg");

  // optional export helpers
  document.getElementById("btnExportCsv")?.addEventListener("click", () => {
    window.location.href = "/api/inventory/export?fmt=csv";
  });
  document.getElementById("btnExportJson")?.addEventListener("click", () => {
    window.location.href = "/api/inventory/export?fmt=json";
  });

  // pick(): tolerates legacy keys (owner/user, department/location, model/name, ip/address)
  const pick = (obj, keys) => {
    for (const k of keys) {
      const v = obj?.[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") return v;
    }
    return "";
  };

  const fillEdit = (r) => {
    document.getElementById("edit-id").value         = pick(r, ["id"]);
    document.getElementById("edit-owner").value      = pick(r, ["owner","user","username"]);
    document.getElementById("edit-department").value = pick(r, ["department","location","dept"]);
    document.getElementById("edit-model").value      = pick(r, ["model","name"]);
    document.getElementById("edit-ip").value         = pick(r, ["ip","address","ip_address"]);
    document.getElementById("edit-os").value         = pick(r, ["os","operating_system"]);
    document.getElementById("edit-status").value     = pick(r, ["status"]);
    const editMsg = document.getElementById("editMsg");
    if (editMsg) editMsg.textContent = "";
  };

  // Render one table row
  const renderRow = (r) => {
    const tr = document.createElement("tr");

    const cells = [
      ["Asset ID",   pick(r, ["id"])],
      ["Kullanıcı",  pick(r, ["owner","user","username"])],
      ["Departman",  pick(r, ["department","location","dept"])],
      ["Model",      pick(r, ["model","name"])],
      ["IP",         pick(r, ["ip","address","ip_address"])],
      ["OS",         pick(r, ["os","operating_system"])],
      ["Durum",      pick(r, ["status"])],
    ];

    cells.forEach(([label, value]) => {
      const td = document.createElement("td");
      td.dataset.label = label;
      td.textContent = value || "—";
      tr.appendChild(td);
    });

    const tdOps = document.createElement("td");
    tdOps.dataset.label = "İşlem";

    const editBtn = document.createElement("button");
    editBtn.textContent = "Düzenle";

    const delBtn = document.createElement("button");
    delBtn.className = "btn btn-outline-danger";
    delBtn.textContent = "Sil";

    editBtn.onclick = () => { fillEdit(r); editDlg.showModal(); };
    delBtn.onclick = () => {
      deleteText.textContent = `${pick(r,["id"])} kaydı silinsin mi?`;
      deleteDlg.dataset.id = pick(r,["id"]);
      deleteDlg.showModal();
    };

    tdOps.append(editBtn, delBtn);
    tr.appendChild(tdOps);
    tbody.appendChild(tr);
  };

  const load = async () => {
    try {
      tbody.innerHTML = "";
      const res = await fetch("/api/inventory");
      const data = await res.json();
      data.forEach(renderRow);
    } catch {
      tbody.innerHTML = `<tr><td colspan="8">Veri yüklenemedi.</td></tr>`;
    }
  };

  window.reloadInventory = load;

  // Add
  const addForm = document.getElementById("addForm");
  addForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(addForm);
    const payload = Object.fromEntries(fd.entries());
    const res = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await res.json();
    if (j.ok) {
      addForm.reset();
      const sec = document.getElementById("addSection");
      if (sec) sec.open = false;
      load();
    }
  });

  // Edit
  document.getElementById("editCancel").onclick = () => editDlg.close();
  document.getElementById("editSave").onclick = async (e) => {
    e.preventDefault();
    const updated = {
      id: document.getElementById("edit-id").value,
      owner: document.getElementById("edit-owner").value,
      department: document.getElementById("edit-department").value,
      model: document.getElementById("edit-model").value,
      ip: document.getElementById("edit-ip").value,
      os: document.getElementById("edit-os").value,
      status: document.getElementById("edit-status").value,
    };
    const res = await fetch(`/api/inventory/${encodeURIComponent(updated.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    const j = await res.json();
    if (j.ok) {
      editDlg.close();
      load();
    } else {
      editMsg.textContent = j.error || "Hata";
    }
  };

  // Delete
  document.getElementById("deleteCancel").onclick = () => editDlg.close();
  document.getElementById("deleteConfirm").onclick = async (e) => {
    e.preventDefault();
    const id = deleteDlg.dataset.id;
    const res = await fetch(`/api/inventory/${encodeURIComponent(id)}`, { method: "DELETE" });
    const j = await res.json();
    if (j.ok) {
      deleteDlg.close();
      load();
    }
  };

  load();
});

/* ---------------------------------- 3) Charts ---------------------------------- */
window.renderCharts = (statusData, osData) => {
  const sctx = document.getElementById("statusChart");
  const octx = document.getElementById("osChart");
  if (!sctx || !octx || typeof Chart === "undefined") return;

  const cs = getComputedStyle(document.documentElement);
  const grid = cs.getPropertyValue("--line").trim() || "#30363d";
  const text = "#e6edf3";
  const palette = ["#58a6ff","#7ee787","#ff7b72","#d2a8ff","#ffa657","#79c0ff","#a5d6ff"];

  Chart.defaults.color = text;

  new Chart(sctx, {
    type: "doughnut",
    data: {
      labels: Object.keys(statusData),
      datasets: [{
        data: Object.values(statusData),
        backgroundColor: Object.keys(statusData).map((_, i) => palette[i % palette.length]),
        borderColor: grid, borderWidth: 1
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: text } } },
      layout: { padding: 8 }
    }
  });

  new Chart(octx, {
    type: "bar",
    data: {
      labels: Object.keys(osData),
      datasets: [{
        data: Object.values(osData),
        backgroundColor: Object.keys(osData).map((_, i) => palette[i % palette.length]),
        borderColor: grid, borderWidth: 1
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: text }, grid: { color: grid } },
        y: { ticks: { color: text, precision: 0 }, grid: { color: grid }, beginAtZero: true }
      },
      layout: { padding: 8 }
    }
  });
};

// Auto-draw charts on dashboard
document.addEventListener("DOMContentLoaded", () => {
  const sEl = document.getElementById("status-data");
  const oEl = document.getElementById("os-data");
  if (!sEl || !oEl) return;

  try {
    const statusData = JSON.parse(sEl.textContent || "{}");
    const osData = JSON.parse(oEl.textContent || "{}");
    if (typeof Chart !== "undefined" && window.renderCharts) {
      window.renderCharts(statusData, osData);
    }
  } catch (e) {
    console.error("Chart data parse error", e);
  }
});

/* ----------------------- 4) Inbox Drawer (contact messages) ----------------------- */
document.addEventListener("DOMContentLoaded", () => {
  const btn       = document.getElementById("inboxBtn");
  const drawer    = document.getElementById("inboxDrawer");
  const backdrop  = document.getElementById("inboxBackdrop");
  const panel     = document.getElementById("inboxPanel");
  const closeBtn  = document.getElementById("inboxClose");
  const listEl    = document.getElementById("inboxList");
  const emptyEl   = document.getElementById("inboxEmpty");
  const badgeEl   = document.getElementById("inboxBadge");
  const markAll   = document.getElementById("inboxMarkAll");
  const allLink   = document.getElementById("inboxAll");

  if (!btn || !drawer || !backdrop || !panel || !listEl) return;

  const open  = () => { drawer.classList.add("open"); drawer.setAttribute("aria-hidden","false"); };
  const close = () => { drawer.classList.remove("open"); drawer.setAttribute("aria-hidden","true"); };

  // Close only by backdrop/close button/ESC — clicks inside panel should NOT close
  backdrop.addEventListener("click", close);
  closeBtn?.addEventListener("click", close);
  panel.addEventListener("click", (e) => e.stopPropagation());
  drawer.addEventListener("click", close); // clicking the free area closes
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

  const setBadge = (n) => { if (badgeEl) badgeEl.textContent = String(n); };

  const render = (items = []) => {
    listEl.innerHTML = "";
    emptyEl?.classList.toggle("d-none", items.length !== 0);

    items.forEach((m) => {
      const li = document.createElement("li");
      li.className = "inbox-item" + (m.read ? " read" : "");
      li.dataset.id = m.id;

      li.innerHTML = `
        <span class="inbox-dot" aria-hidden="true"></span>
        <div class="flex-1">
          <p class="inbox-title">${m.subject || "Mesaj"}</p>
          <div class="inbox-meta">${m.name || "Bilinmiyor"} — ${new Date(m.created_at || m.ts || Date.now()).toLocaleString("tr-TR")}</div>
          <p class="inbox-text">${m.message || ""}</p>
        </div>
        <button class="btn btn-sm btn-outline-secondary open-item" type="button">Aç</button>
      `;

      const go = () => { window.location.href = "/notifications"; };
      li.addEventListener("click", (e) => { e.stopPropagation(); go(); });
      li.querySelector(".open-item").addEventListener("click", (e) => { e.stopPropagation(); go(); });

      listEl.appendChild(li);
    });
  };

  const load = async () => {
    try {
      const r = await fetch("/api/contact/latest?limit=10");
      const j = await r.json();
      render(j);
      const rc = await fetch("/api/contact/unread-count").then(x=>x.json()).catch(()=>({unread:0}));
      setBadge(rc.unread ?? 0);
    } catch {
      render([]);
    }
  };

  markAll?.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      const r = await fetch("/api/notifications/read-all", { method: "POST" });
      const j = await r.json();
      if (j.ok) {
        listEl.querySelectorAll(".inbox-item").forEach(li => li.classList.add("read"));
        setBadge(j.unread ?? 0);
      }
    } catch {}
  });

  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    await load();
    open();
  });

  allLink?.addEventListener("click", () => { close(); });
});

/* ----------------------- 5) Notifications page actions (FIXED) ----------------------- */
/**
 * Minimal, scoped fixes:
 * - Correctly send {read:true/false}
 * - Update row class, status cell, and button label
 * - Keep navbar badge in sync
 */
document.addEventListener("DOMContentLoaded", () => {
  const table = document.getElementById("notifTable");
  if (!table) return; // Not on notifications page

  const tbody  = table.querySelector("tbody");
  const selAll = document.getElementById("notifSelectAll");
  const btnAll = document.getElementById("markAllRead");
  const btnDel = document.getElementById("deleteSelected");
  const btnDelAll = document.getElementById("deleteAll");

  const updateBadge = (n) => {
    const b = document.querySelector("#navUnread, .nt-badge, .badge");
    if (b != null && typeof n === "number") b.textContent = String(n);
  };

  const selectedIds = () =>
    Array.from(tbody.querySelectorAll("tr"))
      .filter(tr => tr.querySelector(".sel")?.checked)
      .map(tr => tr.dataset.id);

  const removeRows = (idsSet) => {
    Array.from(tbody.querySelectorAll("tr")).forEach(tr => {
      if (idsSet.has(tr.dataset.id)) tr.remove();
    });
  };

  // Read/Unread toggle + single delete
  tbody.addEventListener("click", async (e) => {
    const tr = e.target.closest("tr");
    if (!tr) return;
    const id = tr.dataset.id;
    const stateTd = tr.querySelector("td:nth-last-child(2)");

    // → Mark as Read
    if (e.target.classList.contains("btnRead")) {
      const r = await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true })
      });
      const j = await r.json().catch(() => ({}));
      if (j.ok) {
        tr.classList.remove("notif-unread");
        if (stateTd) stateTd.textContent = "Okundu";
        e.target.outerHTML = '<button class="btnUnread">Okunmadı</button>';
        updateBadge(j.unread);
      }
      return;
    }

    // → Mark as Unread
    if (e.target.classList.contains("btnUnread")) {
      const r = await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: false })
      });
      const j = await r.json().catch(() => ({}));
      if (j.ok) {
        tr.classList.add("notif-unread");
        if (stateTd) stateTd.textContent = "Yeni";
        e.target.outerHTML = '<button class="btnRead">Okundu</button>';
        updateBadge(j.unread);
      }
      return;
    }

    // Single delete
    if (e.target.classList.contains("btnDel")) {
      if (!confirm("Bu mesaj silinsin mi?")) return;
      const r = await fetch(`/api/contact/${encodeURIComponent(id)}`, { method: "DELETE" });
      const j = await r.json().catch(() => ({}));
      if (j.ok) {
        tr.remove();
        if (typeof j.unread === "number") updateBadge(j.unread);
      }
    }
  });

  // Select all
  selAll?.addEventListener("change", () => {
    const v = selAll.checked;
    tbody.querySelectorAll(".sel").forEach(ch => (ch.checked = v));
  });

  // Mark all as read
  btnAll?.addEventListener("click", async () => {
    const r = await fetch("/api/notifications/read-all", { method: "POST" });
    const j = await r.json().catch(() => ({}));
    if (j.ok) {
      tbody.querySelectorAll("tr").forEach(tr => {
        tr.classList.remove("notif-unread");
        tr.querySelector("td:nth-last-child(2)").textContent = "Okundu";
        const btn = tr.querySelector(".btnRead, .btnUnread");
        if (btn) btn.outerHTML = '<button class="btnUnread">Okunmadı</button>';
      });
      updateBadge(j.unread ?? 0);
    }
  });

  // Delete selected
  btnDel?.addEventListener("click", async () => {
    const ids = selectedIds();
    if (ids.length === 0) {
      alert("Silmek için en az bir mesaj seçin.");
      return;
    }
    if (!confirm(`${ids.length} mesajı silmek istediğinize emin misiniz?`)) return;

    const r = await fetch("/api/contact/delete-bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids })
    });
    const j = await r.json().catch(() => ({}));
    if (j.ok) {
      removeRows(new Set(ids));
      if (typeof j.unread === "number") updateBadge(j.unread);
      if (selAll) selAll.checked = false;
    }
  });

  // Delete ALL
  btnDelAll?.addEventListener("click", async () => {
    if (!confirm("Tüm mesajlar silinecek. Emin misiniz?")) return;
    const r = await fetch("/api/contact/delete-bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true })
    });
    const j = await r.json().catch(() => ({}));
    if (j.ok) {
      tbody.innerHTML = "";
      updateBadge(0);
      if (selAll) selAll.checked = false;
    }
  });
});

/* ---------------------- 6) Import modal (d&d + toast) ---------------------- */
document.addEventListener("DOMContentLoaded", () => {
  const importForm = document.getElementById("importForm");
  const progressEl = document.getElementById("importProgress");
  const msgEl = document.getElementById("importMsg");
  const toastEl = document.getElementById("toast");
  const toastBody = document.getElementById("toastBody");
  const toast = toastEl && window.bootstrap ? new bootstrap.Toast(toastEl) : null;

  const dz = document.getElementById("dropzone");
  const fileInput = document.getElementById("importFile");

  if (dz && fileInput) {
    ["dragenter", "dragover"].forEach((ev) =>
      dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("border-primary"); })
    );
    ["dragleave", "drop"].forEach((ev) =>
      dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove("border-primary"); })
    );
    dz.addEventListener("drop", (e) => {
      const f = e.dataTransfer.files?.[0];
      if (f) fileInput.files = e.dataTransfer.files;
    });
  }

  importForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    msgEl.className = "alert d-none";

    const mode = document.getElementById("importMode").value;
    const confirmReplace = document.getElementById("confirmBigChange").checked;
    if (mode === "replace" && !confirmReplace) {
      msgEl.className = "alert alert-warning";
      msgEl.textContent = "Replace için onay kutucuğunu işaretleyin.";
      return;
    }

    const fd = new FormData(importForm);
    progressEl.classList.remove("d-none");

    try {
      const r = await fetch("/api/inventory/import", { method: "POST", body: fd });
      const j = await r.json();
      progressEl.classList.add("d-none");

      if (j.ok) {
        const added   = (j.added ?? j.inserted ?? 0);
        const updated = (j.updated ?? 0);
        const total   = (j.total ?? (added + updated));

        msgEl.className = "alert alert-success";
        msgEl.textContent = `Tamam: ${added} eklendi, ${updated} güncellendi (Toplam ${total})`;
        if (toastBody) toastBody.textContent = "İçe aktarma tamamlandı";
        toast && toast.show();

        if (typeof window.reloadInventory === "function") window.reloadInventory();
      } else {
        msgEl.className = "alert alert-danger";
        msgEl.textContent = `Hata: ${j.error || "Bilinmeyen hata"}`;
      }
    } catch {
      progressEl.classList.add("d-none");
      msgEl.className = "alert alert-danger";
      msgEl.textContent = "Yükleme başarısız. Dosya türü CSV/XLSX olmalı.";
    }
  });
});

/* ----------------------- 7) Notifications: view dialog ----------------------- */
document.addEventListener("DOMContentLoaded", () => {
  const table = document.getElementById("notifTable");
  const vdlg  = document.getElementById("notifView");
  const vSubj = document.getElementById("nvSubject");
  const vMeta = document.getElementById("nvMeta");
  const vBody = document.getElementById("nvBody");
  const vClose= document.getElementById("nvClose");

  if (!table || !vdlg) return;

  // When "Görüntüle" is clicked, fill dialog and mark the row as read
  table.addEventListener("click", async (e) => {
    const btn = e.target.closest(".btnView");
    if (!btn) return;

    const tr = btn.closest("tr");
    const subj = tr.dataset.subject || "Mesaj";
    const name = tr.dataset.name || "Bilinmiyor";
    const email= tr.dataset.email || "";
    const ts   = tr.dataset.ts || "";
    const dept = tr.dataset.department || "";
    const msg  = tr.dataset.message || "";

    vSubj.textContent = subj;
    vMeta.textContent = `${name}${email ? " • " + email : ""}${dept ? " • " + dept : ""}${ts ? " • " + ts : ""}`;
    vBody.textContent = msg;

    // Mark as read on open (optional UX)
    try { await fetch(`/api/notifications/${encodeURIComponent(tr.dataset.id)}/read`, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ read: true })
    }); } catch {}

    // Reflect state in the row + change action button text consistently
    tr.classList.remove("notif-unread");
    tr.querySelector("td:nth-last-child(2)").textContent = "Okundu";
    const actCell = tr.querySelector("td:last-child");
    if (actCell) actCell.innerHTML = `<button class="btnView">Görüntüle</button> <button class="btnUnread">Okunmadı</button>`;

    vdlg.showModal();
  });

  vClose?.addEventListener("click", (e) => { e.preventDefault(); vdlg.close(); });
});
