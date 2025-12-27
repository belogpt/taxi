export type CalculationMode = "distance" | "individual_price" | "equal";

export interface ParticipantInput {
  name: string;
  value: number;
}

export interface CalculationResultItem extends ParticipantInput {
  share: number;
  pay: number;
}

export interface CalculationResponse {
  total: number;
  mode: CalculationMode;
  results: CalculationResultItem[];
  sumPay: number;
}
