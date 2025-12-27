import { useMemo, useState } from "react";
import { CalculationMode, CalculationResponse } from "./types";

type ParticipantForm = {
  name: string;
  value: string;
};

const MAX_PARTICIPANTS = 10;
const MIN_PARTICIPANTS = 2;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(
    value,
  );

const modeLabels: Record<CalculationMode, string> = {
  distance: "По километражу",
  individual_price: "По индивидуальной цене",
  equal: "Поровну",
};

function App() {
  const [total, setTotal] = useState<string>("1000");
  const [mode, setMode] = useState<CalculationMode>("distance");
  const [participants, setParticipants] = useState<ParticipantForm[]>([
    { name: "Алиса", value: "5" },
    { name: "Боб", value: "8" },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CalculationResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const apiBase = useMemo(() => "/api", []);

  const handleParticipantChange = (index: number, field: keyof ParticipantForm, value: string) => {
    setParticipants((prev) => prev.map((participant, i) => (i === index ? { ...participant, [field]: value } : participant)));
  };

  const addParticipant = () => {
    if (participants.length >= MAX_PARTICIPANTS) return;
    setParticipants((prev) => [...prev, { name: "", value: "" }]);
  };

  const removeParticipant = (index: number) => {
    if (participants.length <= MIN_PARTICIPANTS) return;
    setParticipants((prev) => prev.filter((_, i) => i !== index));
  };

  const validatePayload = () => {
    const parsedTotal = Number(total);
    if (!Number.isFinite(parsedTotal) || parsedTotal <= 0) {
      throw new Error("Введите положительное число для общей стоимости.");
    }

    const sanitizedParticipants = participants.map((p) => {
      const numericValue = Number(p.value);
      const value = mode === "equal" ? 1 : numericValue;
      return {
        name: p.name.trim(),
        value,
      };
    });

    if (
      mode !== "equal" &&
      sanitizedParticipants.some((p) => !Number.isFinite(p.value) || p.value <= 0)
    ) {
      throw new Error("Все значения участников должны быть положительными числами.");
    }

    if (sanitizedParticipants.length < MIN_PARTICIPANTS || sanitizedParticipants.length > MAX_PARTICIPANTS) {
      throw new Error(`Количество участников от ${MIN_PARTICIPANTS} до ${MAX_PARTICIPANTS}.`);
    }

    return { total: parsedTotal, mode, participants: sanitizedParticipants };
  };

  const calculate = async () => {
    setError(null);
    setCopied(false);
    try {
      const payload = validatePayload();
      setLoading(true);
      const response = await fetch(`${apiBase}/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Ошибка расчёта. Проверьте введённые данные.");
      }
      setResult(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Не удалось выполнить расчёт. Попробуйте ещё раз.");
      }
    } finally {
      setLoading(false);
    }
  };

  const copyResult = async () => {
    if (!result) return;
    const lines = result.results.map(
      (item) => `${item.name}: доля ${(item.share * 100).toFixed(2)}% — к оплате ${formatCurrency(item.pay)}`,
    );
    const text = [`Итог: ${formatCurrency(result.total)}`, `Режим: ${modeLabels[result.mode]}`, ...lines, `Сумма: ${formatCurrency(result.sumPay)}`].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Не удалось скопировать результат.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100">
      <header className="px-6 py-8 sm:px-10">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-md sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-accent">Taxi Splitter</p>
              <h1 className="mt-2 text-3xl font-bold text-primary">Справедливое разделение стоимости поездки</h1>
              <p className="mt-2 text-slate-600">Рассчитайте долю каждого участника по километражу, индивидуальной цене или поровну.</p>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-slate-600">
              <div className="h-10 w-10 rounded-full bg-accent/10 text-accent">
                <div className="flex h-full w-full items-center justify-center text-lg">🚕</div>
              </div>
              <div>
                <p className="text-sm font-medium text-primary">Всего участников</p>
                <p className="text-xl font-semibold text-primary">{participants.length}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="px-6 pb-16 sm:px-10">
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section className="rounded-2xl bg-white p-6 shadow-md">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label htmlFor="total" className="text-sm font-semibold text-primary">
                  Общая стоимость поездки
                </label>
                <input
                  id="total"
                  type="number"
                  min={0}
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-lg font-semibold text-primary outline-none transition focus:border-accent focus:bg-white"
                  placeholder="Например, 1500"
                />
              </div>

              <div className="flex flex-col gap-3">
                <p className="text-sm font-semibold text-primary">Режим расчёта</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {(Object.keys(modeLabels) as CalculationMode[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setMode(option)}
                      className={`rounded-xl border px-4 py-3 text-left transition ${
                        mode === option
                          ? "border-accent bg-accent/10 text-primary shadow-sm"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:border-accent/50 hover:bg-white"
                      }`}
                    >
                      <p className="font-semibold text-primary">{modeLabels[option]}</p>
                      <p className="text-xs text-slate-500">
                        {option === "distance" && "Оплата пропорциональна километражу."}
                        {option === "individual_price" && "Оплата пропорциональна индивидуальной цене."}
                        {option === "equal" && "Каждый платит одинаковую сумму."}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-primary">Участники</p>
                  <p className="text-xs text-slate-500">От {MIN_PARTICIPANTS} до {MAX_PARTICIPANTS} человек</p>
                </div>
                <button
                  type="button"
                  onClick={addParticipant}
                  disabled={participants.length >= MAX_PARTICIPANTS}
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:bg-slate-200"
                >
                  ➕ Добавить
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {participants.map((participant, index) => (
                  <div
                    key={index}
                    className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-accent/60"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-primary">Участник {index + 1}</p>
                      <button
                        type="button"
                        onClick={() => removeParticipant(index)}
                        disabled={participants.length <= MIN_PARTICIPANTS}
                        className="text-sm text-slate-500 transition hover:text-red-500 disabled:cursor-not-allowed disabled:text-slate-300"
                      >
                        Удалить
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-slate-500">Имя (необязательно)</label>
                        <input
                          type="text"
                          value={participant.name}
                          onChange={(e) => handleParticipantChange(index, "name", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-accent"
                          placeholder={`Участник ${index + 1}`}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-slate-500">
                          {mode === "equal" ? "Значение (игнорируется в этом режиме)" : "Километры или цена"}
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={participant.value}
                          onChange={(e) => handleParticipantChange(index, "value", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-accent"
                          placeholder={mode === "equal" ? "—" : "Например, 5"}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={calculate}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-semibold text-white shadow-lg transition hover:bg-slate-900 disabled:cursor-progress"
                >
                  {loading ? "Рассчитываем..." : "Рассчитать"}
                </button>
                <p className="text-sm text-slate-500">Суммы округляются до целых рублей. Разница компенсируется у последнего участника.</p>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-md">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-primary">Результаты</p>
                <p className="text-xs text-slate-500">Отобразятся после расчёта</p>
              </div>
              <button
                type="button"
                onClick={copyResult}
                disabled={!result}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-primary transition hover:border-accent hover:text-primary disabled:cursor-not-allowed disabled:text-slate-300"
              >
                {copied ? "Скопировано" : "Скопировать результат"}
              </button>
            </div>

            {result ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <span className="rounded-full bg-white px-3 py-1 text-primary shadow-sm">Общая сумма: {formatCurrency(result.total)}</span>
                  <span className="rounded-full bg-white px-3 py-1 text-primary shadow-sm">Режим: {modeLabels[result.mode]}</span>
                  <span className="rounded-full bg-white px-3 py-1 text-primary shadow-sm">Сумма к оплате: {formatCurrency(result.sumPay)}</span>
                </div>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Имя</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Значение</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Доля</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">К оплате</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {result.results.map((item, index) => (
                        <tr key={index} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm font-semibold text-primary">{item.name}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {mode === "equal" ? "—" : item.value}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">{(item.share * 100).toFixed(2)}%</td>
                          <td className="px-4 py-3 text-sm font-semibold text-primary">{formatCurrency(item.pay)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-slate-500">
                <p className="font-semibold text-primary">Расчёт ещё не выполнен</p>
                <p className="text-sm">Заполните данные и нажмите «Рассчитать», чтобы увидеть результаты.</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
