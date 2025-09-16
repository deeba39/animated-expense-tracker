import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Chart from "react-apexcharts";

type TxType = "Income" | "Expense";
type Transaction = {
	id: string;
	description: string;
	amount: number; // positive numeric value
	category: string;
	type: TxType;
	date: string; // ISO date string
};

const STORAGE_KEY = "aet_transactions_v1";

const formatCurrency = (n: number) =>
	n.toLocaleString(undefined, { style: "currency", currency: "USD" });

export default function ExpenseTracker() {
	const [transactions, setTransactions] = useState<Transaction[]>(() => {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			return raw ? JSON.parse(raw) : [];
		} catch {
			return [];
		}
	});

	// Form
	const [description, setDescription] = useState("");
	const [amountStr, setAmountStr] = useState("");
	const [category, setCategory] = useState("Other");
	const [type, setType] = useState<TxType>("Expense");
	const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

	// display animation for balance
	const [displayBalance, setDisplayBalance] = useState(0);
	const prevBalanceRef = useRef<number>(0);

	// computed totals
	const balance = transactions.reduce((acc, t) => {
		return acc + (t.type === "Income" ? t.amount : -t.amount);
	}, 0);

	useEffect(() => {
		// persist
		localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
	}, [transactions]);

	// count-up animation for balance
	useEffect(() => {
		const from = prevBalanceRef.current;
		const to = balance;
		const duration = 550; // ms
		const start = performance.now();

		let raf = 0;
		function step(now: number) {
			const t = Math.min(1, (now - start) / duration);
			// easeOut cubic
			const eased = 1 - Math.pow(1 - t, 3);
			const current = from + (to - from) * eased;
			setDisplayBalance(Number(current.toFixed(2)));
			if (t < 1) raf = requestAnimationFrame(step);
			else prevBalanceRef.current = to;
		}

		raf = requestAnimationFrame(step);
		return () => cancelAnimationFrame(raf);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [balance]);

	// add tx
	function addTransaction() {
		const amount = parseFloat(amountStr);
		if (!description.trim() || Number.isNaN(amount) || amount <= 0) {
			alert("Please add a valid description and positive amount.");
			return;
		}
		const newTx: Transaction = {
			id: Date.now().toString(),
			description: description.trim(),
			amount,
			category: category || "Other",
			type,
			date,
		};
		setTransactions((s) => [newTx, ...s]);
		setDescription("");
		setAmountStr("");
		setCategory("Other");
		setType("Expense");
		setDate(new Date().toISOString().slice(0, 10));
	}

	function deleteTx(id: string) {
		setTransactions((s) => s.filter((t) => t.id !== id));
	}

	// Chart data (spend by category)
	const expenseTx = transactions.filter((t) => t.type === "Expense");
	const grouped = expenseTx.reduce<Record<string, number>>((acc, t) => {
		acc[t.category] = (acc[t.category] || 0) + t.amount;
		return acc;
	}, {});
	const chartLabels = Object.keys(grouped);
	const chartSeries = chartLabels.map((k) => grouped[k]);

	const chartOptions = {
		chart: { toolbar: { show: false } },
		labels: chartLabels,
		legend: { position: "bottom" },
		theme: { mode: "dark" },
		tooltip: { y: { formatter: (val: number) => formatCurrency(val) } },
	};

	const sampleCategories = [
		"Food",
		"Bills",
		"Transport",
		"Entertainment",
		"Shopping",
		"Other",
	];

	return (
		<div className="w-full max-w-4xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 rounded-2xl p-6 shadow-lg">
			{/* Header */}
			<motion.div
				initial={{ y: -20, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				className="flex items-center justify-between mb-6"
			>
				<div>
					<h1 className="text-2xl font-bold flex items-center gap-2">
						<span>💸</span> Animated Expense Tracker
					</h1>
					<p className="text-sm text-slate-300">
						Small demo: localStorage + animations
					</p>
				</div>

				<div className="text-right">
					<p className="text-xs text-slate-300">Balance</p>
					<motion.div
						key={displayBalance}
						initial={{ scale: 0.9, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						className="text-xl font-semibold"
					>
						<span className={balance >= 0 ? "text-green-300" : "text-red-400"}>
							{formatCurrency(displayBalance)}
						</span>
					</motion.div>
				</div>
			</motion.div>

			{/* Layout: form + chart + list */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				{/* Form */}
				<div className="md:col-span-1 bg-slate-800/60 p-4 rounded-lg">
					<h3 className="font-semibold mb-2">Add Transaction</h3>
					<input
						placeholder="Description"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						className="w-full mb-2 p-2 rounded text-white"
					/>
					<input
						placeholder="Amount (numbers only)"
						value={amountStr}
						onChange={(e) => setAmountStr(e.target.value)}
						className="w-full mb-2 p-2 rounded text-white"
						inputMode="decimal"
					/>

					<div className="flex gap-2 mb-2">
						<select
							value={category}
							onChange={(e) => setCategory(e.target.value)}
							className="flex-1 p-2 rounded text-white"
						>
							{sampleCategories.map((c) => (
								<option value={c} key={c}>
									{c}
								</option>
							))}
						</select>

						<select
							value={type}
							onChange={(e) => setType(e.target.value as TxType)}
							className="w-28 p-2 rounded text-white"
						>
							<option>Expense</option>
							<option>Income</option>
						</select>
					</div>

					<input
						type="date"
						value={date}
						onChange={(e) => setDate(e.target.value)}
						className="w-full mb-3 p-2 rounded text-white"
					/>

					<button
						onClick={addTransaction}
						className="w-full py-2 rounded bg-gradient-to-r from-indigo-500 to-blue-500 hover:scale-[1.01] active:scale-95 transition"
					>
						Add
					</button>

					{/* quick helpers */}
					<div className="mt-4 text-xs text-slate-300">
						Tip: mark incomes as <span className="text-green-300">Income</span>{" "}
						so they add to your balance.
					</div>
				</div>

				{/* Chart */}
				<div className="md:col-span-2 bg-slate-800/60 p-4 rounded-lg">
					<h3 className="font-semibold mb-2">Spending by Category</h3>

					{chartSeries.length ? (
						<Chart
							options={chartOptions}
							series={chartSeries}
							type="donut"
							height={280}
						/>
					) : (
						<div className="flex items-center justify-center h-[280px] text-slate-400">
							No expense data yet — add a transaction.
						</div>
					)}
				</div>

				{/* Transaction list - spans full width under small screens */}
				<div className="md:col-span-3">
					<h3 className="font-semibold mb-2">Transactions</h3>
					<div className="bg-slate-800/60 rounded-lg p-3">
						<ul className="space-y-2">
							<AnimatePresence>
								{transactions.length === 0 && (
									<motion.li
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										className="text-slate-400 text-sm"
									>
										No transactions — add one on the left.
									</motion.li>
								)}

								{transactions.map((t) => (
									<motion.li
										key={t.id}
										initial={{ opacity: 0, x: 40 }}
										animate={{ opacity: 1, x: 0 }}
										exit={{ opacity: 0, x: -40 }}
										layout
										className="flex items-center justify-between bg-slate-700/60 p-2 rounded"
									>
										<div>
											<div className="font-medium">{t.description}</div>
											<div className="text-xs text-slate-300 flex gap-2 items-center">
												<span>{t.date}</span>
												<span>•</span>
												<span>{t.category}</span>
											</div>
										</div>

										<div className="flex items-center gap-3">
											<div
												className={
													t.type === "Income"
														? "text-green-300"
														: "text-red-300"
												}
											>
												{t.type === "Income" ? "+" : "-"}
												{formatCurrency(t.amount)}
											</div>
											<button
												onClick={() => deleteTx(t.id)}
												className="text-slate-300 hover:text-red-400 p-1 rounded"
												aria-label="Delete transaction"
											>
												✖
											</button>
										</div>
									</motion.li>
								))}
							</AnimatePresence>
						</ul>
					</div>
				</div>
			</div>
		</div>
	);
}
