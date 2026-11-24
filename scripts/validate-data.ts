import { readDataset } from "../src/lib/data";

try {
  const { creators, milestones } = readDataset();
  console.log(`数据校验通过 · ${creators.length} 份档案，${milestones.length} 条事件`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
