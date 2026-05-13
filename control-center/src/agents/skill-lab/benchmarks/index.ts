import { logoBenchmarks } from "./logo-benchmarks";
import { memoryBenchmarks } from "./memory-benchmarks";
import { routingBenchmarks } from "./routing-benchmarks";
import { visibilityBenchmarks } from "./visibility-benchmarks";
import { websiteBenchmarks } from "./website-benchmarks";

export const skillBenchmarkCases = [
  ...logoBenchmarks,
  ...websiteBenchmarks,
  ...routingBenchmarks,
  ...memoryBenchmarks,
  ...visibilityBenchmarks,
];

export { logoBenchmarks, memoryBenchmarks, routingBenchmarks, visibilityBenchmarks, websiteBenchmarks };

