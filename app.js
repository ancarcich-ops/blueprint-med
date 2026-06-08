/* Austin Lads Goldy Extravaganza — group expense tracker */

const STORAGE_KEY = "austin-lads-goldy";

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    /* ignore corrupt data */
  }
  return { people: [], expenses: [] };
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const money = (n) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* ---------- View switching ---------- */
const tabs = document.querySelectorAll(".tab");
const views = document.querySelectorAll(".view");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.view;
    tabs.forEach((t) => t.classList.toggle("active", t === tab));
    views.forEach((v) => v.classList.toggle("active", v.id === target));
    if (target === "summary") renderSummary();
  });
});

/* ---------- People ---------- */
const personForm = document.getElementById("person-form");
const personName = document.getElementById("person-name");
const peopleList = document.getElementById("people-list");

personForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = personName.value.trim();
  if (!name) return;
  if (state.people.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
    personName.value = "";
    return;
  }
  state.people.push({ id: uid(), name });
  personName.value = "";
  save();
  renderPeople();
  renderPayerOptions();
  renderSplitList();
});

function renderPeople() {
  peopleList.innerHTML = "";
  if (state.people.length === 0) {
    peopleList.innerHTML = '<li class="empty">Add the lads to get started.</li>';
    return;
  }
  state.people.forEach((p) => {
    const li = document.createElement("li");
    li.textContent = p.name;
    const btn = document.createElement("button");
    btn.className = "remove";
    btn.textContent = "×";
    btn.title = "Remove";
    btn.addEventListener("click", () => removePerson(p.id));
    li.appendChild(btn);
    peopleList.appendChild(li);
  });
}

function removePerson(id) {
  const person = state.people.find((p) => p.id === id);
  const involved = state.expenses.some(
    (e) => e.payer === id || e.split.includes(id)
  );
  if (involved && person) {
    if (
      !confirm(
        `${person.name} is part of some expenses. Remove them and those expenses too?`
      )
    )
      return;
    state.expenses = state.expenses.filter(
      (e) => e.payer !== id && !e.split.includes(id)
    );
  }
  state.people = state.people.filter((p) => p.id !== id);
  save();
  renderPeople();
  renderPayerOptions();
  renderSplitList();
  renderExpenses();
}

/* ---------- Expense form ---------- */
const expenseForm = document.getElementById("expense-form");
const expDesc = document.getElementById("exp-desc");
const expAmount = document.getElementById("exp-amount");
const expPayer = document.getElementById("exp-payer");
const splitList = document.getElementById("split-list");

function renderPayerOptions() {
  const prev = expPayer.value;
  expPayer.innerHTML = "";
  if (state.people.length === 0) {
    const opt = document.createElement("option");
    opt.textContent = "Add people first";
    opt.disabled = true;
    expPayer.appendChild(opt);
    return;
  }
  state.people.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    expPayer.appendChild(opt);
  });
  if (state.people.some((p) => p.id === prev)) expPayer.value = prev;
}

function renderSplitList() {
  splitList.innerHTML = "";
  if (state.people.length === 0) {
    splitList.innerHTML = '<span class="empty">Add people first</span>';
    return;
  }
  state.people.forEach((p) => {
    const label = document.createElement("label");
    label.className = "split-tag on";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = p.id;
    cb.checked = true;
    cb.addEventListener("change", () =>
      label.classList.toggle("on", cb.checked)
    );
    label.appendChild(cb);
    label.appendChild(document.createTextNode(p.name));
    splitList.appendChild(label);
  });
}

document.getElementById("split-all").addEventListener("click", () => {
  splitList.querySelectorAll("input").forEach((cb) => {
    cb.checked = true;
    cb.closest(".split-tag").classList.add("on");
  });
});
document.getElementById("split-none").addEventListener("click", () => {
  splitList.querySelectorAll("input").forEach((cb) => {
    cb.checked = false;
    cb.closest(".split-tag").classList.remove("on");
  });
});

expenseForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const desc = expDesc.value.trim() || "Expense";
  const amount = parseFloat(expAmount.value);
  const payer = expPayer.value;
  const split = [...splitList.querySelectorAll("input:checked")].map(
    (cb) => cb.value
  );

  if (!payer || !state.people.some((p) => p.id === payer)) {
    alert("Pick who paid.");
    return;
  }
  if (!(amount > 0)) {
    alert("Enter an amount greater than zero.");
    return;
  }
  if (split.length === 0) {
    alert("Pick at least one person to split between.");
    return;
  }

  state.expenses.push({ id: uid(), desc, amount, payer, split });
  save();

  expDesc.value = "";
  expAmount.value = "";
  expDesc.focus();
  renderExpenses();
});

