const express = require("express");

const app = express();
app.use(express.json());

let orders = [];
let tables = [
  { number: 1, capacity: 2, occupied: false, current: null },
  { number: 2, capacity: 5, occupied: false, current: null },
  { number: 3, capacity: 10, occupied: false, current: null },
  { number: 4, capacity: 20, occupied: false, current: null }
];
let tableQueue = [];

function allocateTable(people, name) {
  const table = tables
    .filter(t => !t.occupied && t.capacity >= people)
    .sort((a, b) => a.capacity - b.capacity)[0];

  if (!table) return null;

  table.occupied = true;
  table.current = { name, people, since: Date.now() };
  return table;
}

app.post("/api/order", (req, res) => {
  const { name, items, people } = req.body;

  const existing = orders.find(
    o => o.name === name && o.status !== "Completed"
  );
  if (existing) return res.json(existing);

  let table = null;
  let status = "Preparing";

  if (people && people > 0) {
    table = allocateTable(people, name);
    if (!table) {
      status = "Waiting for Table";
      tableQueue.push({ name, items, people, createdAt: Date.now() });
    }
  }

  const order = {
    id: Date.now(),
    name,
    items,
    people,
    tableNumber: table ? table.number : null,
    status
  };

  orders.push(order);
  res.json(order);
});

app.get("/api/orders", (req, res) => {
  res.json(orders.filter(o => o.status === "Preparing"));
});

app.get("/api/manager-data", (req, res) => {
  res.json({ tables, queue: tableQueue });
});

app.post("/api/free-table", (req, res) => {
  const { tableNumber } = req.body;
  const table = tables.find(t => t.number === tableNumber);
  if (!table) return res.json({ error: "Table not found" });

  table.occupied = false;
  table.current = null;

  const next = tableQueue.shift();
  if (next && table.capacity >= next.people) {
    table.occupied = true;
    table.current = { name: next.name, people: next.people, since: Date.now() };

    const order = orders.find(
      o => o.name === next.name && o.status === "Waiting for Table"
    );
    if (order) {
      order.status = "Preparing";
      order.tableNumber = table.number;
    }
  }

  res.json({ success: true });
});

module.exports = app;
