import express from "express";
import cors from "cors";
import helmet from "helmet";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

const MODES = ["distance", "individual_price", "equal"];

const calculatePayments = ({ total, mode, participants }) => {
  if (typeof total !== "number" || Number.isNaN(total) || total <= 0) {
    throw new Error("Total must be a positive number");
  }

  if (!Array.isArray(participants) || participants.length < 2 || participants.length > 10) {
    throw new Error("Participants must be an array with 2 to 10 items");
  }

  if (!MODES.includes(mode)) {
    throw new Error("Mode must be distance, individual_price, or equal");
  }

  const sanitizedParticipants = participants.map((participant, index) => {
    const name = participant?.name?.trim() || `Участник ${index + 1}`;
    const rawValue = Number(participant?.value);
    const valueForDisplay =
      Number.isFinite(rawValue) && rawValue > 0 ? rawValue : mode === "equal" ? 1 : NaN;
    if (mode !== "equal" && (!Number.isFinite(rawValue) || rawValue <= 0)) {
      throw new Error("Each participant must have a positive numeric value");
    }
    return { name, value: valueForDisplay };
  });

  let denominator;
  if (mode === "equal") {
    denominator = sanitizedParticipants.length;
  } else {
    denominator = sanitizedParticipants.reduce((sum, { value }) => sum + value, 0);
    if (denominator <= 0) {
      throw new Error("Sum of participant values must be greater than zero");
    }
  }

  const rawResults = sanitizedParticipants.map(({ name, value }) => {
    const share = mode === "equal" ? 1 / denominator : value / denominator;
    const pay = total * share;
    return { name, value, share, pay };
  });

  const roundedPays = rawResults.map(({ pay }) => Math.round(pay));
  const sumRounded = roundedPays.reduce((sum, pay) => sum + pay, 0);
  const difference = Math.round(total) - sumRounded;

  if (difference !== 0 && roundedPays.length) {
    roundedPays[roundedPays.length - 1] += difference;
  }

  const results = rawResults.map((result, index) => ({
    ...result,
    pay: roundedPays[index],
  }));

  const sumPay = results.reduce((sum, { pay }) => sum + pay, 0);

  return {
    total: Math.round(total),
    mode,
    results,
    sumPay,
  };
};

app.post("/api/calculate", (req, res) => {
  try {
    const { total, mode, participants } = req.body;
    const calculation = calculatePayments({ total, mode, participants });
    res.json(calculation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend server is running on port ${PORT}`);
});

export default app;