function renderExpenses() {
  const list = document.getElementById("expense-list");
  list.innerHTML = "";
  if (state.expenses.length === 0) {
    list.innerHTML = '<li class="empty">No expenses yet.</li>';
    return;
  }
  const nameOf = (id) => {
    const p = state.people.find((x) => x.id === id);
    return p ? p.name : "?";
  };
  // newest first
  [...state.expenses].reverse().forEach((exp) => {
    const li = document.createElement("li");

    const main = document.createElement("div");
    main.className = "exp-main";
    const desc = document.createElement("div");
    desc.className = "exp-desc";
    desc.textContent = exp.desc;
    const meta = document.createElement("div");
    meta.className = "exp-meta";
    meta.textContent = `${nameOf(exp.payer)} paid · split ${exp.split.length} way${
      exp.split.length > 1 ? "s" : ""
    }`;
    main.appendChild(desc);
    main.appendChild(meta);

    const right = document.createElement("div");
    right.className = "exp-right";
    const amt = document.createElement("span");
    amt.className = "exp-amt";
    amt.textContent = money(exp.amount);
    const del = document.createElement("button");
    del.className = "exp-del";
    del.textContent = "×";
    del.title = "Delete";
    del.addEventListener("click", () => {
      state.expenses = state.expenses.filter((e) => e.id !== exp.id);
      save();
      renderExpenses();
    });
    right.appendChild(amt);
    right.appendChild(del);

    li.appendChild(main);
    li.appendChild(right);
    list.appendChild(li);
  });
}

/* ---------- Summary & settlement ---------- */
function renderSummary() {
  const spendList = document.getElementById("spend-list");
  const settlementList = document.getElementById("settlement-list");
  const grandTotal = document.getElementById("grand-total");

  const total = state.expenses.reduce((s, e) => s + e.amount, 0);
  grandTotal.textContent = `Total spent: ${money(total)}`;

  // net[id] = paid - owed
  const net = {};
  const paid = {};
  state.people.forEach((p) => {
    net[p.id] = 0;
    paid[p.id] = 0;
  });

  state.expenses.forEach((exp) => {
    if (net[exp.payer] === undefined) return;
    paid[exp.payer] += exp.amount;
    net[exp.payer] += exp.amount;
    const share = exp.amount / exp.split.length;
    exp.split.forEach((id) => {
      if (net[id] === undefined) return;
      net[id] -= share;
    });
  });

  // Spent-per-person list
  spendList.innerHTML = "";
  if (state.people.length === 0) {
    spendList.innerHTML = '<li class="empty">No one here yet.</li>';
  } else {
    state.people.forEach((p) => {
      const li = document.createElement("li");
      const name = document.createElement("span");
      name.className = "spend-name";
      name.textContent = p.name;
      const amt = document.createElement("span");
      amt.className = "spend-amt";
      amt.textContent = `paid ${money(paid[p.id] || 0)}`;
      li.appendChild(name);
      li.appendChild(amt);
      spendList.appendChild(li);
    });
  }

  // Settlement
  settlementList.innerHTML = "";
  const transactions = settle(net);

  if (state.expenses.length === 0) {
    settlementList.innerHTML = '<li class="empty">Add expenses to see who owes who.</li>';
    return;
  }
  if (transactions.length === 0) {
    settlementList.innerHTML = '<li class="all-square">🎉 All square — nobody owes anybody!</li>';
    return;
  }

  const nameOf = (id) => {
    const p = state.people.find((x) => x.id === id);
    return p ? p.name : "?";
  };

  transactions.forEach((t) => {
    const li = document.createElement("li");
    li.innerHTML =
      `<span class="from">${escapeHtml(nameOf(t.from))}</span>` +
      `<span class="arrow">→</span>` +
      `<span class="to">${escapeHtml(nameOf(t.to))}</span>` +
      `<span class="pay-amt">${money(t.amount)}</span>`;
    settlementList.appendChild(li);
  });
}

/* Greedy min-cash-flow settlement. */
function settle(net) {
  const EPS = 0.005;
  const debtors = [];
  const creditors = [];
  Object.keys(net).forEach((id) => {
    const v = Math.round(net[id] * 100) / 100;
    if (v < -EPS) debtors.push({ id, amt: -v });
    else if (v > EPS) creditors.push({ id, amt: v });
  });

  // largest first for fewer transactions
  debtors.sort((a, b) => b.amt - a.amt);
  creditors.sort((a, b) => b.amt - a.amt);

  const txns = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amt, creditors[j].amt);
    txns.push({
      from: debtors[i].id,
      to: creditors[j].id,
      amount: Math.round(pay * 100) / 100,
    });
    debtors[i].amt -= pay;
    creditors[j].amt -= pay;
    if (debtors[i].amt < EPS) i++;
    if (creditors[j].amt < EPS) j++;
  }
  return txns.filter((t) => t.amount > 0);
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

/* ---------- Reset ---------- */
document.getElementById("reset-btn").addEventListener("click", () => {
  if (confirm("Wipe everyone and every expense? This can't be undone.")) {
    state = { people: [], expenses: [] };
    save();
    renderAll();
  }
});

/* ---------- Init ---------- */
function renderAll() {
  renderPeople();
  renderPayerOptions();
  renderSplitList();
  renderExpenses();
}
renderAll();
