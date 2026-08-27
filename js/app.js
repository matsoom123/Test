(function () {
  "use strict";

  const STORAGE_KEY = "finance-tracker:transactions";
  const BUDGET_KEY = "finance-tracker:budgets";

  const DEFAULT_CATEGORIES = [
    "Salary", "Groceries", "Rent", "Utilities", "Transport",
    "Dining Out", "Entertainment", "Health", "Shopping", "Savings", "Other"
  ];

  const CHART_COLORS = [
    "#2563eb", "#dc2626", "#16a34a", "#f59e0b", "#8b5cf6",
    "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1", "#64748b"
  ];

  let transactions = loadTransactions();
  let budgets = loadBudgets();

  const els = {
    balanceValue: document.getElementById("balanceValue"),
    incomeValue: document.getElementById("incomeValue"),
    expenseValue: document.getElementById("expenseValue"),
    txForm: document.getElementById("txForm"),
    txType: document.getElementById("txType"),
    txAmount: document.getElementById("txAmount"),
    txCategory: document.getElementById("txCategory"),
    txDate: document.getElementById("txDate"),
    txDescription: document.getElementById("txDescription"),
    txTableBody: document.getElementById("txTableBody"),
    emptyState: document.getElementById("emptyState"),
    categoryChart: document.getElementById("categoryChart"),
    budgetList: document.getElementById("budgetList"),
    budgetForm: document.getElementById("budgetForm"),
    budgetCategory: document.getElementById("budgetCategory"),
    budgetAmount: document.getElementById("budgetAmount"),
    filterCategory: document.getElementById("filterCategory"),
    filterType: document.getElementById("filterType"),
    filterMonth: document.getElementById("filterMonth"),
    clearFilters: document.getElementById("clearFilters"),
    exportBtn: document.getElementById("exportBtn"),
    importInput: document.getElementById("importInput"),
  };

  function loadTransactions() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error("Failed to load transactions", e);
      return [];
    }
  }

  function loadBudgets() {
    try {
      const raw = localStorage.getItem(BUDGET_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.error("Failed to load budgets", e);
      return {};
    }
  }

  function saveTransactions() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  }

  function saveBudgets() {
    localStorage.setItem(BUDGET_KEY, JSON.stringify(budgets));
  }

  function getAllCategories() {
    const fromTx = transactions.map((t) => t.category);
    const fromBudgets = Object.keys(budgets);
    const set = new Set([...DEFAULT_CATEGORIES, ...fromTx, ...fromBudgets]);
    return Array.from(set).sort();
  }

  function formatCurrency(amount) {
    const sign = amount < 0 ? "-" : "";
    return `${sign}$${Math.abs(amount).toFixed(2)}`;
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function currentMonthKey() {
    return new Date().toISOString().slice(0, 7);
  }

  function populateCategorySelects() {
    const categories = getAllCategories();
    const selects = [els.txCategory, els.budgetCategory, els.filterCategory];
    selects.forEach((select) => {
      const isFilter = select === els.filterCategory;
      const currentValue = select.value;
      const preserved = isFilter ? '<option value="">All Categories</option>' : "";
      select.innerHTML = preserved + categories
        .map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`)
        .join("");
      if (currentValue && categories.includes(currentValue)) {
        select.value = currentValue;
      }
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function getFilteredTransactions() {
    const cat = els.filterCategory.value;
    const type = els.filterType.value;
    const month = els.filterMonth.value;
    return transactions.filter((t) => {
      if (cat && t.category !== cat) return false;
      if (type && t.type !== type) return false;
      if (month && !t.date.startsWith(month)) return false;
      return true;
    });
  }

  function renderSummary() {
    let income = 0;
    let expense = 0;
    transactions.forEach((t) => {
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
    });
    els.incomeValue.textContent = formatCurrency(income);
    els.expenseValue.textContent = formatCurrency(expense);
    els.balanceValue.textContent = formatCurrency(income - expense);
  }

  function renderTable() {
    const filtered = [...getFilteredTransactions()].sort((a, b) =>
      b.date.localeCompare(a.date) || b.id.localeCompare(a.id)
    );

    els.txTableBody.innerHTML = filtered
      .map((t) => `
        <tr data-id="${t.id}">
          <td>${t.date}</td>
          <td>${escapeHtml(t.description || "—")}</td>
          <td>${escapeHtml(t.category)}</td>
          <td>${t.type === "income" ? "Income" : "Expense"}</td>
          <td class="amount-col ${t.type}">${t.type === "income" ? "+" : "-"}${formatCurrency(t.amount).replace("-", "")}</td>
          <td><button class="btn-icon" data-action="delete" title="Delete">✕</button></td>
        </tr>
      `)
      .join("");

    els.emptyState.hidden = filtered.length !== 0;
  }

  function renderChart() {
    const totals = {};
    transactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        totals[t.category] = (totals[t.category] || 0) + t.amount;
      });

    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const grandTotal = entries.reduce((sum, [, v]) => sum + v, 0);

    if (entries.length === 0) {
      els.categoryChart.innerHTML = '<p class="empty-hint">No expenses recorded yet.</p>';
      return;
    }

    let cumulativePercent = 0;
    const gradientStops = entries
      .map(([cat, value], i) => {
        const percent = (value / grandTotal) * 100;
        const start = cumulativePercent;
        cumulativePercent += percent;
        const color = CHART_COLORS[i % CHART_COLORS.length];
        return `${color} ${start}% ${cumulativePercent}%`;
      })
      .join(", ");

    const legend = entries
      .map(([cat, value], i) => {
        const color = CHART_COLORS[i % CHART_COLORS.length];
        const percent = ((value / grandTotal) * 100).toFixed(1);
        return `
          <div class="legend-row">
            <span class="legend-name"><span class="legend-swatch" style="background:${color}"></span>${escapeHtml(cat)}</span>
            <span class="legend-value">${formatCurrency(value)} (${percent}%)</span>
          </div>
        `;
      })
      .join("");

    els.categoryChart.innerHTML = `
      <div style="width:160px;height:160px;border-radius:50%;background:conic-gradient(${gradientStops});flex-shrink:0;"></div>
      <div class="chart-legend">${legend}</div>
    `;
  }

  function renderBudgets() {
    const spentByCategory = {};
    const month = currentMonthKey();
    transactions
      .filter((t) => t.type === "expense" && t.date.startsWith(month))
      .forEach((t) => {
        spentByCategory[t.category] = (spentByCategory[t.category] || 0) + t.amount;
      });

    const entries = Object.entries(budgets);
    if (entries.length === 0) {
      els.budgetList.innerHTML = '<p class="empty-hint">No budgets set yet. Add one below to track monthly spending.</p>';
      return;
    }

    els.budgetList.innerHTML = entries
      .map(([cat, budgetAmount]) => {
        const spent = spentByCategory[cat] || 0;
        const percent = budgetAmount > 0 ? Math.min((spent / budgetAmount) * 100, 100) : 0;
        const over = spent > budgetAmount;
        return `
          <div class="budget-item">
            <div class="budget-item-top">
              <span class="cat-name">${escapeHtml(cat)}</span>
              <span class="amounts ${over ? "over" : ""}">${formatCurrency(spent)} / ${formatCurrency(budgetAmount)}</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill ${over ? "over" : ""}" style="width:${percent}%"></div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function renderAll() {
    populateCategorySelects();
    renderSummary();
    renderTable();
    renderChart();
    renderBudgets();
  }

  function addTransaction(e) {
    e.preventDefault();
    const type = els.txType.value;
    const amount = parseFloat(els.txAmount.value);
    const category = els.txCategory.value;
    const date = els.txDate.value || todayISO();
    const description = els.txDescription.value.trim();

    if (!amount || amount <= 0 || !category) return;

    transactions.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      amount,
      category,
      date,
      description,
    });

    saveTransactions();
    els.txForm.reset();
    els.txDate.value = todayISO();
    renderAll();
  }

  function deleteTransaction(id) {
    transactions = transactions.filter((t) => t.id !== id);
    saveTransactions();
    renderAll();
  }

  function setBudget(e) {
    e.preventDefault();
    const category = els.budgetCategory.value;
    const amount = parseFloat(els.budgetAmount.value);
    if (!category || isNaN(amount) || amount < 0) return;
    budgets[category] = amount;
    saveBudgets();
    els.budgetForm.reset();
    renderAll();
  }

  function exportCSV() {
    const header = ["date", "type", "category", "amount", "description"];
    const rows = transactions.map((t) => [
      t.date,
      t.type,
      t.category,
      t.amount,
      (t.description || "").replace(/"/g, '""'),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finance-transactions-${todayISO()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function parseCSVLine(line) {
    const result = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          current += char;
        }
      } else if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }

  function importCSV(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
      if (lines.length < 2) return;

      const header = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
      const idx = {
        date: header.indexOf("date"),
        type: header.indexOf("type"),
        category: header.indexOf("category"),
        amount: header.indexOf("amount"),
        description: header.indexOf("description"),
      };
      if (idx.date === -1 || idx.type === -1 || idx.category === -1 || idx.amount === -1) {
        alert("CSV must include date, type, category, and amount columns.");
        return;
      }

      let imported = 0;
      for (let i = 1; i < lines.length; i++) {
        const fields = parseCSVLine(lines[i]);
        const amount = parseFloat(fields[idx.amount]);
        const type = (fields[idx.type] || "").trim().toLowerCase();
        const date = (fields[idx.date] || "").trim();
        const category = (fields[idx.category] || "").trim() || "Other";
        if (!amount || isNaN(amount) || !date || (type !== "income" && type !== "expense")) continue;

        transactions.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${i}`,
          type,
          amount: Math.abs(amount),
          category,
          date,
          description: idx.description !== -1 ? (fields[idx.description] || "").trim() : "",
        });
        imported++;
      }

      saveTransactions();
      renderAll();
      alert(`Imported ${imported} transaction(s).`);
    };
    reader.readAsText(file);
  }

  els.txForm.addEventListener("submit", addTransaction);
  els.budgetForm.addEventListener("submit", setBudget);
  els.exportBtn.addEventListener("click", exportCSV);
  els.importInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) importCSV(file);
    e.target.value = "";
  });

  els.txTableBody.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action='delete']");
    if (!btn) return;
    const row = btn.closest("tr");
    const id = row.dataset.id;
    if (confirm("Delete this transaction?")) deleteTransaction(id);
  });

  [els.filterCategory, els.filterType, els.filterMonth].forEach((el) => {
    el.addEventListener("change", renderTable);
  });

  els.clearFilters.addEventListener("click", () => {
    els.filterCategory.value = "";
    els.filterType.value = "";
    els.filterMonth.value = "";
    renderTable();
  });

  els.txDate.value = todayISO();
  renderAll();
})();
